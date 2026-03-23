import {
  createMongoClient,
  validateConnectionString,
} from "@/lib/mongodb";
import type { MigrationMode, MigrationStreamEvent } from "@/types";

export const maxDuration = 300;

const BATCH_SIZE = 500;

export async function POST(request: Request) {
  const { sourceUri, targetUri, sourceDb, targetDb, collections, mode } =
    await request.json();

  if (
    !sourceUri ||
    !targetUri ||
    !validateConnectionString(sourceUri) ||
    !validateConnectionString(targetUri)
  ) {
    return new Response(
      JSON.stringify({ error: "Valid connection strings are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!sourceDb || !targetDb) {
    return new Response(
      JSON.stringify({ error: "Source and target database names are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!collections || !Array.isArray(collections) || collections.length === 0) {
    return new Response(
      JSON.stringify({ error: "At least one collection must be selected" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const migrationMode: MigrationMode =
    mode === "overwrite" ? "overwrite" : "merge";

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: MigrationStreamEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };

      const sourceClient = createMongoClient(sourceUri);
      const targetClient = createMongoClient(targetUri);

      try {
        await sourceClient.connect();
        await targetClient.connect();

        const sourceDatabase = sourceClient.db(sourceDb);
        const targetDatabase = targetClient.db(targetDb);

        let totalDocs = 0;
        const collectionCounts: Record<string, number> = {};

        for (const colName of collections) {
          const count = await sourceDatabase
            .collection(colName)
            .countDocuments();
          collectionCounts[colName] = count;
          totalDocs += count;
        }

        let totalProcessed = 0;

        for (let i = 0; i < collections.length; i++) {
          const colName = collections[i];
          const docCount = collectionCounts[colName];

          sendEvent({
            type: "collection_start",
            data: {
              collectionName: colName,
              collectionsCompleted: i,
              totalCollections: collections.length,
              totalDocumentsProcessed: totalProcessed,
              totalDocuments: totalDocs,
              status: "running",
              collections: collections.map((name: string, idx: number) => ({
                name,
                documentsProcessed: idx < i ? collectionCounts[name] : 0,
                totalDocuments: collectionCounts[name],
                status:
                  idx < i ? "completed" : idx === i ? "running" : "pending",
              })),
            },
          });

          try {
            if (migrationMode === "overwrite") {
              await targetDatabase
                .collection(colName)
                .drop()
                .catch(() => {});
            }

            if (docCount === 0) {
              await targetDatabase.createCollection(colName).catch(() => {});

              sendEvent({
                type: "collection_done",
                data: {
                  collectionName: colName,
                  collectionsCompleted: i + 1,
                  totalCollections: collections.length,
                  totalDocumentsProcessed: totalProcessed,
                  totalDocuments: totalDocs,
                  status: "running",
                  collections: collections.map(
                    (name: string, idx: number) => ({
                      name,
                      documentsProcessed:
                        idx <= i ? collectionCounts[name] : 0,
                      totalDocuments: collectionCounts[name],
                      status: idx <= i ? "completed" : "pending",
                    })
                  ),
                },
              });
              continue;
            }

            const sourceIndexes = await sourceDatabase
              .collection(colName)
              .indexes()
              .catch(() => []);

            const cursor = sourceDatabase.collection(colName).find();
            let batch: Record<string, unknown>[] = [];
            let colProcessed = 0;

            for await (const doc of cursor) {
              batch.push(doc);

              if (batch.length >= BATCH_SIZE) {
                await insertBatch(
                  targetDatabase,
                  colName,
                  batch,
                  migrationMode
                );

                colProcessed += batch.length;
                totalProcessed += batch.length;
                batch = [];

                sendEvent({
                  type: "progress",
                  data: {
                    collectionsCompleted: i,
                    totalCollections: collections.length,
                    totalDocumentsProcessed: totalProcessed,
                    totalDocuments: totalDocs,
                    status: "running",
                    collectionName: colName,
                    collections: collections.map(
                      (name: string, idx: number) => ({
                        name,
                        documentsProcessed:
                          idx < i
                            ? collectionCounts[name]
                            : idx === i
                              ? colProcessed
                              : 0,
                        totalDocuments: collectionCounts[name],
                        status:
                          idx < i
                            ? "completed"
                            : idx === i
                              ? "running"
                              : "pending",
                      })
                    ),
                  },
                });
              }
            }

            if (batch.length > 0) {
              await insertBatch(
                targetDatabase,
                colName,
                batch,
                migrationMode
              );
              colProcessed += batch.length;
              totalProcessed += batch.length;
            }

            if (sourceIndexes.length > 1) {
              const customIndexes = sourceIndexes.filter(
                (idx) => idx.name !== "_id_"
              );
              for (const idx of customIndexes) {
                try {
                  const { key, ...options } = idx;
                  const {
                    v: _v,
                    ns: _ns,
                    ...cleanOptions
                  } = options as Record<string, unknown>;
                  await targetDatabase
                    .collection(colName)
                    .createIndex(key, cleanOptions);
                } catch {
                  /* index creation failure is non-critical */
                }
              }
            }

            sendEvent({
              type: "collection_done",
              data: {
                collectionName: colName,
                collectionsCompleted: i + 1,
                totalCollections: collections.length,
                totalDocumentsProcessed: totalProcessed,
                totalDocuments: totalDocs,
                status: "running",
                collections: collections.map(
                  (name: string, idx: number) => ({
                    name,
                    documentsProcessed:
                      idx <= i ? collectionCounts[name] : 0,
                    totalDocuments: collectionCounts[name],
                    status: idx <= i ? "completed" : "pending",
                  })
                ),
              },
            });
          } catch (error) {
            const errMsg =
              error instanceof Error ? error.message : "Unknown error";

            sendEvent({
              type: "error",
              data: {
                collectionName: colName,
                message: `Failed to migrate "${colName}": ${errMsg}`,
                collectionsCompleted: i,
                totalCollections: collections.length,
                totalDocumentsProcessed: totalProcessed,
                totalDocuments: totalDocs,
                status: "error",
                collections: collections.map(
                  (name: string, idx: number) => ({
                    name,
                    documentsProcessed:
                      idx < i ? collectionCounts[name] : 0,
                    totalDocuments: collectionCounts[name],
                    status:
                      idx < i
                        ? "completed"
                        : idx === i
                          ? "error"
                          : "pending",
                    error: idx === i ? errMsg : undefined,
                  })
                ),
              },
            });
          }
        }

        sendEvent({
          type: "done",
          data: {
            collectionsCompleted: collections.length,
            totalCollections: collections.length,
            totalDocumentsProcessed: totalProcessed,
            totalDocuments: totalDocs,
            status: "completed",
            collections: collections.map((name: string) => ({
              name,
              documentsProcessed: collectionCounts[name],
              totalDocuments: collectionCounts[name],
              status: "completed",
            })),
          },
        });
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : "Migration failed";
        sendEvent({
          type: "error",
          data: { message: errMsg, status: "error" },
        });
      } finally {
        await sourceClient.close().catch(() => {});
        await targetClient.close().catch(() => {});
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

import type { Db } from "mongodb";

const insertBatch = async (
  db: Db,
  colName: string,
  batch: Record<string, unknown>[],
  mode: MigrationMode
) => {
  try {
    if (mode === "overwrite") {
      await db.collection(colName).insertMany(batch);
    } else {
      await db
        .collection(colName)
        .insertMany(batch, { ordered: false })
        .catch((err) => {
          if (err.code !== 11000) throw err;
        });
    }
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: number }).code === 11000
    ) {
      return;
    }
    throw err;
  }
};

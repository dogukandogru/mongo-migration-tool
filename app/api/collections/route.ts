import { NextResponse } from "next/server";
import {
  createMongoClient,
  validateConnectionString,
} from "@/lib/mongodb";
import type { CollectionsResponse } from "@/types";

export async function POST(request: Request) {
  try {
    const { connectionString, databaseName } = await request.json();

    if (!connectionString || !validateConnectionString(connectionString)) {
      return NextResponse.json<CollectionsResponse>(
        { success: false, error: "Valid connection string is required" },
        { status: 400 }
      );
    }

    if (!databaseName || typeof databaseName !== "string") {
      return NextResponse.json<CollectionsResponse>(
        { success: false, error: "Database name is required" },
        { status: 400 }
      );
    }

    const client = createMongoClient(connectionString);

    try {
      await client.connect();

      const db = client.db(databaseName);
      const collections = await db.listCollections().toArray();

      const collectionInfos = await Promise.all(
        collections
          .filter((col) => col.type === "collection")
          .map(async (col) => {
            try {
              const stats = await db.command({ collStats: col.name });
              return {
                name: col.name,
                documentCount: stats.count ?? 0,
                avgDocSize: stats.avgObjSize ?? 0,
                totalSize: stats.size ?? 0,
                selected: true,
              };
            } catch {
              const count = await db.collection(col.name).countDocuments();
              return {
                name: col.name,
                documentCount: count,
                avgDocSize: 0,
                totalSize: 0,
                selected: true,
              };
            }
          })
      );

      return NextResponse.json<CollectionsResponse>({
        success: true,
        collections: collectionInfos.sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      });
    } finally {
      await client.close();
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch collections";

    return NextResponse.json<CollectionsResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

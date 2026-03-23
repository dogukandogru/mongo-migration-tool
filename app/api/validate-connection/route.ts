import { NextResponse } from "next/server";
import {
  createMongoClient,
  validateConnectionString,
  extractDatabaseName,
} from "@/lib/mongodb";
import type { ValidateConnectionResponse } from "@/types";

const SYSTEM_DBS = new Set(["admin", "local", "config"]);

export async function POST(request: Request) {
  try {
    const { connectionString } = await request.json();

    if (!connectionString || typeof connectionString !== "string") {
      return NextResponse.json<ValidateConnectionResponse>(
        { success: false, error: "Connection string is required" },
        { status: 400 }
      );
    }

    if (!validateConnectionString(connectionString)) {
      return NextResponse.json<ValidateConnectionResponse>(
        {
          success: false,
          error:
            "Invalid connection string format. Must start with mongodb:// or mongodb+srv://",
        },
        { status: 400 }
      );
    }

    const client = createMongoClient(connectionString);

    try {
      await client.connect();
      await client.db().command({ ping: 1 });

      const databaseName = extractDatabaseName(connectionString);

      const adminDb = client.db().admin();
      const { databases: dbList } = await adminDb.listDatabases();
      const databases = dbList
        .map((db: { name: string }) => db.name)
        .filter((name: string) => !SYSTEM_DBS.has(name))
        .sort();

      return NextResponse.json<ValidateConnectionResponse>({
        success: true,
        databaseName: databaseName ?? databases[0] ?? "test",
        databases,
      });
    } finally {
      await client.close();
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Connection failed";

    return NextResponse.json<ValidateConnectionResponse>(
      { success: false, error: message },
      { status: 400 }
    );
  }
}

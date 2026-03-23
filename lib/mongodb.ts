import { MongoClient } from "mongodb";

const CONNECTION_TIMEOUT_MS = 10_000;

export const validateConnectionString = (connectionString: string): boolean => {
  return /^mongodb(\+srv)?:\/\/.+/.test(connectionString.trim());
};

export const createMongoClient = (connectionString: string): MongoClient => {
  return new MongoClient(connectionString.trim(), {
    connectTimeoutMS: CONNECTION_TIMEOUT_MS,
    socketTimeoutMS: 30_000,
    serverSelectionTimeoutMS: CONNECTION_TIMEOUT_MS,
  });
};

export const extractDatabaseName = (connectionString: string): string | null => {
  try {
    const cleaned = connectionString.trim();
    const match = cleaned.match(/\/([^/?]+)(\?|$)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
};

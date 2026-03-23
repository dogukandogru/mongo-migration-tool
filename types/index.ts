export type MigrationStep = "connect" | "select" | "migrate";

export type ConnectionStatus = "idle" | "validating" | "connected" | "error";

export type MigrationMode = "overwrite" | "merge";

export type MigrationStatus =
  | "idle"
  | "running"
  | "completed"
  | "error";

export type CollectionMigrationStatus =
  | "pending"
  | "running"
  | "completed"
  | "skipped"
  | "error";

export interface CollectionInfo {
  name: string;
  documentCount: number;
  avgDocSize: number;
  totalSize: number;
  selected: boolean;
}

export interface ConnectionState {
  connectionString: string;
  status: ConnectionStatus;
  error?: string;
  databaseName?: string;
  databases?: string[];
}

export interface CollectionMigrationResult {
  name: string;
  documentsProcessed: number;
  totalDocuments: number;
  status: CollectionMigrationStatus;
  error?: string;
}

export interface MigrationProgress {
  collectionsCompleted: number;
  totalCollections: number;
  totalDocumentsProcessed: number;
  totalDocuments: number;
  status: MigrationStatus;
  error?: string;
  startTime: number;
  endTime?: number;
  collections: CollectionMigrationResult[];
}

export interface ValidateConnectionResponse {
  success: boolean;
  databaseName?: string;
  databases?: string[];
  error?: string;
}

export interface CollectionsResponse {
  success: boolean;
  collections?: CollectionInfo[];
  error?: string;
}

export interface MigrationStreamEvent {
  type: "progress" | "collection_start" | "collection_done" | "error" | "done";
  data: Partial<MigrationProgress> & {
    collectionName?: string;
    message?: string;
  };
}

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckSquare,
  ChevronDown,
  Loader2,
  Square,
  AlertCircle,
  Database,
} from "lucide-react";
import type { CollectionInfo, MigrationMode } from "@/types";

interface StepCollectionSelectorProps {
  sourceConnectionString: string;
  sourceDatabases: string[];
  defaultSourceDb: string;
  targetDatabases: string[];
  defaultTargetDb: string;
  onBack: () => void;
  onNext: (
    collections: string[],
    mode: MigrationMode,
    sourceDb: string,
    targetDb: string
  ) => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat("en-US").format(num);
};

const SourceDatabaseSelector = ({
  databases,
  value,
  onChange,
}: {
  databases: string[];
  value: string;
  onChange: (db: string) => void;
}) => (
  <div className="flex-1">
    <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-mongo-navy">
      <Database className="h-3.5 w-3.5 text-mongo-dark-green" />
      Source Database
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-mongo-border bg-white px-4 py-2.5 pr-10 font-mono text-sm text-mongo-navy focus:border-mongo-dark-green focus:outline-none focus:ring-2 focus:ring-mongo-green/20"
        aria-label="Select source database"
      >
        {databases.map((db) => (
          <option key={db} value={db}>
            {db}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mongo-text-secondary" />
    </div>
  </div>
);

const TargetDatabaseInput = ({
  databases,
  value,
  onChange,
}: {
  databases: string[];
  value: string;
  onChange: (db: string) => void;
}) => {
  const isNew = value.trim() !== "" && !databases.includes(value);

  return (
    <div className="flex-1">
      <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-mongo-navy">
        <Database className="h-3.5 w-3.5 text-mongo-dark-green" />
        Target Database
      </label>
      <div className="relative">
        <input
          type="text"
          list="target-db-list"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Select or type a new name"
          className="w-full rounded-lg border border-mongo-border bg-white px-4 py-2.5 pr-10 font-mono text-sm text-mongo-navy placeholder:text-mongo-text-secondary/50 focus:border-mongo-dark-green focus:outline-none focus:ring-2 focus:ring-mongo-green/20"
          aria-label="Select or type target database name"
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mongo-text-secondary" />
        <datalist id="target-db-list">
          {databases.map((db) => (
            <option key={db} value={db} />
          ))}
        </datalist>
      </div>
      {isNew && (
        <p className="mt-1.5 text-xs text-mongo-dark-green">
          <strong>{value}</strong> will be created automatically on target.
        </p>
      )}
    </div>
  );
};

const StepCollectionSelector = ({
  sourceConnectionString,
  sourceDatabases,
  defaultSourceDb,
  targetDatabases,
  defaultTargetDb,
  onBack,
  onNext,
}: StepCollectionSelectorProps) => {
  const [sourceDb, setSourceDb] = useState(defaultSourceDb);
  const [targetDb, setTargetDb] = useState(defaultTargetDb);
  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<MigrationMode>("overwrite");

  const handleSourceDbChange = useCallback(
    (db: string) => {
      setSourceDb(db);
      setTargetDb(db);
    },
    []
  );

  const fetchCollections = useCallback(
    async (dbName: string) => {
      try {
        setLoading(true);
        setError(null);
        setCollections([]);

        const response = await fetch("/api/collections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionString: sourceConnectionString,
            databaseName: dbName,
          }),
        });

        const data = await response.json();

        if (!data.success) {
          setError(data.error || "Failed to fetch collections");
          return;
        }

        setCollections(data.collections ?? []);
      } catch {
        setError("Failed to fetch collections. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [sourceConnectionString]
  );

  useEffect(() => {
    fetchCollections(sourceDb);
  }, [sourceDb, fetchCollections]);

  const handleToggle = (name: string) => {
    setCollections((prev) =>
      prev.map((col) =>
        col.name === name ? { ...col, selected: !col.selected } : col
      )
    );
  };

  const handleSelectAll = () => {
    const allSelected = collections.every((c) => c.selected);
    setCollections((prev) =>
      prev.map((col) => ({ ...col, selected: !allSelected }))
    );
  };

  const selectedCollections = collections.filter((c) => c.selected);
  const totalDocs = selectedCollections.reduce(
    (sum, c) => sum + c.documentCount,
    0
  );
  const totalSize = selectedCollections.reduce(
    (sum, c) => sum + c.totalSize,
    0
  );
  const allSelected =
    collections.length > 0 && collections.every((c) => c.selected);

  if (error && collections.length === 0) {
    return (
      <div className="animate-fade-in space-y-4">
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-mongo-dark-green hover:text-mongo-navy"
          tabIndex={0}
          aria-label="Go back to connection step"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to connections
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-mongo-navy">
          Select Database & Collections
        </h2>
        <p className="mt-1 text-sm text-mongo-text-secondary">
          Choose the source and target databases, then select which collections
          to migrate.
        </p>
      </div>

      <div className="rounded-xl border border-mongo-border bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <SourceDatabaseSelector
            databases={sourceDatabases}
            value={sourceDb}
            onChange={handleSourceDbChange}
          />
          <div className="hidden items-end pb-2.5 sm:flex">
            <ArrowRight className="h-4 w-4 text-mongo-text-secondary" />
          </div>
          <TargetDatabaseInput
            databases={targetDatabases}
            value={targetDb}
            onChange={setTargetDb}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-mongo-dark-green" />
          <p className="mt-4 text-sm text-mongo-text-secondary">
            Fetching collections from <strong>{sourceDb}</strong>...
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-mongo-border bg-white">
            <div className="flex items-center justify-between border-b border-mongo-border px-4 py-3">
              <button
                type="button"
                onClick={handleSelectAll}
                className="flex items-center gap-2 text-sm font-medium text-mongo-dark-green hover:text-mongo-navy"
                tabIndex={0}
                aria-label={
                  allSelected
                    ? "Deselect all collections"
                    : "Select all collections"
                }
              >
                {allSelected ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {allSelected ? "Deselect All" : "Select All"}
              </button>

              <span className="text-xs text-mongo-text-secondary">
                {selectedCollections.length} of {collections.length} selected
              </span>
            </div>

            {collections.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-mongo-text-secondary">
                <Database className="h-8 w-8 opacity-40" />
                <p className="mt-3 text-sm">
                  No collections found in <strong>{sourceDb}</strong>
                </p>
              </div>
            ) : (
              <div className="max-h-80 divide-y divide-mongo-border overflow-y-auto">
                {collections.map((col) => (
                  <button
                    key={col.name}
                    type="button"
                    onClick={() => handleToggle(col.name)}
                    className={`flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-mongo-bg ${
                      col.selected ? "bg-mongo-light-green/20" : ""
                    }`}
                    tabIndex={0}
                    aria-label={`${col.selected ? "Deselect" : "Select"} collection ${col.name}`}
                  >
                    {col.selected ? (
                      <CheckSquare className="h-4 w-4 shrink-0 text-mongo-dark-green" />
                    ) : (
                      <Square className="h-4 w-4 shrink-0 text-mongo-text-secondary" />
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm font-medium text-mongo-navy">
                        {col.name}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-4 text-xs text-mongo-text-secondary">
                      <span>{formatNumber(col.documentCount)} docs</span>
                      {col.totalSize > 0 && (
                        <span>{formatBytes(col.totalSize)}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedCollections.length > 0 && (
              <div className="border-t border-mongo-border bg-mongo-bg px-4 py-3">
                <div className="flex items-center justify-between text-xs text-mongo-text-secondary">
                  <span>
                    Total: <strong>{formatNumber(totalDocs)}</strong> documents
                  </span>
                  {totalSize > 0 && (
                    <span>
                      Estimated size: <strong>{formatBytes(totalSize)}</strong>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-mongo-border bg-white p-4">
            <h4 className="text-sm font-semibold text-mongo-navy">
              Migration Mode
            </h4>
            <p className="mt-1 text-xs text-mongo-text-secondary">
              Choose how to handle existing data in the target database.
            </p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => setMode("overwrite")}
                className={`flex-1 rounded-lg border-2 px-4 py-3 text-left transition-all ${
                  mode === "overwrite"
                    ? "border-mongo-dark-green bg-mongo-light-green/30"
                    : "border-mongo-border hover:border-mongo-dark-green/30"
                }`}
                tabIndex={0}
                aria-label="Overwrite mode"
              >
                <p className="text-sm font-medium text-mongo-navy">
                  Overwrite
                </p>
                <p className="mt-0.5 text-xs text-mongo-text-secondary">
                  Drop target collections and recreate
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMode("merge")}
                className={`flex-1 rounded-lg border-2 px-4 py-3 text-left transition-all ${
                  mode === "merge"
                    ? "border-mongo-dark-green bg-mongo-light-green/30"
                    : "border-mongo-border hover:border-mongo-dark-green/30"
                }`}
                tabIndex={0}
                aria-label="Merge mode"
              >
                <p className="text-sm font-medium text-mongo-navy">Merge</p>
                <p className="mt-0.5 text-xs text-mongo-text-secondary">
                  Insert new, skip duplicates
                </p>
              </button>
            </div>
          </div>
        </>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg border border-mongo-border px-4 py-2.5 text-sm font-medium text-mongo-navy transition-colors hover:bg-mongo-bg"
          tabIndex={0}
          aria-label="Go back to connection step"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <button
          type="button"
          onClick={() =>
            onNext(
              selectedCollections.map((c) => c.name),
              mode,
              sourceDb,
              targetDb
            )
          }
          disabled={selectedCollections.length === 0 || loading || !targetDb.trim()}
          className="flex items-center gap-2 rounded-lg bg-mongo-green px-6 py-3 text-sm font-semibold text-mongo-forest transition-all hover:bg-mongo-green/90 hover:shadow-lg hover:shadow-mongo-green/20 disabled:cursor-not-allowed disabled:opacity-40"
          tabIndex={0}
          aria-label="Start migration"
        >
          Start Migration
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default StepCollectionSelector;

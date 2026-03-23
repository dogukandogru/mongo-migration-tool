"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  RotateCcw,
  AlertTriangle,
  Database,
} from "lucide-react";
import type {
  CollectionMigrationResult,
  MigrationMode,
  MigrationProgress,
  MigrationStreamEvent,
} from "@/types";

interface StepMigrationProgressProps {
  sourceUri: string;
  targetUri: string;
  sourceDb: string;
  targetDb: string;
  collections: string[];
  mode: MigrationMode;
  onReset: () => void;
}

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat("en-US").format(num);
};

const CollectionStatusIcon = ({
  status,
}: {
  status: CollectionMigrationResult["status"];
}) => {
  if (status === "running") {
    return <Loader2 className="h-4 w-4 animate-spin text-mongo-dark-green" />;
  }
  if (status === "completed") {
    return <CheckCircle2 className="h-4 w-4 text-mongo-green" />;
  }
  if (status === "error") {
    return <XCircle className="h-4 w-4 text-red-500" />;
  }
  if (status === "skipped") {
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  }
  return <div className="h-4 w-4 rounded-full border-2 border-mongo-border" />;
};

const StepMigrationProgress = ({
  sourceUri,
  targetUri,
  sourceDb,
  targetDb,
  collections,
  mode,
  onReset,
}: StepMigrationProgressProps) => {
  const [progress, setProgress] = useState<MigrationProgress>({
    collectionsCompleted: 0,
    totalCollections: collections.length,
    totalDocumentsProcessed: 0,
    totalDocuments: 0,
    status: "running",
    startTime: Date.now(),
    collections: collections.map((name) => ({
      name,
      documentsProcessed: 0,
      totalDocuments: 0,
      status: "pending",
    })),
  });

  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 1000);

    const runMigration = async () => {
      try {
        const response = await fetch("/api/migrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceUri,
            targetUri,
            sourceDb,
            targetDb,
            collections,
            mode,
          }),
        });

        if (!response.ok || !response.body) {
          setProgress((prev) => ({
            ...prev,
            status: "error",
            error: "Failed to start migration",
            endTime: Date.now(),
          }));
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            try {
              const event: MigrationStreamEvent = JSON.parse(
                line.substring(6)
              );

              setProgress((prev) => ({
                ...prev,
                ...event.data,
                collections:
                  event.data.collections ?? prev.collections,
                endTime:
                  event.type === "done" || event.type === "error"
                    ? Date.now()
                    : undefined,
              }));

              if (event.type === "done" || event.type === "error") {
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                }
              }
            } catch {
              /* malformed SSE line */
            }
          }
        }
      } catch (err) {
        setProgress((prev) => ({
          ...prev,
          status: "error",
          error: err instanceof Error ? err.message : "Migration failed",
          endTime: Date.now(),
        }));
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };

    runMigration();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sourceUri, targetUri, sourceDb, targetDb, collections, mode]);

  const overallPercent =
    progress.totalDocuments > 0
      ? Math.round(
          (progress.totalDocumentsProcessed / progress.totalDocuments) * 100
        )
      : 0;

  const isDone = progress.status === "completed";
  const isError = progress.status === "error";
  const isRunning = progress.status === "running";

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-mongo-navy">
          {isDone
            ? "Migration Complete!"
            : isError
              ? "Migration Failed"
              : "Migrating Data..."}
        </h2>
        <p className="mt-1 text-sm text-mongo-text-secondary">
          {isDone
            ? "All selected collections have been successfully migrated."
            : isError
              ? progress.error ?? "An error occurred during migration."
              : "Please keep this page open while the migration is in progress."}
        </p>
      </div>

      <div className="rounded-xl border border-mongo-border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isDone && (
              <CheckCircle2 className="h-6 w-6 text-mongo-green" />
            )}
            {isError && <XCircle className="h-6 w-6 text-red-500" />}
            {isRunning && (
              <Loader2 className="h-6 w-6 animate-spin text-mongo-dark-green" />
            )}
            <span className="text-lg font-semibold text-mongo-navy">
              {overallPercent}%
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-mongo-text-secondary">
            <Clock className="h-4 w-4" />
            {formatDuration(progress.endTime ? progress.endTime - progress.startTime : elapsed)}
          </div>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-mongo-border">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isError
                ? "bg-red-500"
                : isDone
                  ? "bg-mongo-green"
                  : "bg-mongo-dark-green animate-progress-stripe"
            }`}
            style={{ width: `${overallPercent}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-mongo-text-secondary">
          <span>
            {formatNumber(progress.totalDocumentsProcessed)} /{" "}
            {formatNumber(progress.totalDocuments)} documents
          </span>
          <span>
            {progress.collectionsCompleted} / {progress.totalCollections}{" "}
            collections
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-mongo-border bg-white">
        <div className="border-b border-mongo-border px-4 py-3">
          <h4 className="text-sm font-semibold text-mongo-navy">
            Collection Progress
          </h4>
        </div>

        <div className="max-h-72 divide-y divide-mongo-border overflow-y-auto">
          {progress.collections.map((col) => {
            const colPercent =
              col.totalDocuments > 0
                ? Math.round(
                    (col.documentsProcessed / col.totalDocuments) * 100
                  )
                : 0;

            return (
              <div
                key={col.name}
                className={`flex items-center gap-4 px-4 py-3 transition-colors ${
                  col.status === "running"
                    ? "animate-slide-in bg-mongo-light-green/20"
                    : ""
                }`}
              >
                <CollectionStatusIcon status={col.status} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate font-mono text-sm text-mongo-navy">
                      {col.name}
                    </p>
                    <span className="ml-2 shrink-0 text-xs text-mongo-text-secondary">
                      {col.status === "running" || col.status === "completed"
                        ? `${formatNumber(col.documentsProcessed)} docs`
                        : col.status === "error"
                          ? "Error"
                          : "Pending"}
                    </span>
                  </div>

                  {(col.status === "running" || col.status === "completed") &&
                    col.totalDocuments > 0 && (
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-mongo-border">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            col.status === "completed"
                              ? "bg-mongo-green"
                              : "bg-mongo-dark-green"
                          }`}
                          style={{ width: `${colPercent}%` }}
                        />
                      </div>
                    )}

                  {col.error && (
                    <p className="mt-1 text-xs text-red-500">{col.error}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isDone && (
        <div className="animate-fade-in rounded-xl border border-mongo-green/30 bg-mongo-light-green/30 p-6">
          <div className="flex items-start gap-4">
            <Database className="mt-0.5 h-6 w-6 text-mongo-dark-green" />
            <div>
              <h4 className="font-semibold text-mongo-forest">
                Migration Summary
              </h4>
              <ul className="mt-2 space-y-1 text-sm text-mongo-dark-green">
                <li>
                  Collections migrated:{" "}
                  <strong>{progress.collectionsCompleted}</strong>
                </li>
                <li>
                  Total documents:{" "}
                  <strong>
                    {formatNumber(progress.totalDocumentsProcessed)}
                  </strong>
                </li>
                <li>
                  Duration:{" "}
                  <strong>
                    {formatDuration(
                      (progress.endTime ?? Date.now()) - progress.startTime
                    )}
                  </strong>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {(isDone || isError) && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-2 rounded-lg border border-mongo-border px-6 py-3 text-sm font-medium text-mongo-navy transition-colors hover:bg-mongo-bg"
            tabIndex={0}
            aria-label="Start a new migration"
          >
            <RotateCcw className="h-4 w-4" />
            Start New Migration
          </button>
        </div>
      )}
    </div>
  );
};

export default StepMigrationProgress;

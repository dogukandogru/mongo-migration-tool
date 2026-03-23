"use client";

import { useState, useCallback } from "react";
import Header from "@/components/Header";
import StepIndicator from "@/components/StepIndicator";
import StepConnectionForm from "@/components/StepConnectionForm";
import StepCollectionSelector from "@/components/StepCollectionSelector";
import StepMigrationProgress from "@/components/StepMigrationProgress";
import type {
  ConnectionState,
  MigrationMode,
  MigrationStep,
} from "@/types";

const DEFAULT_CONNECTION: ConnectionState = {
  connectionString: "",
  status: "idle",
};

const Home = () => {
  const [step, setStep] = useState<MigrationStep>("connect");
  const [source, setSource] = useState<ConnectionState>(DEFAULT_CONNECTION);
  const [target, setTarget] = useState<ConnectionState>(DEFAULT_CONNECTION);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [migrationMode, setMigrationMode] = useState<MigrationMode>("overwrite");
  const [sourceDbName, setSourceDbName] = useState("");
  const [targetDbName, setTargetDbName] = useState("");

  const validateSingle = async (
    connectionString: string,
    setter: React.Dispatch<React.SetStateAction<ConnectionState>>
  ) => {
    setter((prev) => ({ ...prev, status: "validating", error: undefined }));

    try {
      const response = await fetch("/api/validate-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionString }),
      });

      const data = await response.json();

      if (data.success) {
        setter((prev) => ({
          ...prev,
          status: "connected",
          databaseName: data.databaseName,
          databases: data.databases,
          error: undefined,
        }));
      } else {
        setter((prev) => ({
          ...prev,
          status: "error",
          error: data.error || "Connection failed",
        }));
      }
    } catch {
      setter((prev) => ({
        ...prev,
        status: "error",
        error: "Network error. Please try again.",
      }));
    }
  };

  const handleValidateBoth = useCallback(async () => {
    await Promise.all([
      validateSingle(source.connectionString, setSource),
      validateSingle(target.connectionString, setTarget),
    ]);
  }, [source.connectionString, target.connectionString]);

  const handleReset = useCallback(() => {
    setStep("connect");
    setSource(DEFAULT_CONNECTION);
    setTarget(DEFAULT_CONNECTION);
    setSelectedCollections([]);
    setMigrationMode("overwrite");
    setSourceDbName("");
    setTargetDbName("");
  }, []);

  const handleCollectionsNext = useCallback(
    (collections: string[], mode: MigrationMode, srcDb: string, tgtDb: string) => {
      setSelectedCollections(collections);
      setMigrationMode(mode);
      setSourceDbName(srcDb);
      setTargetDbName(tgtDb);
      setStep("migrate");
    },
    []
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <div className="mb-8 flex justify-center">
            <StepIndicator currentStep={step} />
          </div>

          {step === "connect" && (
            <StepConnectionForm
              source={source}
              target={target}
              onSourceChange={(value) =>
                setSource({
                  connectionString: value,
                  status: "idle",
                  error: undefined,
                })
              }
              onTargetChange={(value) =>
                setTarget({
                  connectionString: value,
                  status: "idle",
                  error: undefined,
                })
              }
              onValidateBoth={handleValidateBoth}
              onNext={() => setStep("select")}
            />
          )}

          {step === "select" && (
            <StepCollectionSelector
              sourceConnectionString={source.connectionString}
              sourceDatabases={source.databases ?? []}
              defaultSourceDb={source.databaseName ?? "test"}
              targetDatabases={target.databases ?? []}
              defaultTargetDb={source.databaseName ?? target.databaseName ?? "test"}
              onBack={() => setStep("connect")}
              onNext={handleCollectionsNext}
            />
          )}

          {step === "migrate" && (
            <StepMigrationProgress
              sourceUri={source.connectionString}
              targetUri={target.connectionString}
              sourceDb={sourceDbName}
              targetDb={targetDbName}
              collections={selectedCollections}
              mode={migrationMode}
              onReset={handleReset}
            />
          )}
        </div>
      </main>

      <footer className="border-t border-mongo-border bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-4 text-xs text-mongo-text-secondary">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>Open-source MongoDB migration tool</p>
            <p>Your credentials are never stored</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="inline-flex w-fit max-w-full flex-col gap-2 rounded-lg border border-teleminute-border bg-teleminute-bg p-3 transition-colors hover:border-teleminute-accent/60 sm:flex-row sm:items-start sm:gap-3">
              <p className="shrink-0 rounded-md bg-teleminute-surface px-2 py-1 text-[10px] font-medium leading-tight text-teleminute-muted ring-1 ring-teleminute-border">
                Also by{" "}
                <a
                  href="https://x.com/dogrubuilds"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-teleminute-accent hover:text-teleminute-accent-hover hover:underline focus:outline-none focus:ring-2 focus:ring-teleminute-accent/50 rounded-sm"
                  aria-label="dogru on X"
                  tabIndex={0}
                >
                  dogru
                </a>
              </p>
              <p className="leading-relaxed text-teleminute-text">
                <a
                  href="https://teleminute.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline text-left focus:outline-none focus:ring-2 focus:ring-teleminute-accent/40 rounded-sm"
                  aria-label="TeleMinute — visit teleminute.com"
                  tabIndex={0}
                >
                  <span className="font-semibold text-teleminute-accent group-hover:text-teleminute-accent-hover">
                    TeleMinute
                  </span>
                  <span className="text-teleminute-muted">
                    {" "}
                    — Create and deploy Telegram bots in minutes—no coding or
                    servers.{" "}
                  </span>
                  <span className="font-medium text-teleminute-accent group-hover:underline">
                    teleminute.com
                  </span>
                </a>
              </p>
            </div>

            <p className="shrink-0 text-mongo-text-secondary sm:ml-auto sm:text-right">
              Made by{" "}
              <a
                href="https://x.com/dogrubuilds"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-mongo-green-link underline-offset-2 transition-colors hover:text-mongo-dark-green hover:underline focus:outline-none focus:ring-2 focus:ring-mongo-green-link/40 focus:ring-offset-2 rounded-sm"
                aria-label="dogru on X"
                tabIndex={0}
              >
                dogru
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;

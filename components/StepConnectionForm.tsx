"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  Loader2,
  XCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import type { ConnectionState, ConnectionStatus } from "@/types";

interface StepConnectionFormProps {
  source: ConnectionState;
  target: ConnectionState;
  onSourceChange: (value: string) => void;
  onTargetChange: (value: string) => void;
  onValidateBoth: () => Promise<void>;
  onNext: () => void;
}

const StatusIcon = ({ status }: { status: ConnectionStatus }) => {
  if (status === "validating") {
    return <Loader2 className="h-5 w-5 animate-spin text-mongo-dark-green" />;
  }
  if (status === "connected") {
    return <CheckCircle2 className="h-5 w-5 text-mongo-green" />;
  }
  if (status === "error") {
    return <XCircle className="h-5 w-5 text-red-500" />;
  }
  return null;
};

const ConnectionCard = ({
  label,
  description,
  state,
  onChange,
}: {
  label: string;
  description: string;
  state: ConnectionState;
  onChange: (value: string) => void;
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const isValidating = state.status === "validating";
  const isConnected = state.status === "connected";

  return (
    <div
      className={`rounded-xl border-2 p-6 transition-all ${
        isConnected
          ? "border-mongo-green/50 bg-mongo-light-green/30"
          : state.status === "error"
            ? "border-red-200 bg-red-50/30"
            : "border-mongo-border bg-white"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-mongo-dark-green" />
          <div>
            <h3 className="text-sm font-semibold text-mongo-navy">{label}</h3>
            <p className="text-xs text-mongo-text-secondary">{description}</p>
          </div>
        </div>
        <StatusIcon status={state.status} />
      </div>

      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          placeholder="mongodb+srv://user:pass@cluster.mongodb.net/dbname"
          value={state.connectionString}
          onChange={(e) => onChange(e.target.value)}
          disabled={isValidating}
          className="w-full rounded-lg border border-mongo-border bg-mongo-bg px-4 py-3 pr-12 font-mono text-sm text-mongo-navy placeholder:text-mongo-text-secondary/50 focus:border-mongo-dark-green focus:outline-none focus:ring-2 focus:ring-mongo-green/20 disabled:opacity-60"
          aria-label={`${label} connection string`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-mongo-text-secondary hover:text-mongo-navy"
          aria-label={showPassword ? "Hide connection string" : "Show connection string"}
          tabIndex={0}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>

      {state.status === "error" && state.error && (
        <p className="mt-2 text-xs text-red-600">{state.error}</p>
      )}

      {isConnected && state.databaseName && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-mongo-light-green px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-mongo-dark-green" />
          <span className="text-xs font-medium text-mongo-forest">
            Connected &middot; {state.databases?.length ?? 0} database{(state.databases?.length ?? 0) !== 1 ? "s" : ""} found
          </span>
        </div>
      )}
    </div>
  );
};

const StepConnectionForm = ({
  source,
  target,
  onSourceChange,
  onTargetChange,
  onValidateBoth,
  onNext,
}: StepConnectionFormProps) => {
  const bothConnected =
    source.status === "connected" && target.status === "connected";
  const isValidating =
    source.status === "validating" || target.status === "validating";
  const hasEmptyFields =
    !source.connectionString.trim() || !target.connectionString.trim();

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-mongo-navy">
          Connect Your Databases
        </h2>
        <p className="mt-1 text-sm text-mongo-text-secondary">
          Provide the MongoDB connection strings for both the source and target
          databases. Your credentials are never stored.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ConnectionCard
          label="Source Database"
          description="Data will be copied from here"
          state={source}
          onChange={onSourceChange}
        />
        <ConnectionCard
          label="Target Database"
          description="Data will be copied to here"
          state={target}
          onChange={onTargetChange}
        />
      </div>

      <div className="flex justify-end">
        {bothConnected ? (
          <button
            type="button"
            onClick={onNext}
            className="animate-fade-in flex items-center gap-2 rounded-lg bg-mongo-green px-6 py-3 text-sm font-semibold text-mongo-forest transition-all hover:bg-mongo-green/90 hover:shadow-lg hover:shadow-mongo-green/20"
            tabIndex={0}
            aria-label="Continue to collection selection"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onValidateBoth}
            disabled={isValidating || hasEmptyFields}
            className="flex items-center gap-2 rounded-lg bg-mongo-forest px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-mongo-navy disabled:cursor-not-allowed disabled:opacity-40"
            tabIndex={0}
            aria-label="Validate both connections"
          >
            {isValidating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                Connect & Validate
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        )}
      </div>

      <div className="rounded-lg border border-mongo-border bg-white p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-mongo-text-secondary">
          Security Notice
        </h4>
        <p className="mt-1 text-xs leading-relaxed text-mongo-text-secondary">
          Connection strings are sent directly to the server for validation and
          migration only. They are never logged, stored, or cached. All
          operations happen in-memory during the session. We still recommend
          rotating your database user credentials after the migration is
          complete.
        </p>
      </div>
    </div>
  );
};

export default StepConnectionForm;

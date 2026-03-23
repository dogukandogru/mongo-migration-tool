"use client";

import { Check, Link, ListChecks, Play } from "lucide-react";
import type { MigrationStep } from "@/types";

interface StepIndicatorProps {
  currentStep: MigrationStep;
}

const STEPS: { key: MigrationStep; label: string; icon: typeof Link }[] = [
  { key: "connect", label: "Connect", icon: Link },
  { key: "select", label: "Select", icon: ListChecks },
  { key: "migrate", label: "Migrate", icon: Play },
];

const stepIndex = (step: MigrationStep) =>
  STEPS.findIndex((s) => s.key === step);

const StepIndicator = ({ currentStep }: StepIndicatorProps) => {
  const currentIdx = stepIndex(currentStep);

  return (
    <nav aria-label="Migration steps" className="flex items-center gap-2">
      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const Icon = isCompleted ? Check : step.icon;

        return (
          <div key={step.key} className="flex items-center gap-2">
            {idx > 0 && (
              <div
                className={`h-px w-8 sm:w-12 transition-colors ${
                  isCompleted ? "bg-mongo-green" : "bg-mongo-border"
                }`}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all ${
                  isCompleted
                    ? "bg-mongo-green text-mongo-forest"
                    : isCurrent
                      ? "bg-mongo-forest text-mongo-green ring-2 ring-mongo-green/30"
                      : "bg-mongo-border text-mongo-text-secondary"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span
                className={`hidden text-sm font-medium sm:inline ${
                  isCurrent
                    ? "text-mongo-navy"
                    : isCompleted
                      ? "text-mongo-dark-green"
                      : "text-mongo-text-secondary"
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </nav>
  );
};

export default StepIndicator;

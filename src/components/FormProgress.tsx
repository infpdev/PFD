import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  title: string;
  description?: string;
}

interface FormProgressProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
}

export const FormProgress: React.FC<FormProgressProps> = ({
  steps,
  currentStep,
  onStepClick,
}) => {
  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = onStepClick && index <= currentStep;

          return (
            <li key={step.id} className="relative flex-1">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "absolute left-[calc(50%+1rem)] right-[-50%] top-5 h-0.5 transition-colors duration-300",
                    isCompleted ? "bg-primary" : "bg-border"
                  )}
                  aria-hidden="true"
                />
              )}

              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(index)}
                disabled={!isClickable}
                className={cn(
                  "relative flex flex-col items-center group",
                  isClickable ? "cursor-pointer" : "cursor-default"
                )}
              >
                {/* Step circle */}
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary bg-primary/10 text-primary ring-4 ring-primary/20",
                    !isCompleted && !isCurrent && "border-border bg-background text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </span>

                {/* Step label */}
                <span
                  className={cn(
                    "mt-2 text-xs font-medium text-center max-w-[100px] transition-colors duration-200",
                    isCurrent && "text-primary",
                    isCompleted && "text-primary",
                    !isCompleted && !isCurrent && "text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

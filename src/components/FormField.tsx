import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AlertCircle, Info, Lock } from "lucide-react";

interface FormFieldProps {
  label: string;
  name: string;
  id?: string;
  type?: string;
  value: string | number;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  sensitive?: boolean;
  disabled?: boolean;
  className?: string;
  maxLength?: number;
  pattern?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  id,
  type = "text",
  value,
  onChange,
  error,
  required = false,
  placeholder,
  helpText,
  sensitive = false,
  disabled = false,
  className,
  maxLength,
  pattern,
}) => {
  const fieldId = id || name;
  return (
    <div className={cn("space-y-2", className)}>
      <Label
        htmlFor={fieldId}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
      >
        {label}
        {required && <span className="text-destructive">*</span>}
        {sensitive && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            <Lock className="h-3 w-3" />
            Sensitive
          </span>
        )}
      </Label>

      <Input
        id={fieldId}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        pattern={pattern}
        className={cn(
          "w-full",
          error && "border-destructive focus:ring-destructive/20",
        )}
      />

      {helpText && !error && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-pre-line">
          <Info className="h-3 w-3" />
          {helpText.replace(/\\n/g, "\n")}
        </p>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
};

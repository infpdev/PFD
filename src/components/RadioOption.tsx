import React, { useId } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface RadioOptionProps {
  label: string;
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  id?: string;
}

export const RadioOption: React.FC<RadioOptionProps> = ({
  label,
  name,
  value,
  checked,
  onChange,
  required = false,
  className,
  id,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(value);
  };

  return (
    <div
      role="radio"
      aria-checked={checked}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onChange(value);
        }
      }}
      className={cn(
        "flex sm:w-auto items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 select-none",
        checked 
          ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
          : "border-border bg-card hover:border-primary/30 hover:bg-muted/50",
        className
      )}
    >
      <div 
        className={cn(
          "h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors",
          checked ? "border-primary bg-primary" : "border-muted-foreground"
        )}
      >
        {checked && (
          <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
        )}
      </div>
      <span className={cn(
        "text-sm font-medium",
        checked ? "text-foreground" : "text-muted-foreground"
      )}>
        {label}
      </span>
    </div>
  );
};

interface RadioGroupProps {
  label: string;
  name: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  horizontal?: boolean;
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  name,
  options,
  value,
  onChange,
  required = false,
  error,
  horizontal = false,
  className,
}) => {
  const groupId = useId();
  
  return (
    <div className={cn("space-y-2 form-field-enter", className)} role="radiogroup" aria-labelledby={`${groupId}-label`}>
      <Label id={`${groupId}-label`} className="text-sm font-medium text-form-label">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      
      <div className={cn(
        "gap-2",
        horizontal ? "flex flex-wrap" : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2"
      )}>
        {options.map((option) => (
          <RadioOption
            key={option.value}
            id={`${groupId}-${option.value}`}
            label={option.label}
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={onChange}
            required={required}
          />
        ))}
      </div>
      
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
};

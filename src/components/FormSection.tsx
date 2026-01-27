import React from 'react';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

interface FormSectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  helpText?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  icon,
  children,
  className,
  helpText,
}) => {
  return (
    <section className={cn("animate-slide-up", className)}>

      <div className="flex items-center gap-3 mb-4 flex-row">
        {icon && (
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
        )}
        <div>
          <div className='flex flex-col'>
            <h3 className="text-lg font-semibold text-foreground font-serif whitespace-pre-line ">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground whitespace-pre-line">{description.replace(/\\n/g, "\n")}</p>
            )}
          </div>
        </div>
      </div>
      {helpText && (
        <p className=" flex items-center gap-1.5 text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
          <Info className="h-3 w-3" />
          {helpText.replace(/\\n/g, "\n")}
        </p>
      )}

      <div className="form-section">

        {children}
      </div>
    </section>
  );
};

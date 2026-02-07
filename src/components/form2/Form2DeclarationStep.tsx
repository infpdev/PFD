import React from "react";
import { FormField } from "@/components/FormField";
import { FormSection } from "@/components/FormSection";
import { FileCheck } from "lucide-react";
import type { DeclarationDetails } from "@/types/epf-forms";

interface Form2DeclarationStepProps {
  data: DeclarationDetails;
  onChange: (data: DeclarationDetails) => void;
  errors: Record<string, string>;
}

export const Form2DeclarationStep: React.FC<Form2DeclarationStepProps> = ({
  data,
  onChange,
  errors,
}) => {
  const handleChange = <K extends keyof DeclarationDetails>(
    field: K,
    value: DeclarationDetails[K],
  ) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <FormSection
      title="Declaration"
      description="Confirm your nomination"
      icon={<FileCheck className="h-5 w-5" />}
    >
      <div className="space-y-6">
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-sm text-muted-foreground">
            I hereby declare that the above particulars are correct and I
            authorize the employer to submit this nomination and declaration
            form to the EPFO on my behalf.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label="Place"
            name="form2_place"
            value={data.place}
            onChange={(v) => handleChange("place", v)}
            required
            placeholder="City/Town name"
            error={errors.form2_place}
          />

          <FormField
            label="Date"
            name="form2_date"
            type="date"
            value={data.date}
            onChange={(v) => handleChange("date", v)}
            required
            error={errors.form2_date}
          />
        </div>
      </div>
    </FormSection>
  );
};

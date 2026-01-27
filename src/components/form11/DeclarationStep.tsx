import React from "react";
import { FormField } from "@/components/FormField";
import { FormSection } from "@/components/FormSection";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { FileCheck, Check } from "lucide-react";
import type { DeclarationDetails } from "@/types/epf-forms";
import { Label } from "@/components/ui/label";

interface DeclarationStepProps {
  data: DeclarationDetails;
  onChange: (data: DeclarationDetails) => void;
  errors: Record<string, string>;
}

export const DeclarationStep: React.FC<DeclarationStepProps> = ({
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

  const undertakingPoints = [
    "Certified that the particulars are true to the best of my knowledge.",
    "I authorize EPFO to use my Aadhaar for verification / e-KYC purpose for service delivery.",
    "Kindly transfer the funds and service details, if applicable, from the previous PF account as declared above to the present PF Account. The Transfer would be possible only if the identified KYC details approved by previous employer has been verified by present employer.",
    "In case of changes in above details the same will be intimated to employer at the earliest.",
  ];

  return (
    <FormSection
      title="Declaration & Signature"
      description="Review the undertaking and provide your signature"
      icon={<FileCheck className="h-5 w-5" />}
    >
      <div className="space-y-6 ">
        {/* Undertaking */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <h4 className="font-semibold text-foreground mb-3">UNDERTAKING</h4>
          <ol className="space-y-2">
            {undertakingPoints.map((point, index) => (
              <li key={index} className="flex gap-3 text-sm">
                <span className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {index + 1}
                </span>
                <span className="text-muted-foreground">{point}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Declaration fields */}
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label="Place"
            name="place"
            value={data.place}
            onChange={(v) => handleChange("place", v)}
            required
            placeholder="City/Town name"
            error={errors.place}
          />

          <FormField
            label="Date"
            name="date"
            type="date"
            value={data.date}
            onChange={(v) => handleChange("date", v)}
            required
            error={errors.date}
          />
        </div>

        {/* Signature */}
        <div className=" space-y-2">
          <Label className="text-sm font-medium text-form-label">
            Signature of Member
            <span className="text-destructive ml-1">*</span>
          </Label>

          <SignatureCanvas
            onSignatureChange={(sig) => handleChange("signature_data", sig)}
            initialSignature={data.signature_data?.image}
            initialBbox={data.signature_data?.bbox}
          />

          {errors.signature_data && (
            <p className="text-xs text-destructive">{errors.signature_data}</p>
          )}
        </div>
      </div>
    </FormSection>
  );
};

import React, { useEffect } from "react";
import { FormField } from "@/components/FormField";
import { FormSection } from "@/components/FormSection";
import { RadioGroup } from "@/components/RadioOption";
import { Globe } from "lucide-react";
import type { InternationalWorkerDetails } from "@/types/epf-forms";

interface InternationalWorkerStepProps {
  data: InternationalWorkerDetails;
  onChange: (data: InternationalWorkerDetails) => void;
  errors: Record<string, string>;
}


const EMPTY_INTERNATIONAL_WORKER: InternationalWorkerDetails = {
  is_international_worker: false,
  country_of_origin: "",
  passport_no: "",
  passport_validity_from: null,
  passport_validity_to: null,
}

export const InternationalWorkerStep: React.FC<
  InternationalWorkerStepProps
> = ({ data, onChange, errors }) => {
  const handleChange = (
    field: keyof InternationalWorkerDetails,
    value: string | boolean,
  ) => {
    onChange({ ...data, [field]: value });
  };

  useEffect(() => {
    if (!data.is_international_worker) onChange(EMPTY_INTERNATIONAL_WORKER);
  }, [data]);

  return (
    <FormSection
      title="International Worker Details"
      description="Complete if you are an international worker"
      icon={<Globe className="h-5 w-5" />}
    >
      <div className="space-y-5">
        <RadioGroup
          label="Are you an International Worker?"
          name="is_international_worker"
          value={data.is_international_worker ? "yes" : "no"}
          onChange={(v) => handleChange("is_international_worker", v === "yes")}
          options={[
            { label: "Yes", value: "yes" },
            { label: "No", value: "no" },
          ]}
          required
          horizontal
        />

        {data.is_international_worker && (
          <div className="space-y-5 pt-2 animate-fade-in">
            <FormField
              label="Country of Origin"
              name="country_of_origin"
              value={data.country_of_origin || ""}
              onChange={(v) => handleChange("country_of_origin", v)}
              required
              placeholder="India or other country name"
              error={errors.country_of_origin}
            />

            <FormField
              label="Passport Number"
              name="passport_no"
              value={data.passport_no || ""}
              onChange={(v) => handleChange("passport_no", v.toUpperCase())}
              required
              placeholder="Enter passport number"
              maxLength={15}
              error={errors.passport_no}
              sensitive
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                label="Passport Validity From"
                name="passport_validity_from"
                type="date"
                value={data.passport_validity_from || ""}
                onChange={(v) => handleChange("passport_validity_from", v)}
                required
                error={errors.passport_validity_from}
              />

              <FormField
                label="Passport Validity To"
                name="passport_validity_to"
                type="date"
                value={data.passport_validity_to || ""}
                onChange={(v) => handleChange("passport_validity_to", v)}
                required
                error={errors.passport_validity_to}
              />
            </div>
          </div>
        )}
      </div>
    </FormSection>
  );
};

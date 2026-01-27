import React from "react";
import { FormField } from "@/components/FormField";
import { FormSection } from "@/components/FormSection";
import { RadioGroup } from "@/components/RadioOption";
import { Eye, User } from "lucide-react";
import type { DocumentUploads, PersonalDetails } from "@/types/epf-forms";
import { Button } from "../ui/button";

interface PersonalDetailsStepProps {
  data: PersonalDetails;
  onChange: (data: PersonalDetails) => void;
  errors: Record<string, string>;
  documents?: DocumentUploads;
  onPreviewDocument?: (type: "aadhaar" | "pan" | "passbook") => void;
}

export const PersonalDetailsStep: React.FC<PersonalDetailsStepProps> = ({
  data,
  onChange,
  errors,
  documents,
  onPreviewDocument,
}) => {
  const handleChange = (field: keyof PersonalDetails, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <FormSection
        title="Personal Information"
        helpText="Enter your personal details as shown in AADHAAR 
\n ಆಧಾರ್‌ನಲ್ಲಿ ತೋರಿಸಿರುವಂತೆ ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ವಿವರಗಳನ್ನು ನಮೂದಿಸಿ."
        icon={<User className="h-5 w-5" />}
      >
        <div className="space-y-5">
          <div className="space-y-2">
            {(documents?.aadhaar || documents?.pan || documents?.passbook) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {documents?.aadhaar && onPreviewDocument && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onPreviewDocument("aadhaar")}
                    className="h-7 text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Aadhaar
                  </Button>
                )}
              </div>
            )}
            <FormField
              label="Name of the Member"
              name="member_name"
              value={data.member_name}
              onChange={(v) => handleChange("member_name", v.toUpperCase())}
              required
              placeholder="Enter your full name as per Aadhaar"
              error={errors.member_name}
              helpText="Enter name as shown on Aadhaar card\n
            ಆಧರ್ ಕಾರ್ಡನಲ್ಲಿ ತೋರಿಸಿರುವಂತೆ ಹೆಸರನ್ನ ಬರೆಯಿರಿ."
            />
          </div>

          <FormField
            label="Date of Birth"
            name="date_of_birth"
            type="date"
            value={data.date_of_birth}
            onChange={(v) => handleChange("date_of_birth", v)}
            required
            error={errors.date_of_birth}
            helpText="DD/MM/YYYY format"
          />

          <RadioGroup
            label="Gender"
            name="gender"
            value={data.gender}
            onChange={(v) =>
              handleChange("gender", v as PersonalDetails["gender"])
            }
            options={[
              { label: "Male", value: "male" },
              { label: "Female", value: "female" },
              { label: "Transgender", value: "transgender" },
            ]}
            required
            error={errors.gender}
          />

          <RadioGroup
            label="Marital Status"
            name="marital_status"
            value={data.marital_status}
            onChange={(v) =>
              handleChange(
                "marital_status",
                v as PersonalDetails["marital_status"],
              )
            }
            options={[
              { label: "Unmarried", value: "unmarried" },
              { label: "Married", value: "married" },
              { label: "Widow", value: "widow" },
              { label: "Divorced", value: "divorced" },
            ]}
            required
            error={errors.marital_status}
          />

          <div className="space-y-3">
            <RadioGroup
              label="Relationship"
              name="parent_spouse_type"
              value={data.parent_spouse_type}
              onChange={(v) =>
                handleChange("parent_spouse_type", v as "Father" | "Husband")
              }
              options={[
                { label: "Father's Name", value: "Father" },
                { label: "Husband's Name", value: "Husband" },
              ]}
              required
              horizontal
            />

            <FormField
              label={
                data.parent_spouse_type === "Husband"
                  ? "Husband's Name"
                  : "Father's Name"
              }
              name="parent_spouse_name"
              value={data.parent_spouse_name}
              onChange={(v) =>
                handleChange("parent_spouse_name", v.toUpperCase())
              }
              required
              placeholder={`Enter ${data.parent_spouse_type === "Husband" ? "husband's" : "father's"} name`}
              error={errors.parent_spouse_name}
            />
          </div>
        </div>
      </FormSection>
    </div>
  );
};

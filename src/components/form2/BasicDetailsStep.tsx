import React from "react";
import { FormField } from "@/components/FormField";
import { FormSection } from "@/components/FormSection";
import { RadioGroup } from "@/components/RadioOption";
import { User, Eye } from "lucide-react";
import type { Form2Data, DocumentUploads } from "@/types/epf-forms";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface BasicDetailsStepProps {
  data: Pick<
    Form2Data,
    | "member_name"
    | "father_husband_name"
    | "date_of_birth"
    | "gender"
    | "employee_no"
    | "pf_account_no"
    | "marital_status"
    | "mobile_no"
    | "permanent_address"
  >;
  onChange: (data: Partial<Form2Data>) => void;
  onMaritalStatusChange?: (status: string) => void;
  errors: Record<string, string>;
  documents?: DocumentUploads;
  onPreviewDocument?: (type: "aadhaar" | "pan" | "passbook") => void;
}

export const BasicDetailsStep: React.FC<BasicDetailsStepProps> = ({
  data,
  onChange,
  onMaritalStatusChange,
  errors,
  documents,
  onPreviewDocument,
}) => {

  const handleChange = (field: string, value: string) => {
    onChange({ [field]: value });
    if (field === "marital_status" && onMaritalStatusChange) {
      onMaritalStatusChange(value);
    }
  };

  return (
    <FormSection
      title="Basic Information"
      description="Employee details for nomination form"
      icon={<User className="h-5 w-5" />}
    >
      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <FormField
              label="Name as per AADHAAR"
              name="member_name"
              id="form2_member_name"
              value={data.member_name}
              onChange={(v) => handleChange("member_name", v.toUpperCase())}
              required
              placeholder="FULL NAME AS PER AADHAAR"
              error={errors.form2_member_name}
            />
            {/* Document preview buttons */}
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
                {documents?.pan && onPreviewDocument && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onPreviewDocument("pan")}
                    className="h-7 text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    PAN
                  </Button>
                )}
                {documents?.passbook && onPreviewDocument && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onPreviewDocument("passbook")}
                    className="h-7 text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Passbook
                  </Button>
                )}
              </div>
            )}
          </div>

          <FormField
            label="Father's / Husband's Name (As per AADHAAR)"
            name="father_husband_name"
            id="form2_father_husband_name"
            value={data.father_husband_name}
            onChange={(v) =>
              handleChange("father_husband_name", v.toUpperCase())
            }
            required
            placeholder="Enter name"
            error={errors.form2_father_husband_name}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <FormField
            label="Date of Birth"
            name="date_of_birth"
            id="form2_date_of_birth"
            type="date"
            value={data.date_of_birth}
            onChange={(v) => handleChange("date_of_birth", v)}
            required
            error={errors.form2_date_of_birth}
          />

          <FormField
            label="Employee No."
            name="employee_no"
            id="form2_employee_no"
            value={data.employee_no || ""}
            onChange={(v) => handleChange("employee_no", v)}
            maxLength={8}
            placeholder="If assigned"
            error={errors.form2_employee_no}
          />

          <FormField
            label="P.F. Account No."
            name="pf_account_no"
            id="form2_pf_account_no"
            value={data.pf_account_no || ""}
            onChange={(v) => handleChange("pf_account_no", v)}
            placeholder="If assigned"
          />

          <FormField
            label="Mobile No."
            name="mobile_no"
            id="form2_mobile_no"
            type="tel"
            value={data.mobile_no}
            onChange={(v) => handleChange("mobile_no", v)}
            required
            placeholder="10-digit"
            maxLength={10}
            error={errors.form2_mobile_no}
          />
        </div>

        <RadioGroup
          label="Gender"
          name="gender"
          value={data.gender}
          onChange={(v) => handleChange("gender", v)}
          options={[
            { label: "Male", value: "male" },
            { label: "Female", value: "female" },
            { label: "Transgender", value: "transgender" },
          ]}
          required
        />

        <RadioGroup
          label="Marital Status"
          name="marital_status"
          value={data.marital_status}
          onChange={(v) => handleChange("marital_status", v)}
          options={[
            { label: "Unmarried", value: "unmarried" },
            { label: "Married", value: "married" },
            { label: "Widow", value: "widow" },
            { label: "Divorced", value: "divorced" },
          ]}
          required
        />

        <div className="space-y-2">
          <Label className="text-sm font-medium text-form-label">
            Permanent / Temporary Address
            <span className="text-destructive ml-1">*</span>
          </Label>
          <Textarea
            id="form2_permanent_address"
            value={data.permanent_address}
            onChange={(e) => handleChange("permanent_address", e.target.value)}
            placeholder="Enter complete address with PIN code"
            rows={3}
            className="resize-none"
          />
          {errors.form2_permanent_address && (
            <p className="text-xs text-destructive">
              {errors.form2_permanent_address}
            </p>
          )}
        </div>
      </div>
    </FormSection>
  );
};

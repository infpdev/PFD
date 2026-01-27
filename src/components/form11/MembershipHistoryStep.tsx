import React, { useEffect } from "react";
import { FormField } from "@/components/FormField";
import { FormSection } from "@/components/FormSection";
import { RadioGroup } from "@/components/RadioOption";
import { History, Building2 } from "lucide-react";
import type { PreviousEmploymentDetails } from "@/types/epf-forms";

interface MembershipHistoryStepProps {
  wasEpfMember: boolean;
  wasEpsMember: boolean;
  previousEmployment: PreviousEmploymentDetails;
  onMembershipChange: (
    field: "was_epf_member" | "was_eps_member",
    value: boolean,
  ) => void;
  onPreviousEmploymentChange: (data: PreviousEmploymentDetails) => void;
  errors: Record<string, string>;
}

const EMPTY_PREVIOUS_EMPLOYMENT: PreviousEmploymentDetails = {
  uan: "",
  previous_pf_account_no: "",
  exit_date: "",
  scheme_certificate_no: "",
  ppo_no: "",
};


export const MembershipHistoryStep: React.FC<MembershipHistoryStepProps> = ({
  wasEpfMember,
  wasEpsMember,
  previousEmployment,
  onMembershipChange,
  onPreviousEmploymentChange,
  errors,
}) => {
  const showPreviousDetails = wasEpfMember || wasEpsMember;

  const handlePreviousChange = (
    field: keyof PreviousEmploymentDetails,
    value: string,
  ) => {
    onPreviousEmploymentChange({ ...previousEmployment, [field]: value });
  };

  useEffect(() => {
    if (!showPreviousDetails) onPreviousEmploymentChange(EMPTY_PREVIOUS_EMPLOYMENT);
  }, [showPreviousDetails]);

  return (
    <div className="space-y-6">
      <FormSection
        title="EPF/EPS Membership History"
        description="Information about your previous provident fund membership"
        helpText="Enter details only if you have worked as an employee before\n
        ನೀವು ಈ ಹಿಂದೆ ಉದ್ಯೋಗಿಯಾಗಿ ಕೆಲಸ ಮಾಡಿದ್ದರೆ ಮಾತ್ರ ವಿವರಗಳನ್ನು ತುಂಬಿ."
        icon={<History className="h-5 w-5" />}
      >
        <div className="space-y-5">
          <RadioGroup
            label="Were you earlier a member of Employees Provident Fund Scheme 1952?"
            name="was_epf_member"
            value={wasEpfMember ? "yes" : "no"}
            onChange={(v) => onMembershipChange("was_epf_member", v === "yes")}
            options={[
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
            ]}
            required
            horizontal
          />

          <RadioGroup
            label="Were you earlier a member of Employees Pension Scheme 1995?"
            name="was_eps_member"
            value={wasEpsMember ? "yes" : "no"}
            onChange={(v) => onMembershipChange("was_eps_member", v === "yes")}
            options={[
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
            ]}
            required
            horizontal
          />
        </div>
      </FormSection>

      {showPreviousDetails && (
        <FormSection
          title="Previous Employment Details"
          description="Mandatory if you were earlier a member of EPF/EPS"
          helpText="If you have worked as an employee, enter your UAN\n
          ನೀವು ಉದ್ಯೋಗಿಯಾಗಿ ಕೆಲಸ ಮಾಡಿದ್ದರೆ, ನಿಮ್ಮ UAN ಅನ್ನು ತುಂಬಿ."
          icon={<Building2 className="h-5 w-5" />}
        >
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                label="Universal Account Number (UAN)"
                name="uan"
                value={previousEmployment.uan}
                onChange={(v) => handlePreviousChange("uan", v)}
                required
                placeholder="12-digit UAN"
                error={errors.uan}
                maxLength={12}
                sensitive
              />

              <FormField
                label="Previous PF Account Number"
                name="previous_pf_account_no"
                value={previousEmployment.previous_pf_account_no}
                onChange={(v) =>
                  handlePreviousChange(
                    "previous_pf_account_no",
                    v.toUpperCase(),
                  )
                }
                required
                placeholder="e.g., MH/BOM/12345/123"
                error={errors.previous_pf_account_no}
              />
            </div>

            <FormField
              label="Date of Exit from Previous Employment"
              name="exit_date"
              type="date"
              value={previousEmployment.exit_date}
              onChange={(v) => handlePreviousChange("exit_date", v)}
              required
              error={errors.exit_date}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                label="Scheme Certificate Number"
                name="scheme_certificate_no"
                value={previousEmployment.scheme_certificate_no || ""}
                onChange={(v) =>
                  handlePreviousChange("scheme_certificate_no", v)
                }
                placeholder="If issued"
                helpText="Enter if scheme certificate was issued"
              />

              <FormField
                label="Pension Payment Order (PPO) Number"
                name="ppo_no"
                value={previousEmployment.ppo_no || ""}
                onChange={(v) => handlePreviousChange("ppo_no", v)}
                placeholder="If issued"
                helpText="Enter if PPO was issued"
              />
            </div>
          </div>
        </FormSection>
      )}
    </div>
  );
};

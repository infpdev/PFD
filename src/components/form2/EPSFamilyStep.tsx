import React from "react";
import { FormField } from "@/components/FormField";
import { FormSection } from "@/components/FormSection";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Heart, Plus, Trash2 } from "lucide-react";
import type { EPSFamilyMember, PensionNominee } from "@/types/epf-forms";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EPSFamilyStepProps {
  familyMembers: EPSFamilyMember[];
  hasNoFamily: boolean;
  pensionNominee?: PensionNominee;
  onFamilyMembersChange: (members: EPSFamilyMember[]) => void;
  onHasNoFamilyChange: (value: boolean) => void;
  onPensionNomineeChange: (nominee: PensionNominee | undefined) => void;
  errors: Record<string, string>;
  maritalStatus: string;
  gender: string;
}

const createEmptyFamilyMember = (): EPSFamilyMember => ({
  id: crypto.randomUUID(),
  name: "",
  address: "",
  date_of_birth: "",
  relationship: "",
  other_relationship: "",
});

export const EPSFamilyStep: React.FC<EPSFamilyStepProps> = ({
  familyMembers,
  pensionNominee,
  onFamilyMembersChange,
  onPensionNomineeChange,
  errors,
  maritalStatus,
  gender,
}) => {
  // Get relationship options based on marital status and gender
  const getRelationshipOptions = () => {
    const baseOptions = [
      { value: 'Father', label: 'Father' },
      { value: 'Mother', label: 'Mother' },
    ];

    if (maritalStatus === 'married' || maritalStatus === 'widow') {
      if (gender === 'female') {
        baseOptions.push({ value: 'husband', label: 'Husband' });
      } else {
        baseOptions.push({ value: 'wife', label: 'Wife' });
      }
    }

    baseOptions.push({ value: 'other', label: 'Other' });
    return baseOptions;
  };

  const relationshipOptions = getRelationshipOptions();
  const addFamilyMember = () => {
    onFamilyMembersChange([...familyMembers, createEmptyFamilyMember()]);
  };

  const removeFamilyMember = (id: string) => {
    onFamilyMembersChange(familyMembers.filter((m) => m.id !== id));
  };

  const updateFamilyMember = (
    id: string,
    field: keyof EPSFamilyMember,
    value: string
  ) => {
    onFamilyMembersChange(
      familyMembers.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const updatePensionNominee = (field: keyof PensionNominee, value: string) => {
    onPensionNomineeChange({
      ...(pensionNominee || {
        name: "",
        address: "",
        date_of_birth: "",
        relationship: "",
      }),
      [field]: value,
    });
  };

  // Determine which sections are required based on marital status
  const isMarriedOrWidow =
    maritalStatus === "married" || maritalStatus === "widow";
  const epsFamilyRequired = isMarriedOrWidow;
  const pensionNomineeRequired = !isMarriedOrWidow;

  // Error focus scroll for family members
  React.useEffect(() => {
    const firstErrorKey = Object.keys(errors).find(key => key.startsWith('family_'));
    if (firstErrorKey) {
      const match = firstErrorKey.match(/family_\w+_(\d+)/);
      if (match) {
        const index = parseInt(match[1], 10);
        const member = familyMembers[index];
        if (member) {
          const el = document.querySelector(`[name="family_name_${member.id}"]`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (el as HTMLInputElement)?.focus();
        }
      }
    }
  }, [errors, familyMembers]);

  return (
    <div className="space-y-6">
      {isMarriedOrWidow && (
        <FormSection
          title="Part B - EPS Family Details"
          description="Family members eligible for Widow/Widower/Children Pension"
          helpText="If you are married or a widow / widower, enter the details\n
          ನೀವು ವಿವಾಹಿತರಾಗಿದ್ದರೆ ಅಥವಾ ವಿಧವೆ / ವಿಧುರರಾಗಿದ್ದರೆ, ವಿವರಗಳನ್ನು ತುಂಬಿ"
          icon={<Heart className="h-5 w-5" />}
        >
          <div className="space-y-6">
            {/* Family members list */}
            {familyMembers.map((member, index) => (
              <div
                key={member.id}
                className="p-4 rounded-lg border border-border bg-background space-y-4 animate-fade-in"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-foreground">
                    Family Member {index + 1}
                  </h4>
                  {familyMembers.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFamilyMember(member.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="Name"
                    name={`family_name_${member.id}`}
                    value={member.name}
                    onChange={(v) => updateFamilyMember(member.id, "name", v.toUpperCase())}
                    placeholder="Full name"
                    required={epsFamilyRequired}
                    error={errors[`family_name_${index}`]}
                  />

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-form-label">
                      Relationship with Member {epsFamilyRequired && <span className="text-destructive">*</span>}
                    </Label>
                    <Select
                      value={member.relationship}
                      onValueChange={(v) => {
                        onFamilyMembersChange(
                          familyMembers.map((m) => (m.id === member.id ? { ...m, relationship: v, other_relationship: v === "other" ? member.other_relationship : '' } : m))
                        );
                      }}
                    >
                      <SelectTrigger className={errors[`family_rel_${index}`] ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        {relationshipOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors[`family_rel_${index}`] && (
                      <p className="text-sm text-destructive">{errors[`family_rel_${index}`]}</p>
                    )}
                  </div>
                </div>

                {/* Show text input when "other" is selected */}
                {member.relationship === 'other' && (
                  <FormField
                    label="Specify Relationship"
                    name={`family_other_rel_${member.id}`}
                    value={member.other_relationship || ''}
                    onChange={(v) => updateFamilyMember(member.id, 'other_relationship', v)}
                    required={epsFamilyRequired}
                    placeholder="e.g., Son, Daughter, Brother"
                    error={errors[`family_other_rel_${index}`]}
                  />
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="Date of Birth"
                    name={`family_dob_${member.id}`}
                    type="date"
                    value={member.date_of_birth}
                    onChange={(v) =>
                      updateFamilyMember(member.id, "date_of_birth", v)
                    }
                    required={epsFamilyRequired}
                    error={errors[`family_dob_${index}`]}
                  />

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-form-label">
                      Address
                    </Label>
                    <Textarea
                      value={member.address}
                      onChange={(e) =>
                        updateFamilyMember(member.id, "address", e.target.value)
                      }
                      placeholder="Complete address"
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Add family member button */}
            <Button
              type="button"
              variant="formOutline"
              onClick={addFamilyMember}
              className="w-full"
            >
              <Plus className="h-4 w-4" />
              Add Family Member
            </Button>


          </div>
        </FormSection>
      )}

      {/* No family certification - info only (read-only text) */}
      {isMarriedOrWidow && (
        <div className="py-4 border-t border-b border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            *Certified that I have no family as defined in para 2 (vii) of the
            Employees' Pension Scheme, 1995 and should I acquire a family
            hereafter shall furnish particulars thereon in the above form.
          </p>
        </div>
      )}


      {/* Pension Nominee - visible for unmarried/divorced, optional for married/widow */}
      <FormSection
        title={`Pension Nominee ${pensionNomineeRequired ? " (Required)" : " (Optional)"}`}
        description="Nominate a person to receive pension in the event of your death"
        helpText="Details of the person who will receive the pension in the event of your death\n
        ನಿಮ್ಮ ಮರಣದ ಸಂದರ್ಭದಲ್ಲಿ ಪಿಂಚಣಿ ಪಡೆಯಲು ವ್ಯಕ್ತಿಯನ್ನು ನಾಮನಿರ್ದೇಶನ ಮಾಡಿ."
        icon={<Heart className="h-5 w-5" />}
      >
        <div className="space-y-4">
          {/* <p className="text-sm text-muted-foreground">
            Nominate a person for receiving the monthly pension in the event of your death. 
          </p> */}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Nominee Name"
              name="pension_nominee_name"
              value={pensionNominee?.name || ""}
              onChange={(v) => updatePensionNominee("name", v.toUpperCase())}
              placeholder="Full name"
              required={pensionNomineeRequired}
              error={errors.pension_nominee_name}
            />

            <div className="space-y-2">
              <Label className="text-sm font-medium text-form-label">
                Relationship {pensionNomineeRequired && <span className="text-destructive">*</span>}
              </Label>
              <Select
                value={pensionNominee?.relationship || ""}
                onValueChange={(v) => {
                  onPensionNomineeChange(({

                    ...(pensionNominee),
                    relationship: v,
                    other_relationship: v === 'other' ? pensionNominee.other_relationship : '',
                  }));
                }}
              >
                <SelectTrigger className={errors.pension_nominee_rel ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {relationshipOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.pension_nominee_rel && (
                <p className="text-sm text-destructive">{errors.pension_nominee_rel}</p>
              )}
            </div>
          </div>

          {/* Show text input when "other" is selected for pension nominee */}
          {pensionNominee?.relationship === 'other' && (
            <FormField
              label="Specify Relationship"
              name="pension_nominee_other_rel"
              value={pensionNominee?.other_relationship || ''}
              onChange={(v) => updatePensionNominee('other_relationship', v)}
              required={pensionNomineeRequired}
              placeholder="e.g., Son, Daughter, Brother"
              error={errors.pension_nominee_other_rel}
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Date of Birth"
              name="pension_nominee_dob"
              type="date"
              value={pensionNominee?.date_of_birth || ""}
              onChange={(v) => updatePensionNominee("date_of_birth", v)}
              required={pensionNomineeRequired}
              error={errors.pension_nominee_dob}
            />

            <div className="space-y-2">
              <Label className="text-sm font-medium text-form-label">
                Address
                {pensionNomineeRequired && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </Label>
              <Textarea
                value={pensionNominee?.address || ""}
                name="pension_nominee_address"
                onChange={(e) =>
                  updatePensionNominee("address", e.target.value)
                }
                placeholder="Complete address"
                rows={2}
                className="resize-none"
              />
              {errors.pension_nominee_address && (
                <p className="text-sm text-destructive">
                  {errors.pension_nominee_address}
                </p>
              )}
            </div>
          </div>
        </div>
      </FormSection >
    </div >
  );
};

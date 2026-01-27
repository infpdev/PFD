import React from 'react';
import { FormField } from '@/components/FormField';
import { FormSection } from '@/components/FormSection';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Users, Plus, Trash2 } from 'lucide-react';
import type { EPFNominee } from '@/types/epf-forms';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EPFNomineeStepProps {
  nominees: EPFNominee[];
  hasNoFamily: boolean;
  dependentParents: boolean;
  onNomineesChange: (nominees: EPFNominee[]) => void;
  onHasNoFamilyChange: (value: boolean) => void;
  onDependentParentsChange: (value: boolean) => void;
  errors: Record<string, string>;
  maritalStatus: string;
  gender: string;
}

const createEmptyNominee = (): EPFNominee => ({
  id: crypto.randomUUID(),
  name: '',
  address: '',
  relationship: '',
  date_of_birth: '',
  share_percentage: 0,
  is_minor: false,
  other_relationship: '',
});

export const EPFNomineeStep: React.FC<EPFNomineeStepProps> = ({
  nominees,
  onNomineesChange,
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
  const addNominee = () => {
    onNomineesChange([...nominees, createEmptyNominee()]);
  };

  const removeNominee = (id: string) => {
    onNomineesChange(nominees.filter((n) => n.id !== id));
  };

  const updateNominee = (id: string, field: keyof EPFNominee, value: unknown) => {
    if (field === 'share_percentage') {
      // Calculate remaining share excluding current nominee
      const otherNomineesShare = nominees
        .filter((n) => n.id !== id)
        .reduce((sum, n) => sum + (n.share_percentage || 0), 0);
      const maxShare = 100 - otherNomineesShare;
      const cappedValue = Math.min(Math.max(0, Number(value)), maxShare);
      onNomineesChange(
        nominees.map((n) => (n.id === id ? { ...n, [field]: cappedValue } : n))
      );
    } else {
      onNomineesChange(
        nominees.map((n) => (n.id === id ? { ...n, [field]: value } : n))
      );
    }
  };

  const totalShare = nominees.reduce((sum, n) => sum + (n.share_percentage || 0), 0);

  // Error focus scroll
  React.useEffect(() => {
    const firstErrorKey = Object.keys(errors).find(key => key.startsWith('nominee_'));
    if (firstErrorKey) {
      const match = firstErrorKey.match(/nominee_\w+_(\d+)/);
      if (match) {
        const index = parseInt(match[1], 10);
        const nominee = nominees[index];
        if (nominee) {
          const el = document.querySelector(`[name="nominee_name_${index}"]`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (el as HTMLInputElement)?.focus();
        }
      }
    }
  }, [errors, nominees]);

  return (
    <FormSection
      title="Part A - EPF Nomination"
      description="Nominate person(s) to receive your EPF accumulations in the event of death"
      icon={<Users className="h-5 w-5" />}
    >
      <div className="space-y-6">
        {/* Nominees list */}
        {nominees.map((nominee, index) => (
          <div
            key={nominee.id}
            className="p-4 rounded-lg border border-border bg-background space-y-4 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">Nominee {index + 1}</h4>
              {nominees.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeNominee(nominee.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Name of Nominee"
                name={`nominee_name_${index}`}
                value={nominee.name}
                onChange={(v) => updateNominee(nominee.id, 'name', v.toUpperCase())}
                required
                placeholder="Full name"
                error={errors[`nominee_name_${index}`]}
              />

              <div className="space-y-2">
                <Label className="text-sm font-medium text-form-label">
                  Relationship with Member <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={nominee.relationship}
                  onValueChange={(v) => {
                    onNomineesChange(
                      nominees.map((n) =>
                        n.id === nominee.id
                          ? {
                            ...n,
                            relationship: v,
                            other_relationship: v === 'other' ? n.other_relationship : '',
                          }
                          : n
                      )
                    );
                  }}

                >
                  <SelectTrigger className={errors[`nominee_rel_${index}`] ? 'border-destructive' : ''}>
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
                {errors[`nominee_rel_${index}`] && (
                  <p className="text-sm text-destructive">{errors[`nominee_rel_${index}`]}</p>
                )}
              </div>
            </div>

            {/* Show text input when "other" is selected */}
            {nominee.relationship === 'other' && (
              <FormField
                label="Specify Relationship"
                name={`nominee_other_rel_${index}`}
                value={nominee.other_relationship || ''}
                onChange={(v) => updateNominee(nominee.id, 'other_relationship', v)}
                required
                placeholder="e.g., Son, Daughter, Brother"
                error={errors[`nominee_other_rel_${index}`]}
              />
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Date of Birth"
                name={`nominee_dob_${index}`}
                type="date"
                value={nominee.date_of_birth}
                onChange={(v) => updateNominee(nominee.id, 'date_of_birth', v)}
                required
                error={errors[`nominee_dob_${index}`]}
              />

              {(() => {
                const otherShare = nominees
                  .filter((n) => n.id !== nominee.id)
                  .reduce((sum, n) => sum + (n.share_percentage || 0), 0);
                const maxShare = 100 - otherShare;
                return (
                  <FormField
                    label={`Share Percentage (%) - Max: ${maxShare}%`}
                    name={`nominee_share_${index}`}
                    type="number"
                    value={nominee.share_percentage}
                    onChange={(v) => updateNominee(nominee.id, 'share_percentage', Number(v))}
                    required
                    placeholder={`0-${maxShare}`}
                    error={errors[`nominee_share_${index}`]}
                  />
                );
              })()}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-form-label">Address</Label>
              <Textarea
                value={nominee.address}
                onChange={(e) => updateNominee(nominee.id, 'address', e.target.value)}
                placeholder="Complete address"
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Minor nominee checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id={`is_minor_${nominee.id}`}
                checked={nominee.is_minor}
                onCheckedChange={(checked) => updateNominee(nominee.id, 'is_minor', checked)}
              />
              <Label htmlFor={`is_minor_${nominee.id}`} className="text-sm cursor-pointer">
                Nominee is a minor
              </Label>
            </div>

            {/* Guardian details for minor */}
            {nominee.is_minor && (
              <div className="pt-4 space-y-4 border-t border-border animate-fade-in">
                <h5 className="text-sm font-medium text-muted-foreground">Guardian Details</h5>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="Guardian Name"
                    name={`guardian_name_${nominee.id}`}
                    value={nominee.guardian_name || ''}
                    onChange={(v) => updateNominee(nominee.id, 'guardian_name', v.toUpperCase())}
                    required
                    placeholder="Full name"
                  />

                  <FormField
                    label="Guardian Relationship"
                    name={`guardian_relationship_${nominee.id}`}
                    value={nominee.guardian_relationship || ''}
                    onChange={(v) => updateNominee(nominee.id, 'guardian_relationship', v)}
                    required
                    placeholder="e.g., Mother, Uncle"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-form-label">Guardian Address</Label>
                  <Textarea
                    value={nominee.guardian_address || ''}
                    onChange={(e) => updateNominee(nominee.id, 'guardian_address', e.target.value)}
                    placeholder="Complete address"
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add nominee button */}
        <Button
          type="button"
          variant="formOutline"
          title='Add one more nominee'
          disabled={nominees.length > 1}
          onClick={addNominee}
          className="w-full"
        >
          <Plus className="h-4 w-4" />
          Add Another Nominee
        </Button>

        {/* Share percentage indicator */}
        <div className={`p-3 rounded-lg ${totalShare === 100 ? 'bg-success/10 border border-success/30' : 'bg-warning/10 border border-warning/30'}`}>
          <p className="text-sm">
            <span className="font-medium">Total Share:</span>{' '}
            <span className={totalShare === 100 ? 'text-success' : 'text-warning'}>
              {totalShare}%
            </span>
            {totalShare !== 100 && (
              <span className="text-muted-foreground ml-2">(Must equal 100%)</span>
            )}
          </p>
        </div>

        {/* Certifications - info only (read-only text) */}
        
      </div>
      
    </FormSection>
    
  );
};

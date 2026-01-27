import React from 'react';
import { FormField } from '@/components/FormField';
import { FormSection } from '@/components/FormSection';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import type { KYCDetails } from '@/types/epf-forms';

interface KYCDetailsStepProps {
  data: KYCDetails;
  onChange: (data: KYCDetails) => void;
  errors: Record<string, string>;
}

export const KYCDetailsStep: React.FC<KYCDetailsStepProps> = ({
  data,
  onChange,
  errors,
}) => {
  const handleChange = (field: keyof KYCDetails, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <FormSection
      title="KYC Details"
      description="Bank account and identity verification documents"
      icon={<ShieldCheck className="h-5 w-5" />}
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Important</p>
            <p className="text-muted-foreground">
              Attach self-attested copies of the following KYC documents along with this form.
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label="Bank Account Number"
            name="bank_account_no"
            value={data.bank_account_no}
            onChange={(v) => handleChange('bank_account_no', v)}
            required
            placeholder="Enter bank account number"
            error={errors.bank_account_no}
            sensitive
          />

          <FormField
            label="IFSC Code"
            name="ifsc_code"
            value={data.ifsc_code}
            onChange={(v) => handleChange('ifsc_code', v.toUpperCase())}
            required
            placeholder="e.g., SBIN0001234"
            error={errors.ifsc_code}
            maxLength={11}
          />
        </div>

        <FormField
          label="Aadhaar Number"
          name="aadhaar_no"
          value={data.aadhaar_no}
          onChange={(v) => handleChange('aadhaar_no', v.replace(/\D/g, ''))}
          required
          placeholder="12-digit Aadhaar number"
          error={errors.aadhaar_no}
          maxLength={12}
          sensitive
          helpText="Will be used for e-KYC verification"
        />

        <FormField
          label="Permanent Account Number (PAN)"
          name="pan_no"
          value={data.pan_no || ''}
          onChange={(v) => handleChange('pan_no', v.toUpperCase())}
          placeholder="If available (e.g., ABCDE1234F)"
          error={errors.pan_no}
          maxLength={10}
          sensitive
        />
      </div>
    </FormSection>
  );
};

import React from 'react';
import { FormField } from '@/components/FormField';
import { FormSection } from '@/components/FormSection';
import { Mail } from 'lucide-react';
import type { ContactDetails } from '@/types/epf-forms';

interface ContactDetailsStepProps {
  data: ContactDetails;
  onChange: (data: ContactDetails) => void;
  errors: Record<string, string>;
}

export const ContactDetailsStep: React.FC<ContactDetailsStepProps> = ({
  data,
  onChange,
  errors,
}) => {
  const handleChange = (field: keyof ContactDetails, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <FormSection
      title="Contact Details"
      description="Your email and mobile number for official communication"
      icon={<Mail className="h-5 w-5" />}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Email ID"
          name="email"
          type="email"
          value={data.email}
          onChange={(v) => handleChange('email', v)}
          required
          placeholder="your.email@example.com"
          error={errors.email}
          helpText="Will be used for EPF-related communications"
        />

        <FormField
          label="Mobile Number"
          name="mobile_no"
          type="tel"
          value={data.mobile_no}
          onChange={(v) => handleChange('mobile_no', v)}
          required
          placeholder="10-digit mobile number"
          error={errors.mobile_no}
          maxLength={10}
          pattern="[0-9]{10}"
          helpText="Number linked with Aadhaar for OTP verification\n
          OTP ಪರಿಶೀಲನೆಗಾಗಿ ಆಧಾರ್‌ನೊಂದಿಗೆ ಲಿಂಕ್ ಮಾಡಲಾದ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ"
        />
      </div>
    </FormSection>
  );
};

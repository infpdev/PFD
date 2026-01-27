// EPF Form Data Types

export interface PersonalDetails {
  member_name: string;
  parent_spouse_name: string;
  parent_spouse_type: "Father" | "Husband";
  date_of_birth: string;
  gender: "male" | "female" | "transgender";
  marital_status: "married" | "unmarried" | "widow" | "divorced";
}

export interface ContactDetails {
  email: string;
  mobile_no: string;
  permanent_address?: string;
  temporary_address?: string;
}

export interface PreviousEmploymentDetails {
  uan: string;
  previous_pf_account_no: string;
  exit_date: string;
  scheme_certificate_no?: string;
  ppo_no?: string;
}

export interface InternationalWorkerDetails {
  is_international_worker: boolean;
  country_of_origin?: string;
  passport_no?: string;
  passport_validity_from?: string;
  passport_validity_to?: string;
}

export interface KYCDetails {
  bank_account_no: string;
  ifsc_code: string;
  aadhaar_no: string;
  pan_no?: string;
}

export interface SignatureBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SignatureData {
  image: string; // base64 PNG
  bbox: SignatureBBox;
}


export interface DeclarationDetails {
  place: string;
  date: string;
  signature_data?: SignatureData | null; // Base64 encoded signature image
  same_signature?: boolean;
}

// Form 11 Complete Data
export interface Form11Data {
  personal_details: PersonalDetails;
  contact_details: ContactDetails;
  was_epf_member: boolean;
  was_eps_member: boolean;
  previous_employment?: PreviousEmploymentDetails;
  international_worker: InternationalWorkerDetails;
  kyc_details: KYCDetails;
  declaration: DeclarationDetails;
}

// Form 2 Types
export interface EPFNominee {
  id: string;
  name: string;
  address: string;
  relationship: string;
  other_relationship?: string; // Used when relationship is "other"
  date_of_birth: string;
  share_percentage: number;
  is_minor: boolean;
  guardian_name?: string;
  guardian_relationship?: string;
  guardian_address?: string;
}

export interface EPSFamilyMember {
  id: string;
  name: string;
  address: string;
  date_of_birth: string;
  relationship: string;
  other_relationship?: string; // Used when relationship is "other"
}

export interface PensionNominee {
  name?: string;
  address?: string;
  date_of_birth?: string;
  relationship?: string;
  other_relationship?: string; // Used when relationship is "other"
}

// Document upload types - for runtime use with File objects
export interface DocumentFile {
  file: File;
  preview: string | null;
}

// Serializable document data for storage and payload
export interface StoredDocument {
  name: string;
  type: string;
  base64: string; // base64 encoded file content
  preview: string | null;
}

export interface DocumentUploads {
  aadhaar?: DocumentFile;
  pan?: DocumentFile;
  passbook?: DocumentFile;
}

export interface StoredDocumentUploads {
  aadhaar?: StoredDocument;
  pan?: StoredDocument;
  passbook?: StoredDocument;
}

export interface Form2Data {
  // Basic details (carried from Form 11 or entered separately)
  member_name: string;
  father_husband_name: string;
  date_of_birth: string;
  gender: string;
  employee_no?: string;
  pf_account_no?: string;
  marital_status: string;
  mobile_no: string;
  permanent_address: string;

  // Part A - EPF Nominations
  epf_nominees: EPFNominee[];
  has_no_family_epf: boolean;
  dependent_parents: boolean;

  // Part B - EPS Family Details (optional - only for married/widow)
  eps_family_members?: EPSFamilyMember[];
  has_no_family_eps?: boolean;

  // Pension Nominee (if no eligible family)
  pension_nominee?: PensionNominee;

  // Declaration
  declaration: DeclarationDetails;
}

// Field Definition for form generation
export interface FormFieldDefinition {
  field_label: string;
  field_key: string;
  data_type: "string" | "date" | "number" | "boolean" | "list" | "select";
  required: boolean;
  conditional_on?: string;
  conditional_value?: unknown;
  applicable_form: "form_11" | "form_2" | "both";
  section: string;
  options?: { label: string; value: string }[];
  is_sensitive?: boolean;
  validation?: {
    pattern?: string;
    min_length?: number;
    max_length?: number;
    min?: number;
    max?: number;
  };
}

export interface Meta {
  exported_at: string;
  version: string;
}

export interface Forms {
  form_11: Form11Data;
  form_2: Form2Data;
}

export interface Payload {
  forms: Forms;
  documents?: StoredDocumentUploads;
  meta: Meta;
  password?: string;
}

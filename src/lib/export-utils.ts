import type { Form11Data, Form2Data, Forms, Payload, StoredDocumentUploads } from "@/types/epf-forms";

// Flatten nested objects for TSV export
const flattenObject = (
  obj: Record<string, unknown>,
  prefix = ""
): Record<string, string> => {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}_${key}` : key;

    if (value === null || value === undefined) {
      result[newKey] = "";
    } else if (typeof value === "object" && !Array.isArray(value)) {
      Object.assign(
        result,
        flattenObject(value as Record<string, unknown>, newKey)
      );
    } else if (Array.isArray(value)) {
      result[newKey] = JSON.stringify(value);
    } else {
      result[newKey] = String(value);
    }
  }

  return result;
};

// Export to TSV (Tab-Separated Values)
export const exportToTSV = (
  data: Form11Data | Form2Data | Forms,
  formType: "form_11" | "form_2" | "both"
): string => {
  const flattened = flattenObject(data as unknown as Record<string, unknown>);
  const headers = Object.keys(flattened);
  const values = Object.values(flattened).map((v) =>
    v.replace(/\t/g, " ").replace(/\n/g, " ")
  );

  return `${headers.join("\t")}\n${values.join("\t")}`;
};

// Export combined forms to TSV
export const exportCombinedTSV = (forms: Forms): string => {
  const form11Flat = flattenObject(
    forms.form_11 as unknown as Record<string, unknown>,
    "form11"
  );
  const form2Flat = flattenObject(
    forms.form_2 as unknown as Record<string, unknown>,
    "form2"
  );
  const combined = { ...form11Flat, ...form2Flat };

  const headers = Object.keys(combined);
  const values = Object.values(combined).map((v) =>
    v.replace(/\t/g, " ").replace(/\n/g, " ")
  );

  return `${headers.join("\t")}\n${values.join("\t")}`;
};

// Export to JSON
export const exportToJSON = (data: Forms, documents?: StoredDocumentUploads): string => {
  const payload: Payload = {
    forms: {
      form_11: data.form_11,
      form_2: data.form_2,
    },
    documents,
    meta: {
      exported_at: new Date().toISOString(),
      version: "1.0",
    },
  };

  if (
    payload.forms.form_2.declaration.same_signature ||
    payload.forms.form_2.declaration.signature_data?.image === "same"
  ) {
    console.log("Same sig");
    if (payload.forms.form_2.declaration.signature_data && payload.forms.form_11.declaration.signature_data) {
      payload.forms.form_2.declaration.signature_data.bbox =
        payload.forms.form_11.declaration.signature_data.bbox;
      payload.forms.form_2.declaration.signature_data.image = "same";
    }
  }

  return JSON.stringify(payload, null, 2);
};

// Download file helper
export const downloadFile = (
  content: string,
  filename: string,
  type: string
): void => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export form data
export const exportFormData = (forms: Forms, format: "tsv" | "json", documents?: StoredDocumentUploads): void => {
  const timestamp = new Date().toISOString().split("T")[0];

  if (format === "tsv") {
    const content = exportCombinedTSV(forms);
    downloadFile(
      content,
      `epf_forms_${timestamp}.tsv`,
      "text/tab-separated-values"
    );
    return;
  }

  const content = exportToJSON(forms, documents);
  downloadFile(content, `epf_forms_${timestamp}.json`, "application/json");
};

// Generate form field definitions for documentation
export const getForm11FieldDefinitions = () => [
  {
    field_label: "Name of the Member",
    field_key: "member_name",
    data_type: "string",
    required: true,
    section: "Personal Details",
    applicable_form: "form_11",
  },
  {
    field_label: "Father's/Husband's Name",
    field_key: "parent_spouse_name",
    data_type: "string",
    required: true,
    section: "Personal Details",
    applicable_form: "form_11",
  },
  {
    field_label: "Relationship Type",
    field_key: "parent_spouse_type",
    data_type: "select",
    required: true,
    section: "Personal Details",
    applicable_form: "form_11",
    options: ["father", "husband"],
  },
  {
    field_label: "Date of Birth",
    field_key: "date_of_birth",
    data_type: "date",
    required: true,
    section: "Personal Details",
    applicable_form: "form_11",
  },
  {
    field_label: "Gender",
    field_key: "gender",
    data_type: "select",
    required: true,
    section: "Personal Details",
    applicable_form: "form_11",
    options: ["male", "female", "transgender"],
  },
  {
    field_label: "Marital Status",
    field_key: "marital_status",
    data_type: "select",
    required: true,
    section: "Personal Details",
    applicable_form: "form_11",
    options: ["married", "unmarried", "widow", "divorced"],
  },
  {
    field_label: "Email ID",
    field_key: "email",
    data_type: "string",
    required: true,
    section: "Contact Details",
    applicable_form: "form_11",
  },
  {
    field_label: "Mobile Number",
    field_key: "mobile_no",
    data_type: "string",
    required: true,
    section: "Contact Details",
    applicable_form: "form_11",
    is_sensitive: true,
  },
  {
    field_label: "Was EPF Member",
    field_key: "was_epf_member",
    data_type: "boolean",
    required: true,
    section: "Membership History",
    applicable_form: "form_11",
  },
  {
    field_label: "Was EPS Member",
    field_key: "was_eps_member",
    data_type: "boolean",
    required: true,
    section: "Membership History",
    applicable_form: "form_11",
  },
  {
    field_label: "UAN",
    field_key: "uan",
    data_type: "string",
    required: false,
    section: "Previous Employment",
    applicable_form: "form_11",
    conditional_on: "was_epf_member || was_eps_member",
    is_sensitive: true,
  },
  {
    field_label: "Previous PF Account No",
    field_key: "previous_pf_account_no",
    data_type: "string",
    required: false,
    section: "Previous Employment",
    applicable_form: "form_11",
    conditional_on: "was_epf_member || was_eps_member",
  },
  {
    field_label: "Exit Date",
    field_key: "exit_date",
    data_type: "date",
    required: false,
    section: "Previous Employment",
    applicable_form: "form_11",
    conditional_on: "was_epf_member || was_eps_member",
  },
  {
    field_label: "International Worker",
    field_key: "is_international_worker",
    data_type: "boolean",
    required: true,
    section: "International Worker",
    applicable_form: "form_11",
  },
  {
    field_label: "Country of Origin",
    field_key: "country_of_origin",
    data_type: "string",
    required: false,
    section: "International Worker",
    applicable_form: "form_11",
    conditional_on: "is_international_worker",
  },
  {
    field_label: "Passport Number",
    field_key: "passport_no",
    data_type: "string",
    required: false,
    section: "International Worker",
    applicable_form: "form_11",
    conditional_on: "is_international_worker",
    is_sensitive: true,
  },
  {
    field_label: "Bank Account Number",
    field_key: "bank_account_no",
    data_type: "string",
    required: true,
    section: "KYC Details",
    applicable_form: "form_11",
    is_sensitive: true,
  },
  {
    field_label: "IFSC Code",
    field_key: "ifsc_code",
    data_type: "string",
    required: true,
    section: "KYC Details",
    applicable_form: "form_11",
  },
  {
    field_label: "Aadhaar Number",
    field_key: "aadhaar_no",
    data_type: "string",
    required: true,
    section: "KYC Details",
    applicable_form: "form_11",
    is_sensitive: true,
  },
  {
    field_label: "PAN",
    field_key: "pan_no",
    data_type: "string",
    required: false,
    section: "KYC Details",
    applicable_form: "form_11",
    is_sensitive: true,
  },
  {
    field_label: "Place",
    field_key: "place",
    data_type: "string",
    required: true,
    section: "Declaration",
    applicable_form: "form_11",
  },
  {
    field_label: "Date",
    field_key: "date",
    data_type: "date",
    required: true,
    section: "Declaration",
    applicable_form: "form_11",
  },
  {
    field_label: "Signature",
    field_key: "signature_data",
    data_type: "string",
    required: true,
    section: "Declaration",
    applicable_form: "form_11",
  },
];

export const getForm2FieldDefinitions = () => [
  {
    field_label: "Name",
    field_key: "member_name",
    data_type: "string",
    required: true,
    section: "Basic Details",
    applicable_form: "form_2",
  },
  {
    field_label: "Father's/Husband's Name",
    field_key: "father_husband_name",
    data_type: "string",
    required: true,
    section: "Basic Details",
    applicable_form: "form_2",
  },
  {
    field_label: "Date of Birth",
    field_key: "date_of_birth",
    data_type: "date",
    required: true,
    section: "Basic Details",
    applicable_form: "form_2",
  },
  {
    field_label: "Gender",
    field_key: "gender",
    data_type: "select",
    required: true,
    section: "Basic Details",
    applicable_form: "form_2",
  },
  {
    field_label: "Employee No",
    field_key: "employee_no",
    data_type: "string",
    required: false,
    section: "Basic Details",
    applicable_form: "form_2",
  },
  {
    field_label: "PF Account No",
    field_key: "pf_account_no",
    data_type: "string",
    required: false,
    section: "Basic Details",
    applicable_form: "form_2",
  },
  {
    field_label: "Mobile No",
    field_key: "mobile_no",
    data_type: "string",
    required: true,
    section: "Basic Details",
    applicable_form: "form_2",
  },
  {
    field_label: "Address",
    field_key: "permanent_address",
    data_type: "string",
    required: true,
    section: "Basic Details",
    applicable_form: "form_2",
  },
  {
    field_label: "EPF Nominees",
    field_key: "epf_nominees",
    data_type: "list",
    required: true,
    section: "Part A - EPF",
    applicable_form: "form_2",
  },
  {
    field_label: "No Family (EPF)",
    field_key: "has_no_family_epf",
    data_type: "boolean",
    required: false,
    section: "Part A - EPF",
    applicable_form: "form_2",
  },
  {
    field_label: "Dependent Parents",
    field_key: "dependent_parents",
    data_type: "boolean",
    required: false,
    section: "Part A - EPF",
    applicable_form: "form_2",
  },
  {
    field_label: "EPS Family Members",
    field_key: "eps_family_members",
    data_type: "list",
    required: false,
    section: "Part B - EPS",
    applicable_form: "form_2",
  },
  {
    field_label: "No Family (EPS)",
    field_key: "has_no_family_eps",
    data_type: "boolean",
    required: false,
    section: "Part B - EPS",
    applicable_form: "form_2",
  },
  {
    field_label: "Pension Nominee",
    field_key: "pension_nominee",
    data_type: "object",
    required: false,
    section: "Part B - EPS",
    applicable_form: "form_2",
    conditional_on: "has_no_family_eps",
  },
  {
    field_label: "Place",
    field_key: "place",
    data_type: "string",
    required: true,
    section: "Declaration",
    applicable_form: "form_2",
  },
  {
    field_label: "Date",
    field_key: "date",
    data_type: "date",
    required: true,
    section: "Declaration",
    applicable_form: "form_2",
  },
  {
    field_label: "Signature",
    field_key: "signature_data",
    data_type: "string",
    required: true,
    section: "Declaration",
    applicable_form: "form_2",
  },
];

import React, { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { PersonalDetailsStep } from "@/components/form11/PersonalDetailsStep";
import { ContactDetailsStep } from "@/components/form11/ContactDetailsStep";
import { MembershipHistoryStep } from "@/components/form11/MembershipHistoryStep";
import { InternationalWorkerStep } from "@/components/form11/InternationalWorkerStep";
import { KYCDetailsStep } from "@/components/form11/KYCDetailsStep";
import { DeclarationStep } from "@/components/form11/DeclarationStep";
import { BasicDetailsStep } from "@/components/form2/BasicDetailsStep";
import { EPFNomineeStep } from "@/components/form2/EPFNomineeStep";
import { EPSFamilyStep } from "@/components/form2/EPSFamilyStep";
import { Form2DeclarationStep } from "@/components/form2/Form2DeclarationStep";
import { DocumentUploadStep } from "@/components/form2/DocumentUploadStep";
import { FormSummary } from "@/components/FormSummary";
import { DUMMY_PAYLOAD } from "@/components/dummyPayload";
import type { DocumentFile } from "@/types/epf-forms";

import {
  FileText,
  Users,
  Building2,
  Shield,
  Download,
  RotateCcw,
  X,
  Upload,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type {
  Form11Data,
  Form2Data,
  EPFNominee,
  EPSFamilyMember,
  DocumentUploads,
} from "@/types/epf-forms";
import {
  saveDocumentsToStorage,
  loadDocumentsFromStorage,
  clearDocumentsFromStorage,
  storedToDocumentFile,
} from "@/lib/document-storage";
import { useLocation } from "react-router-dom";
import NotFound from "./NotFound";

const STORAGE_KEY_FORM11 = "epf_form11_data";
const STORAGE_KEY_FORM2 = "epf_form2_data";

// Helper to validate bbox - all values must be finite numbers (x/y can be 0)
const isValidBbox = (
  bbox:
    | { x: number; y: number; width: number; height: number }
    | null
    | undefined,
): boolean => {
  if (!bbox) return false;
  return (
    typeof bbox.x === "number" &&
    isFinite(bbox.x) &&
    typeof bbox.y === "number" &&
    isFinite(bbox.y) &&
    typeof bbox.width === "number" &&
    isFinite(bbox.width) &&
    bbox.width > 0 &&
    typeof bbox.height === "number" &&
    isFinite(bbox.height) &&
    bbox.height > 0
  );
};

function safeUUID() {
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const createEmptyNominee = (): EPFNominee => ({
  id: safeUUID(),
  name: "",
  address: "",
  relationship: "",
  date_of_birth: "",
  share_percentage: 100,
  is_minor: false,
  other_relationship: "",
});

const createEmptyFamilyMember = (): EPSFamilyMember => ({
  id: safeUUID(),
  name: "",
  address: "",
  date_of_birth: "",
  relationship: "",
  other_relationship: "",
});

const initialForm11Data: Form11Data = {
  personal_details: {
    member_name: "",
    parent_spouse_name: "",
    parent_spouse_type: "Father",
    date_of_birth: "",
    gender: "male",
    marital_status: "unmarried",
  },
  contact_details: {
    email: "",
    mobile_no: "",
  },
  was_epf_member: false,
  was_eps_member: false,
  previous_employment: {
    uan: "",
    previous_pf_account_no: "",
    exit_date: "",
  },
  international_worker: {
    is_international_worker: false,
  },
  kyc_details: {
    bank_account_no: "",
    ifsc_code: "",
    aadhaar_no: "",
  },
  declaration: {
    place: "",
    date: new Date().toISOString().split("T")[0],
  },
};

const initialForm2Data: Form2Data = {
  member_name: "",
  father_husband_name: "",
  date_of_birth: "",
  gender: "male",
  marital_status: "unmarried",
  mobile_no: "",
  permanent_address: "",
  epf_nominees: [createEmptyNominee()],
  has_no_family_epf: false,
  dependent_parents: false,
  eps_family_members: [], // Optional - only populated for married/widow
  has_no_family_eps: false,
  declaration: {
    place: "",
    date: new Date().toISOString().split("T")[0],
  },
};

const loadFromStorage = <T,>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored) as T;

      // Normalize form2 data to ensure other_relationship field exists
      if (key === STORAGE_KEY_FORM2 && parsed) {
        const form2 = parsed as unknown as Form2Data;

        // Normalize EPF nominees
        if (form2.epf_nominees) {
          form2.epf_nominees = form2.epf_nominees.map((nominee) => ({
            ...nominee,
            other_relationship: nominee.other_relationship ?? "",
          }));
        }
        // Normalize EPS family members
        if (form2.eps_family_members) {
          form2.eps_family_members = form2.eps_family_members.map((member) => ({
            ...member,
            other_relationship: member.other_relationship ?? "",
          }));
        }
        // Normalize pension nominee
        if (form2.pension_nominee) {
          form2.pension_nominee = {
            ...form2.pension_nominee,
            other_relationship: form2.pension_nominee.other_relationship ?? "",
          };
        }

        return form2 as unknown as T;
      }

      return parsed;
    }
  } catch (e) {
    console.error("Error loading from localStorage:", e);
  }
  return fallback;
};

const Index: React.FC = () => {
  const [form11Data, setForm11Data] = useState<Form11Data>(() =>
    loadFromStorage(STORAGE_KEY_FORM11, initialForm11Data),
  );
  const [form2Data, setForm2Data] = useState<Form2Data>(() =>
    loadFromStorage(STORAGE_KEY_FORM2, initialForm2Data),
  );
  const [documents, setDocuments] = useState<DocumentUploads>({});
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const [errors11, setErrors11] = useState<Record<string, string>>({});
  const [errors2, setErrors2] = useState<Record<string, string>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [showEditJson, setShowEditJson] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // ==================== Handle preview ===============================

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [pageNotFound, setPageNotFound] = useState(false);

  // ================= Handle routing =================================
  const { pathname } = useLocation();
  const allowedPaths = ["/"];
  if (!allowedPaths.some((p) => pathname.startsWith(p))) {
    setPageNotFound(true);
  }

  const handlePreview = (type: "aadhaar" | "pan" | "passbook") => {
    const doc = documents?.[type];
    if (doc?.preview) {
      setPreviewUrl(doc.preview);
      setPreviewType(doc.file?.type || null);
    }
  };

  const closePreview = () => {
    setPreviewUrl(null);
    setPreviewType(null);
  };

  const [isDemo, setIsDemo] = useState(
    new URLSearchParams(window.location.search).has("dummy"),
  );

  useEffect(() => {
    async function isAdmin() {
      const res = await fetch("/isAdmin", {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Unable to access backend");
      const data = await res.json();

      setShowEditJson(false);
      if (data.isAdmin) setShowEditJson(true);
    }
    isAdmin();
  }, []);
  const { toast } = useToast();

  const form11Ref = React.useRef<HTMLDivElement | null>(null);
  const form2Ref = React.useRef<HTMLDivElement | null>(null);

  // Auto-save form11 data on change
  // Load documents from IndexedDB on mount
  useEffect(() => {
    const loadDocs = async () => {
      const loadedDocs = await loadDocumentsFromStorage();
      setDocuments(loadedDocs);
      setDocumentsLoaded(true);
    };
    if (!isDemo) loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save form11 data on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FORM11, JSON.stringify(form11Data));
    } catch (e) {
      console.error("Error saving form11 to localStorage:", e);
    }
  }, [form11Data]);

  // Auto-save form2 data on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FORM2, JSON.stringify(form2Data));
    } catch (e) {
      console.error("Error saving form2 to localStorage:", e);
    }
  }, [form2Data]);

  // Auto-save documents on change (only after initial load)
  useEffect(() => {
    async function loadDocs() {
      if (documentsLoaded) {
        await saveDocumentsToStorage(documents);
      }
    }

    loadDocs();
  }, [documents, documentsLoaded]);

  // Clear saved data after submit (commented out for now)
  // const clearSavedData = () => {
  //   localStorage.removeItem(STORAGE_KEY_FORM11);
  //   localStorage.removeItem(STORAGE_KEY_FORM2);
  //   clearDocumentsFromStorage();
  // };

  const validateForm11 = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    // Personal
    if (!form11Data.personal_details.member_name)
      newErrors.member_name = "Name is required";
    if (!form11Data.personal_details.parent_spouse_name)
      newErrors.parent_spouse_name = "This field is required";
    if (!form11Data.personal_details.date_of_birth)
      newErrors.date_of_birth = "Date of birth is required";

    // Contact
    if (!form11Data.contact_details.email)
      newErrors.email = "Email is required";
    else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form11Data.contact_details.email)
    ) {
      newErrors.email = "Invalid email format";
    }
    if (!form11Data.contact_details.mobile_no)
      newErrors.mobile_no = "Mobile number is required";
    else if (!/^[0-9]{10}$/.test(form11Data.contact_details.mobile_no)) {
      newErrors.mobile_no = "Invalid mobile number (10 digits required)";
    }

    // Membership
    if (form11Data.was_epf_member || form11Data.was_eps_member) {
      if (!form11Data.previous_employment?.uan)
        newErrors.uan = "UAN is required";
      if (!/^[0-9]{12}$/.test(form11Data.previous_employment?.uan))
        newErrors.uan = "UAN must be a 12-digit number";
      if (!form11Data.previous_employment?.previous_pf_account_no)
        newErrors.previous_pf_account_no = "Previous PF Account No is required";
      if (!form11Data.previous_employment?.exit_date)
        newErrors.exit_date = "Exit date is required";
    } else {
      if (!/^[0-9]{12}$/.test(form11Data.previous_employment?.uan))
        newErrors.uan = "UAN must be a 12-digit number";
    }

    // International
    if (form11Data.international_worker.is_international_worker) {
      if (!form11Data.international_worker.country_of_origin)
        newErrors.country_of_origin = "Country is required";
      if (!form11Data.international_worker.passport_no)
        newErrors.passport_no = "Passport number is required";

      if (
        !/^[A-Z0-9\s]{6,15}$/.test(form11Data.international_worker.passport_no)
      )
        newErrors.passport_no = "Passport number length invalid, please edit";
      if (!form11Data.international_worker.passport_validity_from)
        newErrors.passport_validity_from = "Start date is required";
      if (!form11Data.international_worker.passport_validity_to)
        newErrors.passport_validity_to = "End date is required";
    }

    // KYC
    if (!form11Data.kyc_details.bank_account_no)
      newErrors.bank_account_no = "Bank account is required";
    if (!form11Data.kyc_details.ifsc_code)
      newErrors.ifsc_code = "IFSC code is required";
    else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form11Data.kyc_details.ifsc_code)) {
      newErrors.ifsc_code = "Invalid IFSC format";
    }
    if (!form11Data.kyc_details.aadhaar_no)
      newErrors.aadhaar_no = "Aadhaar is required";
    else if (!/^[0-9]{12}$/.test(form11Data.kyc_details.aadhaar_no)) {
      newErrors.aadhaar_no = "Aadhaar must be 12 digits";
    }

    // Declaration
    if (!form11Data.declaration.place) newErrors.place = "Place is required";
    if (!form11Data.declaration.date) newErrors.date = "Date is required";
    if (!form11Data.declaration.signature_data) {
      newErrors.signature_data = "Signature is required";
    } else if (!isValidBbox(form11Data.declaration.signature_data.bbox)) {
      // bbox is invalid or missing - signature needs to be re-drawn
      newErrors.signature_data =
        "Please re-sign - signature data is incomplete";
      setForm11Data({
        ...form11Data,
        declaration: {
          ...form11Data.declaration,
          signature_data: null,
        },
      });

      setForm2Data({
        ...form2Data,
        declaration: {
          ...form2Data.declaration,
          signature_data: null,
          same_signature: false,
        },
      });
    }
    setErrors11(newErrors);
    return newErrors;
  };

  const validateForm2 = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    // Basic - use prefixed error keys so focus targets Form 2 inputs
    if (!form2Data.member_name)
      newErrors.form2_member_name = "Name is required";
    if (!form2Data.father_husband_name)
      newErrors.form2_father_husband_name = "This field is required";
    if (!form2Data.date_of_birth)
      newErrors.form2_date_of_birth = "Date of birth is required";
    if (!form2Data.mobile_no)
      newErrors.form2_mobile_no = "Mobile number is required";
    if (!form2Data.permanent_address)
      newErrors.form2_permanent_address = "Address is required";

    if (form2Data.employee_no && !/^[0-9]{8}$/.test(form2Data.employee_no))
      newErrors.form2_employee_no = "Employee number must be a 8-digit number";

    // EPF Nominees
    const totalShare = form2Data.epf_nominees.reduce(
      (sum, n) => sum + (n.share_percentage || 0),
      0,
    );
    if (totalShare !== 100)
      newErrors.nominee_share_0 = "Total share must equal 100%";
    form2Data.epf_nominees.forEach((n, i) => {
      if (!n.name) newErrors[`nominee_name_${i}`] = "Name required";
      if (!n.relationship)
        newErrors[`nominee_rel_${i}`] = "Relationship required";
      if (!n.share_percentage || n.share_percentage <= 0)
        newErrors[`nominee_share_${i}`] = "Share required";
    });

    // Declaration - use prefixed keys to avoid collisions with Form 11
    if (!form2Data.declaration.place)
      newErrors.form2_place = "Place is required";
    if (!form2Data.declaration.date) newErrors.form2_date = "Date is required";
    if (!form2Data.declaration.signature_data)
      newErrors.form2_signature = "Signature is required";

    // Conditional validation based on marital status
    const isMarriedOrWidow =
      form2Data.marital_status === "married" ||
      form2Data.marital_status === "widow";

    // EPS Family validation for married/widow
    if (isMarriedOrWidow) {
      const familyMembers = form2Data.eps_family_members || [];
      if (familyMembers.length === 0) {
        newErrors.family_name_0 = "At least one family member is required";
      } else {
        familyMembers.forEach((m, i) => {
          if (!m.name) newErrors[`family_name_${i}`] = "Name required";
          if (!m.relationship)
            newErrors[`family_rel_${i}`] = "Relationship required";
          if (!m.date_of_birth) newErrors[`family_dob_${i}`] = "DOB required";
        });
      }
    } else {
      // Pension Nominee validation for unmarried/divorced
      if (!form2Data.pension_nominee?.name)
        newErrors.pension_nominee_name = "Nominee name required";
      if (!form2Data.pension_nominee?.relationship)
        newErrors.pension_nominee_rel = "Relationship required";
      if (!form2Data.pension_nominee?.date_of_birth)
        newErrors.pension_nominee_dob = "Date of birth required";
      if (!form2Data.pension_nominee?.address)
        newErrors.pension_nominee_address = "Address required";
    }

    // Form 2 Declaration validation
    if (!form2Data.declaration.place)
      newErrors.form2_place = "Place is required";
    if (!form2Data.declaration.date) newErrors.form2_date = "Date is required";

    // Signature validation - either own signature with valid bbox, or same_signature referencing Form 11
    if (form2Data.declaration.same_signature) {
      // Using Form 11 signature - ensure Form 11 has valid signature
      if (
        !form11Data.declaration.signature_data ||
        !isValidBbox(form11Data.declaration.signature_data.bbox)
      ) {
        newErrors.form2_signature =
          "Form 11 signature is invalid - please re-sign Form 11";
      }
    } else {
      // Own signature required
      if (!form2Data.declaration.signature_data) {
        newErrors.form2_signature = "Signature is required";
      } else if (!isValidBbox(form2Data.declaration.signature_data.bbox)) {
        newErrors.form2_signature =
          "Please re-sign - signature data is incomplete";
      }
    }

    // Document validation
    if (!documents.aadhaar)
      newErrors.doc_aadhaar = "Aadhaar upload is required";
    if (!documents.pan) newErrors.doc_pan = "PAN card upload is required";
    if (!documents.passbook)
      newErrors.doc_passbook = "Passbook/cheque upload is required";

    setErrors2(newErrors);
    return newErrors;
  };

  // Focus on first error field
  const focusFirstError = useCallback((errors: Record<string, string>) => {
    const firstErrorKey = Object.keys(errors)[0];
    if (firstErrorKey) {
      console.log(firstErrorKey);

      // Try to find input by name attribute
      const input = document.querySelector(
        `[name="${firstErrorKey}"]`,
      ) as HTMLElement;
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      // Try to find by id
      const inputById = document.getElementById(firstErrorKey) as HTMLElement;
      if (inputById) {
        inputById.focus();
        inputById.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, []);

  const handleSubmit = () => {
    const form11Errors = validateForm11();
    const form2Errors = validateForm2();

    const form11Valid = Object.keys(form11Errors).length === 0;
    const form2Valid = Object.keys(form2Errors).length === 0;

    if (form11Valid && form2Valid) {
      setShowSummary(true);
      // toast({
      //   title: "Forms Completed",
      //   description: "Both forms have been successfully filled.",
      // });
    } else {
      // Focus on first error - use the returned errors directly
      if (!form11Valid) {
        setTimeout(() => focusFirstError(form11Errors), 100);
      } else if (!form2Valid) {
        setTimeout(() => focusFirstError(form2Errors), 100);
      }
      toast({
        title: "Validation Error",
        description: "Please fill all required fields correctly.",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setForm11Data(initialForm11Data);
    setForm2Data(initialForm2Data);
    setDocuments({});
    clearDocumentsFromStorage();
    setErrors11({});
    setErrors2({});
    setShowSummary(false);
  };
  const handleEdit = (form: "form11" | "form2") => {
    setShowSummary(false);

    setTimeout(() => {
      // requestAnimationFrame(() => {
      const ref = form == "form11" ? form11Ref : form2Ref;
      ref.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      // ref.current?.focus?.();
      // });
    }, 500);

    if (form2Data.declaration.same_signature) {
      setForm2Data((prev) => ({
        ...prev,
        declaration: {
          ...form11Data.declaration,
          signature_data: { ...form11Data.declaration.signature_data },
          same_signature: true,
        },
      }));
    }
  };

  // Auto-sync some fields from Form 11 to Form 2
  const syncToForm2 = () => {
    setForm2Data((prev) => ({
      ...prev,
      member_name: form11Data.personal_details.member_name,
      father_husband_name: form11Data.personal_details.parent_spouse_name,
      date_of_birth: form11Data.personal_details.date_of_birth,
      gender: form11Data.personal_details.gender,
      marital_status: form11Data.personal_details.marital_status,
      mobile_no: form11Data.contact_details.mobile_no,
      pf_account_no: form11Data.previous_employment.previous_pf_account_no,
      declaration: {
        ...prev.declaration,
        signature_data: { ...form11Data.declaration.signature_data },
        same_signature: true,
      },
    }));
  };

  // Load existing JSON data for correction (admin only)
  const handleLoadExistingJson = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        // Validate JSON structure
        if (!jsonData.forms?.form_11 || !jsonData.forms?.form_2) {
          toast({
            title: "Invalid JSON format",
            description:
              "The selected file does not contain valid EPF form data.",
            variant: "destructive",
          });
          return;
        }

        // Hydrate Form 11 data
        setForm11Data(jsonData.forms.form_11);

        // Hydrate Form 2 data with normalization for other_relationship
        const form2 = jsonData.forms.form_2;

        // Normalize EPF nominees
        if (form2.epf_nominees) {
          form2.epf_nominees = form2.epf_nominees.map(
            (nominee: EPFNominee) => ({
              ...nominee,
              other_relationship: nominee.other_relationship || "",
            }),
          );
        }

        // Normalize EPS family members
        if (form2.eps_family_members) {
          form2.eps_family_members = form2.eps_family_members.map(
            (member: EPSFamilyMember) => ({
              ...member,
              other_relationship: member.other_relationship || "",
            }),
          );
        }

        // Normalize pension nominee
        if (form2.pension_nominee && !Array.isArray(form2.pension_nominee)) {
          form2.pension_nominee = {
            ...form2.pension_nominee,
            other_relationship: form2.pension_nominee.other_relationship || "",
          };
        }

        if (form2.declaration.same_signature) {
          form2.declaration.signature_data = {
            ...jsonData.forms.form_11.declaration.signature_data,
            same_signature: true,
          };
        }

        setForm2Data(form2);

        // Handle documents if present
        if (jsonData.documents) {
          const loadedDocs: DocumentUploads = {};

          if (jsonData.documents.aadhaar) {
            loadedDocs.aadhaar = storedToDocumentFile(
              jsonData.documents.aadhaar,
            );
          }
          if (jsonData.documents.pan) {
            loadedDocs.pan = storedToDocumentFile(jsonData.documents.pan);
          }
          if (jsonData.documents.passbook) {
            loadedDocs.passbook = storedToDocumentFile(
              jsonData.documents.passbook,
            );
          }

          setDocuments(loadedDocs);

          async function saveDocs() {
            if (documentsLoaded) {
              await saveDocumentsToStorage(loadedDocs);
            }
          }

          saveDocs();
          // saveDocumentsToStorage(loadedDocs);
        }

        // Mark as edit mode
        setIsEditMode(true);

        toast({
          title: "Data loaded successfully",
          description:
            "You can now edit the form and submit to overwrite the existing records.",
        });

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (err) {
        console.error("Error parsing JSON:", err);
        toast({
          title: "Error loading file",
          description:
            "Failed to parse the JSON file. Please ensure it's a valid EPF data file.",
          variant: "destructive",
        });
      }
    };

    reader.onerror = () => {
      toast({
        title: "Error reading file",
        description: "Failed to read the selected file.",
        variant: "destructive",
      });
    };

    reader.readAsText(file);
  };

  // Dummy documents

  useEffect(() => {
    if (isDemo) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);

      const aadhaar: DocumentFile = storedToDocumentFile(
        DUMMY_PAYLOAD.documents.aadhaar,
      );
      const pan: DocumentFile = storedToDocumentFile(
        DUMMY_PAYLOAD.documents.pan,
      );

      const passbook: DocumentFile = storedToDocumentFile(
        DUMMY_PAYLOAD.documents.passbook,
      );

      setForm11Data(DUMMY_PAYLOAD.forms.form_11);
      setForm2Data({
        ...DUMMY_PAYLOAD.forms.form_2,
        declaration: {
          ...form11Data.declaration,
          signature_data: { ...form11Data.declaration.signature_data },
          same_signature: true,
        },
      });
      setDocuments({
        aadhaar,
        pan,
        passbook,
      });

      saveDocumentsToStorage({
        aadhaar,
        pan,
        passbook,
      }).then(() => {
        setIsDemo(false);
      });
    }
  }, [isDemo, form11Data]);

  if (pageNotFound) return <NotFound />;

  if (showSummary) {
    return (
      <>
        <Helmet>
          <title>EPF • Summary</title>
          <meta
            name="description"
            content="Review your completed EPF Form 11 and Form 2 data before export."
          />
        </Helmet>
        <div className="min-h-screen bg-background">
          <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="container max-w-5xl mx-auto px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary text-primary-foreground">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground font-serif">
                    Employees' Provident Fund
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Digital Form System
                  </p>
                </div>
              </div>
            </div>
          </header>
          <main className="container max-w-5xl mx-auto px-4 py-8">
            <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden p-6 md:p-10">
              <FormSummary
                form11Data={form11Data}
                form2Data={form2Data}
                documents={documents}
                onEdit={handleEdit}
                onReset={handleReset}
                isEditMode={isEditMode}
              />
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>EPF • Form 11 & Form 2 Online</title>
        <meta
          name="description"
          content="Digital EPF Form 11 Declaration and Form 2 Nomination forms for employee provident fund. Easy online form filling with PDF and Excel export."
        />
        <meta
          name="keywords"
          content="EPF Form 11, EPF Form 2, Provident Fund, Employee Nomination, Digital PF Forms"
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary text-primary-foreground">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground font-serif">
                    Employees' Provident Fund
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Digital Form System
                  </p>
                </div>
              </div>
              <Button variant="formOutline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </header>

        <main className="container max-w-5xl mx-auto px-4 py-8">
          {/* Hero Section */}
          <section className="text-center mb-10 animate-slide-up">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground font-serif mb-3">
              EPF Digital Form Entry
            </h2>

            {/* Features */}
            <div className="flex flex-row justify-center w-auto gap-4 mt-8">
              {[
                { icon: FileText, label: "Form 11 & 2" },
                { icon: Shield, label: "Secure Input" },
                { icon: Users, label: "Nominations" },
                // { icon: Building2, label: 'Excel Export' },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex w-full flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border"
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Admin-only Load Existing Data Section */}
          {showEditJson && (
            <section className="mb-8 animate-fade-in">
              <div className="p-4 rounded-xl bg-card border border-amber-500/30 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Upload className="h-4 w-4 text-amber-500" />
                      <span className="font-medium text-foreground">
                        Admin: Load Existing Data for Correction
                      </span>
                      {isEditMode && (
                        <span className="text-xs bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded-full">
                          Edit Mode Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Click to edit the details of an existing user. Select the
                      .json file of the corresponding user to continue.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleLoadExistingJson}
                      className="hidden"
                      id="load-json-input"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Load JSON
                    </Button>
                    {isEditMode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsEditMode(false);
                          toast({
                            title: "Edit mode disabled",
                            description:
                              "Form will now submit as a new record.",
                          });
                        }}
                        className="text-muted-foreground"
                      >
                        Cancel Edit
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* FORM 11 Section */}
          <div
            ref={form11Ref}
            tabIndex={-1}
            className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden mb-8"
          >
            <div className="bg-primary/10 border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="text-xl font-bold text-foreground font-serif">
                    Form 11 - Declaration Form
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Employee declaration for EPF/EPS membership
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-10 space-y-8">
              <PersonalDetailsStep
                data={form11Data.personal_details}
                onChange={(data) =>
                  setForm11Data({ ...form11Data, personal_details: data })
                }
                errors={errors11}
                documents={documents}
                onPreviewDocument={handlePreview}
              />

              <ContactDetailsStep
                data={form11Data.contact_details}
                onChange={(data) =>
                  setForm11Data({ ...form11Data, contact_details: data })
                }
                errors={errors11}
              />

              <MembershipHistoryStep
                wasEpfMember={form11Data.was_epf_member}
                wasEpsMember={form11Data.was_eps_member}
                previousEmployment={form11Data.previous_employment!}
                onMembershipChange={(field, value) =>
                  setForm11Data({ ...form11Data, [field]: value })
                }
                onPreviousEmploymentChange={(data) =>
                  setForm11Data({ ...form11Data, previous_employment: data })
                }
                errors={errors11}
              />

              <InternationalWorkerStep
                data={form11Data.international_worker}
                onChange={(data) =>
                  setForm11Data({ ...form11Data, international_worker: data })
                }
                errors={errors11}
              />

              <KYCDetailsStep
                data={form11Data.kyc_details}
                onChange={(data) =>
                  setForm11Data({ ...form11Data, kyc_details: data })
                }
                errors={errors11}
              />

              <DeclarationStep
                data={form11Data.declaration}
                onChange={(data) =>
                  setForm11Data({ ...form11Data, declaration: data })
                }
                errors={errors11}
              />
            </div>
          </div>

          {/* Sync Button */}
          <div className="flex justify-center mb-8">
            <Button variant="formOutline" onClick={syncToForm2}>
              <Download className="h-4 w-4 mr-2" />
              Copy Form 11 details to Form 2
            </Button>
          </div>

          {/* FORM 2 Section */}
          <div
            ref={form2Ref}
            tabIndex={-1}
            className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden mb-8"
          >
            <div className="bg-secondary/10 border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-secondary-foreground" />
                <div>
                  <h3 className="text-xl font-bold text-foreground font-serif">
                    Form 2 - Nomination Form
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    EPF & EPS nomination and family declaration
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-10 space-y-8">
              <BasicDetailsStep
                data={{
                  member_name: form2Data.member_name,
                  father_husband_name: form2Data.father_husband_name,
                  date_of_birth: form2Data.date_of_birth,
                  gender: form2Data.gender,
                  employee_no: form2Data.employee_no,
                  pf_account_no: form2Data.pf_account_no,
                  marital_status: form2Data.marital_status,
                  mobile_no: form2Data.mobile_no,
                  permanent_address: form2Data.permanent_address,
                }}
                onChange={(data) => setForm2Data({ ...form2Data, ...data })}
                onMaritalStatusChange={(status) => {
                  // Clear EPS family details if marital status is single/divorced
                  if (status === "unmarried" || status === "divorced") {
                    setForm2Data((prev) => ({
                      ...prev,
                      marital_status: status,
                      eps_family_members: [],
                      has_no_family_eps: false,
                    }));
                  } else if (status === "married" || status === "widow") {
                    // Initialize with one default family member if empty
                    setForm2Data((prev) => ({
                      ...prev,
                      marital_status: status,
                      eps_family_members: prev.eps_family_members?.length
                        ? prev.eps_family_members
                        : [createEmptyFamilyMember()],
                    }));
                  }
                }}
                errors={errors2}
                documents={documents}
                onPreviewDocument={handlePreview}
              />

              <EPFNomineeStep
                nominees={form2Data.epf_nominees}
                hasNoFamily={form2Data.has_no_family_epf}
                dependentParents={form2Data.dependent_parents}
                onNomineesChange={(nominees) =>
                  setForm2Data({ ...form2Data, epf_nominees: nominees })
                }
                onHasNoFamilyChange={(value) =>
                  setForm2Data({ ...form2Data, has_no_family_epf: value })
                }
                onDependentParentsChange={(value) =>
                  setForm2Data({ ...form2Data, dependent_parents: value })
                }
                errors={errors2}
                maritalStatus={form2Data.marital_status}
                gender={form2Data.gender}
              />

              <div className="space-y-3 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  *Certified that I have no family as defined in para 2 (g) of
                  the Employees' Provident Fund Scheme, 1952 and should I
                  acquire a family hereafter the above nomination should be
                  deemed as cancelled.
                </p>

                <p className="text-sm text-muted-foreground leading-relaxed border-border border-b pb-4">
                  *Certified that my father/mother is/are dependent upon me.
                </p>
              </div>

              <EPSFamilyStep
                familyMembers={form2Data.eps_family_members || []}
                hasNoFamily={form2Data.has_no_family_eps || false}
                pensionNominee={form2Data.pension_nominee}
                onFamilyMembersChange={(members) =>
                  setForm2Data({ ...form2Data, eps_family_members: members })
                }
                onHasNoFamilyChange={(value) =>
                  setForm2Data({ ...form2Data, has_no_family_eps: value })
                }
                onPensionNomineeChange={(nominee) =>
                  setForm2Data({ ...form2Data, pension_nominee: nominee })
                }
                errors={errors2}
                maritalStatus={form2Data.marital_status}
                gender={form2Data.gender}
              />

              <Form2DeclarationStep
                data={form2Data.declaration}
                onChange={(data) =>
                  setForm2Data({ ...form2Data, declaration: data })
                }
                errors={errors2}
              />
            </div>
          </div>

          {/* Document Upload Section */}
          <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden mb-8">
            <div className="bg-accent/10 border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-accent-foreground" />
                <div>
                  <h3 className="text-xl font-bold text-foreground font-serif">
                    Document Upload
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Upload identity and bank documents
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-10">
              <DocumentUploadStep
                documents={documents}
                onDocumentsChange={setDocuments}
                errors={errors2}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <Button
              variant="form"
              size="lg"
              onClick={handleSubmit}
              className="px-12"
            >
              <FileText className="h-5 w-5 mr-2" />
              Complete & Review Forms
            </Button>
          </div>

          {/* Footer note */}
          {/* <footer className="mt-10 text-center text-sm text-muted-foreground">
            <p>
              This is a digital form filling system. Data is processed locally and not stored on any server.
            </p>
            <p className="mt-1">
              For official submissions, the generated data should be reviewed and submitted through proper channels.
            </p>
          </footer> */}
          {/* Document Preview Modal */}
          {previewUrl && (
            <div
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
              onClick={closePreview}
            >
              <div
                className="relative max-w-4xl max-h-[90vh] bg-card rounded-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background"
                  onClick={closePreview}
                >
                  <X className="h-4 w-4" />
                </Button>

                {previewType?.startsWith("image/") ? (
                  <img
                    src={previewUrl}
                    alt="Document preview"
                    className="max-w-full max-h-[85vh] object-contain"
                  />
                ) : (
                  <iframe
                    src={previewUrl}
                    title="Document preview"
                    className="w-[90vw] max-w-4xl h-[85vh]"
                  />
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default Index;

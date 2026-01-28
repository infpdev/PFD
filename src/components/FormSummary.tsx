import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Edit, Send, Eye, X } from "lucide-react";
import type {
  Form11Data,
  Form2Data,
  Forms,
  DocumentUploads,
  StoredDocumentUploads,
  StoredDocument,
} from "@/types/epf-forms";

// Helper to convert DocumentFile to StoredDocument
const convertDocumentToStored = async (doc: {
  file: File;
  preview: string | null;
}): Promise<StoredDocument> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: doc.file.name,
        type: doc.file.type,
        base64: reader.result as string,
        preview: null,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(doc.file);
  });
};

// Convert all documents to storable format
const convertDocumentsForPayload = async (
  docs: DocumentUploads,
): Promise<StoredDocumentUploads> => {
  const stored: StoredDocumentUploads = {};

  if (docs.aadhaar) {
    stored.aadhaar = await convertDocumentToStored(docs.aadhaar);
  }
  if (docs.pan) {
    stored.pan = await convertDocumentToStored(docs.pan);
  }
  if (docs.passbook) {
    stored.passbook = await convertDocumentToStored(docs.passbook);
  }

  return stored;
};
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface FormSummaryProps {
  form11Data?: Form11Data;
  form2Data?: Form2Data;
  documents?: DocumentUploads;
  onEdit: (form: "form11" | "form2") => void;
  onReset: () => void;
  isEditMode?: boolean;
}

export const FormSummary: React.FC<FormSummaryProps> = ({
  form11Data,
  form2Data,
  documents,
  onEdit,
  onReset,
  isEditMode = false,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);

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
  const [apiHost, setApiHost] = useState("localhost");
  const [apiPort, setApiPort] = useState("8000");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setApiHost(window.location.hostname);
    setApiPort(window.location.port === "8080" ? "8000" : window.location.port);
  }, []);

  // const apiUrl = `http://${apiHost}:${apiPort}`;
  const apiUrl = "";

  const processForms = async (submissionPassword: string) => {
    if (!form11Data || !form2Data) return;

    setIsSubmitting(true);
    setError("");

    // Convert documents to base64 for payload
    let storedDocuments: StoredDocumentUploads | undefined;
    if (
      documents &&
      (documents.aadhaar || documents.pan || documents.passbook)
    ) {
      try {
        storedDocuments = await convertDocumentsForPayload(documents);
      } catch (err) {
        console.error("Error converting documents:", err);
      }
    }

    const payload = {
      forms: {
        form_11: form11Data,
        form_2: form2Data,
      },
      documents: storedDocuments,
      meta: {
        exported_at: new Date().toISOString(),
        version: "1.0",
      },
      password: submissionPassword,
    };

    // Handle same signature optimization - only copy bbox if Form 11 has valid signature
    if (
      (payload.forms.form_11.declaration.signature_data?.image ===
        payload.forms.form_2.declaration.signature_data?.image ||
        payload.forms.form_2.declaration.same_signature) &&
      payload.forms.form_11.declaration.signature_data?.bbox
    ) {
      payload.forms.form_2.declaration.signature_data!.image = "same";
      payload.forms.form_2.declaration.signature_data!.bbox = {
        ...payload.forms.form_11.declaration.signature_data.bbox,
      };
    }

    console.log(payload);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000); // 30 seconds

    try {
      const res = await fetch(`${apiUrl}/api/forms/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        setError("Invalid password");
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to generate PDF");
      }

      const contentType = res.headers.get("content-type") || "";

      // Case 1: Preview disabled (successful, no PDF)
      if (contentType.includes("application/json")) {
        const data = await res.json();

        if (data.preview === false) {
          // show info, not error
          toast({
            title: "Submitted successfully",
            description: "You can now close this tab.",
          });
        }

        // future-proofing
      }

      // Case 2: Preview enabled (PDF)
      else if (contentType.includes("application/pdf")) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, "_blank");
        window.URL.revokeObjectURL(url);
      }

      // --- To download the PDF ---

      // const a = document.createElement("a");
      // a.href = url;
      // a.download = res.headers.get("X-Filename") || "form11.pdf";
      // console.log(res.headers.get("X-Filename"));
      // document.body.appendChild(a);
      // a.click();

      // a.remove();

      toast({
        title: "Submitted successfully",
        description: "You can now close this tab.",
      });

      setShowPasswordDialog(false);
      setPassword("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong while generating the PDF");
      }
    } finally {
      clearTimeout(timeout);
      setIsSubmitting(false);
    }
  };

  const handleSubmitClick = () => {
    if (isEditMode) {
      // Show overwrite confirmation first if in edit mode
      setShowOverwriteConfirm(true);
    } else {
      setShowPasswordDialog(true);
      setError("");
      setPassword("");
    }
  };

  const handleOverwriteConfirm = () => {
    setShowOverwriteConfirm(false);
    setShowPasswordDialog(true);
    setError("");
    setPassword("");
  };

  const handlePasswordSubmit = () => {
    if (!password.trim()) {
      setError("Password is required");
      return;
    }
    processForms(password);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-success/10 text-success mb-4">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Forms Ready for Submission
        </h2>
        <p className="text-muted-foreground">
          Review your data and submit to generate PDF
        </p>
      </div>

      {/* API Configuration */}
      {/* <div className="p-4 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center gap-2 mb-3">
          <Server className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">
            Backend API Configuration
          </Label>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-sm text-muted-foreground">http://</span>
          <Input
            value={apiHost}
            onChange={(e) => setApiHost(e.target.value)}
            placeholder="localhost"
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground">:</span>
          <Input
            value={apiPort}
            onChange={(e) => setApiPort(e.target.value)}
            placeholder="8000"
            className="w-24"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Current API URL:{" "}
          <code className="bg-muted px-1 rounded">{apiUrl}</code>
        </p>
      </div> */}

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Form 11 Summary */}
        {form11Data && (
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Form 11</h3>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-success/10 text-success">
                Complete
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Name:</span>{" "}
                {form11Data.personal_details.member_name}
              </p>
              <p>
                <span className="text-muted-foreground">Father/Spouse:</span>{" "}
                {form11Data.personal_details.parent_spouse_name}
              </p>
              <p>
                <span className="text-muted-foreground">Mobile:</span>{" "}
                {form11Data.contact_details.mobile_no}
              </p>
              {form11Data.kyc_details.pan_no && (
                <p>
                  <span className="text-muted-foreground">PAN:</span>{" "}
                  {form11Data.kyc_details.pan_no}
                </p>
              )}
              <p>
                <span className="text-muted-foreground">Bank IFSC:</span>{" "}
                {form11Data.kyc_details.ifsc_code}
              </p>
              <p>
                <span className="text-muted-foreground">Bank A/C:</span>{" "}
                {form11Data.kyc_details.bank_account_no}
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit("form11")}
              className="w-full"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Form 11
            </Button>
          </div>
        )}

        {/* Form 2 Summary */}
        {form2Data && (
          <div className="p-6 rounded-xl border border-border bg-card space-y-4 flex flex-col !min-h-[210px]">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Form 2</h3>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-success/10 text-success">
                Complete
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Name:</span>{" "}
                {form2Data.member_name}
              </p>
              <p>
                <span className="text-muted-foreground">Nominees:</span>{" "}
                {form2Data.epf_nominees.length}
              </p>
              <p>
                <span className="text-muted-foreground">Family Members:</span>{" "}
                {form2Data.eps_family_members?.length || 0}
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit("form2")}
              className="w-full !mt-auto"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Form 2
            </Button>
          </div>
        )}
      </div>

      {/* Document Preview Section for Admin */}
      {documents &&
        (documents.aadhaar || documents.pan || documents.passbook) && (
          <div className="p-4 rounded-lg border border-border bg-muted/30">
            <Label className="text-sm font-medium mb-3 block text-center">
              Verify Uploaded Documents
            </Label>
            <div className="flex flex-wrap gap-2 justify-center">
              {documents.aadhaar && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreview("aadhaar")}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Aadhaar Card
                </Button>
              )}
              {documents.pan && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreview("pan")}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  PAN Card
                </Button>
              )}
              {documents.passbook && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreview("passbook")}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Passbook / Cheque
                </Button>
              )}
            </div>
          </div>
        )}

      {/* Submit Button */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center gap-4 pt-4">
        <Button
          variant="form"
          size="lg"
          onClick={handleSubmitClick}
          disabled={!form11Data || !form2Data || isSubmitting}
        >
          <Send className="h-5 w-5 mr-2" />
          Submit Forms
        </Button>

        <Button variant="formSecondary" size="lg" onClick={onReset}>
          Start New Entry
        </Button>
      </div>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Submission</DialogTitle>
            <DialogDescription>
              Enter the submission password to generate and download the PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter submission password"
                onKeyDown={(e) =>
                  e.key === "Enter" && !isSubmitting && handlePasswordSubmit()
                }
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPasswordDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handlePasswordSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overwrite Confirmation Dialog */}
      <Dialog
        open={showOverwriteConfirm}
        onOpenChange={setShowOverwriteConfirm}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Overwrite Existing Records?
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                You are about to submit corrected data for an existing user.
              </p>
              <p className="font-medium text-foreground">
                This will permanently overwrite:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                <li>The existing JSON data file</li>
                <li>The existing PDF document</li>
                <li>The existing TSV record</li>
              </ul>
              <p className="text-destructive font-medium mt-2">
                This action cannot be undone.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowOverwriteConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleOverwriteConfirm}>
              Yes, Overwrite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
};

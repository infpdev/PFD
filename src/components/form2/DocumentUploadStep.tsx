import React, { useRef } from "react";
import { FormSection } from "@/components/FormSection";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Eye, X, FileText, Camera } from "lucide-react";
import type { DocumentUploads } from "@/types/epf-forms";

interface DocumentUploadStepProps {
  documents: DocumentUploads;
  onDocumentsChange: (docs: DocumentUploads) => void;
  errors: Record<string, string>;
}

interface UploadFieldProps {
  label: string;
  name: string;
  file: File | null;
  preview: string | null;
  onFileChange: (file: File | null, preview: string | null) => void;
  onPreview: () => void;
  error?: string;
  required?: boolean;
}

const UploadField: React.FC<UploadFieldProps> = ({
  label,
  name,
  file,
  preview,
  onFileChange,
  onPreview,
  error,
  required,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Create preview URL
      const reader = new FileReader();
      reader.onload = () => {
        onFileChange(selectedFile, reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleClear = () => {
    onFileChange(null, null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-form-label">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept="image/jpeg,image/png,application/pdf"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!file ? (
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-12 border-dashed"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Upload {label}</span>
            <span className="sm:hidden">
              <Camera className="h-4 w-4 mr-1 inline" />
              Upload
            </span>
          </Button>
        ) : (
          <div className="flex-1 flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <span className="text-sm truncate flex-1">{file.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {preview && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPreview}
            className="shrink-0"
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Preview</span>
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};

export const DocumentUploadStep: React.FC<DocumentUploadStepProps> = ({
  documents,
  onDocumentsChange,
  errors,
}) => {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewType, setPreviewType] = React.useState<string | null>(null);

  const handlePreview = (preview: string | null, type: string | null) => {
    setPreviewUrl(preview);
    setPreviewType(type);
  };

  const closePreview = () => {
    setPreviewUrl(null);
    setPreviewType(null);
  };

  return (
    <>
      <FormSection
        title="Document Upload"
        description="Upload required identity and bank documents"
        helpText="Upload clear images or PDFs of your documents. On mobile, you can use your camera.\nದಾಖಲೆಗಳ ಸ್ಪಷ್ಟ ಚಿತ್ರಗಳನ್ನು ಅಥವಾ PDF ಗಳನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ."
        icon={<Upload className="h-5 w-5" />}
      >
        <div className="space-y-6">
          <UploadField
            label="Aadhaar Card"
            name="doc_aadhaar"
            file={documents.aadhaar?.file || null}
            preview={documents.aadhaar?.preview || null}
            onFileChange={(file, preview) =>
              onDocumentsChange({
                ...documents,
                aadhaar: file ? { file, preview } : undefined,
              })
            }
            onPreview={() =>
              handlePreview(
                documents.aadhaar?.preview || null,
                documents.aadhaar?.file?.type || null
              )
            }
            error={errors.doc_aadhaar}
            required
          />

          <UploadField
            label="PAN Card"
            name="doc_pan"
            file={documents.pan?.file || null}
            preview={documents.pan?.preview || null}
            onFileChange={(file, preview) =>
              onDocumentsChange({
                ...documents,
                pan: file ? { file, preview } : undefined,
              })
            }
            onPreview={() =>
              handlePreview(
                documents.pan?.preview || null,
                documents.pan?.file?.type || null
              )
            }
            error={errors.doc_pan}
            required
          />

          <UploadField
            label="Bank Passbook / Cancelled Cheque"
            name="doc_passbook"
            file={documents.passbook?.file || null}
            preview={documents.passbook?.preview || null}
            onFileChange={(file, preview) =>
              onDocumentsChange({
                ...documents,
                passbook: file ? { file, preview } : undefined,
              })
            }
            onPreview={() =>
              handlePreview(
                documents.passbook?.preview || null,
                documents.passbook?.file?.type || null
              )
            }
            error={errors.doc_passbook}
            required
          />
        </div>
      </FormSection>

      {/* Preview Modal */}
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
    </>
  );
};

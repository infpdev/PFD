import React, { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Lock, Unlock, Save, TriangleAlert } from "lucide-react";
import { SubmissionData, EPFNominee, EPSFamilyMember } from "@/types/epf-forms";

const apiUrl = "http://localhost:3000";

interface ViewSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: SubmissionData | null;
  search?: () => void;
}

interface FieldDef {
  key: string;
  label: string;
  readOnly?: boolean; // true for boolean/radio fields
}

// Field configuration
const fieldSections: Record<string, FieldDef[]> = {
  personal: [
    { key: "forms.form_11.personal_details.member_name", label: "Member Name" },
    {
      key: "forms.form_11.personal_details.parent_spouse_name",
      label: "Father's/Husband's Name",
    },
    {
      key: "forms.form_11.personal_details.parent_spouse_type",
      label: "Relationship Type",
      readOnly: true,
    },
    {
      key: "forms.form_11.personal_details.date_of_birth",
      label: "Date of Birth",
    },
    {
      key: "forms.form_11.personal_details.gender",
      label: "Gender",
      readOnly: true,
    },
    {
      key: "forms.form_11.personal_details.marital_status",
      label: "Marital Status",
      readOnly: true,
    },
    { key: "forms.form_2.employee_no", label: "Employee Number" },
  ],
  contact: [
    { key: "forms.form_11.contact_details.mobile_no", label: "Mobile Number" },
    { key: "forms.form_11.contact_details.email", label: "Email" },
    // { key: "forms.form_11.contact_details.permanent_address", label: "Permanent Address" },
    // { key: "forms.form_11.contact_details.temporary_address", label: "Temporary Address" },
    {
      key: "forms.form_2.permanent_address",
      label: "Form 2 Permanent Address",
    },
  ],
  kyc: [
    {
      key: "forms.form_11.kyc_details.bank_account_no",
      label: "Bank Account Number",
    },
    { key: "forms.form_11.kyc_details.ifsc_code", label: "IFSC Code" },
    { key: "forms.form_11.kyc_details.aadhaar_no", label: "Aadhaar Number" },
    { key: "forms.form_11.kyc_details.pan_no", label: "PAN Number" },
  ],
  membership: [
    {
      key: "forms.form_11.was_epf_member",
      label: "Was EPF Member",
      readOnly: true,
    },
    {
      key: "forms.form_11.was_eps_member",
      label: "Was EPS Member",
      readOnly: true,
    },
    { key: "forms.form_11.previous_employment.uan", label: "Previous UAN" },
    {
      key: "forms.form_11.previous_employment.previous_pf_account_no",
      label: "Previous PF Account No",
    },
    { key: "forms.form_11.previous_employment.exit_date", label: "Exit Date" },
    {
      key: "forms.form_11.previous_employment.scheme_certificate_no",
      label: "Scheme Certificate No",
    },
    { key: "forms.form_11.previous_employment.ppo_no", label: "PPO Number" },
  ],
  international: [
    {
      key: "forms.form_11.international_worker.is_international_worker",
      label: "Is International Worker",
      readOnly: true,
    },
    {
      key: "forms.form_11.international_worker.country_of_origin",
      label: "Country of Origin",
    },
    {
      key: "forms.form_11.international_worker.passport_no",
      label: "Passport Number",
    },
    {
      key: "forms.form_11.international_worker.passport_validity_from",
      label: "Passport Valid From",
    },
    {
      key: "forms.form_11.international_worker.passport_validity_to",
      label: "Passport Valid To",
    },
  ],
};

const getNestedValue = (obj: unknown, path: string): unknown => {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
};

const setNestedValue = <T,>(obj: T, path: string, value: unknown): T => {
  const parts = path.split(".");
  const newObj = structuredClone(obj) as T;
  let current = newObj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof current[parts[i]] !== "object" || current[parts[i]] === null) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
  return newObj;
};

const NomineeSection = ({ submission }: { submission: SubmissionData }) => {
  const epfNominees: EPFNominee[] =
    submission.forms?.form_2?.epf_nominees || [];
  const epsFamily: EPSFamilyMember[] =
    submission.forms?.form_2?.eps_family_members || [];
  const hasNoFamilyEpf = submission.forms?.form_2?.has_no_family_epf;
  const dependentParents = submission.forms?.form_2?.dependent_parents;

  return (
    <div className="space-y-6">
      {/* EPF Nominees */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">
          EPF Nominees (Part A)
        </h4>
        <div className="grid gap-2 md:grid-cols-2 mb-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">
              No Family for EPF
            </Label>
            <Input
              value={hasNoFamilyEpf ? "Yes" : "No"}
              disabled
              className="bg-muted cursor-not-allowed"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">
              Has Dependent Parents
            </Label>
            <Input
              value={dependentParents ? "Yes" : "No"}
              disabled
              className="bg-muted cursor-not-allowed"
            />
          </div>
        </div>
        {epfNominees.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No EPF nominees recorded.
          </p>
        ) : (
          epfNominees.map((n, i) => (
            <div key={n.id || i} className="border rounded-lg p-3 mb-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Nominee {i + 1}
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {[
                  ["Name", n.name],
                  ["Relationship", n.relationship],
                  ["DOB", n.date_of_birth],
                  ["Share %", String(n.share_percentage)],
                  ["Address", n.address],
                  ["Is Minor", n.is_minor ? "Yes" : "No"],
                  ...(n.is_minor ? [["Guardian", n.guardian_name || "—"]] : []),
                ].map(([label, val]) => (
                  <div key={label} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {label}
                    </Label>
                    <Input
                      value={String(val || "—")}
                      disabled
                      className="bg-muted cursor-not-allowed h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* EPS Family */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">
          EPS Family Members (Part B)
        </h4>
        {epsFamily.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No EPS family members recorded.
          </p>
        ) : (
          epsFamily.map((m, i) => (
            <div key={m.id || i} className="border rounded-lg p-3 mb-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Member {i + 1}
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {[
                  ["Name", m.name],
                  ["Relationship", m.relationship],
                  ["DOB", m.date_of_birth],
                  ["Address", m.address],
                ].map(([label, val]) => (
                  <div key={label} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {label}
                    </Label>
                    <Input
                      value={String(val || "—")}
                      disabled
                      className="bg-muted cursor-not-allowed h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const ViewSubmissionDialog = ({
  open,
  onOpenChange,
  submission,
  search,
}: ViewSubmissionDialogProps) => {
  const [lockedFields, setLockedFields] = useState<Record<string, boolean>>({});
  const [editedData, setEditedData] = useState<SubmissionData | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingUnlockField, setPendingUnlockField] = useState<string | null>(
    null,
  );
  const [hasAcknowledgedWarning, setHasAcknowledgedWarning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (submission) {
      setEditedData(JSON.parse(JSON.stringify(submission)));
      const allFields: Record<string, boolean> = {};
      Object.values(fieldSections)
        .flat()
        .forEach((field) => {
          allFields[field.key] = true;
        });
      setLockedFields(allFields);
      setHasAcknowledgedWarning(false);
    }
  }, [submission]);

  const handleLockToggle = useCallback(
    (fieldKey: string) => {
      const isCurrentlyLocked = lockedFields[fieldKey] !== false;
      if (isCurrentlyLocked) {
        if (!hasAcknowledgedWarning) {
          setPendingUnlockField(fieldKey);
          setShowWarning(true);
          return;
        }
        setLockedFields((prev) => ({ ...prev, [fieldKey]: false }));
      } else {
        setLockedFields((prev) => ({ ...prev, [fieldKey]: true }));
      }
    },
    [lockedFields, hasAcknowledgedWarning],
  );

  const handleWarningAccept = useCallback(() => {
    setHasAcknowledgedWarning(true);
    if (pendingUnlockField) {
      setLockedFields((prev) => ({ ...prev, [pendingUnlockField]: false }));
    }
    setPendingUnlockField(null);
    setShowWarning(false);
  }, [pendingUnlockField]);

  const handleFieldChange = useCallback(
    (fieldKey: string, value: string) => {
      if (!editedData) return;
      setEditedData(setNestedValue(editedData, fieldKey, value.toUpperCase()));
    },
    [editedData],
  );

  const unlockedFields = useMemo(() => {
    return Object.entries(lockedFields)
      .filter(([_, isLocked]) => !isLocked)
      .map(([key]) => key);
  }, [lockedFields]);

  const handleSave = async () => {
    if (!editedData || unlockedFields.length === 0) return;
    const updatedFields: Record<string, unknown> = {};
    unlockedFields.forEach((fieldKey) => {
      updatedFields[fieldKey] = getNestedValue(editedData, fieldKey);
    });
    setIsSaving(true);
    try {
      const res = await fetch(`${apiUrl}/api/submission/${editedData.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editedData.id, updates: updatedFields }),
      });
      if (res.ok) {
        onOpenChange(false);
        toast({
          variant: "default",
          title: "Edited successfully",
          description: "Changes reflected on the submitted data.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Edit failed",
          description: "Failed to edit the details, try again later.",
        });
      }
    } catch (err) {
      console.error("Failed to save:", err);
      toast({
        variant: "destructive",
        title: "Edit failed",
        description: "Failed to edit the details, try again later.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (field: FieldDef) => {
    const value = editedData ? getNestedValue(editedData, field.key) : "";
    const isLocked = lockedFields[field.key] !== false;
    const displayValue =
      typeof value === "boolean" ? (value ? "Yes" : "No") : String(value || "");

    // Read-only fields (booleans/radio selections) — always disabled, no lock toggle
    if (field.readOnly) {
      return (
        <div key={field.key} className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">
            {field.label}
          </Label>
          <Input
            value={displayValue}
            disabled
            className="bg-muted cursor-not-allowed"
          />
        </div>
      );
    }

    return (
      <div key={field.key} className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-foreground">
            {field.label}
          </Label>
          <button
            type="button"
            onClick={() => handleLockToggle(field.key)}
            className="p-1 rounded hover:bg-muted transition-colors"
            title={isLocked ? "Click to unlock and edit" : "Click to lock"}
          >
            {isLocked ? (
              <Lock className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Unlock className="h-4 w-4 text-primary" />
            )}
          </button>
        </div>
        <Input
          value={displayValue}
          onChange={(e) => handleFieldChange(field.key, e.target.value)}
          disabled={isLocked}
          className={isLocked ? "bg-muted cursor-not-allowed" : ""}
        />
      </div>
    );
  };

  if (!submission) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>View Submission</DialogTitle>
            <DialogDescription>
              Submission ID: {submission.id} | Employee:{" "}
              {submission.uan || "N/A"}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[60vh] pr-4">
            <Tabs defaultValue="personal" className="w-full p-1">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="kyc">KYC</TabsTrigger>
                <TabsTrigger value="membership">Membership</TabsTrigger>
                <TabsTrigger value="international">International</TabsTrigger>
                <TabsTrigger value="nominees">Nominees</TabsTrigger>
              </TabsList>

              {Object.entries(fieldSections).map(([section, fields]) => (
                <TabsContent key={section} value={section} className="mt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {fields.map(renderField)}
                  </div>
                </TabsContent>
              ))}

              <TabsContent value="nominees" className="mt-4">
                <NomineeSection submission={editedData || submission} />
              </TabsContent>
            </Tabs>
          </ScrollArea>

          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {unlockedFields.length > 0
                ? `${unlockedFields.length} field(s) unlocked for editing`
                : "Click the lock icon to unlock fields for editing"}
            </p>
            <Button
              onClick={handleSave}
              disabled={isSaving || unlockedFields.length === 0}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlert /> Admin Edit Responsibility Warning
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span>
                You are about to unlock a field for editing. By proceeding, you
                acknowledge that:
              </span>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Your name will be logged in the system for this edit</li>
                <li>You are responsible for any changes made</li>
                <li>All edits are tracked and auditable</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingUnlockField(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleWarningAccept}>
              I Understand, Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ViewSubmissionDialog;

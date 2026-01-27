from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import date


class PersonalDetails(BaseModel):
    member_name: str
    parent_spouse_name: str
    parent_spouse_type: str  # father / spouse
    date_of_birth: date
    gender: str
    marital_status: str


class ContactDetails(BaseModel):
    email: str
    mobile_no: str


class PreviousEmployment(BaseModel):
    uan: Optional[str] = None
    previous_pf_account_no: Optional[str] = None
    exit_date: Optional[date] = None
    scheme_certificate_no: Optional[str] = None
    ppo_no: Optional[str] = None

    @field_validator("exit_date", mode="before")
    @classmethod
    def empty_string_to_none(cls, v):
        if v == "":
            return None
        return v


class InternationalWorker(BaseModel):
    is_international_worker: bool
    country_of_origin: Optional[str] = None
    passport_no: Optional[str] = None
    passport_validity_from: Optional[date] = None
    passport_validity_to: Optional[date] = None



class KYCDetails(BaseModel):
    bank_account_no: str
    ifsc_code: str
    aadhaar_no: str
    pan_no: str


class SignatureBBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class SignatureData(BaseModel):
    image: str              # base64 PNG
    bbox: SignatureBBox     # bounding box


class Declaration(BaseModel):
    place: str
    date: date
    signature_data: Optional[SignatureData] = None
    same_signature: Optional[bool] = False


class Form11Data(BaseModel):
    personal_details: PersonalDetails
    contact_details: ContactDetails

    was_epf_member: bool
    was_eps_member: bool

    previous_employment: Optional[PreviousEmployment] = None
    international_worker: InternationalWorker
    kyc_details: KYCDetails
    declaration: Declaration



# class Form11Submission(BaseModel):
#     form_type: str
#     data: Form11Data
#     exported_at: Optional[str] = None
#     version: str

# Form 2 type

class EPFNominee(BaseModel):
    id: Optional[str] = None
    name: str
    address: str
    relationship: str
    date_of_birth: str
    share_percentage: float
    is_minor: bool
    guardian_name: Optional[str] = None
    guardian_relationship: Optional[str] = None
    guardian_address: Optional[str] = None
    other_relationship: Optional[str] = None


class EPSFamilyMember(BaseModel):
    id: Optional[str] = None
    name: str
    address: str
    date_of_birth: str
    relationship: str
    other_relationship: Optional[str] = None


class PensionNominee(BaseModel):
    name: str
    address: str
    date_of_birth: str
    relationship: str
    other_relationship: Optional[str] = None


class Form2Data(BaseModel):
    member_name: str
    father_husband_name: str
    date_of_birth: str
    gender: str
    employee_no: Optional[str] = None
    pf_account_no: Optional[str] = None
    marital_status: str
    mobile_no: str
    permanent_address: str

    epf_nominees: List[EPFNominee] = Field(default_factory=list)
    has_no_family_epf: bool
    dependent_parents: bool

    eps_family_members: List[EPSFamilyMember] = Field(default_factory=list)
    has_no_family_eps: bool

    pension_nominee: Optional[PensionNominee] = None
    declaration: Declaration


class FormsPayload(BaseModel):
    form_11: Optional[Form11Data]
    form_2: Optional[Form2Data]


class MetaPayload(BaseModel):
    exported_at: str
    version: str


class StoredDocument(BaseModel):
    name: str
    type: str
    base64: str # base64 encoded file content
    preview: Optional[str] = None

class StoredDocumentUploads(BaseModel):
    aadhaar: StoredDocument
    pan: StoredDocument
    passbook: StoredDocument


class Payload(BaseModel):
    forms: FormsPayload
    meta: MetaPayload
    documents: StoredDocumentUploads
    password: str = ""
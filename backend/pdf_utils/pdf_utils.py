import configparser
from datetime import date, datetime
import io
# import json
# import os
import textwrap
from typing import Any, Optional
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from pypdf import PdfReader, PdfWriter, Transformation
from backend.models import Form2Data, FormsPayload, Payload, Form11Data, StoredDocumentUploads
import base64
from reportlab.lib.utils import ImageReader
from reportlab.lib import colors 
from PIL import Image
import sys
from pathlib import Path

from backend.pdf_utils.send_mail import ensure_config, get_app_dir


def resource_path(relative_path: str) -> str:
    """
    Get absolute path to resource, works for dev and PyInstaller
    """
    if hasattr(sys, "_MEIPASS"):
        base = Path(sys._MEIPASS)
    else:
        base = Path(__file__).parent

    return str((base / relative_path).resolve())


TEMPLATE_PATH = resource_path("template.pdf")
OVERLAY_PATH = resource_path("overlay.pdf")

APP_DIR = get_app_dir()
CONFIG_PATH = APP_DIR / "config.ini"




# BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# TEMPLATE_PATH = os.path.join(BASE_DIR, "template.pdf")
# TEMPLATE_PATH = resource_path("pf_with_grid.pdf") # use to set coordinates
# OVERLAY_PATH = os.path.join(BASE_DIR, "overlay.pdf")
# JSON_FILE = os.path.join(BASE_DIR, "data.json")
# DESTINATION_PATH = os.path.join(BASE_DIR, "filled_pf_demo.pdf")




def form2_to_tsv(forms) -> str:
    
    def clean(value):
        if value is None:
            return ""
        return str(value).replace("\t", " ").replace("\n", " ").strip()
    
    f2 = forms.form_2
    f11 = forms.form_11

    headers = [
        "Member Name",
        "Date of Birth",
        "Mobile Number",

        "UAN",
        "Bank acc. no.",
        "Bank IFSC",
        
        "Father / Husband Name",
        "PF Account Number",

        "Nominee 1 Name",
        "Nominee 1 DOB",
        "Nominee 1 Relationship",

        "Nominee 2 Name",
        "Nominee 2 DOB",
        "Nominee 2 Relationship",
    ]

    values = [
        f2.member_name,
        f2.date_of_birth,
        f2.mobile_no,
        f11.previous_employment.uan if f11.previous_employment else "",
        f11.kyc_details.bank_account_no,
        f11.kyc_details.ifsc_code,
        f2.father_husband_name,
        f2.pf_account_no or "",
    ]

    # EPF nominees (max 2)
    nominees = f2.epf_nominees[:2]

    for i in range(2):
        if i < len(nominees):
            n = nominees[i]
            values.extend([
                n.name,
                n.date_of_birth,
                n.relationship,
            ])
        else:
            values.extend(["", "", ""])

    header_row = "\t".join(headers)
    data_row = "\t".join(clean(v) for v in values)

    
    


    return data_row
    return "\t".join(str(v) for v in values)

    # return f"{header_row}\n{data_row}" # to include header


#                                                                                --- FORM 11 FUNCTION ---

def form_11(c, data, extra: Optional[dict[str,Any]]):

    if extra is None:
        extra = {}
    
    fields = prepare_form11_pdf_fields(data)
    



    EPFS_POSITIONS = {
        True: (424, 602),
        False: (502, 602),
    }
    EPS_POSITIONS = {
        True: (424, 589),
        False: (502, 589),
    }

    INTERNATIONAL_WORKER_POS = {
        True: (424, 496),
        False: (502, 496),
    }

    company_x = 450 - len(defaultValuesFromConfig.get("company_name","")) * 1.5

    FIELD_MAP = {
        "company": (company_x,753, defaultValuesFromConfig.get("company_name","")),
        "name": (350, 705, fields["name"].upper()),
        "name_declaration": (183, 265, fields["name"].upper(), True),
        "father_name": (350, 682, fields["father_name"].upper()),
        "dob_day": (350, 665, fields["dob_day"]),
        "dob_month": (430, 665, fields["dob_month"]),
        "dob_year": (495, 665, fields["dob_year"]),
        "gender": (350, 650, fields["gender"].upper()),
        "marital_status": (350, 635, fields["marital_status"].upper()),
        "mail": (350, 624, fields["email"]),
        "mobile": (350, 612, fields["mobile"]),
        "member_of_epf": (
            *EPFS_POSITIONS[fields["member_of_epf"]],
            "✔",
        ),
        "member_of_eps": (
            *EPS_POSITIONS[fields["member_of_eps"]],
            "✔",
        ),


        # "prev_pf_no": (350, 546, fields["pf_no"]),
        "exit_date_day": (350, 534, fields["exit_date_day"]),
        "exit_date_month": (455, 534, fields["exit_date_month"]),
        "exit_date_year": (530, 534, fields["exit_date_year"]),
        "scheme_cert_no": (350, 521, fields["scheme_cert_no"]),
        "ppo": (350, 508, fields["ppo"]),

        "international_worker": (
            *INTERNATIONAL_WORKER_POS[fields["international_worker"]], "✔"
        ),
        "country_of_origin": (350, 484, fields["country_of_origin"]),
        "passport_no": (350, 472, fields["passport_no"]),
        "pp_validity": (350, 460, fields["pp_validity"]),



        "bank_and_ifsc": (350, 434, fields["bank_and_ifsc"]),
        "aadhaar": (350, 420, fields["aadhaar"]),
        "pan": (350, 405, fields["pan"]),
        "date": (100, 305, fields["date"]),
        "place" : (100, 294, fields["place"])

    }

    BASE_FONT = 10
    BASE_CHARS = 28
    MIN_FONT = 6

    for _, value in FIELD_MAP.items():
        x, y, text = value[:3]
        spaceConstraint = value[3] if len(value) > 3 else False
        
        if text:  # safety
            if spaceConstraint and len(text) >= 28:
                font_size = max(
                MIN_FONT,
                BASE_FONT * BASE_CHARS / max(len(text), BASE_CHARS)
)
                c.setFontSize(font_size)
            else:
                c.setFontSize(10)
                
            c.drawString(x, y, str(text))


    c.acroForm.textfield(
    name="pf_number",
    tooltip="Enter PF Number",
    x=150,
    y=250,
    fontSize=10,
    height=12,
    maxlen=14, 
    borderWidth=0,       
    forceBorder=False,     
    fillColor=colors.transparent,       
    borderColor=colors.transparent,
    value="",
    textColor=colors.black,
    )


    c.acroForm.textfield(
    name="employee_number",
    tooltip="Enter employee code",
    x=425,
    y=773,
    fontSize=13,
    height=14,
    maxlen=8, 
    width = 60,
    borderWidth=0,       
    forceBorder=False,     
    fillColor=colors.transparent,       
    borderColor=colors.transparent,
    value=extra["eno"] if extra["eno"] else "",
    textColor=colors.black,
    )

    c.acroForm.textfield(
    name="pf_number_top",
    tooltip="Enter PF Number",
    x=205,
    y=794,
    fontSize=14,
    width = 45,
    height=16,
    maxlen=5, 
    borderWidth=0,       
    forceBorder=False,     
    fillColor=colors.transparent,       
    borderColor=colors.transparent,
    value="",
    textColor=colors.black,
    )
    
    c.acroForm.textfield(
        name="uan_f1",
        tooltip="Enter UAN",
        x=350,
        maxlen=12, 
        y=558,
        width=140,
        height=14,
        fontSize=10,
        borderWidth=0,    
        textColor=colors.black,     
        forceBorder=False,     
        fillColor=colors.transparent,       
        borderColor=colors.transparent,
        value=fields["uan"] if fields["uan"] else "",
    )
    
    c.acroForm.textfield(
        name="pf_ac_number_f1",
        tooltip="Enter PF account number",
        x=350,
        maxlen=26, 
        y=542,
        width=140,
        height=14,
        fontSize=10,
        borderWidth=0,    
        textColor=colors.black,     
        forceBorder=False,     
        fillColor=colors.transparent,       
        borderColor=colors.transparent,
        value=fields["pf_no"] if fields["pf_no"] else "",
    )
    


    c.acroForm.textfield(
    name="join_date",
    tooltip="Enter joining date",
    x=445,
    maxlen=10, 
    y=262,
    width=55,
    height=12,
    fontSize=10,
    borderWidth=0,       
    forceBorder=False,     
    fillColor=colors.transparent,       
    borderColor=colors.transparent,
    value=str(date.today().strftime("%d/%m/%Y")),
    textColor=colors.black,
    )


    sig_data = data.declaration.signature_data
    bounds = sig_data.bbox
    signature_img = signature_to_image(sig_data.image)

    # (bounds.y - bounds.height)*0.2667
    if signature_img:
        c.drawImage(
            signature_img,
            x=500 - (bounds.x - bounds.width/2)*0.2667,
            y=290 + (bounds.y - bounds.height/2)*0.2667,
            width=106,
            height=40,
            mask="auto"
        )
    
    

def wrap_address(addr: str, width: int = 48, max_lines: int = 3) -> list[str]:
    lines = textwrap.wrap(addr, width=width)
    return lines[:max_lines]


#                                                                                --- FORM 2 FUNCTION ---

def form_2(c,data, sigData = None):
    data = prepare_form2_pdf_fields(data)
    
    f2_page1(c, data, sigData)
    c.showPage()
    f2_page2(c, data, sigData)
    



def f2_page1(c,fields, sigData = None):
    
    # print(fields)
    
    def normalize_address(addr: str) -> str:
        return " ".join(addr.replace("\n", " ").split())

    

    
    def draw_address(c, addr: str, x: int, y: int):
        addr = normalize_address(addr)
        lines = wrap_address(addr)

        line_height = 20
        c.setFontSize(9)

        for i, line in enumerate(lines):
            c.drawString(x, y - (i * line_height), line)
        
        c.setFontSize(10)

            
    
    draw_address(c, fields["address"], x=273, y=577)
    

    NOMINEE_BLOCK_HEIGHT = 80      # total height per nominee
    LINE_HEIGHT = 10
    ADDRESS_START_OFFSET = -16
    
            
        
    def draw_epf_nominee_block(c, nominee, x, y):
        # Column X positions
        NAME_X = x
        REL_X = 220
        DOB_X = 285
        SHARE_X = 370
        MINOR_X = 430

        is_minor = nominee.is_minor

        c.setFont("Helvetica", 10)
        c.drawString(NAME_X, y, nominee.name)

        relationship = nominee.other_relationship if nominee.relationship.lower() == "other" else nominee.relationship
        c.drawString(REL_X, y, relationship)

        c.drawString(DOB_X, y, nominee.date_of_birth)
        c.drawString(SHARE_X, y, f"{int(nominee.share_percentage)}%")

        if is_minor:
            c.drawString(MINOR_X, y, nominee.guardian_name)
            c.drawString(MINOR_X, y - LINE_HEIGHT - 2, nominee.guardian_relationship)


        # ---- Address (below name, multi-line) ----
        addr_lines = wrap_address(nominee.address, 34)
        guardian_addr = (
            wrap_address(nominee.guardian_address, 32)
            if is_minor
            else None
        )


        if addr_lines:
            c.setFont("Helvetica", 8)
            for i, line in enumerate(addr_lines):
                c.drawString(
                    NAME_X,
                    y + ADDRESS_START_OFFSET - (i * LINE_HEIGHT),
                    line,
                )
            c.setFont("Helvetica", 10)

        if guardian_addr:
            c.setFont("Helvetica", 8)
            for i, line in enumerate(guardian_addr):
                c.drawString(
                    MINOR_X,
                    y + ADDRESS_START_OFFSET - 6 - (i * LINE_HEIGHT),
                    line,
                )
            c.setFont("Helvetica", 10)



    def draw_epf_nominees(c, nominees, x, start_y):
        for idx, nominee in enumerate(nominees[:2]):
            block_y = start_y - (idx * NOMINEE_BLOCK_HEIGHT)
            draw_epf_nominee_block(c, nominee, x, block_y)


    draw_epf_nominees(c, fields["nominees_epf"], x=55, start_y=335)
    

    FIELD_MAP = {
        "name": (260, 672, fields["name"].upper(), True),
        "father_name": (250, 652, fields["father_husband_name"].upper()),
        "dob": (200, 633, fields["dob"]),
        "gender": (380, 633, fields["gender"].upper()),
        "marital_status": (200, 595, fields["marital_status"].upper()),
        "mobile": (400, 595, fields["mobile"]),
    }

    BASE_FONT = 10
    BASE_CHARS = 28
    MIN_FONT = 6

    for _, value in FIELD_MAP.items():
        x, y, text = value[:3]
        spaceConstraint = value[3] if len(value) > 3 else False
        
        if text:  # safety
            if spaceConstraint and len(text) >= 28:
                font_size = max(
                MIN_FONT,
                BASE_FONT * BASE_CHARS / max(len(text), BASE_CHARS)
                )   
                c.setFontSize(font_size)
            else:
                c.setFontSize(10)
                
            c.drawString(x, y, str(text))
            
    
    c.acroForm.textfield(
        name="pf_ac_number_f2",
        tooltip="Enter PF account number",
        x=407,
        maxlen=26, 
        y=610,
        width=140,
        height=14,
        fontSize=10,
        borderWidth=0,    
        textColor=colors.black,     
        forceBorder=False,     
        fillColor=colors.transparent,       
        borderColor=colors.transparent,
        value=fields["ppn"] if fields["ppn"] else "",
    )
    
    
    c.acroForm.textfield(
        name="emp_no",
        tooltip="Enter employee number",
        x=175,
        maxlen=8,
        y=610,
        width=60,
        height=14,
        fontSize=10,
        borderWidth=0,    
        textColor=colors.black,     
        forceBorder=False,     
        fillColor=colors.transparent,       
        borderColor=colors.transparent,
        value=fields["eno"],
    )
            
            
    sig_data = sigData
    bounds = sig_data.bbox
    signature_img = signature_to_image(sig_data.image)

    # (bounds.y - bounds.height)*0.2667
    if signature_img:
        c.drawImage(
            signature_img,
            x=420 - (bounds.x - bounds.width/2)*0.2667,       
            y=80 + (bounds.y - bounds.height/2)*0.2667,        
            width=106,    
            height=40,
            mask="auto"  
        )


def f2_page2(c,fields, sigData = None):
    
    
    NOMINEE_BLOCK_HEIGHT = 50     # total height per member
    LINE_HEIGHT = 10
    ADDRESS_START_OFFSET = -12
    
    def draw_eps_member_block(c, member, x, y):
        # Column X positions
        NAME_X = x
        ADDR_X = 240
        DOB_X = 385
        REL_X = 485

        # ---- Name (main row) ----
        c.setFont("Helvetica", 10)
        c.drawString(NAME_X, y, member.name)
        
        # ---- Other columns (aligned with name) ----
        
        addr_lines = wrap_address(member.address, 34)

        if addr_lines:
            c.setFont("Helvetica", 8)
            for i, line in enumerate(addr_lines):
                c.drawString(
                    ADDR_X,
                    y  - (i * LINE_HEIGHT),
                    line,
                )
            c.setFont("Helvetica", 10)
        
        c.drawString(DOB_X, y, member.date_of_birth)
        c.drawString(REL_X, y, member.relationship)        

        



    def draw_eps_members(c, members, x, start_y):
        for idx, member in enumerate(members[:2]):
            block_y = start_y - (idx * NOMINEE_BLOCK_HEIGHT)
            draw_eps_member_block(c, member, x, block_y)


    draw_eps_members(c, fields["nominees_eps"], x=90, start_y=668) if fields["nominees_eps"] else None
    
    
    def draw_eps_nominee_block(c, member, x, y):
        # Column X positions
        NAME_X = x
        DOB_X = 310
        REL_X = 450

        # ---- Name (main row) ----
        c.setFont("Helvetica", 10)
        c.drawString(NAME_X, y, member.name)
        addr_lines = wrap_address(member.address, 34)

        if addr_lines:
            c.setFont("Helvetica", 8)
            for i, line in enumerate(addr_lines):
                c.drawString(
                    NAME_X,
                    y + ADDRESS_START_OFFSET - (i * LINE_HEIGHT),
                    line,
                )
            c.setFont("Helvetica", 10)
        
        # ---- Other columns (aligned with name) ----
        
        c.drawString(DOB_X, y, member.date_of_birth)
        c.drawString(REL_X, y, member.relationship)
        
        
        
    # print(fields["pension_nominee"])
    draw_eps_nominee_block(c, fields["pension_nominee"], 55,467) if fields["pension_nominee"] else None

    
    sig_data = sigData
    bounds = sig_data.bbox
    signature_img = signature_to_image(sig_data.image)

    # (bounds.y - bounds.height)*0.2667
    if signature_img:
        c.drawImage(
            signature_img,
            x=425 - (bounds.x - bounds.width/2)*0.2667,       
            y=350 + (bounds.y - bounds.height/2)*0.2667,        
            width=106,    
            height=40,
            mask="auto"  
        )
        
    c.drawString(80, 364, str(fields["date"]))
    c.drawString(80, 350, fields["place"])
    
    pass
TEMPLATE = resource_path("config.template.ini")  # bundled, read-only



def readDefaults():
    try:
        ensure_config()
    except RuntimeError as e:
        print(e)
        return {}
     
    cfg = configparser.ConfigParser()
    cfg.read(CONFIG_PATH, encoding="utf-8")

    defaults = cfg["defaults"] if "defaults" in cfg else {}
    company_name = defaults.get("company_name", fallback="").strip().upper()
    password = defaults.get("password", fallback="").strip()
    show_preview = cfg.getboolean("defaults", "show_preview", fallback=False)
    
    return {
        "company_name" : company_name,
        "password": password,
        "show_preview": show_preview,
        }

defaultValuesFromConfig = readDefaults()

def generate_merged_forms(output_path: str, data: FormsPayload, docs: StoredDocumentUploads):
    

    c = canvas.Canvas(OVERLAY_PATH, pagesize=A4)
    c.setFont("Helvetica", 10)
    
    c.setTitle("PF")

    form_11(c, data.form_11, extra={"eno":data.form_2.employee_no})
    
    c.showPage()
    form_2(c, data.form_2, sigData=data.form_2.declaration.signature_data if not data.form_2.declaration.same_signature else data.form_11.declaration.signature_data)

    c.save()

    # forms_pdf = PdfReader(OVERLAY_PATH)
    c.acroForm.needAppearances = True

    writer = PdfWriter()

    template_pdf = PdfReader(TEMPLATE_PATH)
    overlay_pdf = PdfReader(OVERLAY_PATH)

    template_pages = len(template_pdf.pages)

    for i, overlay_page in enumerate(overlay_pdf.pages):
        if i < template_pages:
            base = template_pdf.pages[i]
            base.merge_page(overlay_page)
            writer.add_page(base)
        else:
            # pages beyond template (attachments)
            writer.add_page(overlay_page)

    sig_data=data.form_2.declaration.signature_data if not data.form_2.declaration.same_signature else data.form_11.declaration.signature_data


    for _, stored_doc in docs:

        # ---- PDF attachment ----
        if stored_doc.type == "application/pdf":
            append_pdf_attachment(
                writer,
                decode_base64(stored_doc.base64),
                sig_data
            )
            continue

        # ---- IMAGE attachment ----
        c = canvas.Canvas(OVERLAY_PATH, pagesize=A4)
        draw_attachment_page(c, stored_doc, sig_data)
        draw_signature(c, sig_data, x=A4[0]/2, y=20)

        c.save()

        img_pdf = PdfReader(OVERLAY_PATH)
        writer.add_page(img_pdf.pages[-1])




    with open(output_path, "wb") as f:
        writer.write(f)


    # print("✅ PDF Generated: ", output_path)


def draw_signature(c, sig_data, x, y, width=106, height=40):
    if not sig_data:
        return

    signature_img = signature_to_image(sig_data.image)
    if not signature_img:
        return

    bounds = sig_data.bbox

    c.drawImage(
        signature_img,
        x=x - (bounds.x - bounds.width / 2) * 0.2667 * 2, # * 2 since width will move it towards right
        y=y + (bounds.y - bounds.height / 2) * 0.2667,
        width=width*2,
        height=height*2,
        mask="auto",
    )



def crop_signature(signature_data):
    """
    signature_data: SignatureData (image + bbox)
    returns: ImageReader of cropped signature
    """

    # 1. Decode base64 image
    header, encoded = signature_data.image.split(",", 1)
    image_bytes = base64.b64decode(encoded)

    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")

    # 2. Extract bbox
    x = int(signature_data.bbox.x)
    y = int(signature_data.bbox.y)
    w = int(signature_data.bbox.width)
    h = int(signature_data.bbox.height)

    # Safety clamp
    w = max(1, w)
    h = max(1, h)

    # 3. Crop (Pillow uses top-left origin)
    cropped = img.crop((x, y, x + w, y + h))

    # 4. Convert to ReportLab ImageReader
    buf = io.BytesIO()
    cropped.save(buf, format="PNG")
    buf.seek(0)

    return ImageReader(buf)


def prepare_form11_pdf_fields(data: Form11Data) -> dict:
    pd = data.personal_details
    cd = data.contact_details
    pe = data.previous_employment
    pe_details_allow = data.was_epf_member or data.was_eps_member
    
    kyc = data.kyc_details
    dec = data.declaration
    id = data.international_worker

    is_int_worker = id.is_international_worker

    dob = pd.date_of_birth

    bank_and_ifsc = f"{kyc.bank_account_no} {kyc.ifsc_code}"
    pp_validity = ""

    if is_int_worker:
        if id.passport_validity_from and id.passport_validity_to:
            pp_validity = (
                f"{id.passport_validity_from.strftime('%d/%m/%Y')}"
                f"   to   "
                f"{id.passport_validity_to.strftime('%d/%m/%Y')}"
            )

    return {
        "name": pd.member_name,
        "father_name": pd.parent_spouse_name,

        "dob_day": f"{dob.day:02d}",
        "dob_month": f"{dob.month:02d}",
        "dob_year": str(dob.year),

        "gender": pd.gender,
        "marital_status": pd.marital_status,

        "email": cd.email,
        "mobile": cd.mobile_no,

        "pe":pe_details_allow,
        "member_of_epf": data.was_epf_member,
        "member_of_eps": data.was_eps_member,


        "uan": pe.uan if pe.uan else "",
        "pf_no": pe.previous_pf_account_no if pe_details_allow else "",
        "exit_date_day": f"{pe.exit_date.day:02d}" if pe_details_allow and pe.exit_date else "",
        "exit_date_month": f"{pe.exit_date.month:02d}" if pe_details_allow and pe.exit_date else "",
        "exit_date_year": str(pe.exit_date.year) if pe_details_allow and pe.exit_date else "",
        "scheme_cert_no": pe.scheme_certificate_no if pe_details_allow else "",
        "ppo": pe.ppo_no if pe_details_allow else "",


        "international_worker": id.is_international_worker,
        "country_of_origin": id.country_of_origin if is_int_worker else "",
        "passport_no": id.passport_no if is_int_worker else "",
        "pp_validity": pp_validity,

        "bank_and_ifsc": bank_and_ifsc,
        "aadhaar": kyc.aadhaar_no,
        "pan": kyc.pan_no,

        "place": dec.place,
        "date": datetime.now().strftime("%d/%m/%Y"),
        
    }
    
    
    
def prepare_form2_pdf_fields(data: Form2Data) -> dict:
    d = data
    decl = d.declaration

    dob = (
        d.date_of_birth
        if not isinstance(d.date_of_birth, str)
        else datetime.strptime(d.date_of_birth, "%Y-%m-%d").date().strftime("%d / %m / %Y")
    )
    MANDATORY_EPS_STATUSES = {"single", "divorced"}
    

    epf_nominees = d.epf_nominees
    if d.marital_status in MANDATORY_EPS_STATUSES and not d.eps_family_members:
        raise ValueError(
            "EPS family members are required for single or divorced employees. It has not been filled."
        )
    eps_members = d.eps_family_members if (d.marital_status=="married" or d.marital_status=="widow") else []


    return {
        "name": d.member_name,
        "father_husband_name": d.father_husband_name,
        
        "dob" : dob,

        "gender": d.gender,
        "marital_status": d.marital_status,

        "mobile": d.mobile_no,
        "address": d.permanent_address,
        
        "ppn": d.pf_account_no if d.pf_account_no else None,
        "eno":d.employee_no if d.employee_no else "",

        "has_no_family_epf": d.has_no_family_epf,
        "nominees_epf": epf_nominees,

        "has_no_family_eps": d.has_no_family_eps,
        "nominees_eps": eps_members,

        "pension_nominee": d.pension_nominee,

        "place": decl.place,
        "date": datetime.now().strftime("%d/%m/%Y"),

        "signature_data": decl.signature_data,
    }




def signature_to_image(signature_data: str) -> ImageReader:
    """
    Converts base64 signature data URL to a ReportLab ImageReader
    """
    if not signature_data:
        return None

    # Remove data:image/...;base64, part
    header, encoded = signature_data.split(",", 1)

    image_bytes = base64.b64decode(encoded)
    image_stream = io.BytesIO(image_bytes)

    return ImageReader(image_stream)


def decode_base64(data_url: str) -> bytes:
    return base64.b64decode(data_url.split(",", 1)[1])



def draw_attachment_page(c, doc, sig_data = None, scale=0.7):
    """
    doc: StoredDocumentUploads item
      - doc.type  -> mime type
      - doc.base64 -> data URL
    """

    a4_w, a4_h = A4

    # print(doc)

    raw = decode_base64(doc.base64)

    # ---- CASE 1: IMAGE (png / jpg) ----
    if doc.type in ("image/png", "image/jpeg"):
        c.showPage()

        img = Image.open(io.BytesIO(raw))
        img_w, img_h = img.size

        a4_w, a4_h = A4

        # Target box = 70% of A4
        target_w = a4_w * scale
        target_h = a4_h * scale

        # Compute scale to fit image into target box
        ratio = min(target_w / img_w, target_h / img_h)

        draw_w = img_w * ratio
        draw_h = img_h * ratio

        # Center on A4
        x = (a4_w - draw_w) / 2
        y = (a4_h - draw_h) / 2
        
        
        c.drawImage(
            ImageReader(img),
            x,
            y,
            width=draw_w,
            height=draw_h,
            preserveAspectRatio=True,
            mask="auto",
        )



    # ---- CASE 2: PDF ----
    elif doc.type == "application/pdf":
        pass
        
    else:
        raise ValueError(f"Unsupported document type: {doc.type}")
    

def create_self_attest_overlay(sig_data, page_size=A4):
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=page_size)

    draw_signature(
        c,
        sig_data,
        x=page_size[0] / 2 - 50,   # centered bottom
        y=20,                      # bottom margin
        width=100,
        height=40,
    )

    c.save()
    buf.seek(0)
    return PdfReader(buf).pages[0]


def append_pdf_attachment(
    writer: PdfWriter,
    pdf_bytes: bytes,
    sig_data = None,
    scale: float = 0.8,
):
    reader = PdfReader(io.BytesIO(pdf_bytes))
    page = reader.pages[0]

    # Source page size
    src_w = float(page.mediabox.width)
    src_h = float(page.mediabox.height)

    # Target page size (A4)
    tgt_w, tgt_h = A4

    # Scaled size
    scaled_w = src_w * scale
    scaled_h = src_h * scale

    # offsets in FINAL (A4) space
    x = (tgt_w - scaled_w) * 3/4
    y = (tgt_h - scaled_h) * 3/4

    blank = writer.add_blank_page(tgt_w, tgt_h)

    transform = (
        Transformation()
        .translate(x, y)     # move first (A4 space)
        .scale(scale, scale) # then scale content
    )

    blank.merge_transformed_page(page, transform)

    overlay = create_self_attest_overlay(sig_data)

    blank.merge_transformed_page(page, transform)
    blank.merge_page(overlay)



# with open(JSON_FILE, "r", encoding="utf-8") as f:
#     raw_data = json.load(f)


# payload = Payload.model_validate(raw_data)

# generate_merged_forms(DESTINATION_PATH,payload.forms)
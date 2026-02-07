from datetime import datetime
import io
import zipfile
from typing import List
from fastapi import FastAPI, Response, HTTPException
from pydantic import BaseModel
from backend.pdf_utils.pdf_utils import generate_merged_forms
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import os



load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
ENV = os.getenv("ENV", "development")
IS_PROD = ENV == "production"

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set")



app = FastAPI()


if not IS_PROD:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):\d+",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Filename"],
    )


class PDFRequest(BaseModel):
    submission_id: int

class BulkPDFRequest(BaseModel):
    ids: List[int]
    
    

def get_db():
    return psycopg2.connect(DATABASE_URL,
    sslmode="require",
    cursor_factory=RealDictCursor
)

@app.post("/get-pdf", status_code=200)
def generate_pdf(payload: PDFRequest):
    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            SELECT data, docs
            FROM submissions
            WHERE id = %s
            """,
            (payload.submission_id,)
        )


        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Submission not found")

        try:
            forms = row["data"]
            docs = row["docs"] or []
        except Exception:
            raise HTTPException(status_code=500, detail="Corrupted submission data")

    finally:
        conn.close()

    member_name = (
        forms.get("form_11", {})
             .get("personal_details", {})
             .get("member_name", "UNKNOWN")
    )

    pdf_bytes = generate_merged_forms(forms, docs)
    raw_dob = (
    forms.get("form_11", {})
    .get("personal_details", {})
    .get("date_of_birth", "")
    )

    dob_safe = ""

    try:
        # Accept ISO dates like 1999-02-01
        dob_safe = datetime.fromisoformat(raw_dob).strftime("%Y-%m-%d")
    except Exception:
        dob_safe = ""
        
    safe_name = "".join(
        c for c in member_name if c.isalnum() or c in (" ", "-", "_")
    ).strip().upper() or "Submissions"

    filename = f"{safe_name}_{dob_safe}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "X-Filename": filename,
        },
    )


@app.post("/bulk-pdf", status_code=200)
def generate_bulk_pdf(payload: BulkPDFRequest):
    """Generate PDFs for multiple submissions and return as a ZIP file."""
    
    if not payload.ids:
        raise HTTPException(status_code=400, detail="No IDs provided")

    conn = get_db()
    zip_buffer = io.BytesIO()

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, data, docs
                FROM submissions
                WHERE id = ANY(%s)
                """,
                (payload.ids,)
            )

            rows = cur.fetchall()

            if not rows:
                raise HTTPException(status_code=404, detail="No submissions found")

            with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
                for row in rows:
                    submission_id = row["id"]
                    forms = row["data"]
                    docs = row["docs"] or []

                    member_name = (
                        forms.get("form_11", {})
                             .get("personal_details", {})
                             .get("member_name", f"SUBMISSION_{submission_id}")
                    )

                    safe_name = "".join(
                        c for c in member_name if c.isalnum() or c in (" ", "-", "_")
                    ).strip().upper()

                    filename = (
                        f"{safe_name}.pdf"
                        if safe_name
                        else f"submission_{submission_id}.pdf"
                    )

                    try:
                        pdf_bytes = generate_merged_forms(forms, docs)
                        zf.writestr(filename, pdf_bytes)
                    except Exception as e:
                        # Skip broken submissions, don't fail whole ZIP
                        print(f"❌ PDF failed for {submission_id}: {e}")
                        continue

    finally:
        conn.close()

    zip_buffer.seek(0)

    return Response(
        content=zip_buffer.read(),
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="submissions.zip"',
        },
    )

import sqlite3
import json



@app.post("/api/forms/process", status_code=status.HTTP_200_OK)
def process_forms(payload: Payload, background_tasks: BackgroundTasks, request: Request):
    # Validate password
    
    conn = sqlite3.connect("submissions.db")
    cursor = conn.cursor()
    member_name = payload.forms.form_11.personal_details.member_name
    
    if payload.password != request.app.state.SUBMISSION_PASSWORD:
        print(f"🔴 Submission attempt by {member_name} blocked: Invalid password")
        raise HTTPException(status_code=401, detail="Invalid password")
    
    forms = payload.forms
    docs = payload.documents
    
    
    uan = forms.form_11.previous_employment.uan or ""
    dob = forms.form_11.personal_details.date_of_birth
    
    # Sanitize filename
    safe_name = "".join(c for c in member_name if c.isalnum() or c in (' ', '-', '_')).strip().upper()
    safe_uan = "".join(c for c in uan if c.isalnum()).strip()
    safe_dob = "".join(c for c in str(dob))
    
    base_filename = f"{safe_name}_{safe_dob}" if safe_dob else safe_name
    
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        uan INTEGER,
        dob TEXT,
        data TEXT
    )
    """)

    # 3. Example "form submission"
    cursor.execute(
    """
    INSERT INTO submissions (name, uan, dob, data)
    VALUES (?, ?, ?, ?)
    """,
    (
        safe_name,
        safe_uan,
        safe_dob,
        json.dumps(forms)
    )
)
    
    submission_id = cursor.lastrowid
    conn.commit()
    
    
    cursor.execute(
    "SELECT id, name, uan, dob, data FROM submissions WHERE id = ?",
    (submission_id,)
)

    row = cursor.fetchone()

    print("Inserted row:")
    print({
        "id": row[0],
        "name": row[1],
        "uan": row[2],
        "dob": row[3],
        "data": json.loads(row[4])
    })

    
    return True
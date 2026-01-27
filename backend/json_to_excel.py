import json
import os
import pandas as pd



# pyinstaller ./json_to_excel.py --onefile --noconsole --distpath . --workpath .\build --specpath .



def extract_row(payload: dict) -> dict:
    f2 = payload["forms"]["form_2"]
    f11 = payload["forms"]["form_11"]

    row = {
        "Member Name": (f2.get("member_name") or "").upper(),
        "Date of Birth": f2.get("date_of_birth") or "",
        "Mobile Number": f2.get("mobile_no") or "",
        "UAN": (f11.get("previous_employment") or {}).get("uan", ""),
        "Bank Acc. No.": (f11.get("kyc_details") or {}).get("bank_account_no", ""),
        "Bank IFSC": (f11.get("kyc_details") or {}).get("ifsc_code", ""),
        "Father / Husband Name": (f2.get("father_husband_name") or "").upper(),
        "PF Account Number": (f2.get("pf_account_no") or "").upper(),
    }


    nominees = f2.get("epf_nominees", [])
    epf_family_members = f2.get("epf_family_members", [])
    pension_nominee = f2.get("pension_nominee", [])

    for i in range(2):
        idx = i + 1
        if i < len(nominees):
            n = nominees[i]
            row[f"Nominee {idx} Name"] = (n.get("name", "") or "").upper()
            row[f"Nominee {idx} DOB"] = n.get("date_of_birth", "")
            row[f"Nominee {idx} Relationship"] = n.get("relationship", "")
        else:
            # Explicit empty cells — this is the key
            row[f"Nominee {idx} Name"] = ""
            row[f"Nominee {idx} DOB"] = ""
            row[f"Nominee {idx} Relationship"] = ""

    return row


def combine_json_to_excel(input_dir: str, output_file: str):
    # --- input validation ---
    if not os.path.exists(input_dir):
        print(f"❌ Input directory does not exist: {input_dir}")
        return False

    if not os.path.isdir(input_dir):
        print(f"❌ Input path is not a directory: {input_dir}")
        return False

    # --- ensure output directory exists ---
    output_dir = os.path.dirname(output_file)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    rows = []

    for filename in os.listdir(input_dir):
        if not filename.lower().endswith(".json"):
            continue

        file_path = os.path.join(input_dir, filename)

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                payload = json.load(f)
        except Exception as e:
            print(f"⚠️ Skipping invalid JSON: {filename} ({e})")
            continue

        rows.append(extract_row(payload))

    if not rows:
        print("⚠️ No valid JSON files found")
        return False

    df = pd.DataFrame(rows)

    # Ensure column order (very important)
    COLUMN_ORDER = [
        "Member Name",
        "Date of Birth",
        "Mobile Number",
        "UAN",
        "Bank Acc. No.",
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

    df = df.reindex(columns=COLUMN_ORDER, fill_value="")

    df.to_excel(output_file, index=False)
    print(f"✅ Excel file created: {output_file}")

    return True
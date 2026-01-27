import os
import pdfplumber

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PATH = os.path.join(BASE_DIR, "filled_pf_demo.pdf")

with pdfplumber.open(PATH) as pdf:
    page = pdf.pages[0]
    text = page.extract_text()

print(text)

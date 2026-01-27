import os
from pypdf import PdfReader, PdfWriter


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_PATH = os.path.join(BASE_DIR, "template.pdf")
GRID_PATH = os.path.join(BASE_DIR, "grid.pdf")


template_pdf = PdfReader(TEMPLATE_PATH)
grid_pdf = PdfReader(GRID_PATH)

writer = PdfWriter()

for i, page in enumerate(template_pdf.pages):
    if i == i:
        page.merge_page(grid_pdf.pages[0])
    writer.add_page(page)

with open("pf_with_grid.pdf", "wb") as f:
    writer.write(f)

print("✅ PF form with grid generated")

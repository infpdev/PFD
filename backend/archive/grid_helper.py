from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

PAGE_WIDTH, PAGE_HEIGHT = A4
GRID_SPACING = 50

c = canvas.Canvas("grid.pdf", pagesize=A4)
c.setFont("Helvetica", 6)
c.setStrokeColorRGB(0.8, 0.8, 0.8)

# Vertical grid lines + x-coordinates
for x in range(0, int(PAGE_WIDTH), GRID_SPACING):
    c.line(x, 0, x, PAGE_HEIGHT)

    # Bottom ruler
    c.drawString(x + 2, 2, str(x))

    # Top ruler
    c.drawString(x + 2, PAGE_HEIGHT - 10, str(x))

# Horizontal grid lines + y-coordinates
for y in range(0, int(PAGE_HEIGHT), GRID_SPACING):
    c.line(0, y, PAGE_WIDTH, y)

    # Left ruler
    c.drawString(2, y + 2, str(y))

    # Right ruler
    c.drawString(PAGE_WIDTH - 30, y + 2, str(y))

c.save()

print("✅ Grid PDF with full rulers generated: grid.pdf")

import os
import subprocess
import sys
from PIL import Image
import re
import tempfile
import shutil
import tkinter as tk
from tkinter import filedialog, messagebox


# pyinstaller --onefile --noconsole --icon=../public/favicon.ico --name=Resize resize.py


MIN_SIZE = 50 * 1024    # 50 KB
MAX_SIZE = 100 * 1024   # 100 KB


def pick_input_folder() -> str | None:
    root = tk.Tk()
    root.withdraw()  # hide main window
    root.attributes("-topmost", True)

    folder = filedialog.askdirectory(
        title="Select folder containing images"
    )

    root.destroy()
    return folder if folder else None

def has_images(folder: str) -> bool:
    return any(
        f.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))
        for f in os.listdir(folder)
    )


def open_folder(path: str):
    if sys.platform.startswith("win"):
        os.startfile(path)
    elif sys.platform == "darwin":
        subprocess.run(["open", path])
    else:
        subprocess.run(["xdg-open", path])


def safe_filename(name: str) -> str:
    name = name.strip().rstrip(".")          # no trailing spaces or dots
    name = re.sub(r'[<>:"/\\|?*]', "_", name) # illegal Windows chars
    return name

def process_image(img_path, out_path):
    img = Image.open(img_path).convert("RGB")

    base_w, base_h = img.size
    scale = 1.0
    quality = 90
    attempts = 0
    MAX_ATTEMPTS = 20

    while attempts < MAX_ATTEMPTS:
        attempts += 1

        new_w = int(base_w * scale)
        new_h = int(base_h * scale)

        resized = img.resize((new_w, new_h), Image.BICUBIC)

        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            temp_path = tmp.name

        resized.save(temp_path, format="JPEG", quality=quality)
        size = os.path.getsize(temp_path)

        print(f"  → attempt {attempts}: {new_w}x{new_h}, {size // 1024} KB")

        if MIN_SIZE <= size <= MAX_SIZE:
            shutil.move(temp_path, out_path)
            print("  ✅ size OK")
            return

        os.remove(temp_path)

        # 🚀 Windows-style inflation logic
        if size < MIN_SIZE:
            scale *= 1.35          # increase resolution
            quality = min(95, quality + 5)
        else:
            quality -= 7           # reduce size

    # fallback save
    resized.save(out_path, format="JPEG", quality=quality)
    print("  ⚠️ saved best possible version")


def main():
    while True:
        input_dir = pick_input_folder()

        if not input_dir:
            # User clicked Cancel
            return

        if not has_images(input_dir):
            messagebox.showerror(
                "No images found",
                "The selected folder does not contain any images.\n\n"
                "Please select a folder with PNG, JPG, JPEG, or WEBP files."
            )
            continue  # reopen selector

        break  # valid folder selected

    output_dir = os.path.join(input_dir, "output_images")
    os.makedirs(output_dir, exist_ok=True)

    for filename in os.listdir(input_dir):
        if filename.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
            clean_name = safe_filename(
                os.path.splitext(filename)[0]
            ) + ".jpg"

            in_path = os.path.join(input_dir, filename)
            out_path = os.path.join(output_dir, clean_name)

            process_image(in_path, out_path)

    open_folder(output_dir)


if __name__ == "__main__":
    main()



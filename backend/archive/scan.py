import cv2
import numpy as np

def scan_effect(image_path, output_path):
    img = cv2.imread(image_path)

    # 1. Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 2. Remove noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # 3. Adaptive threshold (magic step)
    scanned = cv2.adaptiveThreshold(
        blurred,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        11,
        2
    )

    cv2.imwrite(output_path, scanned)
    
    
def enhance_scan(image_path, output_path):
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Increase contrast
    gray = cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX)

    # Blur + threshold
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(
        blur, 255,
        cv2.ADAPTIVE_THRESH_MEAN_C,
        cv2.THRESH_BINARY,
        15, 10
    )

    cv2.imwrite(output_path, thresh)



enhance_scan("img.jpg", "scanned_output.png")

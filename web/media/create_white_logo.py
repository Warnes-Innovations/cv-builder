#!/usr/bin/env python3
"""
Create a white-on-transparent logo from the black-on-white source logo.
"""
from PIL import Image
import numpy as np

# Load the source image
img_path = "/Users/warnes/src/warnes-innovations-website/media/Warnes Innovations Logo - Black on White (1128 × 191 px)_with_white_bg.png"
img = Image.open(img_path)

# Convert to RGBA if not already
img = img.convert('RGBA')
data = np.array(img)

# Get RGB channels
rgb = data[:,:,:3]

# Create new image: white text on transparent background
new_data = np.zeros_like(data)

# Calculate brightness for each pixel
brightness = np.mean(rgb, axis=2)

# If pixel is dark (< 128), make it white (255,255,255)
# If pixel is light (>= 128), make it transparent (alpha=0)
mask_dark = brightness < 128
new_data[mask_dark] = [255, 255, 255, 255]  # White, opaque
new_data[~mask_dark] = [255, 255, 255, 0]   # White, transparent

# Create new image
new_img = Image.fromarray(new_data.astype('uint8'), 'RGBA')

# Save
output_path = 'logo_white_transparent.png'
new_img.save(output_path)
print(f'✓ Logo created successfully: {output_path}')
print(f'  Dimensions: {new_img.width} × {new_img.height} px')

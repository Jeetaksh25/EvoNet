import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
import base64
import io

# ── Architecture (must match train.py exactly) ────────────────────────────────
PCA_COMPONENTS    = 64
input_layer_size  = PCA_COMPONENTS   # network input is PCA features, not raw pixels
hidden_layer_size = 128
output_layer_size = 10

# Temperature > 1 softens the softmax distribution without changing the predicted
# class (argmax is invariant), so confidence values are no longer overconfident.
TEMPERATURE = 2.0


# ── Neural network helpers ────────────────────────────────────────────────────
def softmax(x):
    x = x - np.max(x)
    e = np.exp(np.clip(x, -88.0, 88.0))
    return e / e.sum()


def relu(x):
    return np.maximum(0.0, x)


def decode_chromosome(chromosome):
    s1 = input_layer_size  * hidden_layer_size
    s2 = hidden_layer_size * output_layer_size
    w1 = chromosome[:s1].reshape(input_layer_size, hidden_layer_size)
    w2 = chromosome[s1:s1+s2].reshape(hidden_layer_size, output_layer_size)
    b1 = chromosome[s1+s2 : s1+s2+hidden_layer_size]
    b2 = chromosome[s1+s2+hidden_layer_size:]
    return w1, w2, b1, b2


def apply_pca(pixel_vector, pca_mean, pca_components):
    """Project 256-dim pixel vector into PCA feature space (→ 64-dim)."""
    return (pixel_vector - pca_mean) @ pca_components.T


# ── Image preprocessing (identical pipeline to train.py) ─────────────────────
def preprocess_image(base64_image):
    """
    Decode a base64 PNG and produce a normalised 256-element pixel vector.

    Pipeline:
      1. Decode base64 → grayscale
      2. Invert if bright background (handle both white-on-dark and dark-on-white)
      3. Crop to digit bounding box
      4. Scale to fit inside 18×18, center in 20×20
      5. Shift by center-of-mass (matches train.py preprocessing)
      6. Embed in 28×28 with 4-px padding, downsample to 16×16
      7. Normalise to [-1, 1]
    """
    image_bytes = base64.b64decode(base64_image.split(",")[1])
    image = Image.open(io.BytesIO(image_bytes)).convert("L")
    img   = np.array(image, dtype=np.float32)

    # Ensure white digit on black background (MNIST convention)
    if np.mean(img) > 127:
        img = 255 - img

    # Crop to bounding box of the digit
    coords = np.argwhere(img > 30)
    if len(coords) > 0:
        y0, x0 = coords.min(axis=0)
        y1, x1 = coords.max(axis=0)
        img = img[y0:y1+1, x0:x1+1]

    # Resize to fit inside 18×18, preserving aspect ratio
    h, w  = img.shape
    scale = 18.0 / max(h, w)
    new_h = max(1, int(round(h * scale)))
    new_w = max(1, int(round(w * scale)))
    pil   = Image.fromarray(img.astype(np.uint8))
    pil   = pil.resize((new_w, new_h), Image.Resampling.LANCZOS)

    # Place digit in center of 20×20 canvas
    canvas = np.zeros((20, 20), dtype=np.float32)
    y_off  = (20 - new_h) // 2
    x_off  = (20 - new_w) // 2
    canvas[y_off:y_off+new_h, x_off:x_off+new_w] = np.array(pil, dtype=np.float32)

    # Center-of-mass shift (matches train.py preprocessing)
    if canvas.sum() > 0:
        cy, cx  = ndimage.center_of_mass(canvas)
        shift_y = int(round(10 - cy))
        shift_x = int(round(10 - cx))
        canvas  = ndimage.shift(canvas, [shift_y, shift_x], mode='constant', cval=0.0)

    # Embed in 28×28 with 4-px border, then downsample to 16×16
    final = np.zeros((28, 28), dtype=np.float32)
    final[4:24, 4:24] = canvas
    pil   = Image.fromarray(final.astype(np.uint8))
    pil   = pil.resize((16, 16), Image.Resampling.LANCZOS)

    result = np.array(pil, dtype=np.float32)
    result = (result / 255.0 - 0.5) * 2.0
    return result.flatten()   # 256-dim pixel vector


# ── Inference ─────────────────────────────────────────────────────────────────
def predict_digit(pixel_vector, chromosome, pca_mean, pca_components):
    features = apply_pca(pixel_vector, pca_mean, pca_components)   # 256 → 64
    w1, w2, b1, b2 = decode_chromosome(chromosome)
    hidden   = relu(features @ w1 + b1)
    logits   = hidden @ w2 + b2
    logits   = logits / TEMPERATURE          # temperature scaling: soften confidences
    probs    = softmax(logits)
    digit    = int(np.argmax(probs))
    return digit, float(probs[digit]), [round(float(p), 6) for p in probs]


# ── Path helpers ──────────────────────────────────────────────────────────────
def get_paths():
    base = sys._MEIPASS if getattr(sys, 'frozen', False) else os.path.dirname(__file__)
    return {
        'weights'  : os.path.join(base, 'ga_best_weights.npy'),
        'pca_mean' : os.path.join(base, 'pca_mean.npy'),
        'pca_comps': os.path.join(base, 'pca_components.npy'),
    }


# ── Main ──────────────────────────────────────────────────────────────────────
image_base64 = sys.stdin.read()
pixel_vector = preprocess_image(image_base64)

# Keep pixel values [0,1] for the 16×16 heatmap in the UI (before PCA)
pixels_01 = [round(float((v + 1) / 2), 4) for v in pixel_vector]

paths      = get_paths()
chromosome = np.load(paths['weights'])
pca_mean   = np.load(paths['pca_mean'])
pca_comps  = np.load(paths['pca_comps'])

digit, confidence, all_confidences = predict_digit(
    pixel_vector, chromosome, pca_mean, pca_comps
)

print({
    "prediction"      : digit,
    "confidence"      : confidence,
    "all_confidences" : all_confidences,
    "pixels"          : pixels_01,
})

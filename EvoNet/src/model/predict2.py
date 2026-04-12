import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
import base64
import io
import matplotlib.pyplot as plt

input_layer_size = 256
hidden_layer1_size = 128
hidden_layer2_size = 64
output_layer_size = 10


def softmax(x):
    x = np.clip(x, -10, 10)
    exp_values = np.exp(x - np.max(x))
    return exp_values / np.sum(exp_values)

def relu(x):
    return np.maximum(0, x)

def debug_show(image_vector):
    img = image_vector.reshape(16, 16)
    img = (img + 1) / 2

    plt.imshow(img, cmap='gray')
    plt.title("Predict Pipeline Output")
    plt.axis('off')
    plt.show()

def decode_chromosome(chromosome):
    index = 0

    w1_size = input_layer_size * hidden_layer1_size
    w1 = chromosome[index:index+w1_size].reshape(input_layer_size, hidden_layer1_size)
    index += w1_size

    w2_size = hidden_layer1_size * hidden_layer2_size
    w2 = chromosome[index:index+w2_size].reshape(hidden_layer1_size, hidden_layer2_size)
    index += w2_size

    w3_size = hidden_layer2_size * output_layer_size
    w3 = chromosome[index:index+w3_size].reshape(hidden_layer2_size, output_layer_size)
    index += w3_size

    b1 = chromosome[index:index+hidden_layer1_size]
    index += hidden_layer1_size

    b2 = chromosome[index:index+hidden_layer2_size]
    index += hidden_layer2_size

    b3 = chromosome[index:index+output_layer_size]

    return w1, w2, w3, b1, b2, b3


def center_by_mass(image_array):
    thresholded = image_array.copy()
    thresholded[thresholded < 30] = 0
    if thresholded.sum() == 0:
        return image_array
    cy, cx = ndimage.center_of_mass(thresholded)
    rows, cols = image_array.shape
    shift_y = int(rows / 2 - cy)
    shift_x = int(cols / 2 - cx)
    return ndimage.shift(image_array, [shift_y, shift_x])


def preprocess_image(base64_image):
    image_bytes = base64.b64decode(base64_image.split(",")[1])
    image = Image.open(io.BytesIO(image_bytes))
    image = image.convert("L")
    image_array = np.array(image).astype(np.float32)

    if np.mean(image_array) > 127:
        image_array = 255 - image_array

    coords = np.argwhere(image_array > 30)
    if len(coords) > 0:
        y0, x0 = coords.min(axis=0)
        y1, x1 = coords.max(axis=0)
        image_array = image_array[y0:y1+1, x0:x1+1]

    h, w = image_array.shape
    scale = 18.0 / max(h, w)
    new_h = max(1, int(round(h * scale)))
    new_w = max(1, int(round(w * scale)))

    img = Image.fromarray(image_array.astype(np.uint8))
    img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    canvas_20 = np.zeros((20, 20), dtype=np.float32)
    y_off = (20 - new_h) // 2
    x_off = (20 - new_w) // 2
    canvas_20[y_off:y_off+new_h, x_off:x_off+new_w] = np.array(img).astype(np.float32)

    canvas_28 = np.zeros((28, 28), dtype=np.float32)
    canvas_28[4:24, 4:24] = canvas_20

    img_28 = Image.fromarray(canvas_28.astype(np.uint8))
    img_16 = img_28.resize((16, 16), Image.Resampling.LANCZOS)

    image_array = np.array(img_16).astype(np.float32)
    image_array = (image_array / 255.0 - 0.5) * 2

    return image_array.flatten()


def predict_digit(input_vector, chromosome):
    w1, w2, w3, b1, b2, b3 = decode_chromosome(chromosome)
    hidden1 = relu(np.dot(input_vector, w1) + b1)
    hidden2 = relu(np.dot(hidden1, w2) + b2)
    logits = np.dot(hidden2, w3) + b3
    logits = np.clip(logits, -10, 10)
    probabilities = softmax(logits)
    predicted_digit = int(np.argmax(probabilities))
    confidence = float(np.max(probabilities))
    all_confidences = [round(float(p), 6) for p in probabilities]
    return predicted_digit, confidence, all_confidences


def get_model_path():
    if getattr(sys, 'frozen', False):
        return os.path.join(sys._MEIPASS, "ga_best_weights.npy")
    return os.path.join(os.path.dirname(__file__), "ga_best_weights.npy")


image_base64 = sys.stdin.read()
input_vector = preprocess_image(image_base64)

# debug_show(input_vector)

# Normalise pixels 0-1 for heatmap (from [-1, 1])
pixels_01 = [round(float((v + 1) / 2), 4) for v in input_vector]

model_weights = np.load(get_model_path())
digit, confidence, all_confidences = predict_digit(input_vector, model_weights)

print({
    "prediction": digit,
    "confidence": confidence,
    "all_confidences": all_confidences,
    "pixels": pixels_01
})
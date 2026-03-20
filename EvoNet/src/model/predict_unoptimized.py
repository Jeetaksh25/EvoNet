import os
import sys
import numpy as np
from PIL import Image
import base64
import io


input_layer_size = 256
hidden_layer_size = 128
output_layer_size = 10


def softmax(x):
    exp_values = np.exp(x - np.max(x))
    return exp_values / np.sum(exp_values)


def relu(x):
    return np.maximum(0, x)


def decode_chromosome(chromosome):

    index = 0

    w1_size = input_layer_size * hidden_layer_size
    w1 = chromosome[index:index + w1_size].reshape(
        input_layer_size, hidden_layer_size
    )
    index += w1_size

    w2_size = hidden_layer_size * output_layer_size
    w2 = chromosome[index:index + w2_size].reshape(
        hidden_layer_size, output_layer_size
    )
    index += w2_size

    b1 = chromosome[index:index + hidden_layer_size]
    index += hidden_layer_size

    b2 = chromosome[index:index + output_layer_size]

    return w1, w2, b1, b2


def center_image(image_array):
    threshold = np.max(image_array) * 0.1
    coords = np.column_stack(np.where(image_array > threshold))
    if coords.size == 0:
        return image_array

    y_min, x_min = coords.min(axis=0)
    y_max, x_max = coords.max(axis=0)
    digit = image_array[y_min:y_max+1, x_min:x_max+1]

    canvas = np.zeros((28, 28), dtype=np.float32)
    h, w = digit.shape
    
    if h > 20 or w > 20:
        scale = 20 / max(h, w)
        new_h, new_w = int(h * scale), int(w * scale)
        digit_img = Image.fromarray(digit.astype(np.uint8))
        digit_img = digit_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        digit = np.array(digit_img).astype(np.float32)
        h, w = new_h, new_w

    y_offset = (28 - h) // 2
    x_offset = (28 - w) // 2
    canvas[y_offset:y_offset+h, x_offset:x_offset+w] = digit

    return canvas


# def thicken_strokes(image_array):
#     """Dilate thin strokes to match MNIST average stroke width"""
#     from PIL import ImageFilter
#     img = Image.fromarray(image_array.astype(np.uint8))
#     img = img.filter(ImageFilter.MaxFilter(3))
#     return np.array(img).astype(np.float32)

def preprocess_image(base64_image):
    image_bytes = base64.b64decode(base64_image.split(",")[1])
    image = Image.open(io.BytesIO(image_bytes))
    image = image.convert("L")
    image_array = np.array(image).astype(np.float32)

    if np.mean(image_array) > 127:
        image_array = 255 - image_array

    image_array = center_by_mass(image_array)

    img = Image.fromarray(image_array.astype(np.uint8))
    img = img.resize((20, 20), Image.Resampling.LANCZOS)
    
    padded = np.zeros((28, 28), dtype=np.float32)
    padded[4:24, 4:24] = np.array(img).astype(np.float32)

    img = Image.fromarray(padded.astype(np.uint8))
    img = img.resize((16, 16), Image.Resampling.LANCZOS)

    image_array = np.array(img).astype(np.float32)
    image_array = (image_array / 255.0 - 0.5) * 2

    debug_img = ((image_array + 1) / 2 * 255).reshape(16, 16).astype(np.uint8)
    Image.fromarray(debug_img).save("debug_preprocessed.png")

    return image_array.flatten()


def center_by_mass(image_array):
    """Center digit by center of mass — matches MNIST convention"""
    from scipy import ndimage

    cy, cx = ndimage.center_of_mass(image_array)
    rows, cols = image_array.shape
    shift_y = int(rows / 2 - cy)
    shift_x = int(cols / 2 - cx)

    return ndimage.shift(image_array, [shift_y, shift_x])


def predict_digit(input_vector, chromosome):

    w1, w2, b1, b2 = decode_chromosome(chromosome)

    hidden_layer = relu(np.dot(input_vector, w1) + b1)

    logits = np.dot(hidden_layer, w2) + b2

    probabilities = softmax(logits)

    predicted_digit = int(np.argmax(probabilities))

    confidence = float(np.max(probabilities))

    return predicted_digit, confidence



image_base64 = sys.argv[1]

input_vector = preprocess_image(image_base64)

def get_model_path():
    if getattr(sys, 'frozen', False):
        return os.path.join(sys._MEIPASS, "ga_best_weights.npy")
    return os.path.join(os.path.dirname(__file__), "ga_best_weights.npy")

model_weights = np.load(get_model_path())

digit, confidence = predict_digit(input_vector, model_weights)

print({
    "prediction": digit,
    "confidence": confidence
})
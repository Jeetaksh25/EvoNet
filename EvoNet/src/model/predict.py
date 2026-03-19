import os
import sys
import numpy as np
from PIL import Image
import base64
import io


input_layer_size = 64
hidden_layer_size = 64
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


def preprocess_image(base64_image):

    image_bytes = base64.b64decode(base64_image.split(",")[1])

    image = Image.open(io.BytesIO(image_bytes))

    image = image.convert("L")

    image = image.resize((8, 8))

    image_array = np.array(image) / 255.0

    return image_array.flatten()


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
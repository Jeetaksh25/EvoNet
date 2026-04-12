import numpy as np
from sklearn.datasets import load_digits
from sklearn.datasets import fetch_openml
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import sys, os
from PIL import Image
import torch
import matplotlib.pyplot as plt

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
# device = torch.device("cpu")
print(device)

# digits_dataset = load_digits()


def show_samples(x, y, title, n=10):
    import matplotlib.pyplot as plt
    import numpy as np

    indices = np.random.choice(len(x), n, replace=False)

    plt.figure(figsize=(12, 2))
    for i, idx in enumerate(indices):
        plt.subplot(1, n, i + 1)

        img = x[idx].reshape(16, 16)
        img = (img + 1) / 2

        plt.imshow(img, cmap="gray")
        plt.title(str(y[idx]))
        plt.axis("off")

    plt.suptitle(title)
    plt.show()


def preprocess_train(img):
    img = img.reshape(28, 28).astype(np.float32)

    if np.mean(img) > 127:
        img = 255 - img

    coords = np.argwhere(img > 30)
    if len(coords) > 0:
        y0, x0 = coords.min(axis=0)
        y1, x1 = coords.max(axis=0)
        img = img[y0 : y1 + 1, x0 : x1 + 1]

    h, w = img.shape
    scale = 18.0 / max(h, w)
    new_h = max(1, int(round(h * scale)))
    new_w = max(1, int(round(w * scale)))

    pil = Image.fromarray(img.astype(np.uint8))
    pil = pil.resize((new_w, new_h), Image.Resampling.LANCZOS)

    canvas_20 = np.zeros((20, 20), dtype=np.float32)
    y_off = (20 - new_h) // 2
    x_off = (20 - new_w) // 2
    canvas_20[y_off : y_off + new_h, x_off : x_off + new_w] = np.array(pil)

    canvas_28 = np.zeros((28, 28), dtype=np.float32)
    canvas_28[4:24, 4:24] = canvas_20

    pil = Image.fromarray(canvas_28.astype(np.uint8))
    pil = pil.resize((16, 16), Image.Resampling.LANCZOS)

    return np.array(pil).flatten()


mnist = fetch_openml("mnist_784", version=1, as_frame=False)
input_features = mnist.data.astype(np.float32)
target_labels = mnist.target.astype(int)

input_features_resized = []
for img in input_features:
    processed = preprocess_train(img)
    input_features_resized.append(processed)

input_features = np.array(input_features_resized, dtype=np.float32)

x_train, x_val, y_train, y_val = train_test_split(
    input_features, target_labels, test_size=0.2, random_state=42
)


x_train = (x_train / 255.0 - 0.5) * 2
x_val = (x_val / 255.0 - 0.5) * 2

# show_samples(x_train, y_train, "Training Pipeline Output")

input_layer_size = 256
hidden_layer1_size = 128
hidden_layer2_size = 64
output_layer_size = 10

chromosome_length = (
    input_layer_size * hidden_layer1_size
    + hidden_layer1_size * hidden_layer2_size
    + hidden_layer2_size * output_layer_size
    + hidden_layer1_size
    + hidden_layer2_size
    + output_layer_size
)

population_size = 300
number_of_generation = 400
mutation_rate = 0.05
elite_size = 6
tournament_size = 7


def initialize_population():
    w1_std = np.sqrt(2.0 / input_layer_size)
    w2_std = np.sqrt(2.0 / hidden_layer1_size)
    w3_std = np.sqrt(2.0 / hidden_layer2_size)

    pop = np.zeros((population_size, chromosome_length))

    w1_size = input_layer_size * hidden_layer1_size
    w2_size = hidden_layer1_size * hidden_layer2_size
    w3_size = hidden_layer2_size * output_layer_size

    pop[:, :w1_size] = np.random.randn(population_size, w1_size) * w1_std
    pop[:, w1_size : w1_size + w2_size] = (
        np.random.randn(population_size, w2_size) * w2_std
    )
    pop[:, w1_size + w2_size : w1_size + w2_size + w3_size] = (
        np.random.randn(population_size, w3_size) * w3_std
    )

    return pop


def softmax(x):
    exp_values = np.exp(x - np.max(x, axis=1, keepdims=True))
    return exp_values / np.sum(exp_values, axis=1, keepdims=True)


def relu(x):
    return np.maximum(0, x)


def augment(x):
    noise = np.random.normal(0, 0.1, x.shape)
    x = x + noise

    x = x.reshape(-1, 16, 16)
    x = np.roll(x, np.random.randint(-1, 2), axis=1)
    x = np.roll(x, np.random.randint(-1, 2), axis=2)

    return np.clip(x.reshape(-1, 256), -1, 1)


def thicken(x):
    x = x.reshape(-1, 16, 16)

    padded = np.pad(x, ((0, 0), (1, 1), (1, 1)), mode="constant")

    thick = (
        padded[:, :-2, :-2]
        + padded[:, 1:-1, :-2]
        + padded[:, 2:, :-2]
        + padded[:, :-2, 1:-1]
        + padded[:, 1:-1, 1:-1]
        + padded[:, 2:, 1:-1]
        + padded[:, :-2, 2:]
        + padded[:, 1:-1, 2:]
        + padded[:, 2:, 2:]
    ) / 9.0

    return thick.reshape(-1, 256)


def smooth(x):
    return (x + np.roll(x, 1, axis=1) + np.roll(x, -1, axis=1)) / 3


def decode_chromosome(chromosome):
    index = 0

    w1_size = input_layer_size * hidden_layer1_size
    w1 = chromosome[index : index + w1_size].reshape(
        input_layer_size, hidden_layer1_size
    )
    index += w1_size

    w2_size = hidden_layer1_size * hidden_layer2_size
    w2 = chromosome[index : index + w2_size].reshape(
        hidden_layer1_size, hidden_layer2_size
    )
    index += w2_size

    w3_size = hidden_layer2_size * output_layer_size
    w3 = chromosome[index : index + w3_size].reshape(
        hidden_layer2_size, output_layer_size
    )
    index += w3_size

    b1 = chromosome[index : index + hidden_layer1_size]
    index += hidden_layer1_size

    b2 = chromosome[index : index + hidden_layer2_size]
    index += hidden_layer2_size

    b3 = chromosome[index : index + output_layer_size]

    return w1, w2, w3, b1, b2, b3


def decode_population(population):
    pop_size = population.shape[0]

    w1_size = input_layer_size * hidden_layer1_size
    w2_size = hidden_layer1_size * hidden_layer2_size
    w3_size = hidden_layer2_size * output_layer_size

    w1 = population[:, :w1_size].reshape(pop_size, input_layer_size, hidden_layer1_size)

    w2 = population[:, w1_size : w1_size + w2_size].reshape(
        pop_size, hidden_layer1_size, hidden_layer2_size
    )

    w3 = population[:, w1_size + w2_size : w1_size + w2_size + w3_size].reshape(
        pop_size, hidden_layer2_size, output_layer_size
    )

    b1 = population[
        :,
        w1_size + w2_size + w3_size : w1_size + w2_size + w3_size + hidden_layer1_size,
    ]

    b2 = population[
        :,
        w1_size
        + w2_size
        + w3_size
        + hidden_layer1_size : w1_size
        + w2_size
        + w3_size
        + hidden_layer1_size
        + hidden_layer2_size,
    ]

    b3 = population[
        :, w1_size + w2_size + w3_size + hidden_layer1_size + hidden_layer2_size :
    ]

    return w1, w2, w3, b1, b2, b3


def forward_population(x, w1, w2, b1, b2):
    hidden = np.einsum("ni,pih->pnh", x, w1) + b1[:, None, :]
    hidden = np.maximum(0, hidden)

    logits = np.einsum("pnh,pho->pno", hidden, w2) + b2[:, None, :]

    predictions = np.argmax(logits, axis=2)

    return predictions


def forward_population_torch(x, population):
    pop_size = population.shape[0]

    x = torch.tensor(x, dtype=torch.float32, device=device)

    w1_size = input_layer_size * hidden_layer1_size
    w2_size = hidden_layer1_size * hidden_layer2_size
    w3_size = hidden_layer2_size * output_layer_size

    w1 = population[:, :w1_size].view(pop_size, input_layer_size, hidden_layer1_size)

    w2 = population[:, w1_size : w1_size + w2_size].view(
        pop_size, hidden_layer1_size, hidden_layer2_size
    )

    w3 = population[:, w1_size + w2_size : w1_size + w2_size + w3_size].view(
        pop_size, hidden_layer2_size, output_layer_size
    )

    b1 = population[
        :,
        w1_size + w2_size + w3_size : w1_size + w2_size + w3_size + hidden_layer1_size,
    ]

    b2 = population[
        :,
        w1_size
        + w2_size
        + w3_size
        + hidden_layer1_size : w1_size
        + w2_size
        + w3_size
        + hidden_layer1_size
        + hidden_layer2_size,
    ]

    b3 = population[
        :, w1_size + w2_size + w3_size + hidden_layer1_size + hidden_layer2_size :
    ]

    hidden1 = torch.einsum("ni,pih->pnh", x, w1) + b1.unsqueeze(1)
    hidden1 = torch.relu(hidden1)

    hidden2 = torch.einsum("pnh,phk->pnk", hidden1, w2) + b2.unsqueeze(1)
    hidden2 = torch.relu(hidden2)

    logits = torch.einsum("pnk,pko->pno", hidden2, w3) + b3.unsqueeze(1)

    predictions = torch.argmax(logits, dim=2)

    return predictions.cpu().numpy()


def neural_network_forward(x, chromosome):
    w1, w2, w3, b1, b2, b3 = decode_chromosome(chromosome)

    hidden1 = relu(np.dot(x, w1) + b1)
    hidden2 = relu(np.dot(hidden1, w2) + b2)
    logits = np.dot(hidden2, w3) + b3

    probabilities = softmax(logits)
    predictions = np.argmax(probabilities, axis=1)

    return predictions


EVAL_BATCH_SIZE = 5000


def evaluate_population(population):
    pop_size = population.shape[0]

    indices = np.random.choice(len(x_train), EVAL_BATCH_SIZE, replace=False)
    batch_x = x_train[indices]
    batch_y = y_train[indices]

    val_indices = np.random.choice(len(x_val), 5000, replace=False)
    x_val_batch = x_val[val_indices]
    y_val_batch = y_val[val_indices]

    augmented_x = augment(batch_x.copy())

    x_train_t = torch.tensor(augmented_x, dtype=torch.float32, device=device)
    x_val_t = torch.tensor(x_val_batch, dtype=torch.float32, device=device)

    # Sizes
    w1_size = input_layer_size * hidden_layer1_size
    w2_size = hidden_layer1_size * hidden_layer2_size
    w3_size = hidden_layer2_size * output_layer_size

    # Weights
    w1 = population[:, :w1_size].view(pop_size, input_layer_size, hidden_layer1_size)

    w2 = population[:, w1_size : w1_size + w2_size].view(
        pop_size, hidden_layer1_size, hidden_layer2_size
    )

    w3 = population[:, w1_size + w2_size : w1_size + w2_size + w3_size].view(
        pop_size, hidden_layer2_size, output_layer_size
    )

    # Biases
    b1 = population[
        :,
        w1_size + w2_size + w3_size : w1_size + w2_size + w3_size + hidden_layer1_size,
    ]

    b2 = population[
        :,
        w1_size
        + w2_size
        + w3_size
        + hidden_layer1_size : w1_size
        + w2_size
        + w3_size
        + hidden_layer1_size
        + hidden_layer2_size,
    ]

    b3 = population[
        :, w1_size + w2_size + w3_size + hidden_layer1_size + hidden_layer2_size :
    ]

    hidden1_train = torch.einsum("ni,pih->pnh", x_train_t, w1) + b1.unsqueeze(1)
    hidden1_train = torch.relu(hidden1_train)

    hidden2_train = torch.einsum("pnh,phk->pnk", hidden1_train, w2) + b2.unsqueeze(1)
    hidden2_train = torch.relu(hidden2_train)

    logits_train = torch.einsum("pnk,pko->pno", hidden2_train, w3) + b3.unsqueeze(1)
    logits_train = torch.clamp(logits_train, -10, 10)

    train_preds = torch.argmax(logits_train, dim=2)

    hidden1_val = torch.einsum("ni,pih->pnh", x_val_t, w1) + b1.unsqueeze(1)
    hidden1_val = torch.relu(hidden1_val)

    hidden2_val = torch.einsum("pnh,phk->pnk", hidden1_val, w2) + b2.unsqueeze(1)
    hidden2_val = torch.relu(hidden2_val)

    logits_val = torch.einsum("pnk,pko->pno", hidden2_val, w3) + b3.unsqueeze(1)
    logits_val = torch.clamp(logits_val, -10, 10)

    val_preds = torch.argmax(logits_val, dim=2)

    y_train_t = torch.tensor(batch_y, device=device)
    y_val_t = torch.tensor(y_val_batch, device=device)

    train_acc = (train_preds == y_train_t).float().mean(dim=1)
    val_acc = (val_preds == y_val_t).float().mean(dim=1)

    fitness_scores = []

    for i in range(pop_size):
        pred = train_preds[i].cpu().numpy()
        unique, counts = np.unique(pred, return_counts=True)
        distribution_penalty = np.std(counts) / len(pred)

        penalty = 0.001 * torch.mean(population[i] ** 2).item()

        fitness = (0.2 * train_acc) + (0.8 * val_acc)
        fitness -= penalty
        fitness -= 0.05 * distribution_penalty

        fitness_scores.append(fitness)

    return np.array(fitness_scores)


def tournament_selection(population, fitness_scores):
    selected_indices = np.random.choice(len(population), tournament_size, replace=False)
    best_indices = selected_indices[np.argmax(fitness_scores[selected_indices])]

    return population[best_indices]


def elitism(population, fitness_scores):
    sorted_indices = np.argsort(fitness_scores)[::-1].copy()
    sorted_population_based_on_fitness = population[sorted_indices[:elite_size]]

    return sorted_population_based_on_fitness[:elite_size]


def crossover(parent_one, parent_two):
    mask = np.random.rand(chromosome_length) < 0.5
    child = np.where(mask, parent_one, parent_two)
    return child


def mutate(chromosome, generation):
    current_rate = mutation_rate * (1 - generation / number_of_generation)

    mutation_mask = np.random.rand(chromosome_length) < current_rate
    scale = 0.20 * (1 - generation / number_of_generation)
    chromosome[mutation_mask] += np.random.randn(np.sum(mutation_mask)) * scale

    return chromosome


# Traning

population = initialize_population()
population = torch.tensor(population, dtype=torch.float32, device=device)

generation_history = []

true_best_chromosome = None
true_best_fitness = -1

for generation in range(number_of_generation):
    fitness_scores = evaluate_population(population)
    sorted_indices = np.argsort(fitness_scores)[::-1].copy()
    best_accuracy = fitness_scores[sorted_indices[0]]

    if best_accuracy > true_best_fitness:
        true_best_fitness = best_accuracy
        true_best_chromosome = population[sorted_indices[0]].clone()

    generation_history.append(best_accuracy)

    print(
        f"Generation {generation} | Best Accuracy: {best_accuracy:.4f} | All-time Best: {true_best_fitness:.4f}"
    )

    new_population = []

    elites = population[sorted_indices[:elite_size]]

    new_population.extend(elites)

    while len(new_population) < population_size:

        parent_one = tournament_selection(population.cpu().numpy(), fitness_scores)
        parent_two = tournament_selection(population.cpu().numpy(), fitness_scores)

        child = crossover(parent_one, parent_two)
        child = mutate(child, generation)
        child = torch.tensor(child, dtype=torch.float32, device=device)

        new_population.append(child)

    population = torch.stack(new_population)


# Final Evaluation

fitness_scores = evaluate_population(population)

best_index = np.argmax(fitness_scores)

best_chromosome = population[best_index]

test_predictions = forward_population_torch(x_val, best_chromosome.unsqueeze(0))[0]

test_accuracy = accuracy_score(y_val, test_predictions)

print("\nFinal Test Accuracy:", test_accuracy)


current_dir = os.path.dirname(__file__)

# Save Model
weights_path = os.path.join(current_dir, "ga_best_weights.npy")
np.save(weights_path, true_best_chromosome.cpu().numpy())
print("Saved Model")

# Save History
history_path = os.path.join(current_dir, "fitness_history.npy")
np.save(history_path, generation_history)
print("Saved History")

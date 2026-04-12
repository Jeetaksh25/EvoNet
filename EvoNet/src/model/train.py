import numpy as np
from sklearn.datasets import fetch_openml
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from sklearn.decomposition import PCA
import sys, os
from PIL import Image
from scipy import ndimage
import torch

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(device)

# ── Feature extraction ────────────────────────────────────────────────────────
# Reduce 256 raw pixel features → PCA_COMPONENTS via PCA.
# This shrinks the chromosome from 34 058 → 9 610 genes, making GA feasible.
PCA_COMPONENTS = 64


# ── Image preprocessing ───────────────────────────────────────────────────────
def preprocess_image_array(img_flat):
    """
    Preprocess a flat 784-pixel MNIST image into a normalised 256-element vector.

    Pipeline (matches predict.py exactly):
      1. Reshape to 28×28; ensure white digit on black background
      2. Crop to digit bounding box
      3. Scale to fit inside 18×18, center in 20×20
      4. Shift by center-of-mass (replicates standard MNIST preprocessing)
      5. Embed in 28×28 with 4-px padding, downsample to 16×16
      6. Normalise to [-1, 1]
    """
    img = img_flat.reshape(28, 28).astype(np.float32)

    if np.mean(img) > 127:
        img = 255 - img

    coords = np.argwhere(img > 30)
    if len(coords) > 0:
        y0, x0 = coords.min(axis=0)
        y1, x1 = coords.max(axis=0)
        img = img[y0:y1 + 1, x0:x1 + 1]

    h, w = img.shape
    scale = 18.0 / max(h, w)
    new_h = max(1, int(round(h * scale)))
    new_w = max(1, int(round(w * scale)))

    pil = Image.fromarray(img.astype(np.uint8))
    pil = pil.resize((new_w, new_h), Image.Resampling.LANCZOS)

    canvas = np.zeros((20, 20), dtype=np.float32)
    y_off = (20 - new_h) // 2
    x_off = (20 - new_w) // 2
    canvas[y_off:y_off + new_h, x_off:x_off + new_w] = np.array(pil, dtype=np.float32)

    # Center-of-mass shift (standard MNIST preprocessing step)
    if canvas.sum() > 0:
        cy, cx = ndimage.center_of_mass(canvas)
        shift_y = int(round(10 - cy))
        shift_x = int(round(10 - cx))
        canvas = ndimage.shift(canvas, [shift_y, shift_x], mode='constant', cval=0.0)

    final = np.zeros((28, 28), dtype=np.float32)
    final[4:24, 4:24] = canvas

    pil = Image.fromarray(final.astype(np.uint8))
    pil = pil.resize((16, 16), Image.Resampling.LANCZOS)

    result = np.array(pil, dtype=np.float32)
    result = (result / 255.0 - 0.5) * 2.0
    return result.flatten()   # 256-dim


# ── Load & preprocess MNIST ───────────────────────────────────────────────────
print("Loading MNIST...")
mnist = fetch_openml('mnist_784', version=1, as_frame=False)
raw_features  = mnist.data.astype(np.float32)
target_labels = mnist.target.astype(int)

print("Preprocessing images (this takes a few minutes)...")
pixel_features = np.array(
    [preprocess_image_array(img) for img in raw_features],
    dtype=np.float32
)

x_train_px, x_val_px, y_train, y_val = train_test_split(
    pixel_features, target_labels, test_size=0.2, random_state=42
)


# ── PCA feature selection: 256 → PCA_COMPONENTS ───────────────────────────────
print(f"Fitting PCA ({PCA_COMPONENTS} components)...")
pca = PCA(n_components=PCA_COMPONENTS, random_state=42)
pca.fit(x_train_px)

explained = pca.explained_variance_ratio_.sum()
print(f"  Explained variance: {explained:.3f}")

x_train = pca.transform(x_train_px).astype(np.float32)
x_val   = pca.transform(x_val_px).astype(np.float32)

# Persist PCA params so predict.py can replicate the same transform
current_dir = os.path.dirname(__file__)
np.save(os.path.join(current_dir, "pca_mean.npy"),       pca.mean_.astype(np.float32))
np.save(os.path.join(current_dir, "pca_components.npy"), pca.components_.astype(np.float32))
print("Saved PCA parameters.")


# ── Network: PCA_COMPONENTS → hidden_layer_size → 10 ─────────────────────────
input_layer_size  = PCA_COMPONENTS   # 64
hidden_layer_size = 128
output_layer_size = 10

chromosome_length = (
    input_layer_size  * hidden_layer_size +
    hidden_layer_size * output_layer_size +
    hidden_layer_size +
    output_layer_size
)
print(f"Chromosome length: {chromosome_length}  (was 34 058 with 256 raw pixels)")


# ── GA hyperparameters ────────────────────────────────────────────────────────
population_size      = 300
number_of_generation = 400
mutation_rate        = 0.05
elite_size           = 6
tournament_size      = 7


# ── GA utilities ──────────────────────────────────────────────────────────────
def initialize_population():
    w1_std = np.sqrt(2.0 / input_layer_size)
    w2_std = np.sqrt(2.0 / hidden_layer_size)
    s1 = input_layer_size  * hidden_layer_size
    s2 = hidden_layer_size * output_layer_size
    pop = np.zeros((population_size, chromosome_length), dtype=np.float32)
    pop[:, :s1]      = np.random.randn(population_size, s1).astype(np.float32) * w1_std
    pop[:, s1:s1+s2] = np.random.randn(population_size, s2).astype(np.float32) * w2_std
    return pop


def augment(x):
    """Small Gaussian noise in PCA feature space (avoids overfitting)."""
    return x + np.random.normal(0, 0.05, x.shape).astype(np.float32)


EVAL_BATCH_SIZE = 5000

def evaluate_population(population):
    pop_size = population.shape[0]

    # Random training mini-batch (augmented to reduce overfitting)
    tr_idx = np.random.choice(len(x_train), EVAL_BATCH_SIZE, replace=False)
    bx     = augment(x_train[tr_idx])

    # Random validation mini-batch (larger for stable balanced-accuracy estimate)
    va_idx = np.random.choice(len(x_val), min(3000, len(x_val)), replace=False)
    vx     = x_val[va_idx]
    vy     = y_val[va_idx]

    bx_t = torch.tensor(bx, dtype=torch.float32, device=device)
    vx_t = torch.tensor(vx, dtype=torch.float32, device=device)

    s1 = input_layer_size  * hidden_layer_size
    s2 = hidden_layer_size * output_layer_size

    W1 = population[:, :s1].view(pop_size, input_layer_size,  hidden_layer_size)
    W2 = population[:, s1:s1+s2].view(pop_size, hidden_layer_size, output_layer_size)
    B1 = population[:, s1+s2          : s1+s2+hidden_layer_size]
    B2 = population[:, s1+s2+hidden_layer_size:]

    # Forward pass — training batch
    h_tr  = torch.relu(torch.einsum('ni,pih->pnh', bx_t, W1) + B1.unsqueeze(1))
    lg_tr = torch.einsum('pnh,pho->pno', h_tr, W2) + B2.unsqueeze(1)
    pr_tr = torch.argmax(lg_tr, dim=2).cpu().numpy()   # (pop, EVAL_BATCH_SIZE)

    # Forward pass — validation batch
    h_va  = torch.relu(torch.einsum('ni,pih->pnh', vx_t, W1) + B1.unsqueeze(1))
    lg_va = torch.einsum('pnh,pho->pno', h_va, W2) + B2.unsqueeze(1)
    pr_va = torch.argmax(lg_va, dim=2).cpu().numpy()   # (pop, va_size)

    # Overall validation accuracy (vectorised)
    overall_acc = (pr_va == vy[None, :]).mean(axis=1)   # (pop,)

    fitness_scores = np.empty(pop_size, dtype=np.float32)
    for i in range(pop_size):
        # Balanced accuracy: mean per-class recall on validation
        # This forces the GA to learn ALL 10 digits, not just the easy ones.
        recalls = []
        for c in range(10):
            mask = vy == c
            if mask.sum() > 0:
                recalls.append(float((pr_va[i][mask] == c).mean()))
        bal_acc = float(np.mean(recalls)) if recalls else 0.0

        # Distribution penalty: penalise individuals that predict fewer than 10 classes
        n_classes = len(np.unique(pr_tr[i]))
        dist_pen  = max(0, 10 - n_classes) * 0.02

        # L2 regularisation: discourage large weights
        l2_pen = 1e-5 * float(torch.mean(population[i] ** 2).item())

        # Fitness: balanced accuracy weighted more than raw accuracy
        fitness_scores[i] = (
            0.6 * bal_acc +
            0.4 * float(overall_acc[i]) -
            dist_pen -
            l2_pen
        )

    return fitness_scores


def tournament_selection(pop_np, fitness):
    idx  = np.random.choice(len(pop_np), tournament_size, replace=False)
    best = idx[np.argmax(fitness[idx])]
    return pop_np[best]


def crossover(p1, p2):
    mask = np.random.rand(chromosome_length) < 0.5
    return np.where(mask, p1, p2).astype(np.float32)


def mutate(chromosome, generation):
    # Mutation rate decays but never fully dies out (keeps diversity late in run)
    frac  = generation / number_of_generation
    rate  = max(0.01, mutation_rate * (1.0 - 0.8 * frac))
    scale = max(0.005, 0.15 * (1.0 - 0.8 * frac))
    mask  = np.random.rand(chromosome_length) < rate
    chromosome[mask] += (np.random.randn(int(mask.sum())) * scale).astype(np.float32)
    return chromosome


# ── Training loop ─────────────────────────────────────────────────────────────
population = torch.tensor(initialize_population(), dtype=torch.float32, device=device)

generation_history   = []
true_best_chromosome = None
true_best_fitness    = -np.inf

for generation in range(number_of_generation):
    fitness_scores = evaluate_population(population)
    sorted_idx     = np.argsort(fitness_scores)[::-1].copy()
    best_fitness   = float(fitness_scores[sorted_idx[0]])

    if best_fitness > true_best_fitness:
        true_best_fitness    = best_fitness
        true_best_chromosome = population[sorted_idx[0]].clone()

    generation_history.append(best_fitness)
    print(f"Gen {generation:3d} | Fitness: {best_fitness:.4f} | Best-ever: {true_best_fitness:.4f}")

    # Build next generation
    new_pop = list(population[sorted_idx[:elite_size]])
    pop_np  = population.cpu().numpy()

    while len(new_pop) < population_size:
        p1    = tournament_selection(pop_np, fitness_scores)
        p2    = tournament_selection(pop_np, fitness_scores)
        child = crossover(p1, p2)
        child = mutate(child, generation)
        new_pop.append(torch.tensor(child, dtype=torch.float32, device=device))

    population = torch.stack(new_pop)


# ── Final evaluation ──────────────────────────────────────────────────────────
fitness_scores = evaluate_population(population)
best_idx       = int(np.argmax(fitness_scores))
best_chromosome = population[best_idx]

def predict_all(x_np, chrom):
    """Batched inference on CPU/GPU for final accuracy report."""
    s1 = input_layer_size  * hidden_layer_size
    s2 = hidden_layer_size * output_layer_size
    W1 = chrom[:s1].view(input_layer_size, hidden_layer_size)
    W2 = chrom[s1:s1+s2].view(hidden_layer_size, output_layer_size)
    B1 = chrom[s1+s2:s1+s2+hidden_layer_size]
    B2 = chrom[s1+s2+hidden_layer_size:]
    preds = []
    for start in range(0, len(x_np), 2000):
        xb = torch.tensor(x_np[start:start+2000], dtype=torch.float32, device=device)
        h  = torch.relu(xb @ W1 + B1)
        p  = torch.argmax(h @ W2 + B2, dim=1)
        preds.append(p.cpu().numpy())
    return np.concatenate(preds)

all_preds     = predict_all(x_val, best_chromosome)
test_accuracy = accuracy_score(y_val, all_preds)
print(f"\nFinal Validation Accuracy: {test_accuracy:.4f}")
for c in range(10):
    mask = y_val == c
    print(f"  Digit {c}: {accuracy_score(y_val[mask], all_preds[mask]):.3f}")


# ── Save ──────────────────────────────────────────────────────────────────────
np.save(os.path.join(current_dir, "ga_best_weights.npy"),
        true_best_chromosome.cpu().numpy())
print("\nSaved model weights → ga_best_weights.npy")

np.save(os.path.join(current_dir, "fitness_history.npy"),
        np.array(generation_history, dtype=np.float64))
print("Saved fitness history → fitness_history.npy")

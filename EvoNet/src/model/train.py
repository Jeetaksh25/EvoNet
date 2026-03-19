import numpy as np
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import sys, os

digits_dataset = load_digits()

input_features = digits_dataset.data / 16.0
target_labels = digits_dataset.target

x_train, x_val, y_train, y_val = train_test_split(
    input_features,
    target_labels,
    test_size=0.2,
    random_state=42
)

input_layer_size = 64
hidden_layer_size = 64
output_layer_size = 10

chromosome_length = (
    input_layer_size * hidden_layer_size +
    hidden_layer_size * output_layer_size +
    hidden_layer_size +
    output_layer_size
)


population_size = 300
number_of_generation = 400
mutation_rate = 0.05
elite_size = 6
tournament_size = 7

def initialize_population():
    return np.random.randn(population_size, chromosome_length) * 0.15


def softmax(x):
    exp_values = np.exp(x - np.max(x, axis=1, keepdims=True))
    return exp_values / np.sum(exp_values, axis=1, keepdims=True)


def relu(x):
    return np.maximum(0, x)


def decode_chromosome(chromosome):
    index = 0

    w1_size = input_layer_size * hidden_layer_size
    weights_input_hidden = chromosome[index:index + w1_size].reshape(input_layer_size, hidden_layer_size)
    index += w1_size

    w2_size = hidden_layer_size * output_layer_size
    weights_hidden_output = chromosome[index:index + w2_size].reshape(hidden_layer_size, output_layer_size)
    index += w2_size

    bias_hidden = chromosome[index:index + hidden_layer_size]
    index += hidden_layer_size

    bias_output = chromosome[index:index + output_layer_size]
    
    return weights_input_hidden, weights_hidden_output, bias_hidden, bias_output


def neural_network_forward(x, chromosome):
    w1, w2, b1, b2 = decode_chromosome(chromosome)

    hidden_layer = relu(np.dot(x, w1) + b1)
    output_logits = np.dot(hidden_layer, w2) + b2

    probabilities = softmax(output_logits)
    predictions = np.argmax(probabilities, axis=1)

    return predictions


def evaluate_population(population):
    fitness_scores = []

    for chromosome in population:
        predictions = neural_network_forward(x_train, chromosome)

        accuracy = accuracy_score(y_train, predictions)

        penalty = 0.00001 * np.mean(chromosome ** 2)
        fitness_scores.append(accuracy - penalty)

    return np.array(fitness_scores)


def tournament_selection(population, fitness_scores):
    selected_indices = np.random.choice(len(population), tournament_size, replace=False)
    best_indices = selected_indices[np.argmax(fitness_scores[selected_indices])]

    return population[best_indices]


def elitism(population, fitness_scores):
    sorted_indices = np.argsort(fitness_scores)
    sorted_population_based_on_fitness = population[sorted_indices[-elite_size:]]

    return sorted_population_based_on_fitness[:elite_size]

def crossover(parent_one, parent_two):
    crossover_point = np.random.randint(0, chromosome_length)

    child = np.concatenate([
        parent_one[:crossover_point],
        parent_two[crossover_point:]
    ])

    return child


def mutate(chromosome, generation):
    current_rate = mutation_rate * (1 - generation / number_of_generation)

    mutation_mask = np.random.rand(chromosome_length) < current_rate
    chromosome[mutation_mask] += np.random.randn(np.sum(mutation_mask)) * 0.20

    return chromosome


# Traning

population = initialize_population()

generation_history = []

for generation in range(number_of_generation):


    fitness_scores = evaluate_population(population)

    sorted_indices = np.argsort(fitness_scores)[::-1]

    best_accuracy = fitness_scores[sorted_indices[0]]

    generation_history.append(best_accuracy)

    print(f"Generation {generation} | Best Accuracy: {best_accuracy:.4f}")

    new_population = []

    elites = population[sorted_indices[:elite_size]]

    new_population.extend(elites)

    while len(new_population) < population_size:
        
        parent_one = tournament_selection(population, fitness_scores)
        parent_two = tournament_selection(population, fitness_scores)

        child = crossover(parent_one, parent_two)
        child = mutate(child, generation)

        new_population.append(child)

    population = np.array(new_population)



# Final Evaluation

fitness_scores = evaluate_population(population)

best_index = np.argmax(fitness_scores)

best_chromosome = population[best_index]

test_predictions = neural_network_forward(x_val, best_chromosome)

test_accuracy = accuracy_score(y_val, test_predictions)

print("\nFinal Test Accuracy:", test_accuracy)



current_dir = os.path.dirname(__file__)

# Save Model
weights_path = os.path.join(current_dir, "ga_best_weights.npy")
np.save(weights_path, best_chromosome)
print("Saved Model")

# Save History
history_path = os.path.join(current_dir, "fitness_history.npy")
np.save(history_path, generation_history)
print("Saved History")
import numpy as np
import torch
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from torch.utils.data import DataLoader


def get_parameters(model):
    return [val.detach().cpu().numpy() for _, val in model.state_dict().items()]


def set_parameters(model, parameters):
    params_dict = zip(model.state_dict().keys(), parameters)
    state_dict = {k: torch.tensor(v) for k, v in params_dict}
    model.load_state_dict(state_dict, strict=True)


def evaluate_model(model, dataset, batch_size: int = 32):
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=False)
    y_true, y_pred = [], []

    model.eval()
    with torch.no_grad():
        for x, y in loader:
            preds = model(x)
            preds = (preds >= 0.5).int().view(-1).tolist()
            y_pred.extend(preds)
            y_true.extend(y.int().tolist())

    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
    }


def average_parameters(parameter_sets, weights=None):
    if not parameter_sets:
        raise ValueError("parameter_sets cannot be empty")

    if weights is None:
        weights = [1.0] * len(parameter_sets)

    total_weight = float(sum(weights))
    averaged = []
    for layer_values in zip(*parameter_sets):
        weighted_sum = sum(w * layer for w, layer in zip(weights, layer_values))
        averaged.append(weighted_sum / total_weight)
    return averaged

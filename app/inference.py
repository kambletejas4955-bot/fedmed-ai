from pathlib import Path

import torch

from app.model import RareDiseaseNet


FEATURE_COUNT = 8
BASE_DIR = Path(__file__).resolve().parents[1]
MODEL_PATH = BASE_DIR / "saved_models" / "global_model.pt"


def load_model() -> RareDiseaseNet:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model file not found at {MODEL_PATH}. Train the federated model first."
        )

    model = RareDiseaseNet(input_dim=FEATURE_COUNT)
    state_dict = torch.load(MODEL_PATH, map_location="cpu")
    model.load_state_dict(state_dict)
    model.eval()
    return model


def predict(features: list[float]) -> dict:
    model = load_model()
    x = torch.tensor([features], dtype=torch.float32)
    with torch.no_grad():
        prob = float(model(x).item())

    return {
        "probability": round(prob, 6),
        "prediction": 1 if prob >= 0.5 else 0,
        "message": "High risk of rare disease" if prob >= 0.5 else "Low risk of rare disease",
    }

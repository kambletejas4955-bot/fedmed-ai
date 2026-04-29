import os

import numpy as np
import pandas as pd

os.makedirs("data", exist_ok=True)


def make_hospital_data(path, n=200, bias=0.0, seed=42):
    rng = np.random.default_rng(seed)
    age = rng.integers(1, 90, n)
    sex = rng.integers(0, 2, n)
    fever = rng.integers(0, 2, n)
    fatigue = rng.integers(0, 2, n)
    genetic_risk_score = rng.random(n)
    blood_marker_1 = rng.normal(0.5 + bias, 0.2, n)
    blood_marker_2 = rng.normal(0.4 + bias, 0.2, n)
    family_history = rng.integers(0, 2, n)

    logits = (
        0.02 * age
        + 0.7 * fever
        + 0.8 * fatigue
        + 2.0 * genetic_risk_score
        + 1.8 * blood_marker_1
        + 1.5 * blood_marker_2
        + 1.0 * family_history
        - 3.5
    )
    probs = 1 / (1 + np.exp(-logits))
    labels = (probs > 0.5).astype(int)

    df = pd.DataFrame(
        {
            "age": age,
            "sex": sex,
            "fever": fever,
            "fatigue": fatigue,
            "genetic_risk_score": genetic_risk_score,
            "blood_marker_1": blood_marker_1,
            "blood_marker_2": blood_marker_2,
            "family_history": family_history,
            "rare_disease_label": labels,
        }
    )
    df.to_csv(path, index=False)


make_hospital_data("data/hospital_1.csv", seed=1, bias=0.00)
make_hospital_data("data/hospital_2.csv", seed=2, bias=0.08)
make_hospital_data("data/hospital_3.csv", seed=3, bias=-0.05)
print("Demo data created")

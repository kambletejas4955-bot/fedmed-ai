from __future__ import annotations

import csv
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data"
SUBMISSIONS_DIR = DATA_DIR / "submissions"
SAVED_MODELS_DIR = ROOT_DIR / "saved_models"

HOSPITAL_FILES = {
    "hospital_1": DATA_DIR / "hospital_1.csv",
    "hospital_2": DATA_DIR / "hospital_2.csv",
    "hospital_3": DATA_DIR / "hospital_3.csv",
}

HOSPITAL_NAMES = {
    "hospital_1": "Mayo Clinic",
    "hospital_2": "Johns Hopkins",
    "hospital_3": "Cleveland Clinic",
}

TRAINING_HEADER = [
    "age",
    "sex",
    "fever",
    "fatigue",
    "genetic_risk_score",
    "blood_marker_1",
    "blood_marker_2",
    "family_history",
    "rare_disease_label",
]

SUBMISSION_HEADER = [
    "submitted_at",
    "hospital_id",
    "hospital_name",
    "age",
    "sex",
    "symptoms",
    "medical_history",
    "lab_results",
    "predicted_disease",
    "confidence",
    "refresh_triggered",
]


def ensure_storage_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    SUBMISSIONS_DIR.mkdir(parents=True, exist_ok=True)
    SAVED_MODELS_DIR.mkdir(parents=True, exist_ok=True)



def _append_csv_row(path: Path, header: Iterable[str], row: dict) -> None:
    ensure_storage_dirs()
    write_header = not path.exists()
    with path.open("a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(header))
        if write_header:
            writer.writeheader()
        writer.writerow(row)



def append_training_row(hospital_id: str, features: list[float], label: int) -> Path:
    path = HOSPITAL_FILES[hospital_id]
    row = {
        "age": int(round(features[0])),
        "sex": int(round(features[1])),
        "fever": int(round(features[2])),
        "fatigue": int(round(features[3])),
        "genetic_risk_score": round(float(features[4]), 6),
        "blood_marker_1": round(float(features[5]), 6),
        "blood_marker_2": round(float(features[6]), 6),
        "family_history": int(round(features[7])),
        "rare_disease_label": int(label),
    }
    _append_csv_row(path, TRAINING_HEADER, row)
    return path



def append_submission_row(
    hospital_id: str,
    age: int,
    sex: str,
    symptoms: list[str],
    medical_history: str,
    lab_results: str,
    predicted_disease: str,
    confidence: int,
    refresh_triggered: bool,
) -> dict[str, str]:
    submitted_at = datetime.now(timezone.utc).isoformat()
    hospital_name = HOSPITAL_NAMES.get(hospital_id, hospital_id)
    row = {
        "submitted_at": submitted_at,
        "hospital_id": hospital_id,
        "hospital_name": hospital_name,
        "age": age,
        "sex": sex,
        "symptoms": " | ".join(symptoms),
        "medical_history": medical_history,
        "lab_results": lab_results,
        "predicted_disease": predicted_disease,
        "confidence": confidence,
        "refresh_triggered": str(refresh_triggered),
    }
    hospital_submission_file = SUBMISSIONS_DIR / f"{hospital_id}.csv"
    main_server_file = SUBMISSIONS_DIR / "main_server.csv"
    _append_csv_row(hospital_submission_file, SUBMISSION_HEADER, row)
    _append_csv_row(main_server_file, SUBMISSION_HEADER, row)
    return {
        "hospital_csv": str(HOSPITAL_FILES[hospital_id].relative_to(ROOT_DIR)),
        "hospital_submission_csv": str(hospital_submission_file.relative_to(ROOT_DIR)),
        "main_server_csv": str(main_server_file.relative_to(ROOT_DIR)),
    }

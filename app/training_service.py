from __future__ import annotations

import json
from collections import OrderedDict
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd
import torch

from backend.app.frontend_schemas import FrontendDiagnosisRequest
from backend.app.model import RareDiseaseNet
from hospital_client.dataset import RareDiseaseDataset
from hospital_client.train import train_local

BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"
SUBMISSIONS_DIR = DATA_DIR / "submissions"
TRAINING_STATUS_PATH = SUBMISSIONS_DIR / "training_status.json"
FEDERATED_LOG_PATH = SUBMISSIONS_DIR / "federated_rounds.json"
GLOBAL_MODEL_PATH = BASE_DIR / "backend" / "saved_models" / "global_model.pt"
LOCAL_MODEL_DIR = BASE_DIR / "backend" / "saved_models"
REFRESH_THRESHOLD = 3

HOSPITAL_DATASET_MAP = {
    "hospital_1": DATA_DIR / "hospital_1.csv",
    "hospital_2": DATA_DIR / "hospital_2.csv",
    "hospital_3": DATA_DIR / "hospital_3.csv",
}


def _ensure_dirs() -> None:
    SUBMISSIONS_DIR.mkdir(parents=True, exist_ok=True)
    LOCAL_MODEL_DIR.mkdir(parents=True, exist_ok=True)


def _read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def get_training_status() -> dict[str, Any]:
    _ensure_dirs()
    return _read_json(
        TRAINING_STATUS_PATH,
        {
            "pending_hospitals": [],
            "submissions_since_refresh": 0,
            "last_refresh_at": None,
            "last_refreshed_hospitals": [],
            "refresh_count": 0,
        },
    )


def _save_training_status(status: dict[str, Any]) -> None:
    _write_json(TRAINING_STATUS_PATH, status)


def initialize_global_model() -> None:
    _ensure_dirs()
    if GLOBAL_MODEL_PATH.exists():
        return
    model = RareDiseaseNet(input_dim=8)
    torch.save(model.state_dict(), GLOBAL_MODEL_PATH)


def append_submission_records(
    payload: FrontendDiagnosisRequest,
    hospital_id: str,
    hospital_name: str,
    features: list[float],
    predicted_label: int,
) -> dict[str, str]:
    _ensure_dirs()

    train_row = {
        "age": features[0],
        "sex": features[1],
        "fever": features[2],
        "fatigue": features[3],
        "genetic_risk_score": features[4],
        "blood_marker_1": features[5],
        "blood_marker_2": features[6],
        "family_history": features[7],
        "rare_disease_label": predicted_label,
    }

    display_row = {
        "submitted_at": datetime.now().isoformat(timespec="seconds"),
        "hospital_id": hospital_id,
        "hospital_name": hospital_name,
        "age": payload.age,
        "sex": payload.sex,
        "symptoms": " | ".join(payload.symptoms),
        "medical_history": payload.medicalHistory,
        "lab_results": payload.labResults,
        "genetic_markers": " | ".join(payload.geneticMarkers),
        "predicted_label": predicted_label,
    }

    training_csv_path = HOSPITAL_DATASET_MAP[hospital_id]
    hospital_submission_path = SUBMISSIONS_DIR / f"{hospital_id}.csv"
    central_submission_path = SUBMISSIONS_DIR / "main_server.csv"

    pd.DataFrame([train_row]).to_csv(
        training_csv_path,
        mode="a",
        index=False,
        header=not training_csv_path.exists(),
    )
    pd.DataFrame([display_row]).to_csv(
        hospital_submission_path,
        mode="a",
        index=False,
        header=not hospital_submission_path.exists(),
    )
    pd.DataFrame([display_row]).to_csv(
        central_submission_path,
        mode="a",
        index=False,
        header=not central_submission_path.exists(),
    )

    return {
        "training_csv": str(training_csv_path.relative_to(BASE_DIR)),
        "hospital_submission_csv": str(hospital_submission_path.relative_to(BASE_DIR)),
        "central_submission_csv": str(central_submission_path.relative_to(BASE_DIR)),
    }


def mark_hospital_for_refresh(hospital_id: str) -> dict[str, Any]:
    status = get_training_status()
    pending = set(status.get("pending_hospitals", []))
    pending.add(hospital_id)
    status["pending_hospitals"] = sorted(pending)
    status["submissions_since_refresh"] = int(status.get("submissions_since_refresh", 0)) + 1
    _save_training_status(status)
    return status


def _weighted_average_state_dicts(weighted_states: list[tuple[OrderedDict[str, torch.Tensor], int]]) -> OrderedDict[str, torch.Tensor]:
    total_weight = sum(weight for _, weight in weighted_states)
    if total_weight <= 0:
        raise ValueError("No weights available for aggregation")

    keys = list(weighted_states[0][0].keys())
    averaged: OrderedDict[str, torch.Tensor] = OrderedDict()
    for key in keys:
        tensor_sum = None
        for state_dict, weight in weighted_states:
            current = state_dict[key].float() * weight
            tensor_sum = current if tensor_sum is None else tensor_sum + current
        averaged[key] = tensor_sum / total_weight
    return averaged


def maybe_run_federated_refresh() -> dict[str, Any]:
    initialize_global_model()
    status = get_training_status()
    pending_hospitals = status.get("pending_hospitals", [])
    if len(pending_hospitals) < REFRESH_THRESHOLD:
        return {
            "triggered": False,
            "reason": f"Waiting for {REFRESH_THRESHOLD - len(pending_hospitals)} more hospital updates",
            "pending_hospitals": pending_hospitals,
            "refresh_count": status.get("refresh_count", 0),
        }

    base_model = RareDiseaseNet(input_dim=8)
    base_model.load_state_dict(torch.load(GLOBAL_MODEL_PATH, map_location="cpu"))

    weighted_states: list[tuple[OrderedDict[str, torch.Tensor], int]] = []
    local_models: dict[str, str] = {}
    participant_sizes: dict[str, int] = {}

    for hospital_id, csv_path in HOSPITAL_DATASET_MAP.items():
        dataset = RareDiseaseDataset(str(csv_path))
        local_model = RareDiseaseNet(input_dim=8)
        local_model.load_state_dict(base_model.state_dict())
        train_local(local_model, dataset, epochs=1, batch_size=16, lr=1e-3)
        weighted_states.append((OrderedDict((k, v.detach().cpu()) for k, v in local_model.state_dict().items()), len(dataset)))
        local_model_path = LOCAL_MODEL_DIR / f"{hospital_id}_model.pt"
        torch.save(local_model.state_dict(), local_model_path)
        local_models[hospital_id] = str(local_model_path.relative_to(BASE_DIR))
        participant_sizes[hospital_id] = len(dataset)

    aggregated_state = _weighted_average_state_dicts(weighted_states)
    global_model = RareDiseaseNet(input_dim=8)
    global_model.load_state_dict(aggregated_state)
    torch.save(global_model.state_dict(), GLOBAL_MODEL_PATH)

    status["pending_hospitals"] = []
    status["submissions_since_refresh"] = 0
    status["last_refresh_at"] = datetime.now().isoformat(timespec="seconds")
    status["last_refreshed_hospitals"] = list(HOSPITAL_DATASET_MAP.keys())
    status["refresh_count"] = int(status.get("refresh_count", 0)) + 1
    _save_training_status(status)

    log = _read_json(FEDERATED_LOG_PATH, [])
    log.append({
        "round": status["refresh_count"],
        "timestamp": status["last_refresh_at"],
        "participants": participant_sizes,
        "global_model_path": str(GLOBAL_MODEL_PATH.relative_to(BASE_DIR)),
    })
    _write_json(FEDERATED_LOG_PATH, log)

    return {
        "triggered": True,
        "reason": "Federated refresh completed automatically",
        "pending_hospitals": [],
        "refresh_count": status["refresh_count"],
        "last_refresh_at": status["last_refresh_at"],
        "local_models": local_models,
        "global_model_path": str(GLOBAL_MODEL_PATH.relative_to(BASE_DIR)),
        "participants": participant_sizes,
    }

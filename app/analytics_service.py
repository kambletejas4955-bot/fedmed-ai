from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from app.training_service import FEDERATED_LOG_PATH, HOSPITAL_DATASET_MAP, get_training_status

BASE_DIR = Path(__file__).resolve().parent.parent
SUBMISSIONS_DIR = BASE_DIR / "data" / "submissions"
CENTRAL_CSV = SUBMISSIONS_DIR / "main_server.csv"


def _read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def _read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _dataset_size(path: Path) -> int:
    if not path.exists():
        return 0
    with path.open("r", encoding="utf-8", newline="") as f:
        return max(sum(1 for _ in f) - 1, 0)


def _confidence(row: dict[str, str]) -> float:
    try:
        return round(float(row.get("confidence", 0) or 0), 2)
    except ValueError:
        return 0.0


def build_analytics_overview(*, hospital_id: str | None = None, is_admin: bool = False) -> dict[str, Any]:
    rows = _read_csv(CENTRAL_CSV)
    if not is_admin and hospital_id:
        rows = [row for row in rows if row.get("hospital_id") == hospital_id]

    disease_counter = Counter(row.get("predicted_disease", "Unknown") for row in rows if row.get("predicted_disease"))
    disease_distribution = [{"disease": disease, "count": count, "name": disease, "value": count} for disease, count in disease_counter.most_common(6)]

    hospital_counter = Counter(row.get("hospital_name") or row.get("hospital_id") or "Unknown" for row in rows)
    hospital_stats = [{"hospital": hospital, "submissions": count} for hospital, count in hospital_counter.items()]

    confidence_trend = [{"label": f"Case {i + 1}", "confidence": _confidence(row)} for i, row in enumerate(rows[-10:])]

    recent_submissions = [
        {
            "hospital": row.get("hospital_name") or row.get("hospital_id") or "Unknown",
            "hospitalName": row.get("hospital_name") or row.get("hospital_id") or "Unknown",
            "disease": row.get("predicted_disease", "Unknown"),
            "predictedDisease": row.get("predicted_disease", "Unknown"),
            "confidence": _confidence(row),
            "submitted_at": row.get("submitted_at", ""),
            "submittedAt": row.get("submitted_at", ""),
            "symptoms": row.get("symptoms", ""),
        }
        for row in rows[-10:][::-1]
    ]

    dataset_sizes = []
    for hid, path in HOSPITAL_DATASET_MAP.items():
        if not is_admin and hospital_id and hid != hospital_id:
            continue
        hrows = [row for row in rows if row.get("hospital_id") == hid]
        avg = round(sum(_confidence(row) for row in hrows) / len(hrows), 1) if hrows else 0
        dataset_sizes.append({"hospitalId": hid, "hospital": hid, "rows": _dataset_size(path), "submissions": len(hrows), "avgConfidence": avg})

    training_status = get_training_status()
    federated_log = _read_json(FEDERATED_LOG_PATH, [])
    refresh_trend = [
        {"round": item.get("round", idx + 1), "participants": sum((item.get("participants") or {}).values()), "timestamp": item.get("timestamp")}
        for idx, item in enumerate(federated_log[-8:])
    ]

    avg_confidence = round(sum(_confidence(row) for row in rows) / len(rows), 2) if rows else 0
    summary = {
        "totalSubmissions": len(rows),
        "totalRefreshes": training_status.get("refresh_count", 0),
        "pendingHospitals": len(training_status.get("pending_hospitals", [])),
        "topDisease": disease_distribution[0]["disease"] if disease_distribution else "No data yet",
    }

    return {
        # Shape used by the newer Analytics.tsx
        "totalSubmissions": len(rows),
        "totalHospitals": len(hospital_counter),
        "averageConfidence": avg_confidence,
        "refreshCount": training_status.get("refresh_count", 0),
        "diseaseDistribution": disease_distribution,
        "hospitalStats": hospital_stats,
        "confidenceTrend": confidence_trend,
        "recentSubmissions": recent_submissions,
        # Backward-compatible shape used by older analytics/admin code
        "summary": summary,
        "datasetSizes": dataset_sizes,
        "refreshTrend": refresh_trend,
    }

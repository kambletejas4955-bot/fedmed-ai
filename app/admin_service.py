from __future__ import annotations

import csv
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from app.training_service import HOSPITAL_DATASET_MAP, get_training_status
from app.users import DEMO_USERS

BASE_DIR = Path(__file__).resolve().parent.parent
SUBMISSIONS_DIR = BASE_DIR / "data" / "submissions"
CENTRAL_CSV = SUBMISSIONS_DIR / "main_server.csv"


def _read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        return list(reader)


def build_admin_overview() -> dict[str, Any]:
    training_status = get_training_status()
    central_rows = _read_csv(CENTRAL_CSV)

    per_hospital_rows: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in central_rows:
        per_hospital_rows[row.get("hospital_id", "")].append(row)

    hospitals: list[dict[str, Any]] = []
    for hospital_id, dataset_path in HOSPITAL_DATASET_MAP.items():
        demo_user = next((u for u in DEMO_USERS.values() if u["hospital_id"] == hospital_id), None)
        hospital_name = demo_user["hospital_name"] if demo_user else hospital_id
        rows = per_hospital_rows.get(hospital_id, [])
        confidences = [float(r.get("confidence", 0) or 0) for r in rows]
        diseases = [r.get("predicted_disease", "Unknown") for r in rows if r.get("predicted_disease")]
        top_disease = Counter(diseases).most_common(1)[0][0] if diseases else "No submissions yet"

        training_rows = 0
        if dataset_path.exists():
            with dataset_path.open("r", encoding="utf-8", newline="") as f:
                training_rows = max(sum(1 for _ in f) - 1, 0)

        hospitals.append(
            {
                "hospitalId": hospital_id,
                "hospitalName": hospital_name,
                "submissions": len(rows),
                "trainingRows": training_rows,
                "avgConfidence": round(sum(confidences) / len(confidences), 1) if confidences else 0,
                "topDisease": top_disease,
            }
        )

    recent = list(reversed(central_rows[-10:]))

    return {
        "hospitals": hospitals,
        "trainingStatus": training_status,
        "recentSubmissions": recent,
    }

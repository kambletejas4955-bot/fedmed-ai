from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

from app.frontend_schemas import FrontendDiagnosisRequest

BASE_DIR = Path(__file__).resolve().parent.parent
SUBMISSIONS_DIR = BASE_DIR / "data" / "submissions"
CENTRAL_SERVER_FILE = SUBMISSIONS_DIR / "main_server.csv"

CSV_HEADERS = [
    "submitted_at",
    "hospital_id",
    "hospital_name",
    "patient_code",
    "age",
    "sex",
    "symptoms",
    "symptom_duration",
    "family_history",
    "consanguinity",
    "genetic_markers",
    "medical_history",
    "lab_results",
    "clinical_report_names",
    "lab_report_names",
    "predicted_disease",
    "confidence",
    "rarity",
    "contributing_hospitals",
]


def _ensure_csv(file_path: Path) -> None:
    file_path.parent.mkdir(parents=True, exist_ok=True)
    if not file_path.exists():
        with file_path.open("w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=CSV_HEADERS)
            writer.writeheader()


def _append_row(file_path: Path, row: dict[str, Any]) -> None:
    _ensure_csv(file_path)
    with file_path.open("a", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=CSV_HEADERS)
        writer.writerow(row)


def build_submission_row(payload: FrontendDiagnosisRequest, result: dict[str, Any], hospital_id: str, hospital_name: str) -> dict[str, Any]:
    return {
        "submitted_at": result.get("analyzedAt", ""),
        "hospital_id": hospital_id,
        "hospital_name": hospital_name,
        "patient_code": payload.patient_code,
        "age": payload.age,
        "sex": payload.sex,
        "symptoms": " | ".join(payload.symptoms),
        "symptom_duration": payload.symptom_duration,
        "family_history": payload.family_history,
        "consanguinity": payload.consanguinity,
        "genetic_markers": " | ".join(payload.geneticMarkers) if payload.geneticMarkers else str(payload.genetic_marker_score or ""),
        "medical_history": payload.merged_medical_history,
        "lab_results": payload.merged_lab_results,
        "clinical_report_names": payload.attached_reports.get("clinical_pdf_name") or " | ".join(report.name for report in payload.clinicalReports),
        "lab_report_names": payload.attached_reports.get("lab_pdf_name") or " | ".join(report.name for report in payload.labReports),
        "predicted_disease": result.get("primaryDiagnosis", ""),
        "confidence": result.get("confidence", ""),
        "rarity": result.get("rarity", ""),
        "contributing_hospitals": result.get("contributingHospitals", ""),
    }


def save_submission_to_hospital_and_central(payload: FrontendDiagnosisRequest, result: dict[str, Any], hospital_id: str, hospital_name: str) -> dict[str, str]:
    row = build_submission_row(payload, result, hospital_id, hospital_name)
    hospital_file = SUBMISSIONS_DIR / f"{hospital_id}.csv"
    _append_row(hospital_file, row)
    _append_row(CENTRAL_SERVER_FILE, row)
    return {
        "hospital_csv": str(hospital_file.relative_to(BASE_DIR)),
        "central_server_csv": str(CENTRAL_SERVER_FILE.relative_to(BASE_DIR)),
    }

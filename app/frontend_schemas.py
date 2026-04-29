from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class UploadedPdfMeta(BaseModel):
    name: str = ""
    size: int = 0
    type: str = "application/pdf"


class FrontendDiagnosisRequest(BaseModel):
    # New medical intake fields
    patient_code: str = ""
    hospital_id: str | None = None
    age: int = Field(ge=0, le=120)
    sex: Literal["male", "female", "other"]
    symptoms: list[str] = Field(default_factory=list)
    symptom_duration: str = ""

    family_history: bool = False
    consanguinity: bool = False
    genetic_marker_score: float | None = None

    bilirubin: float | None = None
    alt: float | None = None
    ast: float | None = None
    ferritin: float | None = None
    hemoglobin: float | None = None
    wbc: float | None = None
    platelets: float | None = None

    clinical_notes: str = ""
    attached_reports: dict[str, Any] = Field(default_factory=dict)

    # Legacy fields kept for old frontend compatibility
    geneticMarkers: list[str] = Field(default_factory=list)
    medicalHistory: str = ""
    labResults: str = ""
    clinicalReports: list[UploadedPdfMeta] = Field(default_factory=list)
    labReports: list[UploadedPdfMeta] = Field(default_factory=list)

    @property
    def merged_medical_history(self) -> str:
        return self.clinical_notes or self.medicalHistory or ""

    @property
    def merged_lab_results(self) -> str:
        lab_parts = []
        for label, value in [
            ("bilirubin", self.bilirubin),
            ("ALT", self.alt),
            ("AST", self.ast),
            ("ferritin", self.ferritin),
            ("hemoglobin", self.hemoglobin),
            ("WBC", self.wbc),
            ("platelets", self.platelets),
        ]:
            if value is not None:
                lab_parts.append(f"{label}: {value}")
        if self.labResults:
            lab_parts.append(self.labResults)
        return " | ".join(lab_parts)


class FrontendLoginResponse(BaseModel):
    message: str
    access_token: str
    token_type: str
    user: dict

from pydantic import BaseModel


class PatientFeatures(BaseModel):
    age: float
    sex: float
    fever: float
    fatigue: float
    genetic_risk_score: float
    blood_marker_1: float
    blood_marker_2: float
    family_history: float

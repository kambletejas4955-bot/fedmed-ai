from __future__ import annotations

from datetime import datetime

from app.frontend_schemas import FrontendDiagnosisRequest
from app.inference import predict

NEURO_SYMPTOMS = {"Seizures", "Tremor", "Cognitive changes", "Vision changes", "Difficulty walking", "Muscle weakness", "Neurological symptoms"}
MUSCULO_SYMPTOMS = {"Joint hypermobility", "Joint pain", "Muscle weakness", "Bone pain", "Chronic fatigue", "Fatigue"}
HEPATIC_SYMPTOMS = {"Abdominal pain", "Hepatomegaly", "Splenomegaly", "Jaundice", "Weight loss"}

HOSPITAL_CONTRIBUTION_MAP = {"hospital_1": 3, "hospital_2": 3, "hospital_3": 3, "admin": 3}


def _has_symptom(symptoms: set[str], needle: str) -> bool:
    return any(needle.lower() in s.lower() for s in symptoms)


def _to_model_features(payload: FrontendDiagnosisRequest) -> list[float]:
    symptoms = set(payload.symptoms)
    notes = f"{payload.merged_medical_history} {payload.merged_lab_results}".lower()

    sex_num = 1.0 if payload.sex == "male" else 0.0
    fever = 1.0 if _has_symptom(symptoms, "fever") or "fever" in notes else 0.0
    fatigue = 1.0 if _has_symptom(symptoms, "fatigue") or "fatigue" in notes else 0.0

    lab_risk = 0.0
    if payload.bilirubin is not None and payload.bilirubin > 1.2:
        lab_risk += 0.18
    if payload.alt is not None and payload.alt > 56:
        lab_risk += 0.14
    if payload.ast is not None and payload.ast > 40:
        lab_risk += 0.14
    if payload.ferritin is not None and payload.ferritin > 300:
        lab_risk += 0.12

    genetic_risk_score = min(
        1.0,
        0.25
        + 0.12 * len(payload.geneticMarkers)
        + (0.18 if payload.family_history else 0.0)
        + (0.12 if payload.consanguinity else 0.0)
        + min((payload.genetic_marker_score or 0) / 100, 0.25),
    )
    blood_marker_1 = min(1.5, 0.35 + 0.08 * len(symptoms) + lab_risk + (0.18 if symptoms & HEPATIC_SYMPTOMS else 0.0))
    blood_marker_2 = min(1.5, 0.30 + 0.07 * len(symptoms) + lab_risk + (0.18 if symptoms & NEURO_SYMPTOMS else 0.0))
    family_history = 1.0 if payload.family_history or "family" in notes else 0.0

    return [float(payload.age), sex_num, fever, fatigue, genetic_risk_score, blood_marker_1, blood_marker_2, family_history]


def _explain(payload: FrontendDiagnosisRequest) -> list[dict[str, float | str]]:
    items: list[dict[str, float | str]] = []
    if payload.family_history:
        items.append({"feature": "Family history", "value": 0.82})
    if payload.consanguinity:
        items.append({"feature": "Consanguinity", "value": 0.72})
    if payload.genetic_marker_score:
        items.append({"feature": "Genetic marker score", "value": min(1.0, payload.genetic_marker_score / 100)})
    if payload.bilirubin is not None and payload.bilirubin > 1.2:
        items.append({"feature": "Elevated bilirubin", "value": min(1.0, payload.bilirubin / 5)})
    if payload.alt is not None and payload.alt > 56:
        items.append({"feature": "Elevated ALT", "value": min(1.0, payload.alt / 200)})
    if payload.ast is not None and payload.ast > 40:
        items.append({"feature": "Elevated AST", "value": min(1.0, payload.ast / 180)})
    if payload.ferritin is not None and payload.ferritin > 300:
        items.append({"feature": "Elevated ferritin", "value": min(1.0, payload.ferritin / 900)})

    for symptom in payload.symptoms[:5]:
        items.append({"feature": f"Symptom: {symptom}", "value": 0.45})

    return sorted(items, key=lambda x: abs(float(x["value"])), reverse=True)[:5]


def _result_template(primary: str, rarity: str, differentials: list[tuple[str, int]], recs: list[str], confidence: int, hospital_id: str, hospital_name: str, payload: FrontendDiagnosisRequest) -> dict:
    return {
        "primaryDiagnosis": primary,
        "confidence": confidence,
        "rarity": rarity,
        "contributingHospitals": HOSPITAL_CONTRIBUTION_MAP.get(hospital_id, 3),
        "analyzedAt": datetime.now().strftime("%d/%m/%Y, %H:%M:%S"),
        "hospitalId": hospital_id,
        "hospitalName": hospital_name,
        "differentialDiagnoses": [{"name": name, "confidence": score} for name, score in differentials],
        "recommendations": recs,
        "explanation": _explain(payload),
        "modelVersion": "v1-medical-ui",
        "trainingTriggered": True,
        "refreshTriggered": False,
    }


def run_frontend_diagnosis(payload: FrontendDiagnosisRequest, hospital_id: str, hospital_name: str) -> dict:
    symptoms = set(payload.symptoms)
    model_output = predict(_to_model_features(payload))
    confidence = max(55, min(95, int(round(float(model_output.get("probability", 0.75)) * 100))))

    # Lab-driven decision support for a more medically meaningful demo.
    hepatic_signal = bool(symptoms & HEPATIC_SYMPTOMS) or (payload.bilirubin or 0) > 1.2 or (payload.alt or 0) > 56 or (payload.ast or 0) > 40
    neuro_signal = bool(symptoms & NEURO_SYMPTOMS)
    musculo_signal = bool(symptoms & MUSCULO_SYMPTOMS) or (payload.ferritin or 0) > 300

    if hepatic_signal:
        return _result_template(
            "Wilson's Disease",
            "rare",
            [("Autoimmune Hepatitis", 20), ("Hemochromatosis", 10), ("Non-alcoholic Fatty Liver Disease", 14)],
            ["Serum ceruloplasmin and copper levels", "24-hour urine copper collection", "Slit-lamp eye exam for Kayser-Fleischer rings", "Liver biopsy if diagnosis uncertain"],
            confidence,
            hospital_id,
            hospital_name,
            payload,
        )
    if neuro_signal:
        return _result_template(
            "Gaucher Disease Type 3",
            "ultra-rare",
            [("Niemann-Pick Disease Type C", 15), ("Tay-Sachs Disease", 8), ("Metachromatic Leukodystrophy", 12)],
            ["GBA gene sequencing", "Chitotriosidase enzyme assay", "Brain MRI with contrast", "Bone marrow biopsy"],
            confidence,
            hospital_id,
            hospital_name,
            payload,
        )
    if musculo_signal:
        return _result_template(
            "Fabry Disease",
            "rare",
            [("Pompe Disease", 18), ("Ehlers-Danlos Syndrome", 22), ("Marfan Syndrome", 11)],
            ["Alpha-galactosidase A enzyme activity test", "GLA gene analysis", "Gb3 urine levels", "Cardiac MRI for cardiomyopathy screening"],
            confidence,
            hospital_id,
            hospital_name,
            payload,
        )
    return _result_template(
        "Rare Disease Risk Detected",
        "uncommon",
        [("Metabolic Disorder", 16), ("Autoimmune Condition", 13), ("Inherited Syndrome", 11)],
        ["Order confirmatory gene panel", "Review family history with genetic counselor", "Repeat targeted metabolic workup", "Refer to rare disease specialist"],
        confidence,
        hospital_id,
        hospital_name,
        payload,
    )

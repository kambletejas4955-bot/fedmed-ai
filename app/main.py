from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.auth import router as auth_router
from app.deps import get_admin_user, get_current_user
from app.frontend_schemas import FrontendDiagnosisRequest
from app.frontend_service import run_frontend_diagnosis
from app.data_logger import save_submission_to_hospital_and_central
from app.inference import predict
from app.admin_service import build_admin_overview
from app.analytics_service import build_analytics_overview
from app.training_metrics_service import build_training_dashboard
from app.training_service import get_training_status
from app.schemas import PatientFeatures

app = FastAPI(title="Rare Disease Federated Diagnosis API")
app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict:
    return {"message": "Federated rare disease diagnosis API is running"}


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/predict")
def predict_disease(payload: PatientFeatures) -> dict:
    try:
        features = [
            payload.age,
            payload.sex,
            payload.fever,
            payload.fatigue,
            payload.genetic_risk_score,
            payload.blood_marker_1,
            payload.blood_marker_2,
            payload.family_history,
        ]
        return predict(features)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/frontend/diagnose")
def frontend_diagnose(payload: FrontendDiagnosisRequest, current_user: dict = Depends(get_current_user)) -> dict:
    try:
        result = run_frontend_diagnosis(payload, hospital_id=current_user["hospital_id"], hospital_name=current_user["hospital_name"])
        save_paths = save_submission_to_hospital_and_central(payload, result, hospital_id=current_user["hospital_id"], hospital_name=current_user["hospital_name"])
        return {
            **result,
            "savedCsvPaths": save_paths,
            "hospitalCsvPath": save_paths.get("hospital_csv", ""),
            "centralCsvPath": save_paths.get("central_server_csv", ""),
        }
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/admin/overview")
def admin_overview(current_user: dict = Depends(get_admin_user)) -> dict:
    return build_admin_overview()


@app.get("/training/status")
def training_status(current_user: dict = Depends(get_current_user)) -> dict:
    return get_training_status()


@app.get("/training/dashboard")
def training_dashboard(current_user: dict = Depends(get_current_user)) -> dict:
    return build_training_dashboard()


@app.get("/analytics/overview")
def analytics_overview(current_user: dict = Depends(get_current_user)) -> dict:
    return build_analytics_overview(hospital_id=current_user["hospital_id"], is_admin=current_user.get("role") == "admin")

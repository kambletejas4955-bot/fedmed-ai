export type UploadedPdfMeta = {
  name: string;
  size: number;
  type: string;
};

export type PatientData = {
  id?: string;
  hospital_id?: string;
  age: number;
  sex: string;
  symptoms: string[];
  medicalHistory?: string;
  labResults?: string;
  clinicalReports?: UploadedPdfMeta[];
  labReports?: UploadedPdfMeta[];
};

export interface DifferentialDiagnosis {
  name: string;
  confidence: number;
}

export interface SavedCsvPaths {
  hospital_csv: string;
  central_server_csv: string;
}

export interface DiagnosisResult {
  primaryDiagnosis: string;
  confidence: number;
  rarity: "ultra-rare" | "rare" | "uncommon";
  contributingHospitals: number;
  analyzedAt: string;
  differentialDiagnoses: DifferentialDiagnosis[];
  recommendations: string[];
  hospitalId?: string;
  hospitalName?: string;
  savedCsvPaths?: SavedCsvPaths;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const STORAGE_KEY = "fedmed-auth";

function getStoredToken(): string | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as { token?: string };
    return parsed.token || null;
  } catch {
    return null;
  }
}

export async function runFederatedDiagnosis(patient: PatientData): Promise<DiagnosisResult> {
  const token = getStoredToken();
  if (!token) {
    throw new Error("You must sign in before running diagnosis.");
  }

  const response = await fetch(`${API_BASE_URL}/frontend/diagnose`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(patient),
  });

  if (response.status === 401) {
    throw new Error("Your session expired. Please sign in again.");
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(data?.detail || "Diagnosis request failed.");
  }

  return response.json();
}

export const SYMPTOM_OPTIONS = [
  "Joint hypermobility", "Chronic fatigue", "Abdominal pain", "Hepatomegaly",
  "Splenomegaly", "Jaundice", "Tremor", "Difficulty walking", "Skin bruising",
  "Bone pain", "Anemia", "Cognitive changes", "Muscle weakness", "Seizures",
  "Vision changes", "Hearing loss", "Skin rash", "Shortness of breath",
];

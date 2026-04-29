# FedMed AI — Federated Rare Disease Diagnosis

This package combines:
- a **FastAPI + Flower + PyTorch backend** for federated learning
- your uploaded **React/Vite frontend** that matches the UI in the screenshots
- **3 hospital logins** mapped to separate hospital identities

## Demo hospital accounts
- `mayo@hospital.org` → Mayo Clinic → `hospital_1`
- `johns@hospital.org` → Johns Hopkins → `hospital_2`
- `cleveland@hospital.org` → Cleveland Clinic → `hospital_3`
- password for all demo users: `password123`

## Project structure
```text
fedmed-ai-full/
├── backend/
├── fl_server/
├── hospital_client/
├── data/
├── scripts/
└── frontend/
```

## Backend setup
Create a virtual environment, then install dependencies.

### Windows
```powershell
python -m venv venv
venv\Scripts\activate
pip install -r backend/requirements.txt
```

### Linux / macOS
```bash
python -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
```

## Generate demo hospital data
```bash
python scripts/generate_demo_data.py
```

## Run federated training
Open 4 terminals in the project root.

### Terminal 1
```bash
python fl_server/server.py
```

### Terminal 2
```bash
python hospital_client/client.py data/hospital_1.csv
```

### Terminal 3
```bash
python hospital_client/client.py data/hospital_2.csv
```

### Terminal 4
```bash
python hospital_client/client.py data/hospital_3.csv
```

The global model is saved to:
```text
saved_models/global_model.pt
```

## Run backend API
```bash
uvicorn app.main:app --reload
# alternate command also supported:
# uvicorn backend.app.main:app --reload
```

Useful backend routes:
- `GET /`
- `POST /predict`
- `POST /auth/login`
- `POST /frontend/diagnose`

## Frontend setup
In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the backend at:
```text
http://127.0.0.1:8000
```

If needed, copy `.env.example` to `.env` and change `VITE_API_BASE_URL`.

## How the frontend works
- Login uses the hospital email.
- Each login maps to a specific hospital identity.
- Diagnosis UI uses your uploaded design.
- If the backend is running, the frontend calls `POST /frontend/diagnose`.
- If the backend is not running, the UI still works using a local fallback result generator.

## Notes
- This is a **demo/college project**.
- Login is demo-only and not production secure.
- The frontend diagnosis form is richer than the original tabular backend model, so the backend converts UI inputs into model features before inference.


## JWT Login + Real Frontend API

This version includes:
- JWT-based login for the 3 demo hospitals
- protected `POST /frontend/diagnose` endpoint
- frontend sends the Bearer token on diagnosis requests

### Demo accounts
- mayo@hospital.org / password123
- johns@hospital.org / password123
- cleveland@hospital.org / password123

### Start backend
```bash
pip install -r backend/requirements.txt
python scripts/generate_demo_data.py
uvicorn app.main:app --reload
# alternate command also supported:
# uvicorn backend.app.main:app --reload
```

### Optional federated training
In separate terminals:
```bash
python fl_server/server.py
python hospital_client/client.py data/hospital_1.csv
python hospital_client/client.py data/hospital_2.csv
python hospital_client/client.py data/hospital_3.csv
```

### Start frontend
```bash
cd frontend
npm install
npm run dev
```


## Diagnosis history
- The new **History** page stores diagnosis history in the browser using localStorage, so it works immediately without extra database setup.
- Open the dashboard and use **View History** to review past diagnosis runs for the logged-in hospital.


## Included starter model
A starter checkpoint is already included at `saved_models/global_model.pt`, so the diagnosis API can run immediately before you do a full federated training round.


## New UI additions
- Custom **Other Symptom** field on the dashboard to add symptoms not in the preset list.
- PDF uploaders for **Clinical Notes** and **Lab Results**. Uploaded PDFs are kept as file metadata in the frontend session/history for demo purposes.


## CSV Submission Storage
Each diagnosis submitted from the frontend is now written to two CSV files:
- Hospital-specific file: `data/submissions/hospital_1.csv`, `hospital_2.csv`, or `hospital_3.csv`
- Central main server file: `data/submissions/main_server.csv`

This keeps a local copy per hospital and a combined copy on the central server.

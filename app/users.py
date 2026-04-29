DEMO_USERS = {
    "mayo@hospital.org": {
        "email": "mayo@hospital.org",
        "password": "password123",
        "hospital_id": "hospital_1",
        "hospital_name": "Mayo Clinic",
        "role": "hospital_user",
    },
    "johns@hospital.org": {
        "email": "johns@hospital.org",
        "password": "password123",
        "hospital_id": "hospital_2",
        "hospital_name": "Johns Hopkins",
        "role": "hospital_user",
    },
    "cleveland@hospital.org": {
        "email": "cleveland@hospital.org",
        "password": "password123",
        "hospital_id": "hospital_3",
        "hospital_name": "Cleveland Clinic",
        "role": "hospital_user",
    },
    "admin@fedmed.org": {
        "email": "admin@fedmed.org",
        "password": "password123",
        "hospital_id": "admin",
        "hospital_name": "Central Admin",
        "role": "admin",
    },
}

DEMO_USERS_BY_HOSPITAL = {user["hospital_id"]: user for user in DEMO_USERS.values()}

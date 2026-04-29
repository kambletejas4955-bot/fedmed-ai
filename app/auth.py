from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.deps import get_current_user
from app.security import create_access_token
from app.users import DEMO_USERS

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/login")
def login(payload: LoginRequest) -> dict:
    user = DEMO_USERS.get(payload.email)
    if not user or payload.password != user["password"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(
        {
            "sub": user["email"],
            "hospital_id": user["hospital_id"],
            "role": user["role"],
        }
    )
    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": user["email"],
            "hospital_id": user["hospital_id"],
            "hospital_name": user["hospital_name"],
            "role": user["role"],
        },
    }


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)) -> dict:
    return {
        "email": current_user["email"],
        "hospital_id": current_user["hospital_id"],
        "hospital_name": current_user["hospital_name"],
        "role": current_user["role"],
    }

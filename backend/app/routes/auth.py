from fastapi import APIRouter, HTTPException
from app.db.database import users_collection
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter()


@router.post("/register")
def register(user: dict):
    if users_collection.find_one({"email": user["email"]}):
        raise HTTPException(status_code=400, detail="User already exists")

    user["password"] = hash_password(user["password"])
    users_collection.insert_one(user)

    return {"message": "User registered successfully"}


@router.post("/login")
def login(user: dict):
    db_user = users_collection.find_one({"email": user["email"]})

    if not db_user or not verify_password(user["password"], db_user["password"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = create_access_token({"sub": user["email"]})
    return {"access_token": token}
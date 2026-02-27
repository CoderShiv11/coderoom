from fastapi import APIRouter
from pydantic import BaseModel
from pymongo import MongoClient
import subprocess
import tempfile
import os

router = APIRouter()

client = MongoClient("mongodb+srv://shivtejlondhe8_db_user:<db_password>@cluster0.mwe45w1.mongodb.net/?appName=Cluster0")
db = client["coderoom"]
users_collection = db["users"]

# ---------------------------
# Request Models
# ---------------------------

class CodeRequest(BaseModel):
    username: str
    code: str
    input_data: str


# ---------------------------
# RUN ROUTE (Already working)
# ---------------------------

@router.post("/run")
def run_code(request: CodeRequest):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".py") as temp:
            temp.write(request.code.encode())
            temp_path = temp.name

        result = subprocess.run(
            ["python", temp_path],
            input=request.input_data,
            text=True,
            capture_output=True,
            timeout=5
        )

        os.remove(temp_path)

        return {"output": result.stdout}

    except Exception as e:
        return {"error": str(e)}


# ---------------------------
# SUBMIT ROUTE
# ---------------------------

@router.post("/submit")
def submit_code(request: CodeRequest):
    expected_output = "Odd\n"   # CHANGE per problem

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".py") as temp:
            temp.write(request.code.encode())
            temp_path = temp.name

        result = subprocess.run(
            ["python", temp_path],
            input=request.input_data,
            text=True,
            capture_output=True,
            timeout=5
        )

        os.remove(temp_path)

        user_output = result.stdout.strip()

        if user_output == expected_output.strip():
            score = 10
        else:
            score = 0

        users_collection.update_one(
            {"username": request.username},
            {"$inc": {"score": score}},
            upsert=True
        )

        return {
            "output": user_output,
            "score_added": score
        }

    except Exception as e:
        return {"error": str(e)}


# ---------------------------
# LEADERBOARD ROUTE
# ---------------------------

@router.get("/leaderboard")
def leaderboard():
    users = list(users_collection.find({}, {"_id": 0}))
    users.sort(key=lambda x: x.get("score", 0), reverse=True)
    return users
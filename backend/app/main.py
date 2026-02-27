# -----------------------------------
# IMPORTS
# -----------------------------------

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pymongo import MongoClient
import subprocess
import tempfile
import os

# -----------------------------------
# FASTAPI APP
# -----------------------------------

app = FastAPI()

# -----------------------------------
# CORS CONFIG (IMPORTANT)
# -----------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------
# DATABASE CONNECTION
# -----------------------------------

MONGO_URI = "mongodb+srv://shivtejlondhe8_db_user:<db_password>@cluster0.mwe45w1.mongodb.net/?appName=Cluster0"

client = MongoClient(MONGO_URI)
db = client["coderoom"]
users_collection = db["users"]

# -----------------------------------
# REQUEST MODEL
# -----------------------------------

class CodeRequest(BaseModel):
    username: str
    code: str
    input_data: str


# -----------------------------------
# SERVE FRONTEND
# -----------------------------------

@app.get("/")
def serve_frontend():
    return FileResponse("index.html")


# -----------------------------------
# RUN ROUTE
# -----------------------------------

@app.post("/run")
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


# -----------------------------------
# SUBMIT ROUTE
# -----------------------------------

@app.post("/submit")
def submit_code(request: CodeRequest):

    # ⚠ CHANGE THIS PER PROBLEM
    expected_output = "Odd"

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

        # SCORING LOGIC
        if user_output == expected_output.strip():
            score = 10
        else:
            score = 0

        # UPDATE USER SCORE
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


# -----------------------------------
# LEADERBOARD ROUTE
# -----------------------------------

@app.get("/leaderboard")
def get_leaderboard():

    users = list(users_collection.find({}, {"_id": 0}))

    users.sort(key=lambda x: x.get("score", 0), reverse=True)

    return users
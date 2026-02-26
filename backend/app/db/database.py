from pymongo import MongoClient
import os

client = MongoClient("mongodb://localhost:27017")
db = client["coderoom"]
users_collection = db["users"]
rooms_collection = db["rooms"]
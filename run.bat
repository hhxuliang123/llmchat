@echo off
start cmd /k "npm run dev"
start cmd /k "cd python && python -m uvicorn main:app --host 0.0.0.0  --port 11223"
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
import os
import shutil
from typing import List, Dict
from pydantic import BaseModel

router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "data")
os.makedirs(DATA_DIR, exist_ok=True)

class CreateFileRequest(BaseModel):
    filename: str

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        file_location = os.path.join(DATA_DIR, file.filename)
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        return {"info": f"file '{file.filename}' saved at '{file_location}'"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create")
async def create_file(request: CreateFileRequest):
    try:
        filename = request.filename
        if not filename.endswith('.db'):
            filename += '.db'
            
        file_location = os.path.join(DATA_DIR, filename)
        if os.path.exists(file_location):
            raise HTTPException(status_code=400, detail="File already exists")
            
        import sqlite3
        conn = sqlite3.connect(file_location)
        conn.close()
        
        return {"info": f"file '{filename}' created successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_files():
    try:
        files = []
        if os.path.exists(DATA_DIR):
            for f in os.listdir(DATA_DIR):
                if f.endswith('.db'):
                    file_path = os.path.join(DATA_DIR, f)
                    stats = os.stat(file_path)
                    files.append({
                        "name": f,
                        "size": stats.st_size,
                        "modified": stats.st_mtime
                    })
        return files
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{filename}")
async def download_file(filename: str):
    file_path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, filename=filename)

@router.delete("/{filename}")
async def delete_file(filename: str):
    try:
        file_path = os.path.join(DATA_DIR, filename)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        os.remove(file_path)
        return {"info": f"File {filename} deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

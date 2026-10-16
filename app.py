import os
import io
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

from services.preprocessor import preprocess_prescription_image, generate_sample_prescription
from services.interaction_engine import ClinicalInteractionEngine
from services.gemma_client import GemmaClient

app = FastAPI(
    title="AushadhiDrishti API",
    description="Intelligent Multilingual Prescription Scanner powered by Gemma 4",
    version="1.0.0"
)

# Enable CORS for hackathon demos
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize singletons
interaction_engine = ClinicalInteractionEngine()
gemma_client = GemmaClient(interaction_engine)

# Mount static folder
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def root():
    """Serves the main application UI."""
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "AushadhiDrishti Backend Running. static/index.html not found."}


@app.get("/api/health")
async def health_check():
    """Returns system status, active Gemma model, and drug catalog stats."""
    return {
        "status": "online",
        "service": "AushadhiDrishti (औषधि दृष्टि)",
        "gemma_model": gemma_client.model_name,
        "gemma_endpoint": gemma_client.api_base,
        "has_live_api_key": bool(gemma_client.api_key),
        "catalog_size": len(interaction_engine.drug_db),
        "interaction_rules": len(interaction_engine.interactions),
    }


@app.get("/api/config")
async def get_config():
    """Returns the current API configuration (masking the API key for privacy)."""
    masked_key = ""
    if gemma_client.api_key:
        masked_key = gemma_client.api_key[:4] + "..." + gemma_client.api_key[-4:] if len(gemma_client.api_key) > 8 else "***"
    return {
        "api_key_set": bool(gemma_client.api_key),
        "masked_key": masked_key,
        "api_base": gemma_client.api_base,
        "model": gemma_client.model_name
    }


@app.post("/api/config")
async def update_config(payload: dict):
    """Allows updating Gemma API key, base URL, and model dynamically from the UI."""
    api_key = payload.get("api_key")
    api_base = payload.get("api_base")
    model = payload.get("model")
    
    gemma_client.update_config(api_key=api_key, api_base=api_base, model=model)
    return {
        "status": "updated",
        "api_key_set": bool(gemma_client.api_key),
        "api_base": gemma_client.api_base,
        "model": gemma_client.model_name
    }


@app.get("/api/samples")
async def list_samples():
    """Returns pre-loaded sample prescriptions for fast 1-click hackathon evaluation."""
    return [
        {
            "id": "cardio_diabetic",
            "title_en": "Cardio-Diabetic Regimen",
            "title_hi": "हृदय एवं मधुमेह पर्चा",
            "subtitle_en": "Metformin 500mg, Atorvastatin 20mg, Aspirin 75mg, Pantoprazole 40mg",
            "subtitle_hi": "मेटफॉर्मिन, एटोरवास्टेटिन, एस्पिरिन, पैंटोप्राजोल",
            "preview_url": "/static/samples/cardio_diabetic.jpg",
            "scenario_en": "Common chronic disease prescription with moderate interaction monitoring",
            "scenario_hi": "मधुमेह और कोलेस्ट्रॉल का सामान्य पर्चा - मध्यम सतर्कता",
            "tag": "Safe / Monitored"
        },
        {
            "id": "infection_fever",
            "title_en": "Acute Bacterial Infection & Fever",
            "title_hi": "तीव्र जीवाणु संक्रमण एवं ज्वर",
            "subtitle_en": "Augmentin 625mg, Dolo 650, Cetirizine 10mg, Pantoprazole 40mg",
            "subtitle_hi": "ऑगमेंटिन, डोलो 650, सेट्रीज़ीन, पैंटोप्राजोल",
            "preview_url": "/static/samples/infection_fever.jpg",
            "scenario_en": "Acute OPD case emphasizing antibiotic course completion and fever timing",
            "scenario_hi": "बुखार और इन्फेक्शन का पर्चा - एंटीबायोटिक का पूरा कोर्स",
            "tag": "Acute Care"
        },
        {
            "id": "arthritis_pain",
            "title_en": "Severe Arthritis Pain & DVT (High Danger)",
            "title_hi": "गठिया दर्द व वारफेरिन (घातक चेतावनी)",
            "subtitle_en": "Brufen 400mg (Ibuprofen), Warfarin 5mg, Omeprazole 20mg",
            "subtitle_hi": "आइबुप्रोफेन, वारफेरिन, ओमेप्राजोल",
            "preview_url": "/static/samples/arthritis_pain.jpg",
            "scenario_en": "CRITICAL RISK: Contraindicated combination of Warfarin and NSAID causing extreme bleeding",
            "scenario_hi": "अत्यंत जोखिम: खून पतला करने वाली दवा और दर्दनिवारक का जानलेवा टकराव",
            "tag": "High Risk Demo"
        }
    ]


@app.post("/api/analyze-sample/{preset_id}")
async def analyze_sample(preset_id: str):
    """Analyzes a built-in sample prescription image."""
    sample_path = os.path.join(STATIC_DIR, "samples", f"{preset_id}.jpg")
    if not os.path.exists(sample_path):
        # Generate on the fly if missing
        b, _ = generate_sample_prescription(preset_id)
        with open(sample_path, "wb") as f:
            f.write(b)

    with open(sample_path, "rb") as f:
        raw_bytes = f.read()

    processed_bytes, data_url, meta = preprocess_prescription_image(raw_bytes)
    analysis = await gemma_client.analyze_prescription(processed_bytes, filename=f"{preset_id}.jpg")
    
    return {
        "success": True,
        "image_data_url": data_url,
        "metadata": meta,
        "analysis": analysis
    }


@app.post("/api/analyze")
async def analyze_prescription(file: UploadFile = File(...)):
    """
    Main endpoint: Uploads prescription scan, applies handwriting contrast enhancement,
    and runs Gemma 4 clinical analysis.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    # Read uploaded file
    try:
        raw_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {e}")

    if len(raw_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Preprocess image
    try:
        processed_bytes, data_url, meta = preprocess_prescription_image(raw_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image preprocessing failed: {e}")

    # Analyze with Gemma / Clinical Engine
    try:
        analysis = await gemma_client.analyze_prescription(processed_bytes, filename=file.filename or "upload.jpg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis engine error: {e}")

    return {
        "success": True,
        "image_data_url": data_url,
        "metadata": meta,
        "analysis": analysis
    }


@app.get("/api/drugs")
async def get_drug_catalog():
    """Returns the verified drug catalog."""
    return interaction_engine.drug_db


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

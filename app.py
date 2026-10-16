import os
import io
import json
import time
import asyncio
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
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
        "active_provider": gemma_client.active,
        "gemma_model": gemma_client.model_name,
        "gemma_endpoint": gemma_client.api_base,
        "has_live_api_key": bool(gemma_client.api_key),
        "catalog_size": len(interaction_engine.drug_db),
        "interaction_rules": len(interaction_engine.interactions),
    }


@app.get("/api/config")
async def get_config():
    """Returns provider configuration for the UI (API keys are masked)."""
    return gemma_client.public_config()


@app.post("/api/config")
async def update_config(payload: dict):
    """
    Updates one provider's settings and (by default) makes it the active provider.
    Body: {provider, api_key?, api_base?, model?, activate?, failover?}
    """
    provider = str(payload.get("provider") or gemma_client.active).lower()
    try:
        gemma_client.configure(
            provider,
            api_key=payload.get("api_key"),
            api_base=payload.get("api_base"),
            model=payload.get("model"),
            activate=bool(payload.get("activate", True)),
            failover=payload.get("failover"),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"status": "updated", **gemma_client.public_config()}


@app.post("/api/config/test")
async def test_config(payload: dict):
    """Checks that the stored key, endpoint and model for a provider actually work."""
    return await gemma_client.ping(str(payload.get("provider") or gemma_client.active).lower())


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


SAMPLE_IDS = ("cardio_diabetic", "infection_fever", "arthritis_pain")


def _load_sample_bytes(preset_id: str) -> bytes:
    """Returns the bytes of a built-in sample prescription, generating it on first use."""
    if preset_id not in SAMPLE_IDS:
        raise HTTPException(status_code=404, detail="Unknown sample prescription.")
    sample_path = os.path.join(STATIC_DIR, "samples", f"{preset_id}.jpg")
    if not os.path.exists(sample_path):
        b, _ = generate_sample_prescription(preset_id)
        os.makedirs(os.path.dirname(sample_path), exist_ok=True)
        with open(sample_path, "wb") as f:
            f.write(b)
    with open(sample_path, "rb") as f:
        return f.read()


def _evt(payload: dict) -> str:
    """Serialises one NDJSON progress event."""
    return json.dumps(payload, ensure_ascii=False) + "\n"


def _stage(stage_id: str, status: str, data: Optional[dict] = None) -> str:
    return _evt({"type": "stage", "id": stage_id, "status": status, "data": data or {}})


async def _analysis_events(raw_bytes: bytes, filename: str):
    """
    Runs the analysis pipeline and yields NDJSON progress events as each stage finishes,
    so the UI can report real progress instead of guessing.
    Stages: upload -> enhance -> vision -> screening -> report.
    """
    started = time.perf_counter()
    extraction_task = None
    try:
        yield _stage("upload", "done", {"filename": filename, "size_bytes": len(raw_bytes)})

        # Image enhancement
        yield _stage("enhance", "active")
        try:
            processed_bytes, data_url, meta = await asyncio.to_thread(preprocess_prescription_image, raw_bytes)
        except Exception:
            yield _evt({"type": "error", "stage": "enhance",
                        "message": "This file could not be read as an image. Upload a JPG, PNG or WebP photo."})
            return
        meta = dict(meta)
        meta["processed_size_bytes"] = len(processed_bytes)
        yield _stage("enhance", "done", {**meta, "image_data_url": data_url})

        # Prescription reading (the slow step: send heartbeats so the UI shows live elapsed time)
        yield _stage("vision", "active", gemma_client.active_engine())
        extraction_task = asyncio.create_task(gemma_client.extract_prescription(processed_bytes, filename=filename))
        vision_started = time.perf_counter()
        while True:
            finished, _ = await asyncio.wait({extraction_task}, timeout=1.0)
            if finished:
                break
            yield _evt({"type": "tick", "stage": "vision", "elapsed": round(time.perf_counter() - vision_started, 1)})
        extraction = extraction_task.result()

        raw = extraction["raw"]
        raw_meds = [m for m in raw.get("medications", []) if isinstance(m, dict)]
        patient = raw.get("patient") if isinstance(raw.get("patient"), dict) else {}
        yield _stage("vision", "done", {
            "engine": extraction["engine"],
            "provider": extraction["provider"],
            "label": extraction["label"],
            "model": extraction["model"],
            "attempts": extraction["attempts"],
            "fallback_reason": extraction["fallback_reason"],
            "elapsed": round(time.perf_counter() - vision_started, 1),
            "patient_name": patient.get("name"),
            "medications": [
                {"name": m.get("name", "Unknown"), "dosage": m.get("dosage", ""), "frequency": m.get("frequency", "")}
                for m in raw_meds
            ],
        })

        # Interaction screening + enrichment
        yield _stage("screening", "active")
        analysis = await asyncio.to_thread(gemma_client.enrich, raw, extraction["source"])
        analysis["engine"] = {"mode": extraction["engine"], "provider": extraction["provider"],
                              "label": extraction["label"], "model": extraction["model"]}
        severities = [a.get("severity") for a in analysis["interactions"]]
        yield _stage("screening", "done", {
            **analysis["screening"],
            "alerts": len(severities),
            "contraindicated": severities.count("contraindicated"),
            "major": severities.count("major"),
            "moderate": severities.count("moderate"),
        })

        # Report
        yield _stage("report", "active")
        yield _stage("report", "done", {"languages": ["en", "hi"], "total_elapsed": round(time.perf_counter() - started, 1)})

        yield _evt({"type": "result", "payload": {
            "success": True,
            "image_data_url": data_url,
            "metadata": meta,
            "analysis": analysis,
        }})
    except asyncio.CancelledError:
        raise
    except Exception as e:
        print(f"[analysis] pipeline error: {type(e).__name__}: {e}")
        yield _evt({"type": "error", "stage": "pipeline", "message": "Analysis failed unexpectedly. Please try again."})
    finally:
        if extraction_task is not None and not extraction_task.done():
            extraction_task.cancel()


def _stream(raw_bytes: bytes, filename: str) -> StreamingResponse:
    return StreamingResponse(
        _analysis_events(raw_bytes, filename),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/analyze-sample/{preset_id}/stream")
async def analyze_sample_stream(preset_id: str):
    """Streams progress events while analyzing a built-in sample prescription."""
    return _stream(_load_sample_bytes(preset_id), f"{preset_id}.jpg")


@app.post("/api/analyze/stream")
async def analyze_prescription_stream(file: UploadFile = File(...)):
    """Streams progress events while analyzing an uploaded prescription."""
    try:
        raw_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {e}")
    if len(raw_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    return _stream(raw_bytes, file.filename or "upload.jpg")


@app.post("/api/analyze-sample/{preset_id}")
async def analyze_sample(preset_id: str):
    """Analyzes a built-in sample prescription image (non-streaming)."""
    raw_bytes = _load_sample_bytes(preset_id)
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

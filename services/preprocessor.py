import io
import base64
from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageDraw, ImageFont
from typing import Tuple, Optional


def preprocess_prescription_image(image_bytes: bytes, max_dimension: int = 1400) -> Tuple[bytes, str, dict]:
    """
    Enhances prescription image for optimal visual extraction:
    - Auto-rotation based on EXIF
    - Contrast enhancement (boost handwriting visibility)
    - Sharpness enhancement
    - Size optimization for LLM token and latency efficiency
    Returns: (processed_bytes, base64_data_url, metadata)
    """
    img = Image.open(io.BytesIO(image_bytes))
    
    # Handle EXIF orientation
    try:
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass

    original_size = img.size
    
    # Convert to RGB (handles RGBA, Palette, Grayscale)
    if img.mode != "RGB":
        img = img.convert("RGB")

    # Resize if oversized while preserving aspect ratio
    w, h = img.size
    if max(w, h) > max_dimension:
        ratio = max_dimension / max(w, h)
        new_size = (int(w * ratio), int(h * ratio))
        resample = getattr(Image, "Resampling", Image).LANCZOS if hasattr(Image, "Resampling") else getattr(Image, "LANCZOS", 1)
        img = img.resize(new_size, resample)

    # Enhance contrast to make faint ink / pen strokes pop
    contrast_enhancer = ImageEnhance.Contrast(img)
    enhanced_img = contrast_enhancer.enhance(1.4)

    # Enhance sharpness for handwriting clarity
    sharpness_enhancer = ImageEnhance.Sharpness(enhanced_img)
    enhanced_img = sharpness_enhancer.enhance(1.3)

    # Save to buffer
    output_buffer = io.BytesIO()
    enhanced_img.save(output_buffer, format="JPEG", quality=90)
    processed_bytes = output_buffer.getvalue()

    b64_str = base64.b64encode(processed_bytes).decode("utf-8")
    data_url = f"data:image/jpeg;base64,{b64_str}"

    metadata = {
        "original_width": original_size[0],
        "original_height": original_size[1],
        "processed_width": enhanced_img.width,
        "processed_height": enhanced_img.height,
        "format": "JPEG",
    }

    return processed_bytes, data_url, metadata


def generate_sample_prescription(preset_id: str = "cardio_diabetic") -> Tuple[bytes, str]:
    """
    Generates realistic synthetic doctor prescriptions for testing and live demonstrations.
    Presets:
    1. 'cardio_diabetic': Metformin, Atorvastatin, Aspirin, Pantoprazole (Cardio-Metabolic)
    2. 'infection_fever': Augmentin / Amoxicillin, Paracetamol 650, Cetirizine, Pantoprazole
    3. 'arthritis_pain': Ibuprofen, Warfarin, Omeprazole (High Danger Interaction Demo)
    """
    width, height = 900, 1200
    img = Image.new("RGB", (width, height), color="#fcfbfa")
    draw = ImageDraw.Draw(img)

    # Use default bitmap font with clean spacing
    font = ImageFont.load_default()

    # Hospital Header Header Bar
    draw.rectangle([0, 0, width, 130], fill="#1e3a8a")
    draw.text((40, 25), "SANJEEVANI MULTISPECIALTY HOSPITAL & RESEARCH CENTER", fill="#ffffff", font=font)
    draw.text((40, 50), "Department of Internal Medicine | NABH Accredited", fill="#93c5fd", font=font)
    draw.text((40, 75), "Helpline: +91 11-2659-8800 | OPD Timings: 09:00 AM - 05:00 PM", fill="#bfdbfe", font=font)
    draw.text((40, 100), "Reg. No: MED/DL/2026/09481 | Doctor: Dr. Arvind Mehra, MD (AIIMS)", fill="#e0f2fe", font=font)

    # Watermark background
    draw.text((260, 480), "AUSHADHI DRISHTI DEMO Rx", fill="#f1f5f9", font=font)

    # Patient Details Strip
    draw.rectangle([40, 150, width - 40, 220], outline="#cbd5e1", fill="#f8fafc")
    if preset_id == "cardio_diabetic":
        p_name = "Patient: Rajesh Kumar Sharma (M/54 yrs)    UHID: SJH-88219"
        p_vitals = "BP: 138/88 mmHg  |  HbA1c: 7.8%  |  Weight: 76 kg  |  Date: Today"
        meds = [
            ("1. Tab. Metformin 500 mg", "1 tablet - Twice Daily (After Meals - 1-0-1)", "For Glycemic Control (Sugar)"),
            ("2. Tab. Atorvastatin 20 mg", "1 tablet - Once Daily (At Bedtime - 0-0-1)", "For Lipid / Cholesterol Control"),
            ("3. Tab. Ecosprin 75 mg (Aspirin)", "1 tablet - Once Daily (After Lunch - 0-1-0)", "Cardioprotection / Blood Flow"),
            ("4. Cap. Pantoprazole 40 mg", "1 capsule - Once Daily (30 min Empty Stomach - 1-0-0)", "Gastric Acid Protection"),
        ]
        advice = "Advice: Low salt & sugar diet. 30 mins brisk walk. Fasting sugar test after 3 weeks."
    elif preset_id == "infection_fever":
        p_name = "Patient: Ananya Verma (F/28 yrs)    UHID: SJH-91042"
        p_vitals = "Temp: 101.4 F  |  BP: 118/76 mmHg  |  SpO2: 98%  |  Date: Today"
        meds = [
            ("1. Tab. Augmentin 625 mg (Amoxicillin)", "1 tablet - Twice Daily for 5 Days (1-0-1)", "Complete FULL 5 days course"),
            ("2. Tab. Dolo 650 (Paracetamol)", "1 tablet - SOS / Thrice Daily if fever >100F (1-1-1)", "Max 3 tabs in 24 hours"),
            ("3. Tab. Cetirizine 10 mg", "1 tablet - Night at Bedtime (0-0-1)", "May cause mild drowsiness"),
            ("4. Cap. Pantocid 40 mg (Pantoprazole)", "1 capsule - Morning Empty Stomach (1-0-0)", "Take with plain water"),
        ]
        advice = "Advice: Warm saline gargles. Steam inhalation. Drink lukewarm water. Rest."
    else:  # arthritis_pain
        p_name = "Patient: Mahendra Singh (M/67 yrs)    UHID: SJH-74301"
        p_vitals = "BP: 144/92 mmHg  |  INR: 2.3  |  History: DVT / Knee Osteoarthritis"
        meds = [
            ("1. Tab. Brufen 400 mg (Ibuprofen)", "1 tablet - Twice Daily with meals (1-0-1)", "Severe Knee Joint Pain"),
            ("2. Tab. Warfarin 5 mg", "1 tablet - Nightly as per INR titration (0-0-1)", "Anticoagulation / DVT Prophylaxis"),
            ("3. Cap. Omez 20 mg (Omeprazole)", "1 capsule - Morning Before Food (1-0-0)", "Mucosal Barrier Protection"),
        ]
        advice = "CRITICAL ALERT: Monitor for unusual bruising or bleeding gums! Report immediately."

    draw.text((60, 165), p_name, fill="#0f172a", font=font)
    draw.text((60, 190), p_vitals, fill="#475569", font=font)

    # Rx Symbol
    draw.text((50, 245), "Rx", fill="#dc2626", font=font)
    draw.line([40, 280, width - 40, 280], fill="#e2e8f0", width=2)

    # Medications
    y = 310
    for title, dose, note in meds:
        draw.text((60, y), title, fill="#0f172a", font=font)
        draw.text((80, y + 25), f"-> Dose: {dose}", fill="#2563eb", font=font)
        draw.text((80, y + 48), f"   Note: {note}", fill="#64748b", font=font)
        draw.line([60, y + 80, width - 60, y + 80], fill="#f1f5f9", width=1)
        y += 105

    # Footer Advice & Signature
    y_footer = height - 230
    draw.rectangle([40, y_footer, width - 40, y_footer + 70], fill="#f0fdf4", outline="#bbf7d0")
    draw.text((60, y_footer + 15), advice, fill="#166534", font=font)
    draw.text((60, y_footer + 40), "Emergency Contact: Sanjeevani ER 011-2659-8899", fill="#15803d", font=font)

    # Doctor signature area
    draw.text((width - 320, height - 120), "Dr. Arvind Mehra, MD (AIIMS)", fill="#334155", font=font)
    draw.text((width - 320, height - 95), "Senior Consultant Physician", fill="#64748b", font=font)
    draw.line([width - 320, height - 130, width - 70, height - 130], fill="#94a3b8", width=1)

    # Save to buffer
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=92)
    img_bytes = buf.getvalue()
    b64 = base64.b64encode(img_bytes).decode("utf-8")
    return img_bytes, f"data:image/jpeg;base64,{b64}"

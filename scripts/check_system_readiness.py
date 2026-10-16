"""
AushadhiDrishti - System Readiness & Pre-Flight Diagnostics CLI
--------------------------------------------------------------
Performs automated pre-demo verification of Python runtime, required packages,
critical dataset assets, static frontend bundles, and core AI services.

Usage:
    python scripts/check_system_readiness.py
"""

import sys
import os
import io

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT_DIR)

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass



def check_python_version() -> bool:
    major, minor = sys.version_info[:2]
    ver_str = f"{major}.{minor}.{sys.version_info.micro}"
    if major >= 3 and minor >= 10:
        print(f"  [PASS] Python Runtime: {ver_str} (>= 3.10 compatible)")
        return True
    print(f"  [FAIL] Python Runtime: {ver_str} (Requires Python >= 3.10)")
    return False


def check_dependencies() -> bool:
    required = ["fastapi", "uvicorn", "PIL", "httpx", "dotenv"]
    missing = []
    for pkg in required:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)

    if not missing:
        print(f"  [PASS] Core Dependencies: All required libraries installed ({', '.join(required)})")
        return True
    print(f"  [FAIL] Missing Dependencies: {', '.join(missing)}")
    return False


def check_critical_files() -> bool:
    critical_paths = [
        os.path.join(ROOT_DIR, "app.py"),
        os.path.join(ROOT_DIR, "data", "drug_database.json"),
        os.path.join(ROOT_DIR, "data", "interactions.json"),
        os.path.join(ROOT_DIR, "static", "index.html"),
        os.path.join(ROOT_DIR, "static", "css", "style.css"),
        os.path.join(ROOT_DIR, "static", "js", "app.js"),
    ]
    missing = [p for p in critical_paths if not os.path.exists(p)]
    if not missing:
        print(f"  [PASS] File Assets: Verified {len(critical_paths)} critical project bundles")
        return True
    print(f"  [FAIL] Missing Assets: {[os.path.basename(p) for p in missing]}")
    return False


def check_clinical_engine() -> bool:
    try:
        from services.interaction_engine import ClinicalInteractionEngine
        engine = ClinicalInteractionEngine()
        if len(engine.drug_db) >= 10 and len(engine.interactions) >= 5:
            print(f"  [PASS] Clinical Engine: Loaded {len(engine.drug_db)} drugs & {len(engine.interactions)} interaction rules")
            return True
        print(f"  [FAIL] Clinical Engine: Insufficient entities loaded")
        return False
    except Exception as e:
        print(f"  [FAIL] Clinical Engine: Initialization error: {e}")
        return False


def check_preprocessor() -> bool:
    try:
        from services.preprocessor import preprocess_prescription_image
        from PIL import Image
        img = Image.new("RGB", (200, 200), color=(255, 255, 255))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        proc_bytes, data_url, meta = preprocess_prescription_image(buf.getvalue())
        if proc_bytes and data_url.startswith("data:image/jpeg"):
            print("  [PASS] Image Preprocessor: Contrast boost and scaling operational")
            return True
        print("  [FAIL] Image Preprocessor: Output format invalid")
        return False
    except Exception as e:
        print(f"  [FAIL] Image Preprocessor: {e}")
        return False


def main():
    print("=" * 70)
    print("  AushadhiDrishti (AI Prescription Scanner) - System Readiness & Health")
    print("=" * 70)

    checks = [
        ("Python Environment", check_python_version),
        ("Library Dependencies", check_dependencies),
        ("Critical File Bundles", check_critical_files),
        ("Pharmacology Intelligence Engine", check_clinical_engine),
        ("Computer Vision Preprocessor", check_preprocessor),
    ]

    all_passed = True
    for name, func in checks:
        if not func():
            all_passed = False

    print("-" * 70)
    if all_passed:
        print("  [SUCCESS] All systems verified! AushadhiDrishti is ready to run.")
        print("  Run command: python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload")
        print("=" * 70)
        sys.exit(0)
    else:
        print("  [WARNING] Some pre-flight checks failed. Review errors above.")
        print("=" * 70)
        sys.exit(1)


if __name__ == "__main__":
    main()

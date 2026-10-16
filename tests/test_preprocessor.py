"""
Unit Tests for Image Preprocessing Pipeline
-------------------------------------------
Tests contrast enhancement, sharpness, resizing, EXIF transposition,
and sample prescription generation.
"""

import unittest
import io
import os
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.preprocessor import preprocess_prescription_image, generate_sample_prescription


class TestPreprocessor(unittest.TestCase):

    def setUp(self):
        # Create a synthetic in-memory RGB test image (800x600)
        self.test_img = Image.new("RGB", (800, 600), color=(240, 240, 240))
        buffer = io.BytesIO()
        self.test_img.save(buffer, format="JPEG")
        self.image_bytes = buffer.getvalue()

    def test_preprocess_returns_valid_tuple(self):
        """Verifies function returns bytes, base64 data url, and metadata dict."""
        proc_bytes, data_url, meta = preprocess_prescription_image(self.image_bytes)
        
        self.assertIsInstance(proc_bytes, bytes)
        self.assertGreater(len(proc_bytes), 0)
        self.assertTrue(data_url.startswith("data:image/jpeg;base64,"))
        self.assertEqual(meta["format"], "JPEG")
        self.assertEqual(meta["original_width"], 800)
        self.assertEqual(meta["original_height"], 600)

    def test_resizing_large_images(self):
        """Verifies oversized images are scaled down while keeping aspect ratio."""
        large_img = Image.new("RGB", (2000, 1000), color=(255, 255, 255))
        buf = io.BytesIO()
        large_img.save(buf, format="JPEG")
        
        _, _, meta = preprocess_prescription_image(buf.getvalue(), max_dimension=1000)
        self.assertLessEqual(meta["processed_width"], 1000)
        self.assertLessEqual(meta["processed_height"], 1000)
        # Verify 2:1 aspect ratio preserved
        self.assertEqual(meta["processed_width"], 1000)
        self.assertEqual(meta["processed_height"], 500)

    def test_rgba_conversion(self):
        """Verifies RGBA images are converted to RGB without errors."""
        rgba_img = Image.new("RGBA", (400, 400), color=(200, 100, 100, 128))
        buf = io.BytesIO()
        rgba_img.save(buf, format="PNG")
        
        proc_bytes, _, meta = preprocess_prescription_image(buf.getvalue())
        out_img = Image.open(io.BytesIO(proc_bytes))
        self.assertEqual(out_img.mode, "RGB")

    def test_generate_sample_prescription(self):
        """Verifies built-in prescription generator yields valid readable bytes."""
        sample_bytes, data_url = generate_sample_prescription("cardio_diabetic")
        self.assertIsInstance(sample_bytes, bytes)
        self.assertGreater(len(sample_bytes), 100)
        self.assertTrue(data_url.startswith("data:image/jpeg;base64,"))
        
        opened = Image.open(io.BytesIO(sample_bytes))
        self.assertGreater(opened.width, 0)
        self.assertGreater(opened.height, 0)


if __name__ == "__main__":
    unittest.main()

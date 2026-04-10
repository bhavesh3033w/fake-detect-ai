"""
FakeDetect AI Microservice
FastAPI + OpenCV based image analysis service

Install:
    pip install fastapi uvicorn python-multipart opencv-python-headless numpy Pillow

Run:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import cv2
from PIL import Image, ImageStat
import io
import math
import time
from typing import Optional

app = FastAPI(
    title="FakeDetect AI Microservice",
    description="Advanced image analysis for fake detection",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_image_from_bytes(data: bytes) -> np.ndarray:
    nparr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Unable to decode image")
    return img


def ela_analysis(img_bytes: bytes, quality: int = 90) -> dict:
    """Error Level Analysis — detects re-saved/edited regions."""
    findings = []
    score = 100

    try:
        pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

        # Save at reduced quality
        buf = io.BytesIO()
        pil_img.save(buf, format="JPEG", quality=quality)
        buf.seek(0)
        compressed = Image.open(buf).convert("RGB")

        # Compute difference
        orig_arr = np.array(pil_img, dtype=np.float32)
        comp_arr = np.array(compressed, dtype=np.float32)
        diff = np.abs(orig_arr - comp_arr)

        mean_diff = float(np.mean(diff))
        max_diff = float(np.max(diff))
        std_diff = float(np.std(diff))

        if mean_diff > 15:
            findings.append(f"High ELA residual (mean={mean_diff:.1f}) — significant re-compression artifacts")
            score -= 25
        elif mean_diff > 8:
            findings.append(f"Moderate ELA residual (mean={mean_diff:.1f}) — possible editing")
            score -= 12

        if std_diff > 20:
            findings.append("High variance in error levels across image — inconsistent editing detected")
            score -= 15

        # Region analysis — if certain areas have much higher ELA than others, likely splice
        h, w = diff.shape[:2]
        regions = [
            diff[:h//2, :w//2], diff[:h//2, w//2:],
            diff[h//2:, :w//2], diff[h//2:, w//2:],
        ]
        region_means = [float(np.mean(r)) for r in regions]
        range_diff = max(region_means) - min(region_means)
        if range_diff > 20:
            findings.append(f"Uneven ELA across quadrants (range={range_diff:.1f}) — possible image splicing")
            score -= 20

    except Exception as e:
        findings.append(f"ELA analysis failed: {str(e)}")
        score -= 5

    return {"score": max(0, min(100, score)), "findings": findings}


def noise_analysis(img: np.ndarray) -> dict:
    """Analyze noise patterns for manipulation detection."""
    findings = []
    score = 100

    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Laplacian variance for sharpness
        lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

        if lap_var < 50:
            findings.append(f"Blurry image or low detail (sharpness={lap_var:.0f}) — may indicate compositing")
            score -= 10

        # Median filter residual noise
        median = cv2.medianBlur(gray, 3)
        residual = cv2.absdiff(gray, median).astype(np.float32)
        noise_mean = float(np.mean(residual))
        noise_std = float(np.std(residual))

        if noise_mean < 0.3:
            findings.append("Near-zero noise residual — image may be synthetically generated")
            score -= 18
        elif noise_mean > 12:
            findings.append(f"Elevated noise residual ({noise_mean:.1f}) — possible noise injection")
            score -= 15

        # DCT analysis for JPEG artifacts
        h, w = gray.shape
        dct_scores = []
        block = 8
        for y in range(0, h - block, block * 4):
            for x in range(0, w - block, block * 4):
                tile = gray[y:y+block, x:x+block].astype(np.float32)
                dct = cv2.dct(tile)
                dct_scores.append(float(np.sum(np.abs(dct[4:, 4:]))))

        if dct_scores:
            avg_hf = np.mean(dct_scores)
            if avg_hf < 5:
                findings.append("Minimal high-frequency DCT coefficients — image may be over-smoothed or AI-generated")
                score -= 12

    except Exception as e:
        findings.append(f"Noise analysis error: {str(e)}")
        score -= 3

    return {"score": max(0, min(100, score)), "findings": findings}


def edge_consistency_analysis(img: np.ndarray) -> dict:
    """Check edge patterns for copy-paste or compositing artifacts."""
    findings = []
    score = 100

    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Canny edges
        edges = cv2.Canny(gray, 50, 150)
        edge_ratio = float(np.sum(edges > 0)) / (gray.shape[0] * gray.shape[1])

        if edge_ratio > 0.3:
            findings.append("Unusually high edge density — possible overlay or text injection")
            score -= 15
        elif edge_ratio < 0.01 and gray.shape[0] > 100:
            findings.append("Very few edges detected — image may be heavily blurred or synthetic")
            score -= 10

        # Check for straight horizontal/vertical lines (common in screenshot fabrication)
        lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=100, minLineLength=100, maxLineGap=5)
        if lines is not None:
            h_lines = sum(1 for l in lines if abs(l[0][1] - l[0][3]) < 3)
            v_lines = sum(1 for l in lines if abs(l[0][0] - l[0][2]) < 3)
            if h_lines > 20 or v_lines > 20:
                findings.append(f"High number of perfect straight lines ({h_lines}H/{v_lines}V) — typical of UI screenshot fabrication")
                score -= 8  # Not penalised heavily since real screenshots also have UI lines

    except Exception as e:
        findings.append(f"Edge analysis error: {str(e)}")

    return {"score": max(0, min(100, score)), "findings": findings}


def color_analysis(img: np.ndarray) -> dict:
    """Color space and saturation analysis."""
    findings = []
    score = 100

    try:
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        sat = hsv[:, :, 1].astype(np.float32)
        val = hsv[:, :, 2].astype(np.float32)

        mean_sat = float(np.mean(sat))
        high_sat_ratio = float(np.sum(sat > 230) / sat.size)
        low_val_ratio = float(np.sum(val < 10) / val.size)

        if mean_sat > 180:
            findings.append(f"Over-saturated colors (mean={mean_sat:.0f}/255) — possible digital enhancement")
            score -= 15

        if high_sat_ratio > 0.15:
            findings.append(f"Large areas of extreme saturation ({high_sat_ratio*100:.0f}%) — may indicate colour injection")
            score -= 12

        if low_val_ratio > 0.4:
            findings.append("More than 40% of pixels are near-black — possibly a dark-theme screenshot or manipulated")

        # Check for uniform color blocks (sign of pasted text or overlays)
        b, g, r = cv2.split(img)
        for ch_name, ch in [('Red', r), ('Green', g), ('Blue', b)]:
            unique = len(np.unique(ch))
            if unique < 10:
                findings.append(f"Extremely low {ch_name} channel variance — possible solid color overlay")
                score -= 20
                break

    except Exception as e:
        findings.append(f"Color analysis error: {str(e)}")

    return {"score": max(0, min(100, score)), "findings": findings}


def generate_heatmap_b64(img: np.ndarray, ela_diff_mean: float) -> Optional[str]:
    """Generate a base64 encoded heatmap image."""
    try:
        import base64
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (21, 21), 0)
        diff = cv2.absdiff(gray, blurred)
        diff_normalized = cv2.normalize(diff, None, 0, 255, cv2.NORM_MINMAX)
        heatmap = cv2.applyColorMap(diff_normalized.astype(np.uint8), cv2.COLORMAP_JET)
        alpha = min(0.6, ela_diff_mean / 30)
        overlay = cv2.addWeighted(img, 1 - alpha, heatmap, alpha, 0)
        _, buf = cv2.imencode('.jpg', overlay, [cv2.IMWRITE_JPEG_QUALITY, 80])
        return f"data:image/jpeg;base64,{base64.b64encode(buf.tobytes()).decode()}"
    except Exception:
        return None


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    start = time.time()

    allowed = ["image/jpeg", "image/png", "image/webp", "image/bmp"]
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")

    img_bytes = await file.read()
    if len(img_bytes) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 15MB)")

    try:
        img = load_image_from_bytes(img_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read image: {str(e)}")

    h, w = img.shape[:2]

    # Run all analyses
    ela = ela_analysis(img_bytes)
    noise = noise_analysis(img)
    edges = edge_consistency_analysis(img)
    colors = color_analysis(img)

    # Weighted aggregate (ELA is most reliable for forgery)
    aggregate = round(
        ela["score"] * 0.35
        + noise["score"] * 0.30
        + edges["score"] * 0.20
        + colors["score"] * 0.15
    )

    result = "real" if aggregate >= 75 else "suspicious" if aggregate >= 45 else "fake"

    all_findings = (
        ela["findings"] + noise["findings"] + edges["findings"] + colors["findings"]
    )
    reasons = [f for f in all_findings if f] or ["No significant manipulation indicators found"]

    # Generate heatmap for non-real results
    heatmap_b64 = None
    if result != "real":
        ela_mean = 0
        try:
            pil = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            buf = io.BytesIO()
            pil.save(buf, format="JPEG", quality=90)
            buf.seek(0)
            compressed = Image.open(buf).convert("RGB")
            diff = np.abs(np.array(pil, dtype=np.float32) - np.array(compressed, dtype=np.float32))
            ela_mean = float(np.mean(diff))
        except Exception:
            pass
        heatmap_b64 = generate_heatmap_b64(img, ela_mean)

    processing_ms = int((time.time() - start) * 1000)

    return {
        "success": True,
        "result": result,
        "confidence": aggregate,
        "reasons": reasons,
        "heatmap_base64": heatmap_b64,
        "processing_time_ms": processing_ms,
        "dimensions": {"width": w, "height": h},
        "analysis": {
            "ela": {"score": ela["score"], "findings": ela["findings"]},
            "noise": {"score": noise["score"], "findings": noise["findings"]},
            "edges": {"score": edges["score"], "findings": edges["findings"]},
            "color": {"score": colors["score"], "findings": colors["findings"]},
        },
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "FakeDetect AI Microservice"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

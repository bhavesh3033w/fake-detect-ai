# 🛡️ FakeDetect AI — Screenshot Authenticity Detection Platform

A production-ready full-stack MERN application that uses multi-layered AI analysis to detect fake or manipulated screenshots.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔍 **Multi-layer Detection** | Metadata, pixel analysis, AI heuristics |
| 🔥 **Heatmap Overlay** | Visual highlighting of suspicious regions |
| 🤖 **AI Explanations** | Human-readable findings for each detection |
| 📊 **Analytics Dashboard** | Charts, trends, type breakdowns |
| 🔐 **JWT Authentication** | Secure register/login with bcrypt |
| 📜 **History** | Full report history with filter & delete |
| 🌐 **Public API** | API key access for external integration |
| 🐍 **Python Microservice** | Optional OpenCV+ELA deep analysis |

---

## 🧱 Tech Stack

- **Frontend** — React 18, Tailwind CSS, Recharts
- **Backend** — Node.js, Express.js, MongoDB (Mongoose)
- **Storage** — Cloudinary
- **Auth** — JWT + bcryptjs
- **AI Service** — Python FastAPI, OpenCV, PIL

---

## 📁 Project Structure

```
fake-detect/
├── client/                  # React frontend
│   ├── src/
│   │   ├── context/         # AuthContext (JWT, API)
│   │   ├── pages/           # Dashboard, Upload, Result, History, Profile
│   │   ├── components/      # Layout, Sidebar
│   │   └── index.css        # Global styles
│   ├── public/
│   └── package.json
│
├── server/                  # Node.js backend
│   ├── controllers/         # authController, reportController
│   ├── middleware/          # JWT auth middleware
│   ├── models/              # User, Report (Mongoose)
│   ├── routes/              # /auth, /reports, /analytics, /api/v1
│   ├── utils/               # cloudinary.js, detector.js
│   └── index.js
│
├── ai-service/              # Python FastAPI microservice
│   ├── main.py              # ELA, noise, edge, color analysis
│   └── requirements.txt
│
├── .env.example
├── package.json
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Cloudinary account (free tier works)
- Python 3.9+ (optional, for AI microservice)

---

### 1. Clone & Install

```bash
git clone https://github.com/yourname/fake-detect.git
cd fake-detect

# Install all dependencies
npm run install:all
```

---

### 2. Configure Environment

```bash
# Copy and fill in your values
cp .env.example server/.env
```

Edit `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fakedetect
JWT_SECRET=your_very_long_secret_key_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLIENT_URL=http://localhost:3000
```

> Get Cloudinary credentials free at [cloudinary.com](https://cloudinary.com)

---

### 3. Run the App

```bash
# Start both frontend and backend simultaneously
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

---

### 4. (Optional) Run Python AI Microservice

```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The Node.js backend will automatically use the Python service if `AI_SERVICE_URL` is set in `.env`.

---

## 🔌 API Reference

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/generate-api-key` | Generate public API key |

### Reports

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/reports/analyze` | Upload and analyze image |
| GET | `/api/reports` | Get user's reports (paginated) |
| GET | `/api/reports/:id` | Get single report |
| DELETE | `/api/reports/:id` | Delete report |

### Analytics

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/dashboard` | Get dashboard stats |

### Public API

```bash
POST /api/v1/detect
Headers: x-api-key: fd_your_api_key
Body: multipart/form-data with field "image"
```

Response:
```json
{
  "success": true,
  "result": "fake",
  "confidence": 34,
  "reasons": ["JPEG block artifacts detected", "High noise residual"],
  "screenshot_type": "upi_payment",
  "processing_time_ms": 1240
}
```

---

## 🧠 Detection Engine

Detection works in 3 layers:

**Level 1 — Metadata Analysis (25% weight)**
- File size vs resolution check
- Aspect ratio analysis
- Format validation
- Dimension anomalies

**Level 2 — Pixel Analysis (40% weight)**
- Noise pattern analysis
- JPEG block artifact detection
- Copy-move detection (tile hashing)
- Color distribution analysis

**Level 3 — AI Heuristics (35% weight)**
- Brightness distribution
- Gradient consistency
- Saturation anomalies
- Sharpness regional inconsistency
- Screenshot-type specific checks (UPI, WhatsApp, etc.)

**Score → Result:**
- 75–100 → ✅ Real
- 45–74 → ⚠️ Suspicious  
- 0–44 → ❌ Fake

---

## 🐍 Python Microservice (Advanced)

The optional FastAPI microservice adds:
- **ELA (Error Level Analysis)** — detects re-saved/edited regions
- **DCT frequency analysis** — JPEG compression artifacts
- **Canny edge analysis** — structural inconsistencies
- **OpenCV heatmap generation** — pixel-accurate manipulation map

To integrate it with the Node.js backend, add to `server/.env`:
```env
AI_SERVICE_URL=http://localhost:8000
```

---

## 🎨 Screenshots

| Dashboard | Upload | Result |
|---|---|---|
| Analytics, charts, recent activity | Drag-drop upload, detection progress | Score, heatmap, AI findings |

---

## 📦 Deployment

### Backend (Render / Railway)
1. Set environment variables
2. Build command: `npm install`
3. Start command: `node index.js`

### Frontend (Vercel / Netlify)
1. Build command: `npm run build`
2. Output directory: `build`
3. Set `REACT_APP_API_URL` to your backend URL

### MongoDB Atlas
Free tier at [mongodb.com/atlas](https://mongodb.com/atlas)

---

## 📄 License

MIT License. Use freely for personal and commercial projects.

---

Built with ❤️ using the MERN stack + AI.

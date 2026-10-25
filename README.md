# DistriSense — Autonomous FMCG Distribution Intelligence

> **Foresight before the shelf runs dry.** DistriSense monitors an interconnected network of warehouses and kirana store shelves across FMCG territories, detecting stockouts and expiry risks before traditional systems can react.

---

## System Architecture

DistriSense is composed of two primary services:

1. **Frontend (`distrisense-web`)**:
   - Modern React application with custom cinematic typography, micro-interactions, and responsive layout.
   - Interactive Decision Engine Dashboard featuring MapTiler territory mapping, dispatch queue with FEFO guards, expiry risk radar, and multi-scenario simulator.
   - Full organisation authentication with Google Sign-In, onboarding quiz, and multi-tenant company personalization.

2. **Backend API (`distrisense-api`)**:
   - High-performance FastAPI application powered by SQLAlchemy with a 6,000-position territory dataset.
   - Daily decision pipeline with safety stock, reorder point calculations, Poisson distribution demand models, and automated FEFO dispatch creation.
   - Comprehensive audit logging and idempotent recommendation approvals.

---

## Local Development

### 1. Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run backend test suite
pytest

# Start FastAPI server
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Frontend Setup

```bash
# In repository root
npm install

# Start Vite dev server on port 5173
npm run dev

# Build for production
npm run build
```

---

## Deployment on Render (Blueprint)

This repository includes a [`render.yaml`](render.yaml) blueprint specification for automated multi-service deployment:

1. **`distrisense-api`** (Python Web Service)
   - Root directory: `backend`
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Environment variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (`sync: false`)

2. **`distrisense-web`** (Static Site)
   - Build command: `npm install && npm run build`
   - Publish path: `dist`
   - Environment variables: `VITE_GOOGLE_CLIENT_ID` (`sync: false`), `VITE_DASHBOARD_URL`, `VITE_API_BASE_URL`

---

## Environment Configuration

Copy the example environment files before running locally:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Fill in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` obtained from Google Cloud Console.

# AI Resume Analyzer & Job Matcher

A production-quality full-stack AI-powered resume analysis and job matching platform.

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend API | Node.js, Express |
| AI / Processing | Python, FastAPI |
| Database | MongoDB, Mongoose |
| Real-Time | Socket.IO |
| File Storage | Cloudinary |
| Payments | Razorpay |
| AI Provider | Google Gemini |

## Project Structure

```
AI-RESUME-ANALYZER/
├── client/          # Frontend (HTML/CSS/JS)
├── server/          # Express backend API
└── ai-service/      # FastAPI AI/processing service
```

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- Python (v3.10 or later)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/AI-RESUME-ANALYZER.git
cd AI-RESUME-ANALYZER
```

### 2. Start the Express Backend

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

The server will start on `http://localhost:5001` (port 5001 because macOS uses 5000 for AirPlay).

### 3. Start the FastAPI Service

```bash
cd ai-service
cp .env.example .env
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --reload-dir app --port 8000
```

The service will start on `http://localhost:8000`.

### 4. Open the Frontend

Open `client/index.html` in your browser, or use a local server:

```bash
npx serve client -l 5500
```

The frontend will be available at `http://localhost:5500`.

### Health Checks

- Express: `http://localhost:5001/api/health`
- FastAPI: `http://localhost:8000/health`

## Status

🚧 **Under active development** — this project is being built incrementally, phase by phase.

## License

This project is for educational and portfolio purposes.

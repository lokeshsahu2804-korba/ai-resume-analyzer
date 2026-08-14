from datetime import datetime, timezone
from fastapi import FastAPI

app = FastAPI(
    title="AI Resume Analyzer - Processing Service",
    description="FastAPI service for PDF processing and AI analysis",
    version="1.0.0"
)


@app.get("/health")
async def health_check():
    """Health check endpoint for the FastAPI AI service."""
    return {
        "status": "ok",
        "service": "fastapi",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

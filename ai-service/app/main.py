from datetime import datetime, timezone
from fastapi import FastAPI
from app.routes import resume

app = FastAPI(
    title="AI Resume Analyzer - Processing Service",
    description="FastAPI service for PDF text extraction and AI analysis",
    version="1.0.0"
)

# Register internal API routers
app.include_router(resume.router)


@app.get("/health")
async def health_check():
    """Health check endpoint for the FastAPI AI service."""
    return {
        "status": "ok",
        "service": "fastapi",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

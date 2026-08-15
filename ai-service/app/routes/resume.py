"""
FastAPI Resume Processing & AI Analysis Router (app/routes/resume.py)
Protected internal endpoints for PDF text extraction and Gemini AI ATS scoring.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.middleware.auth import verify_internal_api_key
from app.schemas.resume import ProcessResumeRequest, ProcessResumeResponse
from app.schemas.analysis import AnalyzeResumeRequest, AnalyzeResumeResponse
from app.services.pdf_extractor import download_or_read_pdf, extract_text_from_pdf_bytes
from app.services.resume_parser import parse_resume_content
from app.services.ai_analyzer import analyze_resume_content
from app.utils.text_cleaner import clean_text, calculate_text_stats

logger = logging.getLogger("fastapi_resume_processor")

router = APIRouter(
    prefix="/api",
    tags=["Resume Processing & Analysis"],
    dependencies=[Depends(verify_internal_api_key)]
)


@router.post(
    "/process-resume",
    response_model=ProcessResumeResponse,
    status_code=status.HTTP_200_OK,
    summary="Extract text and parse structured sections from a resume PDF"
)
async def process_resume(payload: ProcessResumeRequest):
    """
    Downloads the resume PDF from Cloudinary or local storage, extracts UTF-8 text using PyMuPDF,
    cleans the text stream, and deterministically parses contact details, skills, experience, and education.
    """
    logger.info(f"Processing resume document: resumeId={payload.resumeId}, fileUrl={payload.fileUrl}")

    # 1. Download or read PDF binary bytes
    pdf_bytes = await download_or_read_pdf(payload.fileUrl)

    # 2. Extract raw text & page count
    extraction_result = extract_text_from_pdf_bytes(pdf_bytes)
    raw_text = extraction_result.get("rawText", "")
    page_count = extraction_result.get("pageCount", 1)

    # 3. Clean & normalize text
    cleaned_text = clean_text(raw_text)
    if not cleaned_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Extracted text is empty after normalization"
        )

    # 4. Calculate text statistics
    stats = calculate_text_stats(cleaned_text)

    # 5. Parse structured sections
    parsed_data = parse_resume_content(cleaned_text)

    logger.info(
        f"Successfully processed resume: pages={page_count}, words={stats['wordCount']}, "
        f"skills_found={len(parsed_data.skills)}, experience_entries={len(parsed_data.experience)}"
    )

    return ProcessResumeResponse(
        success=True,
        resumeId=payload.resumeId,
        extractedText=cleaned_text,
        parsed=parsed_data,
        pageCount=page_count,
        wordCount=stats["wordCount"],
        characterCount=stats["characterCount"]
    )


@router.post(
    "/analyze-resume",
    response_model=AnalyzeResumeResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate AI ATS score breakdown, strengths, weaknesses, and improvement suggestions"
)
async def analyze_resume(payload: AnalyzeResumeRequest):
    """
    Executes Google Gemini AI and ATS scoring engine on extracted resume text and optional job description.
    """
    logger.info(f"Initiating AI resume analysis for resumeId={payload.resumeId}")

    if not payload.extractedText or not payload.extractedText.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume text cannot be empty for AI analysis"
        )

    result = await analyze_resume_content(payload)
    return result

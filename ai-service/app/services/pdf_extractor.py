"""
PDF Extraction Service (app/services/pdf_extractor.py)
Downloads and extracts UTF-8 text from PDFs using PyMuPDF (fitz) with pdfplumber fallback.
"""

import io
import os
import httpx
import fitz  # PyMuPDF
import pdfplumber
from fastapi import HTTPException, status


async def download_or_read_pdf(file_url: str) -> bytes:
    """
    Retrieves PDF bytes from either an HTTP(S) URL (Cloudinary) or local workspace path.
    """
    if not file_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File URL or path is required"
        )

    # 1. Cloud / Remote URL (http/https)
    if file_url.startswith("http://") or file_url.startswith("https://"):
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                response = await client.get(file_url)
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Failed to download PDF from storage. HTTP status {response.status_code}"
                    )
                return response.content
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Timeout downloading resume PDF from cloud storage"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Error accessing remote PDF: {str(e)}"
            )

    # 2. Local File Fallback (e.g. /uploads/resumes/...)
    local_path = file_url
    if file_url.startswith("/uploads/"):
        # Resolve to server/uploads directory
        workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        local_path = os.path.join(workspace_root, "server", file_url.lstrip("/"))

    if not os.path.exists(local_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Local PDF file not found at path: {local_path}"
        )

    try:
        with open(local_path, "rb") as f:
            return f.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Error reading local PDF file: {str(e)}"
        )


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> dict:
    """
    Extracts text from PDF binary stream using PyMuPDF with pdfplumber fallback.
    
    Returns:
        dict: {"rawText": str, "pageCount": int}
    """
    if len(pdf_bytes) < 4 or not pdf_bytes.startswith(b"%PDF"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The provided file is not a valid PDF document (magic bytes mismatch)"
        )

    raw_text = ""
    page_count = 0

    # 1. Primary Extraction with PyMuPDF (fitz) - Fast & Accurate
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page_count = len(doc)
        pages_text = []

        for page_num in range(page_count):
            page = doc[page_num]
            text = page.get_text("text")
            if text.strip():
                pages_text.append(text)

        raw_text = "\n\n".join(pages_text)
        doc.close()
    except Exception as e:
        # Proceed to fallback if PyMuPDF encountered an issue
        pass

    # 2. Fallback Extraction with pdfplumber (if PyMuPDF text is empty or failed)
    if not raw_text.strip():
        try:
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                page_count = len(pdf.pages)
                pages_text = []
                for page in pdf.pages:
                    text = page.extract_text(layout=True) or page.extract_text()
                    if text and text.strip():
                        pages_text.append(text)
                raw_text = "\n\n".join(pages_text)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to extract text from PDF document: {str(e)}"
            )

    if not raw_text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="PDF contains no extractable text (it may be a scanned image or protected)"
        )

    return {
        "rawText": raw_text,
        "pageCount": max(1, page_count)
    }

"""
Text Normalization & Entity Cleaner Utilities (app/utils/text_cleaner.py)
Cleans raw PDF text streams and performs deterministic regex extraction.
"""

import re
from typing import Dict, List, Optional


def clean_text(raw_text: str) -> str:
    """
    Cleans raw extracted text:
    - Removes null bytes and unprintable control characters
    - Normalizes non-breaking spaces and unicode quotes
    - Standardizes bullet points to clean unicode bullet
    - Collapses excessive whitespace while preserving paragraph lines
    """
    if not raw_text:
        return ""

    # Remove null bytes and non-printable control chars (preserve \n and \t)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", raw_text)

    # Normalize unicode whitespace and quotes
    text = text.replace("\u00a0", " ").replace("\u200b", "")
    text = text.replace("“", '"').replace("”", '"').replace("’", "'").replace("‘", "'")

    # Normalize bullet points (•, ◦, ▪, ▫, ‣, ►, -, *)
    text = re.sub(r"^[\s]*[•◦▪▫‣►\*\-]\s*", "• ", text, flags=re.MULTILINE)

    # Normalize line breaks
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Remove trailing whitespace per line
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]

    # Remove excessive blank lines (> 2 in a row)
    cleaned_lines = []
    blank_count = 0
    for line in lines:
        if not line:
            blank_count += 1
            if blank_count <= 2:
                cleaned_lines.append("")
        else:
            blank_count = 0
            cleaned_lines.append(line)

    return "\n".join(cleaned_lines).strip()


def extract_email(text: str) -> Optional[str]:
    """Extracts candidate email address via RFC compliant regex."""
    email_pattern = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
    matches = re.findall(email_pattern, text)
    return matches[0].lower() if matches else ""


def extract_phone(text: str) -> Optional[str]:
    """Extracts international or domestic telephone numbers."""
    phone_pattern = r"(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{3,5}"
    matches = re.findall(phone_pattern, text)
    for match in matches:
        clean_num = re.sub(r"[^\d+]", "", match)
        if 8 <= len(clean_num) <= 15:
            return match.strip()
    return ""


def extract_urls(text: str) -> Dict[str, str]:
    """Extracts LinkedIn, GitHub, and Portfolio URLs from resume text."""
    urls = {"linkedin": "", "github": "", "portfolio": ""}

    # LinkedIn pattern
    linkedin_match = re.search(r"(?:https?://)?(?:www\.)?linkedin\.com/in/([a-zA-Z0-9_-]+)", text, re.IGNORECASE)
    if linkedin_match:
        urls["linkedin"] = f"https://linkedin.com/in/{linkedin_match.group(1)}"

    # GitHub pattern
    github_match = re.search(r"(?:https?://)?(?:www\.)?github\.com/([a-zA-Z0-9_-]+)", text, re.IGNORECASE)
    if github_match:
        urls["github"] = f"https://github.com/{github_match.group(1)}"

    # Portfolio pattern
    portfolio_match = re.search(r"(?:https?://)?(?:www\.)?([a-zA-Z0-9-]+\.(?:dev|io|me|com|tech|ai)(?:/[^\s]*)?)", text, re.IGNORECASE)
    if portfolio_match:
        full_url = portfolio_match.group(0)
        if "linkedin.com" not in full_url and "github.com" not in full_url:
            urls["portfolio"] = full_url if full_url.startswith("http") else f"https://{full_url}"

    return urls


def calculate_text_stats(text: str) -> Dict[str, int]:
    """Calculates word and character counts."""
    words = [w for w in re.split(r"\s+", text) if w]
    return {
        "wordCount": len(words),
        "characterCount": len(text)
    }

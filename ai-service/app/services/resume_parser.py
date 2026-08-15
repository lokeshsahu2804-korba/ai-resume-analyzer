"""
Deterministic Resume Parser Service (app/services/resume_parser.py)
Segments extracted text into structured resume sections (Contact, Summary, Skills, Experience, Education, Projects).
"""

import re
from typing import Dict, List, Tuple
from app.schemas.resume import (
    ParsedResumeData,
    ExperienceEntry,
    EducationEntry,
    ProjectEntry
)
from app.utils.text_cleaner import (
    extract_email,
    extract_phone,
    extract_urls
)

# Comprehensive Technical & Domain Skills Taxonomy
SKILLS_TAXONOMY = {
    "languages": [
        "python", "javascript", "typescript", "java", "c++", "c#", "c", "go", "golang",
        "rust", "ruby", "php", "swift", "kotlin", "scala", "r", "dart", "sql", "html", "css"
    ],
    "frameworks_backend": [
        "node.js", "nodejs", "express", "express.js", "fastapi", "django", "flask",
        "spring", "spring boot", "nestjs", "ruby on rails", "asp.net", "laravel", "graphql"
    ],
    "frameworks_frontend": [
        "react", "react.js", "next.js", "nextjs", "vue", "vue.js", "angular",
        "svelte", "redux", "tailwind", "tailwindcss", "bootstrap", "sass", "webpack", "vite"
    ],
    "databases_cloud": [
        "mongodb", "postgresql", "postgres", "mysql", "redis", "elasticsearch",
        "dynamodb", "cassandra", "sqlite", "aws", "azure", "gcp", "google cloud",
        "docker", "kubernetes", "k8s", "terraform", "ci/cd", "jenkins", "github actions", "linux"
    ],
    "ai_data_concepts": [
        "machine learning", "deep learning", "nlp", "llms", "gemini", "openai",
        "pytorch", "tensorflow", "pandas", "numpy", "scikit-learn", "rest api", "microservices",
        "data structures", "algorithms", "system design", "git", "agile", "scrum"
    ]
}


def extract_candidate_name(lines: List[str], email: str) -> str:
    """Extracts candidate name from top lines of the resume."""
    for line in lines[:6]:
        cleaned = line.strip()
        # Skip empty lines, lines with email/phone/urls, or section headers
        if not cleaned or "@" in cleaned or "http" in cleaned or "linkedin" in cleaned:
            continue
        if re.search(r"\b(resume|curriculum|vitae|page|contact|phone|email)\b", cleaned, re.IGNORECASE):
            continue
        # Standard name: 2-4 words, letters only
        words = cleaned.split()
        if 1 <= len(words) <= 4 and all(re.match(r"^[A-Za-z.\s'-]+$", w) for w in words):
            return cleaned.title()

    # Fallback to email username prefix
    if email:
        username = email.split("@")[0].replace(".", " ").replace("_", " ")
        return username.title()

    return "Candidate"


def segment_resume_sections(text: str) -> Dict[str, str]:
    """Segments resume text into named sections based on header keywords."""
    section_headers = {
        "summary": r"\b(summary|professional summary|executive summary|about me|profile|objective|career objective)\b",
        "skills": r"\b(technical skills|skills|technologies|core competencies|expertise|tools)\b",
        "experience": r"\b(work experience|experience|employment history|professional experience|internships|work history)\b",
        "education": r"\b(education|academic background|academics|qualifications|degrees)\b",
        "projects": r"\b(projects|personal projects|technical projects|academic projects|key projects)\b",
        "certifications": r"\b(certifications|certificates|licenses|achievements|awards)\b",
        "languages": r"\b(languages|spoken languages)\b"
    }

    lines = text.split("\n")
    sections: Dict[str, List[str]] = {k: [] for k in section_headers}
    current_section = "summary"

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Check if line matches a known section header
        matched_section = None
        for sec_name, pattern in section_headers.items():
            # A line is a header if it is relatively short and matches the pattern
            if len(stripped.split()) <= 4 and re.search(pattern, stripped, re.IGNORECASE):
                matched_section = sec_name
                break

        if matched_section:
            current_section = matched_section
        else:
            sections[current_section].append(stripped)

    return {sec: "\n".join(lines).strip() for sec, lines in sections.items()}


def extract_skills(text: str) -> List[str]:
    """Extracts all matching skills from text against taxonomy."""
    found_skills = set()
    lower_text = " " + text.lower() + " "

    for category, skill_list in SKILLS_TAXONOMY.items():
        for skill in skill_list:
            # Word boundary search for accurate token matching
            pattern = r"(?:\b|_)" + re.escape(skill) + r"(?:\b|_)"
            if re.search(pattern, lower_text):
                # Standardize skill capitalization
                found_skills.add(skill.capitalize() if len(skill) > 3 else skill.upper())

    return sorted(list(found_skills))


def parse_experience_section(exp_text: str) -> List[ExperienceEntry]:
    """Parses experience text blocks into structured experience entries."""
    if not exp_text:
        return []

    entries = []
    blocks = re.split(r"\n(?=[A-Z0-9][A-Za-z0-9\s,-]+(?:•|–|-|\||\n))", exp_text)

    for block in blocks:
        lines = [l.strip() for l in block.split("\n") if l.strip()]
        if not lines:
            continue

        title_line = lines[0]
        company = ""
        title = title_line
        location = ""
        start_date = ""
        end_date = ""
        current = False
        achievements = []

        # Try to parse company / title separation
        if " - " in title_line or " | " in title_line or " at " in title_line:
            parts = re.split(r" - | \| | at ", title_line, maxsplit=1)
            title = parts[0].strip()
            company = parts[1].strip()

        # Look for dates pattern (e.g. Jan 2022 - Present, 2020 - 2024)
        date_match = re.search(r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|[0-9]{4})[a-z0-9,\s]*)\s*(?:–|-|to)\s*(Present|Current|[0-9]{4}|[A-Za-z0-9,\s]+)", block, re.IGNORECASE)
        if date_match:
            start_date = date_match.group(1).strip()
            end_date = date_match.group(2).strip()
            current = "present" in end_date.lower() or "current" in end_date.lower()

        # Collect bullet points
        for line in lines[1:]:
            if line.startswith("•") or line.startswith("-") or line.startswith("*"):
                achievements.append(line.lstrip("•-* ").strip())

        entries.append(
            ExperienceEntry(
                title=title,
                company=company,
                location=location,
                startDate=start_date,
                endDate=end_date,
                current=current,
                description=block[:300],
                achievements=achievements
            )
        )

    return entries[:10]


def parse_education_section(edu_text: str) -> List[EducationEntry]:
    """Parses education text blocks into structured education entries."""
    if not edu_text:
        return []

    entries = []
    lines = [l.strip() for l in edu_text.split("\n") if l.strip()]

    for line in lines:
        if re.search(r"\b(Bachelor|Master|B\.Tech|B\.S\.|M\.S\.|PhD|Degree|Diploma|University|College|Institute)\b", line, re.IGNORECASE):
            degree = line
            institution = ""
            if " - " in line or " | " in line or " from " in line:
                parts = re.split(r" - | \| | from ", line, maxsplit=1)
                degree = parts[0].strip()
                institution = parts[1].strip()

            date_match = re.search(r"\b(20[0-9]{2}|19[0-9]{2})\b", line)
            grad_date = date_match.group(1) if date_match else ""

            gpa_match = re.search(r"\b(?:GPA|CGPA)[:\s]*([0-9.]+)", line, re.IGNORECASE)
            gpa = gpa_match.group(1) if gpa_match else ""

            entries.append(
                EducationEntry(
                    degree=degree,
                    field="",
                    institution=institution,
                    graduationDate=grad_date,
                    gpa=gpa
                )
            )

    return entries[:5]


def parse_resume_content(cleaned_text: str) -> ParsedResumeData:
    """
    Coordinates section segmentation, entity extraction, and structured object assembly.
    """
    lines = cleaned_text.split("\n")
    email = extract_email(cleaned_text)
    phone = extract_phone(cleaned_text)
    urls = extract_urls(cleaned_text)
    name = extract_candidate_name(lines, email)

    sections = segment_resume_sections(cleaned_text)

    # Skills Extraction across full text and skills section
    skills = extract_skills(cleaned_text)

    # Experience & Education
    experience = parse_experience_section(sections.get("experience", ""))
    education = parse_education_section(sections.get("education", ""))

    # Summary
    summary = sections.get("summary", "")
    if len(summary) > 1000:
        summary = summary[:1000]

    # Certifications
    cert_lines = [l.strip("•-* ") for l in sections.get("certifications", "").split("\n") if len(l.strip()) > 3]

    # Projects
    project_entries = []
    proj_text = sections.get("projects", "")
    if proj_text:
        proj_lines = [l for l in proj_text.split("\n") if l.strip()]
        for pline in proj_lines[:5]:
            if not pline.startswith("•"):
                project_entries.append(ProjectEntry(name=pline[:100], description=pline))

    return ParsedResumeData(
        name=name,
        email=email,
        phone=phone,
        location="",
        linkedin=urls.get("linkedin", ""),
        github=urls.get("github", ""),
        portfolio=urls.get("portfolio", ""),
        summary=summary,
        skills=skills,
        experience=experience,
        education=education,
        certifications=cert_lines[:10],
        languages=[],
        projects=project_entries
    )

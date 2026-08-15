"""
Pydantic Schemas for Resume Processing (app/schemas/resume.py)
Defines strict data contracts matching MongoDB Resume model parsed structure.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class ProcessResumeRequest(BaseModel):
    """Payload received from Express backend to initiate resume text extraction."""
    fileUrl: str = Field(..., description="Cloudinary URL or local file path to PDF")
    resumeId: Optional[str] = Field(default="", description="MongoDB Resume document ID")
    originalName: Optional[str] = Field(default="Resume.pdf", description="Original filename")


class ExperienceEntry(BaseModel):
    title: str = ""
    company: str = ""
    location: str = ""
    startDate: str = ""
    endDate: str = ""
    current: bool = False
    description: str = ""
    achievements: List[str] = Field(default_factory=list)


class EducationEntry(BaseModel):
    degree: str = ""
    field: str = ""
    institution: str = ""
    graduationDate: str = ""
    gpa: str = ""


class ProjectEntry(BaseModel):
    name: str = ""
    description: str = ""
    technologies: List[str] = Field(default_factory=list)
    url: str = ""


class ParsedResumeData(BaseModel):
    name: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    linkedin: str = ""
    github: str = ""
    portfolio: str = ""
    summary: str = ""
    skills: List[str] = Field(default_factory=list)
    experience: List[ExperienceEntry] = Field(default_factory=list)
    education: List[EducationEntry] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)
    projects: List[ProjectEntry] = Field(default_factory=list)


class ProcessResumeResponse(BaseModel):
    success: bool = True
    resumeId: Optional[str] = ""
    extractedText: str
    parsed: ParsedResumeData
    pageCount: int = 1
    wordCount: int = 0
    characterCount: int = 0

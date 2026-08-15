"""
Pydantic Schemas for Job Matching & Recommendations (app/schemas/matching.py)
Defines data contracts for resume ↔ job compatibility matching and AI explanations.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class MatchJobRequest(BaseModel):
    """Payload sent from Express backend to compute compatibility match."""
    jobId: str = Field(..., description="Job document ID")
    jobTitle: str = Field(..., description="Job title")
    jobCompany: str = Field(..., description="Company name")
    jobDescription: str = Field(default="", description="Job description text")
    requiredSkills: List[str] = Field(default_factory=list, description="Job required skills")
    experienceLevel: str = Field(default="mid", description="entry | mid | senior | lead")
    location: Optional[str] = Field(default="", description="Job location")
    candidateSkills: List[str] = Field(default_factory=list, description="Candidate parsed skills")
    candidateExperience: List[dict] = Field(default_factory=list, description="Candidate parsed work history")
    candidateEducation: List[dict] = Field(default_factory=list, description="Candidate parsed education")
    candidateSummary: Optional[str] = Field(default="", description="Candidate professional summary")
    candidateLocation: Optional[str] = Field(default="", description="Candidate location")
    candidateAtsScore: Optional[float] = Field(default=75.0, description="Candidate ATS score from Phase 9 (0-100)")
    isPremium: Optional[bool] = Field(default=False)


class MatchCategoryBreakdown(BaseModel):
    skillsScore: float = Field(..., ge=0, le=40, description="Max 40 points: Core skills overlap")
    experienceScore: float = Field(..., ge=0, le=20, description="Max 20 points: Level and tenure")
    titleScore: float = Field(..., ge=0, le=15, description="Max 15 points: Role alignment")
    atsQualityScore: float = Field(..., ge=0, le=10, description="Max 10 points: Resume ATS quality")
    educationScore: float = Field(..., ge=0, le=10, description="Max 10 points: Education & credentials")
    locationScore: float = Field(..., ge=0, le=5, description="Max 5 points: Location & work mode")


class MatchJobResponse(BaseModel):
    success: bool = True
    jobId: str
    matchScore: float = Field(..., ge=0, le=100, description="Overall calibrated match score (0-100)")
    category: str = Field(..., description="Great Match | Good Match | Potential Match | Low Match")
    breakdown: MatchCategoryBreakdown
    matchingSkills: List[str] = Field(default_factory=list)
    missingSkills: List[str] = Field(default_factory=list)
    bonusSkills: List[str] = Field(default_factory=list)
    matchSummary: str = Field(default="", description="High-level match assessment")
    strengths: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    interviewAdvice: List[str] = Field(default_factory=list)
    isSemantic: bool = False
    processingTimeMs: int = 0

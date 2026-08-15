"""
Pydantic Schemas for AI Resume Analysis & ATS Scoring (app/schemas/analysis.py)
Defines strict data contracts matching MongoDB ResumeAnalysis model.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class AnalyzeResumeRequest(BaseModel):
    """Payload received from Express backend to initiate AI ATS analysis."""
    resumeId: str = Field(..., description="MongoDB Resume document ID")
    extractedText: str = Field(..., description="Cleaned extracted resume text")
    parsed: Optional[dict] = Field(default_factory=dict, description="Structured parsed resume sections")
    jobDescription: Optional[str] = Field(default="", description="Optional target job description for matching")
    isPremium: Optional[bool] = Field(default=False, description="Whether requesting user has active premium subscription")


class ScoreCategory(BaseModel):
    score: float = Field(..., ge=0, description="Earned category score points")
    maxScore: float = Field(..., description="Maximum possible points for this category")
    details: str = Field(default="", description="Evaluation summary and justification")


class AtsScoreBreakdown(BaseModel):
    keywordRelevance: ScoreCategory
    skillsAnalysis: ScoreCategory
    experienceQuality: ScoreCategory
    educationRelevance: ScoreCategory
    structureFormatting: ScoreCategory
    quantifiableAchievements: ScoreCategory
    sectionCompleteness: ScoreCategory


class AtsScore(BaseModel):
    overall: float = Field(..., ge=0, le=100, description="Overall calibrated ATS score (0-100)")
    breakdown: AtsScoreBreakdown


class SuggestionItem(BaseModel):
    category: str = Field(..., description="Category: 'skills' | 'experience' | 'formatting' | 'content'")
    priority: str = Field(..., description="Priority: 'high' | 'medium' | 'low'")
    suggestion: str = Field(..., description="Actionable recommendation")
    example: Optional[str] = Field(default="", description="Concrete before/after or phrasing example")


class SkillsAnalysisData(BaseModel):
    technical: List[str] = Field(default_factory=list, description="Extracted technical skills")
    soft: List[str] = Field(default_factory=list, description="Extracted interpersonal / soft skills")
    missing: List[str] = Field(default_factory=list, description="High-demand industry or job-specific missing skills")
    trending: List[str] = Field(default_factory=list, description="Emerging & high-growth keywords in domain")


class AnalyzeResumeResponse(BaseModel):
    success: bool = True
    resumeId: str
    atsScore: AtsScore
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    suggestions: List[SuggestionItem] = Field(default_factory=list)
    skillsAnalysis: SkillsAnalysisData
    aiInsights: str = Field(default="", description="Executive AI assessment summary")
    isPremium: bool = False
    processingTimeMs: int = 0

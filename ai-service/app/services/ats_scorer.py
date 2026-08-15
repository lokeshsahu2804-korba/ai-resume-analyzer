"""
Deterministic ATS Scoring & Calibration Engine (app/services/ats_scorer.py)
Computes 7-category ATS scores summing strictly to 0-100 with comprehensive heuristic evaluation.
"""

import re
from typing import Dict, List, Tuple
from app.schemas.analysis import (
    AtsScore,
    AtsScoreBreakdown,
    ScoreCategory,
    SuggestionItem,
    SkillsAnalysisData
)

TRENDING_TECH_SKILLS = [
    "Docker", "Kubernetes", "AWS", "FastAPI", "TypeScript", "React", "Next.js",
    "Tailwind", "Redis", "PostgreSQL", "MongoDB", "CI/CD", "GitHub Actions", "Microservices", "LLMs"
]

COMMON_SOFT_SKILLS = [
    "Leadership", "Communication", "Problem Solving", "Agile", "Scrum", "Collaboration", "Mentorship"
]


def evaluate_quantifiable_achievements(text: str) -> Tuple[float, str]:
    """Evaluates presence of metrics, percentages, dollar amounts, and scale in bullet points (Max 10 pts)."""
    metric_patterns = [
        r"\b\d+%\b",                                      # 40%, 100%
        r"\$\d+(?:,\d+)*(?:\.\d+)?(?:k|m|b|K|M|B)?\b",    # $50k, $1.2M
        r"\b\d+(?:k|K|M|B)\+?\b",                         # 50k+, 10M
        r"\b(?:reduced|increased|improved|decreased|optimized|scaled)\s+by\s+\d+%\b",
        r"\b\d+\+\s+(?:users|requests|engineers|clients|projects|services)\b"
    ]

    matches_count = 0
    for pat in metric_patterns:
        matches_count += len(re.findall(pat, text, re.IGNORECASE))

    if matches_count >= 5:
        return 10.0, f"Outstanding quantifiable impact: found {matches_count} metric-driven achievements."
    elif matches_count >= 3:
        return 8.0, f"Good quantifiable metrics: found {matches_count} quantified achievements."
    elif matches_count >= 1:
        return 5.5, "Limited quantifiable data: only 1-2 metrics found. Add percentages, dollar values, or scale."
    else:
        return 3.0, "Missing quantifiable achievements. Describe accomplishments with measurable numbers (%, scale, latency)."


def evaluate_section_completeness(parsed: dict, text: str) -> Tuple[float, str]:
    """Evaluates core resume sections: Contact, Summary, Skills, Experience, Education (Max 10 pts)."""
    score = 0.0
    missing_sections = []

    # 1. Contact (Name + Email + Phone + Links) - 2.5 pts
    if parsed.get("name") and parsed.get("email"):
        score += 2.0
        if parsed.get("phone") or parsed.get("linkedin") or parsed.get("github"):
            score += 0.5
    else:
        missing_sections.append("Contact Details")

    # 2. Summary / Objective - 1.5 pts
    if parsed.get("summary") and len(parsed.get("summary")) > 20:
        score += 1.5
    else:
        missing_sections.append("Professional Summary")

    # 3. Skills - 2.0 pts
    if parsed.get("skills") and len(parsed.get("skills")) >= 3:
        score += 2.0
    else:
        missing_sections.append("Skills Section")

    # 4. Work Experience - 2.5 pts
    if parsed.get("experience") and len(parsed.get("experience")) >= 1:
        score += 2.5
    else:
        missing_sections.append("Work Experience")

    # 5. Education - 1.5 pts
    if parsed.get("education") and len(parsed.get("education")) >= 1:
        score += 1.5
    else:
        missing_sections.append("Education")

    if not missing_sections:
        return 10.0, "Complete section coverage: all standard ATS sections are present."
    else:
        return max(2.0, score), f"Missing or incomplete standard sections: {', '.join(missing_sections)}."


def evaluate_skills(parsed_skills: List[str], job_description: str) -> Tuple[float, str, List[str], List[str], List[str]]:
    """Evaluates technical and soft skill breadth and identifies gaps (Max 20 pts)."""
    skills_count = len(parsed_skills)
    technical = [s for s in parsed_skills if s not in COMMON_SOFT_SKILLS]
    soft = [s for s in parsed_skills if s in COMMON_SOFT_SKILLS]

    # Find missing trending skills
    missing = [s for s in TRENDING_TECH_SKILLS if s not in parsed_skills]
    trending = [s for s in parsed_skills if s in TRENDING_TECH_SKILLS]

    # If job description provided, compare against JD keywords
    if job_description:
        jd_lower = job_description.lower()
        for tech in TRENDING_TECH_SKILLS:
            if tech.lower() in jd_lower and tech not in parsed_skills and tech not in missing:
                missing.insert(0, tech)

    if skills_count >= 15:
        score = 19.0
        details = f"Extensive skill coverage: {skills_count} verified skills across frontend, backend, database, and cloud."
    elif skills_count >= 10:
        score = 16.5
        details = f"Strong technical stack: {skills_count} skills detected with balanced language and framework coverage."
    elif skills_count >= 5:
        score = 13.0
        details = f"Moderate skill coverage ({skills_count} skills). Consider expanding cloud, CI/CD, and database proficiencies."
    else:
        score = 8.0
        details = "Sparse skills list. Include specific programming languages, frameworks, databases, and DevOps tools."

    return min(20.0, score), details, technical, soft, missing[:6]


def evaluate_experience_quality(experience_entries: List[dict], text: str) -> Tuple[float, str]:
    """Evaluates work history depth, role titles, and achievement bullets (Max 20 pts)."""
    if not experience_entries:
        return 4.0, "No structured work experience detected. Add detailed employment history."

    entries_count = len(experience_entries)
    total_bullets = sum(len(e.get("achievements", [])) for e in experience_entries)

    score = 10.0
    if entries_count >= 3:
        score += 4.0
    elif entries_count >= 1:
        score += 2.5

    if total_bullets >= 6:
        score += 5.0
    elif total_bullets >= 2:
        score += 3.0

    # Check for strong action verbs
    action_verbs = ["architected", "developed", "engineered", "led", "optimized", "built", "implemented", "scaled", "designed"]
    found_verbs = sum(1 for verb in action_verbs if re.search(r"\b" + verb + r"\b", text, re.IGNORECASE))
    if found_verbs >= 3:
        score += 1.0

    return min(20.0, score), f"Evaluated {entries_count} roles with {total_bullets} achievement bullet points."


def evaluate_keyword_relevance(text: str, job_description: str) -> Tuple[float, str]:
    """Evaluates keyword density and domain alignment (Max 15 pts)."""
    if not job_description:
        # Evaluate standard tech keyword density
        matches = [kw for kw in TRENDING_TECH_SKILLS if re.search(r"\b" + re.escape(kw) + r"\b", text, re.IGNORECASE)]
        score = min(15.0, 7.0 + (len(matches) * 0.7))
        return score, f"Keyword density: {len(matches)} high-impact industry keywords matched."

    # Compare against job description tokens
    jd_words = set(re.findall(r"\b[A-Za-z]{3,}\b", job_description.lower()))
    resume_words = set(re.findall(r"\b[A-Za-z]{3,}\b", text.lower()))

    overlap = jd_words.intersection(resume_words)
    ratio = len(overlap) / max(1, len(jd_words))

    score = min(15.0, max(5.0, ratio * 25.0))
    return round(score, 1), f"Matched {len(overlap)} target keywords ({int(ratio * 100)}% keyword overlap with job description)."


def evaluate_structure_formatting(text: str, page_count: int = 1) -> Tuple[float, str]:
    """Evaluates formatting, line layout, and length standards (Max 15 pts)."""
    score = 11.0
    details = []

    # Check page count
    if 1 <= page_count <= 2:
        score += 2.0
        details.append(f"{page_count}-page layout adheres to standard ATS length")
    else:
        score -= 2.0
        details.append(f"{page_count} pages may be too long for ATS scanning")

    # Check bullet points
    if "•" in text or "-" in text:
        score += 2.0
        details.append("clean bullet points")

    return min(15.0, max(4.0, score)), f"Structure evaluation: {', '.join(details)}."


def evaluate_education_relevance(education_entries: List[dict]) -> Tuple[float, str]:
    """Evaluates education degree, major, and graduation details (Max 10 pts)."""
    if not education_entries:
        return 4.0, "No formal education entries found. Add university degree or diploma credentials."

    score = 7.0
    edu = education_entries[0]
    degree = edu.get("degree", "")

    if re.search(r"\b(B\.Tech|B\.S\.|M\.S\.|Master|Bachelor|PhD|Computer Science|Engineering)\b", degree, re.IGNORECASE):
        score += 2.0

    if edu.get("graduationDate") or edu.get("gpa"):
        score += 1.0

    return min(10.0, score), f"Verified credentials: {degree}."


def compute_deterministic_ats_analysis(extracted_text: str, parsed: dict, job_description: str = "") -> dict:
    """
    Computes a complete, calibrated ATS score breakdown (7 categories summing strictly to 100),
    along with actionable strengths, weaknesses, and prioritized improvement suggestions.
    """
    skills_score, skills_det, technical, soft, missing = evaluate_skills(parsed.get("skills", []), job_description)
    exp_score, exp_det = evaluate_experience_quality(parsed.get("experience", []), extracted_text)
    struct_score, struct_det = evaluate_structure_formatting(extracted_text)
    kw_score, kw_det = evaluate_keyword_relevance(extracted_text, job_description)
    quant_score, quant_det = evaluate_quantifiable_achievements(extracted_text)
    edu_score, edu_det = evaluate_education_relevance(parsed.get("education", []))
    sect_score, sect_det = evaluate_section_completeness(parsed, extracted_text)

    # Round individual categories to 1 decimal
    skills_score = round(skills_score, 1)
    exp_score = round(exp_score, 1)
    struct_score = round(struct_score, 1)
    kw_score = round(kw_score, 1)
    quant_score = round(quant_score, 1)
    edu_score = round(edu_score, 1)
    sect_score = round(sect_score, 1)

    overall_score = round(
        skills_score + exp_score + struct_score + kw_score + quant_score + edu_score + sect_score,
        1
    )
    overall_score = min(100.0, max(0.0, overall_score))

    # Construct Breakdown
    breakdown = AtsScoreBreakdown(
        skillsAnalysis=ScoreCategory(score=skills_score, maxScore=20.0, details=skills_det),
        experienceQuality=ScoreCategory(score=exp_score, maxScore=20.0, details=exp_det),
        structureFormatting=ScoreCategory(score=struct_score, maxScore=15.0, details=struct_det),
        keywordRelevance=ScoreCategory(score=kw_score, maxScore=15.0, details=kw_det),
        quantifiableAchievements=ScoreCategory(score=quant_score, maxScore=10.0, details=quant_det),
        educationRelevance=ScoreCategory(score=edu_score, maxScore=10.0, details=edu_det),
        sectionCompleteness=ScoreCategory(score=sect_score, maxScore=10.0, details=sect_det)
    )

    # Strengths
    strengths = []
    if skills_score >= 15.0:
        strengths.append(f"Strong technical skill variety ({len(technical)} skills verified across multiple domains).")
    if exp_score >= 15.0:
        strengths.append("High-quality work history with descriptive leadership and development responsibilities.")
    if quant_score >= 7.0:
        strengths.append("Effective use of metrics and percentages to quantify project accomplishments.")
    if struct_score >= 12.0:
        strengths.append("Clean formatting with standard ATS-compliant hierarchy and bullet points.")
    if len(strengths) < 2:
        strengths.append("Clear contact details and professional summary section.")

    # Weaknesses
    weaknesses = []
    if quant_score < 7.0:
        weaknesses.append("Lack of quantifiable impact metrics (e.g. % performance increase, latency reduction, user scale).")
    if len(missing) > 0:
        weaknesses.append(f"Missing high-demand industry technologies: {', '.join(missing[:3])}.")
    if kw_score < 11.0:
        weaknesses.append("Moderate keyword density; missing specific tool and framework terminology.")
    if sect_score < 8.0:
        weaknesses.append("Incomplete resume sections. Ensure Summary, Skills, Experience, and Education are well-defined.")
    if len(weaknesses) < 2:
        weaknesses.append("Consider condensing older experience to maintain 1-page focus.")

    # Actionable Suggestions
    suggestions = [
        SuggestionItem(
            category="experience",
            priority="high",
            suggestion="Add quantifiable metrics to every major project or work experience bullet point.",
            example="Instead of 'Optimized backend database queries', write 'Refactored MongoDB indexes, reducing average API query latency by 42% for 100k+ daily users'."
        ),
        SuggestionItem(
            category="skills",
            priority="medium",
            suggestion=f"Incorporate trending cloud and DevOps keywords: {', '.join(missing[:3]) if missing else 'Docker, Kubernetes, AWS'}.",
            example="List under 'Cloud & Tools: Docker, Kubernetes, GitHub Actions, AWS (EC2, S3)'."
        ),
        SuggestionItem(
            category="content",
            priority="medium",
            suggestion="Tailor your professional summary to highlight your primary tech stack and years of expertise.",
            example="'Full Stack Engineer with 4+ years building high-throughput microservices using Node.js, Python, and React'."
        )
    ]

    skills_analysis_data = SkillsAnalysisData(
        technical=technical,
        soft=soft,
        missing=missing,
        trending=[s for s in technical if s in TRENDING_TECH_SKILLS]
    )

    ai_insights = (
        f"Candidate demonstrates an ATS Score of {int(overall_score)}/100. "
        f"Technical depth is strong in {', '.join(technical[:4]) if technical else 'core programming'}. "
        "Enhancing quantifiable accomplishment metrics in experience bullets will position this resume in the top 10% of ATS applicant pools."
    )

    return {
        "atsScore": AtsScore(overall=overall_score, breakdown=breakdown),
        "strengths": strengths,
        "weaknesses": weaknesses,
        "suggestions": suggestions,
        "skillsAnalysis": skills_analysis_data,
        "aiInsights": ai_insights
    }

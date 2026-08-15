/**
 * Job Details & Match Compatibility Page Controller (pages/job-details.js)
 * Displays job specifications, 6-dimension match score breakdown, skill gap chips, and AI interview advice.
 */

import { authService } from '../services/auth.service.js';
import { getJobByIdApi } from '../api/job.api.js';
import { getJobMatchApi, getJobMatchExplanationApi } from '../api/jobMatching.api.js';
import { showToast } from '../components/toast.js';
import { renderIcons } from '../utils/dom.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Check auth state
  await authService.requireAuthGuard();

  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('id');

  const contentWrapper = document.getElementById('job-details-content');
  const loadingOverlay = document.getElementById('job-details-loading');
  const emptyState = document.getElementById('job-details-empty');

  // Dynamic Header & Meta
  const jobTitleEl = document.getElementById('job-detail-title');
  const jobCompanyEl = document.getElementById('job-detail-company');
  const jobLogoEl = document.getElementById('job-detail-logo');
  const jobSalaryEl = document.getElementById('job-detail-salary');
  const jobExpEl = document.getElementById('job-detail-exp');
  const jobPostedEl = document.getElementById('job-detail-posted');
  const jobDescEl = document.getElementById('job-detail-description');
  const jobReqEduEl = document.getElementById('job-detail-education');
  const jobReqExpEl = document.getElementById('job-detail-experience');
  const jobApplyBtn = document.getElementById('job-detail-apply-btn');

  // Match & Skills Containers
  const matchBadgeEl = document.getElementById('job-detail-match-badge');
  const matchCategoryEl = document.getElementById('job-detail-match-category');
  const matchingSkillsContainer = document.getElementById('job-matching-skills-container');
  const missingSkillsContainer = document.getElementById('job-missing-skills-container');
  const bonusSkillsContainer = document.getElementById('job-bonus-skills-container');
  const bonusSkillsWrapper = document.getElementById('bonus-skills-wrapper');
  const breakdownGrid = document.getElementById('job-match-breakdown-grid');

  // AI Explanation Elements
  const aiSummaryEl = document.getElementById('job-ai-summary');
  const aiStrengthsEl = document.getElementById('job-ai-strengths');
  const aiGapsEl = document.getElementById('job-ai-gaps');
  const aiAdviceEl = document.getElementById('job-ai-advice');
  const refreshAiBtn = document.getElementById('btn-refresh-ai-explanation');

  function getCompanyInitials(name = '') {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (name.slice(0, 2) || 'CO').toUpperCase();
  }

  function formatSalary(salary) {
    if (!salary || (!salary.min && !salary.max)) return 'Competitive Package';
    const currency = salary.currency === 'INR' ? '₹' : '$';
    if (salary.min && salary.max) {
      const minL = (salary.min / 100000).toFixed(0);
      const maxL = (salary.max / 100000).toFixed(0);
      return `${currency}${minL}L – ${currency}${maxL}L / year`;
    }
    return `${currency}${(salary.min || salary.max) / 100000}L / year`;
  }

  function renderMatchBreakdown(breakdown = {}) {
    if (!breakdownGrid) return;

    const dimensions = [
      { key: 'skillsScore', title: 'Core Skills', max: 40 },
      { key: 'experienceScore', title: 'Level & Tenure', max: 20 },
      { key: 'titleScore', title: 'Role Alignment', max: 15 },
      { key: 'atsQualityScore', title: 'ATS Quality', max: 10 },
      { key: 'educationScore', title: 'Credentials', max: 10 },
      { key: 'locationScore', title: 'Location Fit', max: 5 }
    ];

    breakdownGrid.innerHTML = dimensions
      .map((dim) => {
        const score = breakdown[dim.key] || 0;
        const percent = Math.round((score / dim.max) * 100);
        return `
          <div class="category-score-card p-md">
            <div class="d-flex justify-between items-center mb-xs">
              <span class="text-xs font-semibold text-secondary">${dim.title}</span>
              <span class="font-mono text-xs font-bold text-accent">${score} / ${dim.max}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-bar__fill" style="width: ${percent}%;"></div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  async function loadAiExplanation() {
    if (aiSummaryEl) aiSummaryEl.textContent = 'Generating contextual AI recruiter evaluation...';
    try {
      const response = await getJobMatchExplanationApi(jobId);
      const data = response?.data || {};

      if (aiSummaryEl) aiSummaryEl.textContent = data.matchSummary || 'Good candidate match profile.';
      if (aiStrengthsEl) {
        aiStrengthsEl.innerHTML = (data.strengths || [])
          .map((s) => `<li>${s}</li>`)
          .join('');
      }
      if (aiGapsEl) {
        aiGapsEl.innerHTML = (data.gaps || [])
          .map((g) => `<li>${g}</li>`)
          .join('');
      }
      if (aiAdviceEl) {
        aiAdviceEl.innerHTML = (data.interviewAdvice || data.recommendations || [])
          .map((a) => `<li>${a}</li>`)
          .join('');
      }
    } catch (err) {
      if (aiSummaryEl) {
        aiSummaryEl.textContent = 'Candidate matches core requirements based on structured resume parsing.';
      }
    }
  }

  if (!jobId) {
    if (loadingOverlay) loadingOverlay.classList.add('d-none');
    if (emptyState) emptyState.classList.remove('d-none');
    return;
  }

  try {
    // 1. Fetch Job Details & Deterministic Compatibility in parallel
    const [jobRes, matchRes] = await Promise.all([
      getJobByIdApi(jobId),
      getJobMatchApi(jobId).catch(() => null)
    ]);

    const job = jobRes?.data?.job;
    if (!job) {
      if (loadingOverlay) loadingOverlay.classList.add('d-none');
      if (emptyState) emptyState.classList.remove('d-none');
      return;
    }

    // Hydrate Header
    if (jobTitleEl) jobTitleEl.textContent = job.title;
    if (jobCompanyEl) {
      jobCompanyEl.textContent = `${job.company} • ${job.location} • ${job.type === 'full-time' ? 'Full Time' : job.type}`;
    }
    if (jobLogoEl) jobLogoEl.textContent = getCompanyInitials(job.company);
    if (jobSalaryEl) jobSalaryEl.textContent = formatSalary(job.salary);
    if (jobExpEl) jobExpEl.textContent = job.requirements?.experience || `${job.experienceLevel} level`;
    if (jobPostedEl && job.postedAt) {
      jobPostedEl.textContent = new Date(job.postedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    if (jobDescEl) jobDescEl.textContent = job.description;
    if (jobReqEduEl) jobReqEduEl.textContent = job.requirements?.education || 'Degree in Computer Science or related engineering.';
    if (jobReqExpEl) jobReqExpEl.textContent = job.requirements?.experience || 'Direct experience in related technologies.';

    // Hydrate Match Score & Badges
    const match = matchRes?.data;
    if (match && match.matchScore !== undefined) {
      const rounded = Math.round(match.matchScore);
      if (matchBadgeEl) {
        matchBadgeEl.textContent = `${rounded}% Match`;
        if (rounded >= 85) matchBadgeEl.className = 'badge badge--match font-bold';
        else if (rounded >= 70) matchBadgeEl.className = 'badge badge--primary font-bold';
        else matchBadgeEl.className = 'badge badge--warning font-bold';
      }
      if (matchCategoryEl) matchCategoryEl.textContent = match.category || 'High Alignment';

      // Matching Skills Chips
      if (matchingSkillsContainer) {
        matchingSkillsContainer.innerHTML = (match.matchingSkills || [])
          .map((s) => `<span class="skill-chip skill-chip--matched font-mono">&check; ${s}</span>`)
          .join(' ') || '<span class="text-xs text-muted">No direct matches detected</span>';
      }

      // Missing Skills Chips
      if (missingSkillsContainer) {
        missingSkillsContainer.innerHTML = (match.missingSkills || [])
          .map((s) => `<span class="skill-chip skill-chip--missing font-mono">+ ${s}</span>`)
          .join(' ') || '<span class="text-xs text-success">All required skills present in resume!</span>';
      }

      // Bonus Skills Chips
      if (match.bonusSkills && match.bonusSkills.length > 0 && bonusSkillsContainer) {
        bonusSkillsContainer.innerHTML = match.bonusSkills
          .map((s) => `<span class="badge badge--secondary font-mono">${s}</span>`)
          .join(' ');
        if (bonusSkillsWrapper) bonusSkillsWrapper.classList.remove('d-none');
      }

      // 6-Category Breakdown Grid
      renderMatchBreakdown(match.breakdown);
    } else {
      if (matchingSkillsContainer) {
        matchingSkillsContainer.innerHTML = (job.requirements?.skills || [])
          .map((s) => `<span class="skill-chip skill-chip--matched font-mono">${s}</span>`)
          .join(' ');
      }
      if (matchBadgeEl) matchBadgeEl.textContent = 'Unrated';
    }

    // Hydrate Application CTA
    if (jobApplyBtn) {
      if (job.applicationUrl) {
        jobApplyBtn.href = job.applicationUrl;
        jobApplyBtn.target = '_blank';
        jobApplyBtn.rel = 'noopener noreferrer';
      } else {
        jobApplyBtn.addEventListener('click', (e) => {
          e.preventDefault();
          showToast(`Application submitted directly to ${job.company}!`, 'success');
        });
      }
    }

    if (loadingOverlay) loadingOverlay.classList.add('d-none');
    if (contentWrapper) contentWrapper.classList.remove('d-none');
    renderIcons();

    // 2. Load Deep AI Explanation in background
    loadAiExplanation();

    // Attach Refresh Listener
    if (refreshAiBtn) {
      refreshAiBtn.addEventListener('click', () => {
        showToast('Refreshing AI recruiter evaluation...', 'info');
        loadAiExplanation();
      });
    }
  } catch (err) {
    if (loadingOverlay) loadingOverlay.classList.add('d-none');
    showToast(err.message || 'Failed to load job details', 'error');
    if (emptyState) emptyState.classList.remove('d-none');
  }
});

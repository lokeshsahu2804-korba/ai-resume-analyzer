/**
 * Job Details Page Controller (pages/job-details.js)
 * Fetches and displays detailed job posting information, requirements, skills chips, and external application links.
 */

import { authService } from '../services/auth.service.js';
import { getJobByIdApi } from '../api/job.api.js';
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

  // Dynamic Elements
  const jobTitleEl = document.getElementById('job-detail-title');
  const jobCompanyEl = document.getElementById('job-detail-company');
  const jobExpBadge = document.getElementById('job-detail-exp-badge');
  const jobLogoEl = document.getElementById('job-detail-logo');
  const jobSalaryEl = document.getElementById('job-detail-salary');
  const jobExpEl = document.getElementById('job-detail-exp');
  const jobPostedEl = document.getElementById('job-detail-posted');
  const jobDescEl = document.getElementById('job-detail-description');
  const jobSkillsContainer = document.getElementById('job-detail-skills');
  const jobReqEduEl = document.getElementById('job-detail-education');
  const jobReqExpEl = document.getElementById('job-detail-experience');
  const jobApplyBtn = document.getElementById('job-detail-apply-btn');

  function getCompanyInitials(name = '') {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name.slice(0, 2) || 'CO').toUpperCase();
  }

  function formatSalary(salary) {
    if (!salary || (!salary.min && !salary.max)) return 'Competitive Package';
    const currencySymbol = salary.currency === 'INR' ? '₹' : '$';

    function formatNumber(num) {
      if (num >= 100000) {
        const inLakhs = (num / 100000).toFixed(num % 100000 === 0 ? 0 : 1);
        return `${currencySymbol}${inLakhs}L`;
      }
      return `${currencySymbol}${num.toLocaleString()}`;
    }

    if (salary.min && salary.max) {
      return `${formatNumber(salary.min)} – ${formatNumber(salary.max)} / year`;
    }
    if (salary.min) return `From ${formatNumber(salary.min)} / year`;
    return `Up to ${formatNumber(salary.max)} / year`;
  }

  if (!jobId) {
    if (loadingOverlay) loadingOverlay.classList.add('d-none');
    if (emptyState) emptyState.classList.remove('d-none');
    return;
  }

  try {
    const response = await getJobByIdApi(jobId);
    const job = response?.data?.job;

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

    if (jobExpBadge) {
      const expLabel =
        job.experienceLevel === 'senior'
          ? 'Senior (5+ yrs)'
          : job.experienceLevel === 'lead'
          ? 'Lead / Staff'
          : job.experienceLevel === 'entry'
          ? 'Entry Level'
          : 'Mid Level (2-4 yrs)';
      jobExpBadge.textContent = expLabel;
    }

    // Hydrate Meta Strip
    if (jobSalaryEl) jobSalaryEl.textContent = formatSalary(job.salary);
    if (jobExpEl) jobExpEl.textContent = job.requirements?.experience || 'Experience required';
    if (jobPostedEl && job.postedAt) {
      jobPostedEl.textContent = new Date(job.postedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }

    // Hydrate Description
    if (jobDescEl) {
      jobDescEl.textContent = job.description;
    }

    // Hydrate Skills Chips
    if (jobSkillsContainer) {
      const skills = job.requirements?.skills || [];
      jobSkillsContainer.innerHTML = skills
        .map((s) => `<span class="skill-chip skill-chip--matched font-mono">${s}</span>`)
        .join(' ');
    }

    // Hydrate Education & Experience Details
    if (jobReqEduEl) {
      jobReqEduEl.textContent = job.requirements?.education || 'Standard technical degree or equivalent practical experience.';
    }
    if (jobReqExpEl) {
      jobReqExpEl.textContent = job.requirements?.experience || 'Direct experience in related technologies.';
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
  } catch (err) {
    if (loadingOverlay) loadingOverlay.classList.add('d-none');
    showToast(err.message || 'Failed to load job details', 'error');
    if (emptyState) emptyState.classList.remove('d-none');
  }
});

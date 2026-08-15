/**
 * Job Listings & Recommendations Page Controller (pages/jobs.js)
 * Manages personalized recommendations, compatibility score badges, search filters, and pagination.
 */

import { authService } from '../services/auth.service.js';
import { getJobsApi } from '../api/job.api.js';
import { getRecommendedJobsApi } from '../api/jobMatching.api.js';
import { showToast } from '../components/toast.js';
import { renderIcons } from '../utils/dom.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Check auth state
  await authService.requireAuthGuard();

  const tabRecommended = document.getElementById('tab-recommended-jobs');
  const tabAll = document.getElementById('tab-all-jobs');
  const searchInput = document.getElementById('job-search-input');
  const expSelect = document.getElementById('job-exp-filter');
  const typeSelect = document.getElementById('job-type-filter');
  const filterBtn = document.getElementById('job-filter-btn');
  const resetBtn = document.getElementById('job-reset-btn');
  const jobsGrid = document.getElementById('jobs-grid-container');
  const loadingSpinner = document.getElementById('jobs-loading-spinner');
  const emptyState = document.getElementById('jobs-empty-state');
  const paginationWrapper = document.getElementById('jobs-pagination-wrapper');
  const totalCountEl = document.getElementById('jobs-total-count');

  let activeMode = 'recommended'; // 'recommended' | 'all'
  let currentPage = 1;
  const pageLimit = 8;
  let searchDebounceTimer = null;

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
      return `${formatNumber(salary.min)} – ${formatNumber(salary.max)} / yr`;
    }
    if (salary.min) return `From ${formatNumber(salary.min)} / yr`;
    return `Up to ${formatNumber(salary.max)} / yr`;
  }

  function getCompanyInitials(name = '') {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name.slice(0, 2) || 'CO').toUpperCase();
  }

  function getMatchBadge(score, category) {
    if (score === null || score === undefined) {
      return '<span class="badge badge--secondary font-bold">Unrated</span>';
    }
    const rounded = Math.round(score);
    if (rounded >= 85) {
      return `<span class="badge badge--match font-bold"><i data-lucide="sparkles" style="width:12px;height:12px;"></i> ${rounded}% Match (${category})</span>`;
    } else if (rounded >= 70) {
      return `<span class="badge badge--primary font-bold">${rounded}% Match (${category})</span>`;
    } else if (rounded >= 50) {
      return `<span class="badge badge--warning font-bold">${rounded}% Match</span>`;
    } else {
      return `<span class="badge badge--secondary font-bold">${rounded}% Match</span>`;
    }
  }

  async function loadJobs(page = 1) {
    currentPage = page;

    if (loadingSpinner) loadingSpinner.classList.remove('d-none');
    if (jobsGrid) jobsGrid.classList.add('d-none');
    if (emptyState) emptyState.classList.add('d-none');
    if (paginationWrapper) paginationWrapper.classList.add('d-none');

    try {
      const search = searchInput?.value?.trim() || '';
      const experienceLevel = expSelect?.value || '';
      const type = typeSelect?.value || '';

      let jobs = [];
      let total = 0;
      let pages = 1;
      let resumeName = '';

      if (activeMode === 'recommended') {
        const response = await getRecommendedJobsApi({
          page: currentPage,
          limit: pageLimit
        });
        const data = response?.data || {};
        jobs = data.jobs || [];
        total = data.total || 0;
        pages = data.pages || 1;
        resumeName = data.activeResumeName || '';

        // Apply client filters if user typed keywords
        if (search || experienceLevel || type) {
          jobs = jobs.filter((j) => {
            const matchesSearch =
              !search ||
              `${j.title} ${j.company} ${j.description} ${(j.requirements?.skills || []).join(' ')}`
                .toLowerCase()
                .includes(search.toLowerCase());
            const matchesExp = !experienceLevel || j.experienceLevel === experienceLevel;
            const matchesType = !type || j.type === type;
            return matchesSearch && matchesExp && matchesType;
          });
        }
      } else {
        const response = await getJobsApi({
          search,
          experienceLevel,
          type,
          page: currentPage,
          limit: pageLimit,
          sort: '-postedAt'
        });
        const data = response?.data || {};
        jobs = data.jobs || [];
        total = data.total || 0;
        pages = data.pages || 1;
      }

      if (totalCountEl) {
        if (activeMode === 'recommended' && resumeName) {
          totalCountEl.innerHTML = `Showing personalized recommendations calibrated against active resume: <strong>${resumeName}</strong>`;
        } else {
          totalCountEl.textContent = `Showing ${jobs.length} of ${total} available technology roles in catalog`;
        }
      }

      if (!jobs || jobs.length === 0) {
        if (loadingSpinner) loadingSpinner.classList.add('d-none');
        if (emptyState) emptyState.classList.remove('d-none');
        return;
      }

      if (jobsGrid) {
        jobsGrid.innerHTML = jobs
          .map((job) => {
            const initials = getCompanyInitials(job.company);
            const salaryStr = formatSalary(job.salary);
            const matchBadgeHtml = getMatchBadge(job.matchScore, job.category);

            // Render matching vs missing skills chips
            const matchingChips = (job.matchingSkills || job.requirements?.skills || [])
              .slice(0, 4)
              .map((s) => `<span class="skill-chip skill-chip--matched">${s}</span>`)
              .join(' ');

            const missingChips = (job.missingSkills || [])
              .slice(0, 2)
              .map((s) => `<span class="skill-chip skill-chip--missing">+ ${s}</span>`)
              .join(' ');

            return `
              <div class="job-card">
                <div>
                  <div class="job-card__header mb-md">
                    <div class="d-flex items-center gap-md">
                      <div class="job-card__company-logo">${initials}</div>
                      <div>
                        <h2 class="text-lg font-bold text-primary">${job.title}</h2>
                        <div class="text-xs text-muted">${job.company} • ${job.location}</div>
                      </div>
                    </div>
                    ${matchBadgeHtml}
                  </div>

                  <p class="text-xs text-secondary mb-md" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${job.description}
                  </p>

                  <div class="d-flex flex-wrap gap-xs mb-md">
                    ${matchingChips}
                    ${missingChips}
                  </div>
                </div>

                <div class="card__footer pt-md">
                  <span class="font-mono text-xs font-bold text-success">${salaryStr}</span>
                  <div class="d-flex gap-xs">
                    <a href="job-details.html?id=${job._id}" class="btn btn--primary btn--sm">View Compatibility</a>
                  </div>
                </div>
              </div>
            `;
          })
          .join('');

        jobsGrid.classList.remove('d-none');
      }

      // Render Pagination Controls
      if (paginationWrapper && pages > 1) {
        paginationWrapper.innerHTML = `
          <div class="d-flex justify-between items-center gap-md" style="margin: 20px auto; max-width: 400px;">
            <button class="btn btn--outline btn--sm" id="btn-prev-page" ${currentPage <= 1 ? 'disabled' : ''}>
              &larr; Previous
            </button>
            <span class="text-xs font-semibold text-secondary">Page ${currentPage} of ${pages}</span>
            <button class="btn btn--outline btn--sm" id="btn-next-page" ${currentPage >= pages ? 'disabled' : ''}>
              Next &rarr;
            </button>
          </div>
        `;
        paginationWrapper.classList.remove('d-none');

        document.getElementById('btn-prev-page')?.addEventListener('click', () => {
          if (currentPage > 1) loadJobs(currentPage - 1);
        });
        document.getElementById('btn-next-page')?.addEventListener('click', () => {
          if (currentPage < pages) loadJobs(currentPage + 1);
        });
      }

      if (loadingSpinner) loadingSpinner.classList.add('d-none');
      renderIcons();
    } catch (err) {
      if (loadingSpinner) loadingSpinner.classList.add('d-none');
      showToast(err.message || 'Failed to load jobs list', 'error');
      if (emptyState) emptyState.classList.remove('d-none');
    }
  }

  // Tab Switcher
  if (tabRecommended && tabAll) {
    tabRecommended.addEventListener('click', () => {
      activeMode = 'recommended';
      tabRecommended.className = 'btn btn--gradient btn--sm tab-filter-btn';
      tabAll.className = 'btn btn--ghost btn--sm tab-filter-btn';
      loadJobs(1);
    });

    tabAll.addEventListener('click', () => {
      activeMode = 'all';
      tabAll.className = 'btn btn--gradient btn--sm tab-filter-btn';
      tabRecommended.className = 'btn btn--ghost btn--sm tab-filter-btn';
      loadJobs(1);
    });
  }

  // Filter Event Listeners
  if (filterBtn) {
    filterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      loadJobs(1);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (searchInput) searchInput.value = '';
      if (expSelect) expSelect.value = '';
      if (typeSelect) typeSelect.value = '';
      loadJobs(1);
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        loadJobs(1);
      }, 400);
    });
  }

  if (expSelect) expSelect.addEventListener('change', () => loadJobs(1));
  if (typeSelect) typeSelect.addEventListener('change', () => loadJobs(1));

  // Initial Load
  await loadJobs(1);
});

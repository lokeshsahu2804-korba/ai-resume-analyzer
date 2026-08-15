/**
 * Saved Jobs Page Controller (pages/saved-jobs.js)
 * Displays bookmarked jobs, compatibility match scores, personal notes, and handles un-saving.
 */

import { authService } from '../services/auth.service.js';
import { getSavedJobsApi, unsaveJobApi } from '../api/savedJob.api.js';
import { showToast } from '../components/toast.js';
import { renderIcons } from '../utils/dom.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Authentication Guard
  await authService.requireAuthGuard();

  const gridContainer = document.getElementById('saved-jobs-grid');
  const loadingSpinner = document.getElementById('saved-jobs-loading');
  const emptyState = document.getElementById('saved-jobs-empty');
  const countSubtitle = document.getElementById('saved-jobs-count');
  const paginationWrapper = document.getElementById('saved-jobs-pagination');

  let currentPage = 1;
  const pageLimit = 6;

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
      return `${currency}${minL}L – ${currency}${maxL}L`;
    }
    return `${currency}${(salary.min || salary.max) / 100000}L`;
  }

  function getMatchBadge(score, category) {
    if (score === null || score === undefined) {
      return '<span class="badge badge--secondary">Unrated</span>';
    }
    const rounded = Math.round(score);
    if (rounded >= 85) {
      return `<span class="badge badge--match font-bold">${rounded}% Match</span>`;
    } else if (rounded >= 70) {
      return `<span class="badge badge--primary font-bold">${rounded}% Match</span>`;
    } else if (rounded >= 50) {
      return `<span class="badge badge--warning font-bold">${rounded}% Match</span>`;
    }
    return `<span class="badge badge--secondary font-bold">${rounded}% Match</span>`;
  }

  async function loadSavedJobs(page = 1) {
    currentPage = page;

    if (loadingSpinner) loadingSpinner.classList.remove('d-none');
    if (gridContainer) gridContainer.classList.add('d-none');
    if (emptyState) emptyState.classList.add('d-none');
    if (paginationWrapper) paginationWrapper.classList.add('d-none');

    try {
      const response = await getSavedJobsApi(currentPage, pageLimit);
      const { savedJobs, total, pages } = response?.data || {};

      if (countSubtitle) {
        countSubtitle.textContent = `You have ${total || 0} bookmarked job postings saved for review.`;
      }

      if (!savedJobs || savedJobs.length === 0) {
        if (loadingSpinner) loadingSpinner.classList.add('d-none');
        if (emptyState) emptyState.classList.remove('d-none');
        return;
      }

      if (gridContainer) {
        gridContainer.innerHTML = savedJobs
          .map((item) => {
            const job = item.job;
            const initials = getCompanyInitials(job.company);
            const salaryStr = formatSalary(job.salary);
            const matchBadgeHtml = getMatchBadge(item.matchScore, item.category);
            const savedDateStr = new Date(item.savedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            });

            const notesHtml = item.notes
              ? `
                <div class="p-sm mb-md" style="background: rgba(255,255,255,0.02); border-radius: var(--radius-sm); border: 1px dashed var(--color-border);">
                  <div class="text-xs text-muted font-semibold mb-2xs">Your Personal Note:</div>
                  <div class="text-xs text-secondary">"${item.notes}"</div>
                </div>
              `
              : '';

            return `
              <div class="job-card" id="saved-card-${job._id}">
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

                  ${notesHtml}

                  <div class="text-xs text-muted mb-md">
                    <i data-lucide="bookmark" style="width:12px;height:12px;"></i> Saved on ${savedDateStr}
                  </div>
                </div>

                <div class="card__footer pt-md">
                  <span class="font-mono text-xs font-bold text-success">${salaryStr}</span>
                  <div class="d-flex gap-xs">
                    <button class="btn btn--outline btn--sm text-danger btn-unsave-job" data-job-id="${job._id}" title="Remove Bookmark">
                      <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                    </button>
                    <a href="job-details.html?id=${job._id}" class="btn btn--primary btn--sm">View Details</a>
                  </div>
                </div>
              </div>
            `;
          })
          .join('');

        gridContainer.classList.remove('d-none');

        // Attach Unsave Handlers
        document.querySelectorAll('.btn-unsave-job').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            const jobId = e.currentTarget.getAttribute('data-job-id');
            try {
              await unsaveJobApi(jobId);
              showToast('Job removed from bookmarks', 'info');
              loadSavedJobs(currentPage);
            } catch (err) {
              showToast(err.message || 'Failed to remove bookmark', 'error');
            }
          });
        });
      }

      // Pagination Controls
      if (paginationWrapper && pages > 1) {
        paginationWrapper.innerHTML = `
          <div class="d-flex justify-between items-center gap-md" style="margin: 20px auto; max-width: 400px;">
            <button class="btn btn--outline btn--sm" id="btn-saved-prev" ${currentPage <= 1 ? 'disabled' : ''}>
              &larr; Previous
            </button>
            <span class="text-xs font-semibold text-secondary">Page ${currentPage} of ${pages}</span>
            <button class="btn btn--outline btn--sm" id="btn-saved-next" ${currentPage >= pages ? 'disabled' : ''}>
              Next &rarr;
            </button>
          </div>
        `;
        paginationWrapper.classList.remove('d-none');

        document.getElementById('btn-saved-prev')?.addEventListener('click', () => {
          if (currentPage > 1) loadSavedJobs(currentPage - 1);
        });
        document.getElementById('btn-saved-next')?.addEventListener('click', () => {
          if (currentPage < pages) loadSavedJobs(currentPage + 1);
        });
      }

      if (loadingSpinner) loadingSpinner.classList.add('d-none');
      renderIcons();
    } catch (err) {
      if (loadingSpinner) loadingSpinner.classList.add('d-none');
      showToast(err.message || 'Failed to load saved jobs', 'error');
      if (emptyState) emptyState.classList.remove('d-none');
    }
  }

  await loadSavedJobs(1);
});

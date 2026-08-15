/**
 * Admin Job Management Page Controller (pages/admin-jobs.js)
 * Manages administrative job CRUD operations, modal creation form, and deletion actions.
 */

import { authService } from '../services/auth.service.js';
import { getJobsApi, createJobApi, deleteJobApi } from '../api/job.api.js';
import { showToast } from '../components/toast.js';
import { renderIcons, closeModal } from '../utils/dom.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Verify admin authorization
  const isAuth = await authService.requireAuthGuard();
  if (!isAuth) return;

  const user = authService.getUser();
  if (user?.role !== 'admin') {
    showToast('Admin privilege required to access this portal', 'error');
    window.location.href = '../dashboard.html';
    return;
  }

  const tableBody = document.getElementById('admin-jobs-table-body');
  const createForm = document.getElementById('create-job-form');
  const saveJobBtn = document.getElementById('btn-save-new-job');

  function formatSalary(salary) {
    if (!salary || (!salary.min && !salary.max)) return 'Competitive';
    const currency = salary.currency === 'INR' ? '₹' : '$';
    if (salary.min && salary.max) {
      const minL = (salary.min / 100000).toFixed(0);
      const maxL = (salary.max / 100000).toFixed(0);
      return `${currency}${minL}L – ${currency}${maxL}L`;
    }
    return `${currency}${(salary.min || salary.max) / 100000}L`;
  }

  async function loadAdminJobs() {
    try {
      const response = await getJobsApi({ limit: 50, sort: '-postedAt' });
      const jobs = response?.data?.jobs || [];

      if (tableBody) {
        tableBody.innerHTML = jobs
          .map((j) => {
            const expLabel =
              j.experienceLevel === 'senior'
                ? 'Senior (5+ yrs)'
                : j.experienceLevel === 'lead'
                ? 'Lead / Staff'
                : j.experienceLevel === 'entry'
                ? 'Entry Level'
                : 'Mid Level';

            return `
              <tr>
                <td>
                  <div class="font-semibold text-primary">${j.title}</div>
                  <div class="text-xs text-muted">${j.company}</div>
                </td>
                <td><span class="badge badge--primary">${expLabel}</span></td>
                <td class="text-secondary">${j.location}</td>
                <td class="font-mono text-xs text-success">${formatSalary(j.salary)}</td>
                <td><span class="badge badge--${j.isActive ? 'success' : 'secondary'}">${j.isActive ? 'Active' : 'Inactive'}</span></td>
                <td style="text-align: right;">
                  <div class="d-flex justify-end gap-xs">
                    <button class="btn btn--ghost btn--sm btn-delete-job" data-id="${j._id}" style="color:var(--color-danger);" title="Delete Job">
                      <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `;
          })
          .join('');

        renderIcons();

        // Attach delete handlers
        document.querySelectorAll('.btn-delete-job').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const jobId = btn.getAttribute('data-id');
            if (!jobId) return;

            const confirmed = window.confirm('Are you sure you want to delete this job listing?');
            if (!confirmed) return;

            try {
              await deleteJobApi(jobId);
              showToast('Job listing deleted successfully', 'success');
              await loadAdminJobs();
            } catch (err) {
              showToast(err.message || 'Failed to delete job', 'error');
            }
          });
        });
      }
    } catch (err) {
      showToast('Failed to load job listings', 'error');
    }
  }

  // Handle New Job Submission
  if (saveJobBtn && createForm) {
    saveJobBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      const title = document.getElementById('job-title')?.value?.trim();
      const company = document.getElementById('company-name')?.value?.trim();
      const location = document.getElementById('job-location')?.value?.trim();
      const type = document.getElementById('job-type')?.value || 'full-time';
      const experienceLevel = document.getElementById('job-exp-level')?.value || 'mid';
      const description = document.getElementById('job-description')?.value?.trim() || `${title} at ${company}. Responsibilities include building scalable services.`;
      const skillsRaw = document.getElementById('required-skills')?.value?.trim() || '';
      const minSalary = Number(document.getElementById('job-salary-min')?.value) || null;
      const maxSalary = Number(document.getElementById('job-salary-max')?.value) || null;

      if (!title || !company || !location || !skillsRaw) {
        showToast('Please fill in title, company, location, and required skills', 'warning');
        return;
      }

      const skills = skillsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      try {
        saveJobBtn.disabled = true;
        saveJobBtn.textContent = 'Saving...';

        await createJobApi({
          title,
          company,
          location,
          type,
          experienceLevel,
          description,
          requirements: {
            skills,
            experience: `${experienceLevel} level experience required`,
            education: 'Degree in Computer Science or related field'
          },
          salary: {
            min: minSalary,
            max: maxSalary,
            currency: 'INR'
          },
          source: 'admin_portal'
        });

        showToast('Job listing created successfully!', 'success');
        closeModal('create-job-modal');
        createForm.reset();
        await loadAdminJobs();
      } catch (err) {
        showToast(err.message || 'Failed to create job listing', 'error');
      } finally {
        saveJobBtn.disabled = false;
        saveJobBtn.textContent = 'Create Job';
      }
    });
  }

  await loadAdminJobs();
});

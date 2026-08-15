/**
 * Job Application Tracker Page Controller (pages/applications.js)
 * Manages Kanban pipeline columns, stage updates, interview dates, and notes.
 */

import { authService } from '../services/auth.service.js';
import {
  getApplicationsApi,
  getApplicationStatsApi,
  updateApplicationApi,
  deleteApplicationApi
} from '../api/application.api.js';
import { showToast } from '../components/toast.js';
import { renderIcons } from '../utils/dom.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Authentication Guard
  await authService.requireAuthGuard();

  const boardContainer = document.getElementById('apps-kanban-board');
  const loadingSpinner = document.getElementById('apps-loading-spinner');
  const emptyState = document.getElementById('apps-empty-state');
  const filterBtns = document.querySelectorAll('.app-filter-btn');

  // Stats Elements
  const statTotal = document.getElementById('stat-total-apps');
  const statActive = document.getElementById('stat-active-apps');
  const statInterview = document.getElementById('stat-interview-apps');
  const statOffered = document.getElementById('stat-offered-apps');

  // Column Containers & Counters
  const colApplied = document.getElementById('col-applied-items');
  const countApplied = document.getElementById('count-col-applied');
  const colInterviewing = document.getElementById('col-interviewing-items');
  const countInterviewing = document.getElementById('count-col-interviewing');
  const colOffered = document.getElementById('col-offered-items');
  const countOffered = document.getElementById('count-col-offered');
  const colTerminal = document.getElementById('col-terminal-items');
  const countTerminal = document.getElementById('count-col-terminal');

  // Modal Elements
  const modal = document.getElementById('modal-update-application');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalCloseBtn = document.getElementById('btn-close-modal');
  const modalCancelBtn = document.getElementById('btn-cancel-modal');
  const modalForm = document.getElementById('form-update-application');
  const modalAppId = document.getElementById('modal-app-id');
  const modalAppTitle = document.getElementById('modal-app-title');
  const modalAppStatus = document.getElementById('modal-app-status');
  const modalAppInterview = document.getElementById('modal-app-interview-date');
  const modalAppNotes = document.getElementById('modal-app-notes');
  const btnWithdraw = document.getElementById('btn-withdraw-application');

  let activeFilter = ''; // '' | 'applied' | 'interviewing' | 'offered' | 'rejected'
  let allApplications = [];

  function formatSalary(salary) {
    if (!salary || (!salary.min && !salary.max)) return 'Competitive';
    const currency = salary.currency === 'INR' ? '₹' : '$';
    if (salary.min && salary.max) {
      return `${currency}${(salary.min / 100000).toFixed(0)}L – ${(salary.max / 100000).toFixed(0)}L`;
    }
    return `${currency}${((salary.min || salary.max) / 100000).toFixed(0)}L`;
  }

  function getMatchBadge(score) {
    if (score === null || score === undefined) return '';
    const rounded = Math.round(score);
    if (rounded >= 85) return `<span class="badge badge--match font-bold">${rounded}% Match</span>`;
    if (rounded >= 70) return `<span class="badge badge--primary font-bold">${rounded}% Match</span>`;
    return `<span class="badge badge--secondary font-bold">${rounded}% Match</span>`;
  }

  function renderCard(app) {
    const job = app.jobId || {};
    const salaryStr = formatSalary(job.salary);
    const matchBadgeHtml = getMatchBadge(app.matchScore);
    const appliedDateStr = new Date(app.appliedAt || app.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    let interviewInfo = '';
    if (app.interviewDate) {
      const interviewStr = new Date(app.interviewDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      interviewInfo = `
        <div class="text-2xs font-semibold text-warning mt-2xs d-flex items-center gap-2xs">
          <i data-lucide="calendar" style="width:11px;height:11px;"></i> ${interviewStr}
        </div>
      `;
    }

    let notesPreview = '';
    if (app.notes) {
      notesPreview = `
        <div class="text-2xs text-secondary mt-xs font-italic" style="display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">
          "${app.notes}"
        </div>
      `;
    }

    return `
      <div class="kanban-item" data-app-id="${app._id}" style="cursor: pointer;">
        <div class="d-flex justify-between items-start mb-2xs">
          <span class="kanban-item__company">${job.company || 'Company'}</span>
          ${matchBadgeHtml}
        </div>
        <div class="kanban-item__title text-primary font-bold">${job.title || 'Job Position'}</div>
        <div class="text-xs text-muted mb-xs">${job.location || 'Remote'}</div>

        ${interviewInfo}
        ${notesPreview}

        <div class="d-flex justify-between items-center mt-sm pt-xs" style="border-top: 1px solid rgba(255,255,255,0.04);">
          <span class="text-2xs font-mono font-bold text-success">${salaryStr}</span>
          <span class="kanban-item__date"><i data-lucide="clock" style="width:11px;height:11px;"></i> ${appliedDateStr}</span>
        </div>
      </div>
    `;
  }

  async function loadPipeline() {
    if (loadingSpinner) loadingSpinner.classList.remove('d-none');
    if (boardContainer) boardContainer.classList.add('d-none');
    if (emptyState) emptyState.classList.add('d-none');

    try {
      // 1. Fetch Stats and Applications concurrently
      const [statsRes, appsRes] = await Promise.all([
        getApplicationStatsApi().catch(() => null),
        getApplicationsApi({ status: activeFilter, limit: 50 })
      ]);

      // Hydrate Stats Strip
      const stats = statsRes?.data?.stats;
      if (stats) {
        if (statTotal) statTotal.textContent = stats.total || 0;
        if (statActive) statActive.textContent = stats.active || 0;
        if (statInterview) statInterview.textContent = stats.interviewing || 0;
        if (statOffered) statOffered.textContent = stats.offered || 0;
      }

      allApplications = appsRes?.data?.applications || [];

      if (!allApplications || allApplications.length === 0) {
        if (loadingSpinner) loadingSpinner.classList.add('d-none');
        if (emptyState) emptyState.classList.remove('d-none');
        return;
      }

      // Partition into columns
      const appliedList = [];
      const interviewList = [];
      const offeredList = [];
      const terminalList = [];

      allApplications.forEach((app) => {
        if (app.status === 'applied') appliedList.push(app);
        else if (app.status === 'interviewing') interviewList.push(app);
        else if (app.status === 'offered') offeredList.push(app);
        else terminalList.push(app);
      });

      // Hydrate Columns
      if (colApplied) {
        colApplied.innerHTML = appliedList.length
          ? appliedList.map(renderCard).join('')
          : '<div class="text-xs text-muted text-center py-md">No applied roles</div>';
        if (countApplied) countApplied.textContent = appliedList.length;
      }

      if (colInterviewing) {
        colInterviewing.innerHTML = interviewList.length
          ? interviewList.map(renderCard).join('')
          : '<div class="text-xs text-muted text-center py-md">No interview rounds</div>';
        if (countInterviewing) countInterviewing.textContent = interviewList.length;
      }

      if (colOffered) {
        colOffered.innerHTML = offeredList.length
          ? offeredList.map(renderCard).join('')
          : '<div class="text-xs text-muted text-center py-md">No offers yet</div>';
        if (countOffered) countOffered.textContent = offeredList.length;
      }

      if (colTerminal) {
        colTerminal.innerHTML = terminalList.length
          ? terminalList.map(renderCard).join('')
          : '<div class="text-xs text-muted text-center py-md">No archived records</div>';
        if (countTerminal) countTerminal.textContent = terminalList.length;
      }

      if (boardContainer) boardContainer.classList.remove('d-none');
      if (loadingSpinner) loadingSpinner.classList.add('d-none');
      renderIcons();

      // Attach Click Listeners to Cards
      document.querySelectorAll('.kanban-item').forEach((card) => {
        card.addEventListener('click', (e) => {
          const appId = e.currentTarget.getAttribute('data-app-id');
          openEditModal(appId);
        });
      });
    } catch (err) {
      if (loadingSpinner) loadingSpinner.classList.add('d-none');
      showToast(err.message || 'Failed to load application pipeline', 'error');
      if (emptyState) emptyState.classList.remove('d-none');
    }
  }

  function openEditModal(appId) {
    const app = allApplications.find((a) => a._id === appId);
    if (!app) return;

    if (modalAppId) modalAppId.value = app._id;
    if (modalAppTitle) {
      modalAppTitle.textContent = `${app.jobId?.title || 'Job'} (${app.jobId?.company || 'Company'})`;
    }
    if (modalAppStatus) modalAppStatus.value = app.status;
    if (modalAppNotes) modalAppNotes.value = app.notes || '';
    if (modalAppInterview) {
      if (app.interviewDate) {
        const d = new Date(app.interviewDate);
        const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        modalAppInterview.value = isoLocal;
      } else {
        modalAppInterview.value = '';
      }
    }

    if (modal) modal.classList.remove('d-none');
    renderIcons();
  }

  function closeModal() {
    if (modal) modal.classList.add('d-none');
  }

  // Modal Event Listeners
  if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);

  if (modalForm) {
    modalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const appId = modalAppId.value;
      const status = modalAppStatus.value;
      const notes = modalAppNotes.value;
      const interviewDate = modalAppInterview.value || null;

      try {
        await updateApplicationApi(appId, { status, notes, interviewDate });
        showToast('Application stage updated successfully', 'success');
        closeModal();
        loadPipeline();
      } catch (err) {
        showToast(err.message || 'Failed to update stage', 'error');
      }
    });
  }

  if (btnWithdraw) {
    btnWithdraw.addEventListener('click', async () => {
      const appId = modalAppId.value;
      if (!confirm('Are you sure you want to withdraw/remove this application?')) return;

      try {
        await deleteApplicationApi(appId);
        showToast('Application withdrawn successfully', 'info');
        closeModal();
        loadPipeline();
      } catch (err) {
        showToast(err.message || 'Failed to withdraw application', 'error');
      }
    });
  }

  // Filter Buttons
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach((b) => (b.className = 'btn btn--ghost btn--sm app-filter-btn'));
      e.currentTarget.className = 'btn btn--gradient btn--sm app-filter-btn';
      activeFilter = e.currentTarget.getAttribute('data-status') || '';
      loadPipeline();
    });
  });

  await loadPipeline();
});

/**
 * Resume Analysis History Page Controller (pages/history.js)
 * Fetches user's uploaded resumes, displays parsing/analysis status, and allows manual parse trigger & AI evaluation.
 */

import { authService } from '../services/auth.service.js';
import { getResumesApi, deleteResumeApi, processResumeApi } from '../api/resume.api.js';
import { showToast } from '../components/toast.js';
import { renderIcons } from '../utils/dom.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Enforce authentication guard
  const isAuthenticated = await authService.requireAuthGuard();
  if (!isAuthenticated) return;

  const tableBody = document.getElementById('history-table-body');
  const emptyState = document.getElementById('history-empty-state');
  const tableWrapper = document.getElementById('history-table-wrapper');

  async function loadResumes() {
    try {
      const response = await getResumesApi(1, 20);
      const resumes = response?.data?.resumes || [];

      if (resumes.length === 0) {
        if (tableWrapper) tableWrapper.classList.add('d-none');
        if (emptyState) emptyState.classList.remove('d-none');
        return;
      }

      if (emptyState) emptyState.classList.add('d-none');
      if (tableWrapper) tableWrapper.classList.remove('d-none');

      if (tableBody) {
        tableBody.innerHTML = resumes
          .map((r, index) => {
            const fileName = r.file?.originalName || 'Resume.pdf';
            const fileUrl = r.file?.fileUrl || '#';
            const sizeMb = r.file?.fileSize
              ? (r.file.fileSize / (1024 * 1024)).toFixed(2) + ' MB'
              : '--';
            const dateStr = r.createdAt
              ? new Date(r.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
              : 'Recent';

            const status = r.status || 'uploaded';
            let statusBadge = '';
            let actionBtn = '';

            if (status === 'analyzed') {
              statusBadge = `<span class="badge badge--success font-mono font-bold"><i data-lucide="award" style="width:12px;height:12px;"></i> ANALYZED</span>`;
              actionBtn = `<a href="analysis.html?resumeId=${r._id}" class="btn btn--gradient btn--sm mr-xs"><i data-lucide="bar-chart-3" style="width:12px;height:12px;"></i> View Report</a>`;
            } else if (status === 'parsed') {
              const skillsCount = r.parsed?.skills?.length || 0;
              statusBadge = `<span class="badge badge--primary font-mono font-bold"><i data-lucide="check-circle" style="width:12px;height:12px;"></i> PARSED (${skillsCount} skills)</span>`;
              actionBtn = `<a href="analysis.html?resumeId=${r._id}&trigger=true" class="btn btn--gradient btn--sm mr-xs"><i data-lucide="zap" style="width:12px;height:12px;"></i> Analyze</a>`;
            } else if (status === 'processing' || status === 'analyzing') {
              statusBadge = `<span class="badge badge--warning font-mono font-bold"><span class="spinner spinner--sm" style="width:12px;height:12px;"></span> ${status.toUpperCase()}</span>`;
            } else if (status === 'failed') {
              statusBadge = `<span class="badge badge--danger font-mono font-bold">PARSE FAILED</span>`;
              actionBtn = `<button class="btn btn--outline btn--sm btn-process-resume mr-xs" data-id="${r._id}"><i data-lucide="refresh-cw" style="width:12px;height:12px;"></i> Retry Parse</button>`;
            } else {
              statusBadge = `<span class="badge badge--secondary font-mono font-bold">UPLOADED</span>`;
              actionBtn = `<button class="btn btn--outline btn--sm btn-process-resume mr-xs" data-id="${r._id}"><i data-lucide="cpu" style="width:12px;height:12px;"></i> Parse Text</button>`;
            }

            const activeBadge =
              index === 0
                ? '<span class="badge badge--primary">Active</span>'
                : '';

            const serverOrigin = typeof API_BASE_URL !== 'undefined'
              ? API_BASE_URL.replace('/api', '')
              : (typeof window !== 'undefined' && window.API_BASE_URL
                  ? window.API_BASE_URL.replace('/api', '')
                  : 'https://ai-resume-analyzer-rn7x.onrender.com');

            const resolvedUrl = fileUrl.startsWith('http')
              ? fileUrl
              : `${serverOrigin}${fileUrl}`;

            return `
              <tr>
                <td>
                  <div class="d-flex items-center gap-sm">
                    <i data-lucide="file-text" style="color: var(--color-primary-light);"></i>
                    <span class="font-semibold text-primary">${fileName}</span>
                    ${activeBadge}
                  </div>
                </td>
                <td>${statusBadge}</td>
                <td class="text-secondary">${sizeMb}</td>
                <td class="text-muted">${dateStr}</td>
                <td>
                  <a href="${resolvedUrl}" target="_blank" rel="noopener" class="btn btn--ghost btn--sm">
                    <i data-lucide="external-link" style="width:14px; height:14px;"></i> View PDF
                  </a>
                </td>
                <td style="text-align: right;">
                  <div class="d-flex items-center justify-end gap-xs">
                    ${actionBtn}
                    <button class="btn btn--ghost btn--sm btn-delete-resume" data-id="${r._id}" style="color: var(--color-danger);" title="Delete Resume">
                      <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `;
          })
          .join('');

        renderIcons();

        // Attach parse event listeners
        document.querySelectorAll('.btn-process-resume').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            const resumeId = btn.getAttribute('data-id');
            if (!resumeId) return;

            btn.disabled = true;
            btn.innerHTML = '<span class="spinner spinner--sm" style="width:12px;height:12px;"></span> Parsing...';

            try {
              await processResumeApi(resumeId);
              showToast('Resume parsed successfully!', 'success');
              await loadResumes();
            } catch (err) {
              showToast(err.message || 'Failed to parse resume', 'error');
              btn.disabled = false;
              btn.innerHTML = '<i data-lucide="refresh-cw" style="width:12px;height:12px;"></i> Retry';
              renderIcons();
            }
          });
        });

        // Attach delete event listeners
        document.querySelectorAll('.btn-delete-resume').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            const resumeId = btn.getAttribute('data-id');
            if (!resumeId) return;

            const confirmed = window.confirm('Are you sure you want to delete this resume?');
            if (!confirmed) return;

            try {
              await deleteResumeApi(resumeId);
              showToast('Resume deleted successfully', 'success');
              await loadResumes();
            } catch (err) {
              showToast(err.message || 'Failed to delete resume', 'error');
            }
          });
        });
      }
    } catch (err) {
      showToast('Failed to load resume history', 'error');
    }
  }

  await loadResumes();
});

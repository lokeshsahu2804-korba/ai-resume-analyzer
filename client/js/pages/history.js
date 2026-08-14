/**
 * Resume Analysis History Page Controller (pages/history.js)
 * Fetches user's uploaded resumes and renders table with live delete action.
 */

import { authService } from '../services/auth.service.js';
import { getResumesApi, deleteResumeApi } from '../api/resume.api.js';
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

            const statusBadge =
              index === 0
                ? '<span class="badge badge--primary">Active</span>'
                : '<span class="badge badge--secondary">Archived</span>';

            const resolvedUrl = fileUrl.startsWith('http')
              ? fileUrl
              : `http://localhost:5001${fileUrl}`;

            return `
              <tr>
                <td>
                  <div class="d-flex items-center gap-sm">
                    <i data-lucide="file-text" style="color: var(--color-primary-light);"></i>
                    <span class="font-semibold text-primary">${fileName}</span>
                    ${statusBadge}
                  </div>
                </td>
                <td>
                  <span class="badge badge--success font-mono font-bold">${r.status.toUpperCase()}</span>
                </td>
                <td class="text-secondary">${sizeMb}</td>
                <td class="text-muted">${dateStr}</td>
                <td>
                  <a href="${resolvedUrl}" target="_blank" rel="noopener" class="btn btn--ghost btn--sm">
                    <i data-lucide="external-link" style="width:14px; height:14px;"></i> View File
                  </a>
                </td>
                <td style="text-align: right;">
                  <button class="btn btn--ghost btn--sm btn-delete-resume" data-id="${r._id}" style="color: var(--color-danger);" title="Delete Resume">
                    <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                  </button>
                </td>
              </tr>
            `;
          })
          .join('');

        renderIcons();

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

/**
 * Admin User Management Controller (pages/admin-users.js)
 * Manages user table, real-time search/filtering, role promotions, plan upgrades, and cascading account deletions.
 */

import { authService } from '../services/auth.service.js';
import {
  getAdminUsersApi,
  getAdminUserDetailsApi,
  updateAdminUserRoleApi,
  updateAdminUserPlanApi,
  deleteAdminUserApi
} from '../api/admin.api.js';
import { showToast } from '../components/toast.js';
import { renderIcons, debounce } from '../utils/dom.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Authorization Guard: Admin only
  const isAuth = await authService.requireAuthGuard();
  if (!isAuth) return;

  const currentUser = authService.getUser();
  if (currentUser?.role !== 'admin') {
    showToast('Admin access required', 'error');
    window.location.href = '../dashboard.html';
    return;
  }

  const tableBody = document.getElementById('admin-users-table-body');
  const countSubtitle = document.getElementById('admin-users-count-subtitle');
  const searchInput = document.getElementById('admin-user-search');
  const planFilter = document.getElementById('admin-user-plan-filter');
  const roleFilter = document.getElementById('admin-user-role-filter');
  const paginationWrapper = document.getElementById('admin-users-pagination');

  // Modal Elements
  const editModal = document.getElementById('modal-edit-user');
  const editOverlay = document.getElementById('modal-edit-overlay');
  const closeEditBtn = document.getElementById('btn-close-edit-modal');
  const cancelEditBtn = document.getElementById('btn-cancel-edit-modal');
  const editForm = document.getElementById('form-edit-user');
  const modalUserId = document.getElementById('modal-edit-user-id');
  const modalUserEmail = document.getElementById('modal-edit-user-email');
  const modalUserRole = document.getElementById('modal-edit-user-role');
  const modalUserPlan = document.getElementById('modal-edit-user-plan');
  const modalUserLimit = document.getElementById('modal-edit-user-limit');
  const modalDeleteBtn = document.getElementById('btn-modal-delete-user');

  let currentPage = 1;
  const pageLimit = 10;
  let allUsers = [];

  function getInitials(name = '') {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (name.slice(0, 2) || 'US').toUpperCase();
  }

  async function loadUsers(page = 1) {
    currentPage = page;

    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-xs text-muted py-lg">
            <div class="spinner spinner--md mb-xs" style="margin: 0 auto;"></div>
            Loading platform users...
          </td>
        </tr>
      `;
    }

    const search = searchInput?.value?.trim() || '';
    const plan = planFilter?.value || '';
    const role = roleFilter?.value || '';

    try {
      const response = await getAdminUsersApi({
        page: currentPage,
        limit: pageLimit,
        search,
        plan,
        role,
        sort: '-createdAt'
      });

      const { users, total, pages } = response?.data || {};
      allUsers = users || [];

      if (countSubtitle) {
        countSubtitle.textContent = `Showing ${allUsers.length} of ${total || 0} registered user accounts.`;
      }

      if (!allUsers || allUsers.length === 0) {
        if (tableBody) {
          tableBody.innerHTML = `
            <tr>
              <td colspan="6" class="text-center text-xs text-muted py-xl">
                No user accounts found matching the current search/filter criteria.
              </td>
            </tr>
          `;
        }
        if (paginationWrapper) paginationWrapper.classList.add('d-none');
        return;
      }

      if (tableBody) {
        tableBody.innerHTML = allUsers
          .map((u) => {
            const initials = getInitials(u.name);
            const isSelf = u._id === currentUser._id;
            const roleBadge = u.role === 'admin'
              ? '<span class="badge badge--danger"><i data-lucide="shield-alert" style="width:11px;height:11px;"></i> Admin</span>'
              : '<span class="badge badge--secondary">Candidate</span>';

            const planBadge = u.subscription?.plan === 'premium'
              ? '<span class="badge badge--gradient">Pro (Unlimited)</span>'
              : `<span class="badge badge--primary">Free (${u.usageLimits?.resumeAnalysesUsed || 0}/${u.usageLimits?.resumeAnalysesLimit || 3})</span>`;

            const activityStr = `${u.activity?.resumesCount || 0} Resumes • ${u.activity?.analysesCount || 0} Analyses • ${u.activity?.applicationsCount || 0} Apps`;
            const joinedStr = new Date(u.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return `
              <tr id="user-row-${u._id}">
                <td>
                  <div class="d-flex items-center gap-sm">
                    <div class="job-card__company-logo" style="width:2rem; height:2rem; font-size:0.75rem;">${initials}</div>
                    <div>
                      <div class="font-semibold text-primary d-flex items-center gap-xs">
                        ${u.name}
                        ${isSelf ? '<span class="badge badge--info" style="font-size:10px; padding:2px 6px;">You</span>' : ''}
                      </div>
                      <div class="text-xs text-muted font-mono">${u.email}</div>
                    </div>
                  </div>
                </td>
                <td>${roleBadge}</td>
                <td>${planBadge}</td>
                <td><span class="text-xs text-secondary">${activityStr}</span></td>
                <td><span class="text-xs text-muted">${joinedStr}</span></td>
                <td class="text-right">
                  <div class="d-inline-flex gap-xs">
                    <button class="btn btn--outline btn--sm btn-edit-user" data-user-id="${u._id}" title="Edit User">
                      <i data-lucide="edit-3" style="width:13px;height:13px;"></i> Edit
                    </button>
                    ${
                      !isSelf
                        ? `
                          <button class="btn btn--outline btn--sm text-danger btn-delete-user" data-user-id="${u._id}" title="Delete User">
                            <i data-lucide="trash-2" style="width:13px;height:13px;"></i>
                          </button>
                        `
                        : ''
                    }
                  </div>
                </td>
              </tr>
            `;
          })
          .join('');

        // Attach Handlers
        document.querySelectorAll('.btn-edit-user').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            const uid = e.currentTarget.getAttribute('data-user-id');
            openEditModal(uid);
          });
        });

        document.querySelectorAll('.btn-delete-user').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            const uid = e.currentTarget.getAttribute('data-user-id');
            const targetUser = allUsers.find((u) => u._id === uid);
            if (!confirm(`Are you sure you want to permanently delete user "${targetUser?.name || 'User'}" (${targetUser?.email}) and ALL associated resumes, analyses, saved jobs, and applications?`)) {
              return;
            }

            try {
              await deleteAdminUserApi(uid);
              showToast('User and all associated records deleted permanently', 'info');
              loadUsers(currentPage);
            } catch (err) {
              showToast(err.message || 'Failed to delete user', 'error');
            }
          });
        });
      }

      // Pagination
      if (paginationWrapper && pages > 1) {
        paginationWrapper.innerHTML = `
          <div class="d-flex justify-between items-center gap-md" style="margin: 20px auto; max-width: 400px;">
            <button class="btn btn--outline btn--sm" id="btn-users-prev" ${currentPage <= 1 ? 'disabled' : ''}>
              &larr; Previous
            </button>
            <span class="text-xs font-semibold text-secondary">Page ${currentPage} of ${pages}</span>
            <button class="btn btn--outline btn--sm" id="btn-users-next" ${currentPage >= pages ? 'disabled' : ''}>
              Next &rarr;
            </button>
          </div>
        `;
        paginationWrapper.classList.remove('d-none');

        document.getElementById('btn-users-prev')?.addEventListener('click', () => {
          if (currentPage > 1) loadUsers(currentPage - 1);
        });
        document.getElementById('btn-users-next')?.addEventListener('click', () => {
          if (currentPage < pages) loadUsers(currentPage + 1);
        });
      } else if (paginationWrapper) {
        paginationWrapper.classList.add('d-none');
      }

      renderIcons();
    } catch (err) {
      showToast(err.message || 'Failed to load user directory', 'error');
    }
  }

  function openEditModal(userId) {
    const targetUser = allUsers.find((u) => u._id === userId);
    if (!targetUser) return;

    if (modalUserId) modalUserId.value = targetUser._id;
    if (modalUserEmail) modalUserEmail.value = `${targetUser.name} (${targetUser.email})`;
    if (modalUserRole) modalUserRole.value = targetUser.role || 'user';
    if (modalUserPlan) modalUserPlan.value = targetUser.subscription?.plan || 'free';
    if (modalUserLimit) modalUserLimit.value = targetUser.usageLimits?.resumeAnalysesLimit || 3;

    if (modalDeleteBtn) {
      if (targetUser._id === currentUser._id) {
        modalDeleteBtn.classList.add('d-none');
      } else {
        modalDeleteBtn.classList.remove('d-none');
      }
    }

    if (editModal) editModal.classList.remove('d-none');
    renderIcons();
  }

  function closeEditModal() {
    if (editModal) editModal.classList.add('d-none');
  }

  if (editOverlay) editOverlay.addEventListener('click', closeEditModal);
  if (closeEditBtn) closeEditBtn.addEventListener('click', closeEditModal);
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditModal);

  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const uid = modalUserId.value;
      const role = modalUserRole.value;
      const plan = modalUserPlan.value;
      const limit = modalUserLimit.value ? parseInt(modalUserLimit.value, 10) : undefined;

      try {
        // Concurrently update role and plan if needed
        await Promise.all([
          updateAdminUserRoleApi(uid, role),
          updateAdminUserPlanApi(uid, { plan, resumeAnalysesLimit: limit })
        ]);

        showToast('User account updated successfully', 'success');
        closeEditModal();
        loadUsers(currentPage);
      } catch (err) {
        showToast(err.message || 'Failed to update user', 'error');
      }
    });
  }

  if (modalDeleteBtn) {
    modalDeleteBtn.addEventListener('click', async () => {
      const uid = modalUserId.value;
      if (!confirm('Are you sure you want to permanently delete this user account?')) return;

      try {
        await deleteAdminUserApi(uid);
        showToast('User deleted permanently', 'info');
        closeEditModal();
        loadUsers(currentPage);
      } catch (err) {
        showToast(err.message || 'Failed to delete user', 'error');
      }
    });
  }

  // Filter and Search Listeners with Debounce
  if (searchInput) {
    searchInput.addEventListener(
      'input',
      debounce(() => loadUsers(1), 300)
    );
  }
  if (planFilter) planFilter.addEventListener('change', () => loadUsers(1));
  if (roleFilter) roleFilter.addEventListener('change', () => loadUsers(1));

  await loadUsers(1);
});

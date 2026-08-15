/**
 * Notification Center Controller (pages/notifications.js)
 * Manages full notifications view, category tab filters, real-time live alerts, mark-as-read, and bulk clear operations.
 */

import { authService } from '../services/auth.service.js';
import {
  getNotificationsApi,
  getUnreadCountApi,
  markAsReadApi,
  markAllAsReadApi,
  deleteNotificationApi,
  clearAllApi
} from '../api/notification.api.js';
import { getNotificationTypeMeta, formatRelativeTime } from '../components/notifications.js';
import { socketService } from '../services/socket.service.js';
import { showToast } from '../components/toast.js';
import { renderIcons } from '../utils/dom.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Authentication Guard
  const isAuthenticated = await authService.requireAuthGuard();
  if (!isAuthenticated) return;

  const container = document.getElementById('notifications-list-container');
  const unreadBadge = document.getElementById('notif-center-unread-badge');
  const paginationWrapper = document.getElementById('notifications-pagination');
  const markAllBtn = document.getElementById('btn-mark-all-read');
  const clearReadBtn = document.getElementById('btn-clear-read');
  const tabButtons = document.querySelectorAll('.notif-tab-btn');

  let activeFilter = 'all';
  let currentPage = 1;
  const pageLimit = 10;
  let allNotifications = [];

  function getFilterParams() {
    const params = { page: currentPage, limit: pageLimit, sort: '-createdAt' };
    if (activeFilter === 'unread') {
      params.isRead = false;
    } else if (activeFilter === 'application') {
      params.type = 'application_submitted'; // API will filter or we filter client-side for application prefix
    } else if (activeFilter === 'analysis') {
      params.type = 'analysis_complete';
    } else if (activeFilter === 'resume') {
      params.type = 'resume_processed';
    }
    return params;
  }

  async function loadNotifications(page = 1) {
    currentPage = page;

    if (container) {
      container.innerHTML = `
        <div class="card p-2xl text-center text-xs text-muted">
          <div class="spinner spinner--md mb-sm" style="margin: 0 auto;"></div>
          Loading your notification stream...
        </div>
      `;
    }

    try {
      const isCategoryFilter = ['application', 'analysis', 'resume'].includes(activeFilter);
      // For general filters, let API handle query
      const params = isCategoryFilter
        ? { page: currentPage, limit: 50, sort: '-createdAt' }
        : getFilterParams();

      const response = await getNotificationsApi(params);
      const data = response?.data || {};

      let items = data.notifications || [];
      const totalCount = data.total || 0;
      const pages = data.pages || 1;
      const unreadTotal = data.unreadCount || 0;

      if (unreadBadge) {
        unreadBadge.textContent = `${unreadTotal} Unread`;
        unreadBadge.className = `badge ${unreadTotal > 0 ? 'badge--primary' : 'badge--secondary'} font-bold`;
      }

      // Client-side category group filtering if needed
      if (activeFilter === 'application') {
        items = items.filter((n) => n.type.startsWith('application_') || n.type === 'interview_scheduled' || n.type === 'offer_received');
      } else if (activeFilter === 'analysis') {
        items = items.filter((n) => n.type === 'analysis_complete' || n.type === 'quota_warning');
      } else if (activeFilter === 'resume') {
        items = items.filter((n) => n.type.startsWith('resume_'));
      }

      allNotifications = items;

      if (items.length === 0) {
        container.innerHTML = `
          <div class="card p-3xl text-center text-secondary">
            <i data-lucide="bell-off" style="width: 36px; height: 36px; margin: 0 auto 12px; color: var(--color-text-muted);"></i>
            <h3 class="text-base font-semibold mb-xs">No notifications found</h3>
            <p class="text-xs text-muted">You're all caught up! New alerts and application updates will appear here in real time.</p>
          </div>
        `;
        if (paginationWrapper) paginationWrapper.classList.add('d-none');
        renderIcons();
        return;
      }

      container.innerHTML = items
        .map((n) => {
          const meta = getNotificationTypeMeta(n.type);
          const timeAgo = formatRelativeTime(n.createdAt);
          const isUnread = !n.isRead;

          let targetLinkHtml = '';
          if (n.data?.applicationId) {
            targetLinkHtml = `<a href="applications.html" class="btn btn--outline btn--xs mt-xs"><i data-lucide="list-todo" style="width:12px;height:12px;"></i> View in Tracker</a>`;
          } else if (n.data?.analysisId || n.type === 'analysis_complete') {
            targetLinkHtml = `<a href="analysis.html" class="btn btn--outline btn--xs mt-xs"><i data-lucide="sparkles" style="width:12px;height:12px;"></i> View ATS Analysis</a>`;
          } else if (n.type === 'quota_warning') {
            targetLinkHtml = `<a href="pricing.html" class="btn btn--gradient btn--xs mt-xs"><i data-lucide="credit-card" style="width:12px;height:12px;"></i> Upgrade to Pro</a>`;
          }

          return `
            <div class="card p-lg notification-card ${isUnread ? 'notification-card--unread' : ''}" data-id="${n._id}">
              <div class="d-flex items-start gap-md">
                <div class="notification-card__icon" style="background: ${meta.bg}; color: ${meta.color};">
                  <i data-lucide="${meta.icon}" style="width: 20px; height: 20px;"></i>
                </div>
                <div style="flex: 1;">
                  <div class="d-flex justify-between items-center mb-xs flex-wrap gap-xs">
                    <div class="d-flex items-center gap-xs">
                      <span class="font-bold ${isUnread ? 'text-primary' : 'text-secondary'}">${n.title}</span>
                      <span class="badge badge--secondary text-xs" style="font-size:10px;">${meta.badge}</span>
                      ${isUnread ? '<span class="badge badge--primary text-xs" style="font-size:10px;">New</span>' : ''}
                    </div>
                    <span class="text-xs text-muted">${timeAgo}</span>
                  </div>
                  <p class="text-sm text-secondary mb-xs">${n.message}</p>
                  ${targetLinkHtml}
                </div>
                <div class="d-flex items-center gap-xs">
                  ${
                    isUnread
                      ? `<button class="btn btn--ghost btn--sm btn-card-mark-read" data-id="${n._id}" title="Mark as read"><i data-lucide="check"></i></button>`
                      : ''
                  }
                  <button class="btn btn--ghost btn--sm text-danger btn-card-delete" data-id="${n._id}" title="Delete"><i data-lucide="trash-2"></i></button>
                </div>
              </div>
            </div>
          `;
        })
        .join('');

      renderIcons();

      // Handlers
      container.querySelectorAll('.btn-card-mark-read').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const nid = btn.getAttribute('data-id');
          try {
            await markAsReadApi(nid);
            const parent = btn.closest('.notification-card');
            if (parent) parent.classList.remove('notification-card--unread');
            btn.remove();
            const unreadRes = await getUnreadCountApi();
            if (unreadBadge) {
              const u = unreadRes?.data?.unreadCount || 0;
              unreadBadge.textContent = `${u} Unread`;
              unreadBadge.className = `badge ${u > 0 ? 'badge--primary' : 'badge--secondary'} font-bold`;
            }
          } catch (err) {
            showToast(err.message || 'Failed to mark as read', 'error');
          }
        });
      });

      container.querySelectorAll('.btn-card-delete').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const nid = btn.getAttribute('data-id');
          try {
            await deleteNotificationApi(nid);
            const parent = btn.closest('.notification-card');
            if (parent) parent.remove();
            showToast('Notification deleted', 'info');
          } catch (err) {
            showToast(err.message || 'Failed to delete', 'error');
          }
        });
      });

      // Pagination
      if (paginationWrapper && pages > 1 && !isCategoryFilter) {
        paginationWrapper.innerHTML = `
          <div class="d-flex justify-between items-center gap-md" style="margin: 20px auto; max-width: 400px;">
            <button class="btn btn--outline btn--sm" id="btn-notif-prev" ${currentPage <= 1 ? 'disabled' : ''}>
              &larr; Previous
            </button>
            <span class="text-xs font-semibold text-secondary">Page ${currentPage} of ${pages}</span>
            <button class="btn btn--outline btn--sm" id="btn-notif-next" ${currentPage >= pages ? 'disabled' : ''}>
              Next &rarr;
            </button>
          </div>
        `;
        paginationWrapper.classList.remove('d-none');

        document.getElementById('btn-notif-prev')?.addEventListener('click', () => {
          if (currentPage > 1) loadNotifications(currentPage - 1);
        });
        document.getElementById('btn-notif-next')?.addEventListener('click', () => {
          if (currentPage < pages) loadNotifications(currentPage + 1);
        });
      } else if (paginationWrapper) {
        paginationWrapper.classList.add('d-none');
      }
    } catch (err) {
      container.innerHTML = `
        <div class="card p-2xl text-center text-xs text-danger">
          Failed to load notification stream: ${err.message}
        </div>
      `;
    }
  }

  // Tab Filter Switching
  tabButtons.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('active'));
      tab.classList.add('active');
      activeFilter = tab.getAttribute('data-filter');
      loadNotifications(1);
    });
  });

  // Mark all as read
  if (markAllBtn) {
    markAllBtn.addEventListener('click', async () => {
      try {
        await markAllAsReadApi();
        showToast('All notifications marked as read', 'success');
        loadNotifications(currentPage);
      } catch (err) {
        showToast(err.message || 'Failed to mark all as read', 'error');
      }
    });
  }

  // Clear read notifications
  if (clearReadBtn) {
    clearReadBtn.addEventListener('click', async () => {
      if (!confirm('Clear all read notifications?')) return;
      try {
        await clearAllApi({ isRead: true });
        showToast('Cleared read notifications', 'info');
        loadNotifications(1);
      } catch (err) {
        showToast(err.message || 'Failed to clear read notifications', 'error');
      }
    });
  }

  // Real-time updates via Socket.IO
  socketService.initSocket();
  socketService.onNotification(() => {
    loadNotifications(currentPage);
  });
  socketService.onUnreadCount((count) => {
    if (unreadBadge) {
      unreadBadge.textContent = `${count} Unread`;
      unreadBadge.className = `badge ${count > 0 ? 'badge--primary' : 'badge--secondary'} font-bold`;
    }
  });

  await loadNotifications(1);
});

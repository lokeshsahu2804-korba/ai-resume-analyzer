/**
 * Topbar Notification Bell & Dropdown Component (components/notifications.js)
 * Manages unread badge counts, live Socket.IO alerts, dropdown popovers, and quick mark-as-read/delete actions.
 */

import { qs, renderIcons } from '../utils/dom.js';
import { authService } from '../services/auth.service.js';
import {
  getNotificationsApi,
  getUnreadCountApi,
  markAsReadApi,
  markAllAsReadApi,
  deleteNotificationApi
} from '../api/notification.api.js';
import { socketService } from '../services/socket.service.js';
import { showToast } from './toast.js';

export function getNotificationTypeMeta(type) {
  switch (type) {
    case 'application_submitted':
      return { icon: 'send', color: 'var(--color-primary-light)', bg: 'rgba(99, 102, 241, 0.15)', badge: 'Applied' };
    case 'application_status_changed':
      return { icon: 'layers', color: 'var(--color-warning)', bg: 'rgba(245, 158, 11, 0.15)', badge: 'Stage Update' };
    case 'interview_scheduled':
      return { icon: 'calendar', color: 'var(--color-info)', bg: 'rgba(59, 130, 246, 0.15)', badge: 'Interview' };
    case 'offer_received':
      return { icon: 'award', color: 'var(--color-success)', bg: 'rgba(16, 185, 129, 0.15)', badge: 'Offer' };
    case 'application_rejected':
      return { icon: 'x-circle', color: 'var(--color-danger)', bg: 'rgba(239, 68, 68, 0.15)', badge: 'Rejected' };
    case 'application_withdrawn':
      return { icon: 'archive', color: 'var(--color-secondary)', bg: 'rgba(148, 163, 184, 0.15)', badge: 'Withdrawn' };
    case 'resume_processed':
      return { icon: 'file-text', color: 'var(--color-accent-light)', bg: 'rgba(168, 85, 247, 0.15)', badge: 'Parsed' };
    case 'resume_processing_failed':
      return { icon: 'alert-triangle', color: 'var(--color-danger)', bg: 'rgba(239, 68, 68, 0.15)', badge: 'Error' };
    case 'analysis_complete':
      return { icon: 'sparkles', color: 'var(--color-success)', bg: 'rgba(16, 185, 129, 0.15)', badge: 'ATS Score' };
    case 'quota_warning':
      return { icon: 'alert-circle', color: 'var(--color-warning)', bg: 'rgba(245, 158, 11, 0.15)', badge: 'Quota' };
    case 'job_match':
      return { icon: 'briefcase', color: 'var(--color-primary-light)', bg: 'rgba(99, 102, 241, 0.15)', badge: 'Job Match' };
    case 'plan_updated':
      return { icon: 'credit-card', color: 'var(--color-accent-light)', bg: 'rgba(168, 85, 247, 0.15)', badge: 'Plan' };
    default:
      return { icon: 'bell', color: 'var(--color-primary-light)', bg: 'rgba(99, 102, 241, 0.15)', badge: 'Alert' };
  }
}

export function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export async function renderNotificationBell() {
  const user = authService.getUser();
  if (!user) return;

  const currentPath = window.location.pathname;
  const basePath = currentPath.includes('/admin/') ? '../../' : currentPath.includes('/pages/') ? '../' : './';

  // Mount into dedicated mount or find topbar actions area
  let mount = qs('#notification-mount');
  if (!mount) {
    const topbar = qs('.app-layout__topbar');
    if (topbar) {
      let actionsDiv = topbar.querySelector('.d-flex.items-center.gap-md:last-child');
      if (actionsDiv) {
        mount = document.createElement('div');
        mount.id = 'notification-mount';
        mount.className = 'notification-bell-container';
        actionsDiv.insertBefore(mount, actionsDiv.firstChild);
      }
    }
  }

  if (!mount) return;

  mount.innerHTML = `
    <div class="notification-wrapper" style="position: relative;">
      <button class="btn btn--ghost btn--sm notification-trigger" id="btn-notification-trigger" aria-label="Notifications" title="Notifications">
        <i data-lucide="bell" style="width: 18px; height: 18px;"></i>
        <span class="notification-badge d-none" id="nav-notification-badge">0</span>
      </button>

      <!-- Dropdown Popover -->
      <div class="notification-popover d-none" id="notification-popover">
        <div class="notification-popover__header">
          <div class="d-flex items-center gap-xs">
            <h4 class="font-bold text-sm">Notifications</h4>
            <span class="badge badge--primary text-xs" id="popover-unread-count-badge">0</span>
          </div>
          <button class="btn btn--ghost btn--xs text-xs" id="btn-popover-mark-all-read" title="Mark all as read">
            Mark all read
          </button>
        </div>

        <div class="notification-popover__body" id="popover-notifications-list">
          <div class="p-lg text-center text-xs text-muted">
            <div class="spinner spinner--sm mb-xs" style="margin: 0 auto;"></div>
            Loading alerts...
          </div>
        </div>

        <div class="notification-popover__footer">
          <a href="${basePath}pages/notifications.html" class="text-xs font-semibold text-primary">
            View All in Notification Center &rarr;
          </a>
        </div>
      </div>
    </div>
  `;

  renderIcons();

  const triggerBtn = qs('#btn-notification-trigger');
  const popover = qs('#notification-popover');
  const badgeEl = qs('#nav-notification-badge');
  const popoverBadgeEl = qs('#popover-unread-count-badge');
  const popoverList = qs('#popover-notifications-list');
  const markAllBtn = qs('#btn-popover-mark-all-read');

  let isPopoverOpen = false;

  function updateUnreadBadge(count) {
    const unread = Number(count) || 0;
    if (badgeEl) {
      badgeEl.textContent = unread > 99 ? '99+' : unread;
      if (unread > 0) {
        badgeEl.classList.remove('d-none');
      } else {
        badgeEl.classList.add('d-none');
      }
    }
    if (popoverBadgeEl) {
      popoverBadgeEl.textContent = unread;
    }
  }

  async function loadPopoverNotifications() {
    try {
      const res = await getNotificationsApi({ limit: 6, sort: '-createdAt' });
      const { notifications, unreadCount } = res?.data || {};

      updateUnreadBadge(unreadCount);

      if (!notifications || notifications.length === 0) {
        popoverList.innerHTML = `
          <div class="p-xl text-center text-xs text-muted">
            <i data-lucide="bell-off" style="width: 24px; height: 24px; margin: 0 auto 8px; color: var(--color-text-muted);"></i>
            <div>No notifications yet.</div>
          </div>
        `;
        renderIcons();
        return;
      }

      popoverList.innerHTML = notifications
        .map((n) => {
          const meta = getNotificationTypeMeta(n.type);
          const timeAgo = formatRelativeTime(n.createdAt);
          const isUnread = !n.isRead;

          return `
            <div class="notification-item ${isUnread ? 'notification-item--unread' : ''}" data-id="${n._id}">
              <div class="notification-item__icon" style="background: ${meta.bg}; color: ${meta.color};">
                <i data-lucide="${meta.icon}" style="width: 14px; height: 14px;"></i>
              </div>
              <div class="notification-item__content">
                <div class="d-flex justify-between items-center mb-2xs">
                  <span class="notification-item__title ${isUnread ? 'font-bold text-primary' : 'text-secondary'}">${n.title}</span>
                  <span class="notification-item__time">${timeAgo}</span>
                </div>
                <div class="notification-item__message">${n.message}</div>
              </div>
              <div class="notification-item__actions">
                ${
                  isUnread
                    ? `<button class="btn-item-mark-read" data-id="${n._id}" title="Mark as read"><i data-lucide="check" style="width:12px;height:12px;"></i></button>`
                    : ''
                }
                <button class="btn-item-delete" data-id="${n._id}" title="Delete"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button>
              </div>
            </div>
          `;
        })
        .join('');

      renderIcons();

      // Handlers for individual items
      popoverList.querySelectorAll('.notification-item').forEach((item) => {
        item.addEventListener('click', async (e) => {
          if (e.target.closest('.btn-item-delete') || e.target.closest('.btn-item-mark-read')) return;
          const nid = item.getAttribute('data-id');
          try {
            await markAsReadApi(nid);
            item.classList.remove('notification-item--unread');
            const unreadRes = await getUnreadCountApi();
            updateUnreadBadge(unreadRes?.data?.unreadCount || 0);
          } catch (err) {
            // Ignore non-critical click errors
          }
        });
      });

      popoverList.querySelectorAll('.btn-item-mark-read').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const nid = btn.getAttribute('data-id');
          try {
            await markAsReadApi(nid);
            const parent = btn.closest('.notification-item');
            if (parent) parent.classList.remove('notification-item--unread');
            btn.remove();
            const unreadRes = await getUnreadCountApi();
            updateUnreadBadge(unreadRes?.data?.unreadCount || 0);
          } catch (err) {
            showToast(err.message || 'Failed to mark as read', 'error');
          }
        });
      });

      popoverList.querySelectorAll('.btn-item-delete').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const nid = btn.getAttribute('data-id');
          try {
            await deleteNotificationApi(nid);
            const parent = btn.closest('.notification-item');
            if (parent) parent.remove();
            const unreadRes = await getUnreadCountApi();
            updateUnreadBadge(unreadRes?.data?.unreadCount || 0);
          } catch (err) {
            showToast(err.message || 'Failed to delete notification', 'error');
          }
        });
      });
    } catch (err) {
      popoverList.innerHTML = `
        <div class="p-lg text-center text-xs text-danger">
          Failed to load alerts.
        </div>
      `;
    }
  }

  // Toggle Popover
  if (triggerBtn && popover) {
    triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isPopoverOpen = !isPopoverOpen;
      if (isPopoverOpen) {
        popover.classList.remove('d-none');
        loadPopoverNotifications();
      } else {
        popover.classList.add('d-none');
      }
    });

    document.addEventListener('click', (e) => {
      if (isPopoverOpen && !popover.contains(e.target) && !triggerBtn.contains(e.target)) {
        isPopoverOpen = false;
        popover.classList.add('d-none');
      }
    });
  }

  // Mark all as read
  if (markAllBtn) {
    markAllBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await markAllAsReadApi();
        updateUnreadBadge(0);
        loadPopoverNotifications();
        showToast('All notifications marked as read', 'success');
      } catch (err) {
        showToast(err.message || 'Failed to mark all as read', 'error');
      }
    });
  }

  // Initial Unread Count Fetch
  try {
    const unreadRes = await getUnreadCountApi();
    updateUnreadBadge(unreadRes?.data?.unreadCount || 0);
  } catch (err) {
    // Non-critical background fetch
  }

  // Socket.IO Real-Time Alert Subscription
  socketService.initSocket();

  socketService.onNotification((notif) => {
    // Show toast for new live incoming alert
    showToast(notif.message, 'info', notif.title);

    // If popover is open, refresh popover list
    if (isPopoverOpen) {
      loadPopoverNotifications();
    }
  });

  socketService.onUnreadCount((count) => {
    updateUnreadBadge(count);
  });
}

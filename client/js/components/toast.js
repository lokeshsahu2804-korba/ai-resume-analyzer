/**
 * AI Resume Analyzer - Toast Notification System (toast.js)
 */

import { createElement, renderIcons } from '../utils/dom.js';

let toastContainer = null;

function ensureToastContainer() {
  if (!toastContainer) {
    toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = createElement('div', { id: 'toast-container' });
      document.body.appendChild(toastContainer);
    }
  }
  return toastContainer;
}

const ICONS = {
  success: 'check-circle-2',
  error: 'alert-circle',
  warning: 'alert-triangle',
  info: 'info'
};

/**
 * Displays a toast notification.
 * @param {string} message - Notification text
 * @param {'info'|'success'|'warning'|'error'} [type='info'] - Type
 * @param {string} [title=''] - Optional title
 * @param {number} [duration=4000] - Duration in ms
 */
export function showToast(message, type = 'info', title = '', duration = 4000) {
  const container = ensureToastContainer();
  const iconName = ICONS[type] || ICONS.info;

  const defaultTitles = {
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Information'
  };

  const toastTitle = title || defaultTitles[type] || 'Notice';

  const toast = createElement('div', { className: `toast toast--${type}` });
  toast.innerHTML = `
    <div class="toast__icon">
      <i data-lucide="${iconName}"></i>
    </div>
    <div class="toast__content">
      <div class="toast__title">${toastTitle}</div>
      <div class="toast__message">${message}</div>
    </div>
    <button class="toast__close" aria-label="Close notification">&times;</button>
  `;

  const closeBtn = toast.querySelector('.toast__close');
  closeBtn.addEventListener('click', () => dismissToast(toast));

  container.appendChild(toast);
  renderIcons();

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('toast--visible');
  });

  if (duration > 0) {
    setTimeout(() => {
      dismissToast(toast);
    }, duration);
  }

  return toast;
}

function dismissToast(toast) {
  toast.classList.remove('toast--visible');
  setTimeout(() => {
    if (toast.parentElement) {
      toast.parentElement.removeChild(toast);
    }
  }, 300);
}

// Attach to window for easy debugging & browser test access
if (typeof window !== 'undefined') {
  window.showToast = showToast;
}

/**
 * AI Resume Analyzer - Modal Dialog Controller (modal.js)
 */

import { qs, qsa, renderIcons } from '../utils/dom.js';

/**
 * Opens a modal dialog by its ID.
 * @param {string} modalId - The element ID of the modal backdrop or modal container
 */
export function openModal(modalId) {
  const modalEl = document.getElementById(modalId);
  if (!modalEl) {
    console.warn(`Modal with ID "${modalId}" not found.`);
    return;
  }

  modalEl.classList.add('active');
  modalEl.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  renderIcons();

  // Focus trap initiation: focus first input or close button
  const focusable = modalEl.querySelector('input, button, select, textarea');
  if (focusable) {
    focusable.focus();
  }
}

/**
 * Closes a modal dialog by its ID.
 * @param {string} modalId - The element ID of the modal backdrop or modal container
 */
export function closeModal(modalId) {
  const modalEl = document.getElementById(modalId);
  if (!modalEl) return;

  modalEl.classList.remove('active');
  modalEl.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/**
 * Initializes global modal event handlers (close buttons, backdrop click, Escape key).
 */
export function initModals() {
  // Close buttons with data-modal-close
  document.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('[data-modal-close]');
    if (closeBtn) {
      const modalBackdrop = closeBtn.closest('.modal-backdrop');
      if (modalBackdrop && modalBackdrop.id) {
        closeModal(modalBackdrop.id);
      }
    }

    // Modal open triggers with data-modal-target
    const openTrigger = e.target.closest('[data-modal-target]');
    if (openTrigger) {
      const targetId = openTrigger.getAttribute('data-modal-target');
      if (targetId) {
        openModal(targetId);
      }
    }

    // Backdrop click to close (when clicking directly on the backdrop, not modal window)
    if (e.target.classList.contains('modal-backdrop')) {
      closeModal(e.target.id);
    }
  });

  // ESC key to close any active modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const activeModals = qsa('.modal-backdrop.active');
      activeModals.forEach((modal) => closeModal(modal.id));
    }
  });
}

// Global window exposure
if (typeof window !== 'undefined') {
  window.openModal = openModal;
  window.closeModal = closeModal;
}

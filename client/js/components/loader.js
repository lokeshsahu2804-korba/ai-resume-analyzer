/**
 * AI Resume Analyzer - Loading & Skeleton Components (loader.js)
 */

import { createElement, renderIcons } from '../utils/dom.js';

/**
 * Inserts a loading spinner into a target element.
 * @param {HTMLElement|string} target - Target container or selector
 * @param {string} [message='Loading...'] - Optional loading text
 * @returns {HTMLElement} The created loader element
 */
export function showLoader(target, message = 'Loading...') {
  const container = typeof target === 'string' ? document.querySelector(target) : target;
  if (!container) return null;

  const loaderEl = createElement('div', { className: 'd-flex flex-col items-center justify-center gap-md py-xl loader-wrapper' });
  loaderEl.innerHTML = `
    <div class="spinner"></div>
    <span class="text-sm text-secondary">${message}</span>
  `;

  container.innerHTML = '';
  container.appendChild(loaderEl);
  return loaderEl;
}

/**
 * Removes loaders from the container.
 * @param {HTMLElement|string} target - Target container or selector
 */
export function hideLoader(target) {
  const container = typeof target === 'string' ? document.querySelector(target) : target;
  if (!container) return;

  const loader = container.querySelector('.loader-wrapper');
  if (loader) {
    loader.remove();
  }
}

/**
 * Generates an animated skeleton placeholder.
 * @param {'card'|'row'|'chart'} [type='card'] - Skeleton variant
 * @returns {string} HTML string of skeleton
 */
export function getSkeletonHtml(type = 'card') {
  if (type === 'row') {
    return `
      <div class="d-flex items-center gap-md py-md w-full">
        <div class="skeleton" style="width: 40px; height: 40px; border-radius: 50%;"></div>
        <div class="flex-1 d-flex flex-col gap-xs">
          <div class="skeleton" style="height: 14px; width: 60%;"></div>
          <div class="skeleton" style="height: 10px; width: 40%;"></div>
        </div>
        <div class="skeleton" style="height: 24px; width: 80px;"></div>
      </div>
    `;
  }

  if (type === 'chart') {
    return `
      <div class="card p-xl d-flex flex-col gap-lg">
        <div class="skeleton" style="height: 20px; width: 35%;"></div>
        <div class="skeleton" style="height: 220px; width: 100%;"></div>
      </div>
    `;
  }

  return `
    <div class="card p-xl d-flex flex-col gap-md">
      <div class="d-flex justify-between items-center">
        <div class="skeleton" style="height: 20px; width: 50%;"></div>
        <div class="skeleton" style="height: 24px; width: 60px; border-radius: 9999px;"></div>
      </div>
      <div class="skeleton" style="height: 14px; width: 90%;"></div>
      <div class="skeleton" style="height: 14px; width: 75%;"></div>
      <div class="skeleton mt-md" style="height: 36px; width: 100%;"></div>
    </div>
  `;
}

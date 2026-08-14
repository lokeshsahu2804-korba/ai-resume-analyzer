/**
 * AI Resume Analyzer - DOM Utilities (dom.js)
 * Safe DOM manipulation, event helpers, and XSS sanitization.
 */

/**
 * Escapes HTML characters in untrusted strings to prevent XSS attacks.
 * @param {string} str - Raw string
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Queries a single DOM element.
 * @param {string} selector - CSS selector
 * @param {HTMLElement|Document} [parent=document] - Scope
 * @returns {HTMLElement|null}
 */
export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * Queries all matching DOM elements.
 * @param {string} selector - CSS selector
 * @param {HTMLElement|Document} [parent=document] - Scope
 * @returns {HTMLElement[]}
 */
export function qsa(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

/**
 * Creates a DOM element with attributes and children.
 * @param {string} tag - Tag name
 * @param {Object} [attrs={}] - Attributes & dataset
 * @param {string|HTMLElement|(string|HTMLElement)[]} [children] - Content or child elements
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, children = null) {
  const el = document.createElement(tag);

  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'className' || key === 'class') {
      el.className = val;
    } else if (key === 'dataset') {
      Object.assign(el.dataset, val);
    } else if (key.startsWith('on') && typeof val === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), val);
    } else if (val !== false && val !== null && val !== undefined) {
      el.setAttribute(key, val);
    }
  }

  if (children !== null && children !== undefined) {
    const childArray = Array.isArray(children) ? children : [children];
    for (const child of childArray) {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else if (child instanceof HTMLElement || child instanceof SVGElement) {
        el.appendChild(child);
      }
    }
  }

  return el;
}

/**
 * Re-triggers Lucide Icon parsing across the document if Lucide library is present.
 */
export function renderIcons() {
  if (typeof window !== 'undefined' && window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

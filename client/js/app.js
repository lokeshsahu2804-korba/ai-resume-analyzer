/**
 * AI Resume Analyzer - Global App Entry Point (app.js)
 * Initializes global UI components, icon rendering, and modal controllers.
 */

import { renderNavbar } from './components/navbar.js';
import { renderSidebar } from './components/sidebar.js';
import { initModals } from './components/modal.js';
import { renderIcons } from './utils/dom.js';

document.addEventListener('DOMContentLoaded', () => {
  // Render layout mounts
  renderNavbar();
  renderSidebar();

  // Initialize modal event listeners
  initModals();

  // Initialize Lucide icons
  renderIcons();

  console.log('AI Resume Analyzer — Frontend Foundation Initialized');
});

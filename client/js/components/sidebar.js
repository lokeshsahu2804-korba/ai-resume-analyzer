/**
 * AI Resume Analyzer - Dashboard Sidebar Component (sidebar.js)
 */

import { qs, renderIcons } from '../utils/dom.js';

/**
 * Mounts the dashboard / admin sidebar into #sidebar-mount if present.
 * @param {Object} [options={}]
 * @param {boolean} [options.isAdmin=false] - Whether to render admin menu
 */
export function renderSidebar(options = {}) {
  const mount = qs('#sidebar-mount');
  if (!mount) return;

  const currentPath = window.location.pathname;
  const isAdmin = options.isAdmin || currentPath.includes('/admin/');
  const basePath = currentPath.includes('/admin/') ? '../../' : (currentPath.includes('/pages/') ? '../' : './');

  let navItemsHtml = '';

  if (isAdmin) {
    navItemsHtml = `
      <div class="sidebar__section-title">Admin Management</div>
      <a href="${basePath}pages/admin/dashboard.html" class="sidebar__link ${currentPath.includes('/admin/dashboard') ? 'active' : ''}">
        <i data-lucide="bar-chart-3"></i>
        <span>Platform Overview</span>
      </a>
      <a href="${basePath}pages/admin/users.html" class="sidebar__link ${currentPath.includes('/admin/users') ? 'active' : ''}">
        <i data-lucide="users"></i>
        <span>User Accounts</span>
      </a>
      <a href="${basePath}pages/admin/jobs.html" class="sidebar__link ${currentPath.includes('/admin/jobs') ? 'active' : ''}">
        <i data-lucide="briefcase"></i>
        <span>Job Database</span>
      </a>

      <div class="sidebar__section-title">User Area</div>
      <a href="${basePath}pages/dashboard.html" class="sidebar__link">
        <i data-lucide="layout-dashboard"></i>
        <span>User Dashboard</span>
      </a>
    `;
  } else {
    navItemsHtml = `
      <div class="sidebar__section-title">Resume & Analysis</div>
      <a href="${basePath}pages/dashboard.html" class="sidebar__link ${currentPath.includes('/dashboard') ? 'active' : ''}">
        <i data-lucide="layout-dashboard"></i>
        <span>Dashboard</span>
      </a>
      <a href="${basePath}pages/upload.html" class="sidebar__link ${currentPath.includes('/upload') ? 'active' : ''}">
        <i data-lucide="file-up"></i>
        <span>Upload Resume</span>
      </a>
      <a href="${basePath}pages/analysis.html" class="sidebar__link ${currentPath.includes('/analysis') ? 'active' : ''}">
        <i data-lucide="sparkles"></i>
        <span>Latest Analysis</span>
      </a>
      <a href="${basePath}pages/history.html" class="sidebar__link ${currentPath.includes('/history') ? 'active' : ''}">
        <i data-lucide="history"></i>
        <span>Analysis History</span>
      </a>

      <div class="sidebar__section-title">Jobs & Applications</div>
      <a href="${basePath}pages/jobs.html" class="sidebar__link ${currentPath.includes('/jobs.html') ? 'active' : ''}">
        <i data-lucide="briefcase"></i>
        <span>Matched Jobs</span>
        <span class="sidebar__badge">12</span>
      </a>
      <a href="${basePath}pages/saved-jobs.html" class="sidebar__link ${currentPath.includes('/saved-jobs') ? 'active' : ''}">
        <i data-lucide="bookmark"></i>
        <span>Saved Jobs</span>
      </a>
      <a href="${basePath}pages/applications.html" class="sidebar__link ${currentPath.includes('/applications') ? 'active' : ''}">
        <i data-lucide="list-todo"></i>
        <span>App Tracker</span>
      </a>

      <div class="sidebar__section-title">Account</div>
      <a href="${basePath}pages/pricing.html" class="sidebar__link ${currentPath.includes('/pricing') ? 'active' : ''}">
        <i data-lucide="credit-card"></i>
        <span>Pricing & Plans</span>
      </a>
      <a href="${basePath}pages/profile.html" class="sidebar__link ${currentPath.includes('/profile') ? 'active' : ''}">
        <i data-lucide="user"></i>
        <span>Profile</span>
      </a>
      <a href="${basePath}pages/settings.html" class="sidebar__link ${currentPath.includes('/settings') ? 'active' : ''}">
        <i data-lucide="settings"></i>
        <span>Settings</span>
      </a>
    `;
  }

  mount.innerHTML = `
    <aside class="app-layout__sidebar" id="app-sidebar">
      <div class="sidebar__header">
        <a href="${basePath}index.html" class="navbar__brand">
          <div class="navbar__logo-icon">
            <i data-lucide="file-check-2"></i>
          </div>
          <span class="navbar__brand-text">ResumeAI</span>
        </a>
      </div>

      <nav class="sidebar__nav" aria-label="Sidebar Navigation">
        ${navItemsHtml}
      </nav>

      <div class="sidebar__footer">
        <div class="sidebar__user-profile">
          <div class="sidebar__avatar">JD</div>
          <div class="sidebar__user-info">
            <div class="sidebar__user-name">John Doe</div>
            <div class="sidebar__user-plan">${isAdmin ? 'Platform Admin' : 'Free Tier'}</div>
          </div>
          <a href="${basePath}pages/login.html" title="Log Out" style="color: var(--color-text-muted);">
            <i data-lucide="log-out" style="width: 16px; height: 16px;"></i>
          </a>
        </div>
      </div>
    </aside>
  `;

  renderIcons();
}

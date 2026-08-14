/**
 * AI Resume Analyzer - Navigation Bar Component (navbar.js)
 */

import { qs, renderIcons } from '../utils/dom.js';

/**
 * Mounts the top navigation bar into #navbar-mount if present.
 * @param {Object} [options={}]
 * @param {'public'|'app'|'admin'} [options.type='public'] - Nav type
 */
export function renderNavbar(options = {}) {
  const mount = qs('#navbar-mount');
  if (!mount) return;

  const currentPath = window.location.pathname;
  const isApp = options.type === 'app' || currentPath.includes('/pages/dashboard') || currentPath.includes('/pages/analysis') || currentPath.includes('/pages/jobs') || currentPath.includes('/pages/upload');
  const isAdmin = options.type === 'admin' || currentPath.includes('/admin/');

  // Relative path resolution
  const basePath = currentPath.includes('/pages/') ? (currentPath.includes('/admin/') ? '../../' : '../') : './';

  let navLinksHtml = '';

  if (isAdmin) {
    navLinksHtml = `
      <ul class="navbar__links">
        <li><a href="${basePath}pages/admin/dashboard.html" class="navbar__link ${currentPath.includes('/admin/dashboard') ? 'active' : ''}">Overview</a></li>
        <li><a href="${basePath}pages/admin/users.html" class="navbar__link ${currentPath.includes('/admin/users') ? 'active' : ''}">Users</a></li>
        <li><a href="${basePath}pages/admin/jobs.html" class="navbar__link ${currentPath.includes('/admin/jobs') ? 'active' : ''}">Jobs</a></li>
        <li><a href="${basePath}pages/dashboard.html" class="navbar__link">User View</a></li>
      </ul>
    `;
  } else if (isApp) {
    navLinksHtml = `
      <ul class="navbar__links">
        <li><a href="${basePath}pages/dashboard.html" class="navbar__link ${currentPath.includes('/dashboard') ? 'active' : ''}"><i data-lucide="layout-dashboard"></i> Dashboard</a></li>
        <li><a href="${basePath}pages/upload.html" class="navbar__link ${currentPath.includes('/upload') ? 'active' : ''}"><i data-lucide="file-up"></i> Upload Resume</a></li>
        <li><a href="${basePath}pages/jobs.html" class="navbar__link ${currentPath.includes('/jobs') ? 'active' : ''}"><i data-lucide="briefcase"></i> Job Matcher</a></li>
        <li><a href="${basePath}pages/applications.html" class="navbar__link ${currentPath.includes('/applications') ? 'active' : ''}"><i data-lucide="list-todo"></i> Tracker</a></li>
      </ul>
    `;
  } else {
    navLinksHtml = `
      <ul class="navbar__links">
        <li><a href="${basePath}index.html" class="navbar__link ${currentPath.endsWith('index.html') || currentPath.endsWith('/') ? 'active' : ''}">Home</a></li>
        <li><a href="${basePath}index.html#features" class="navbar__link">Features</a></li>
        <li><a href="${basePath}pages/pricing.html" class="navbar__link ${currentPath.includes('/pricing') ? 'active' : ''}">Pricing</a></li>
      </ul>
    `;
  }

  let actionsHtml = '';
  if (isApp || isAdmin) {
    actionsHtml = `
      <div class="navbar__actions">
        <a href="${basePath}pages/pricing.html" class="badge badge--gradient" style="text-decoration:none; padding: 0.35rem 0.75rem;">
          <i data-lucide="sparkles" style="width:14px; height:14px;"></i> Pro Plan
        </a>
        <a href="${basePath}pages/profile.html" class="btn btn--outline btn--sm">Profile</a>
        <a href="${basePath}pages/login.html" class="btn btn--secondary btn--sm">Log Out</a>
      </div>
    `;
  } else {
    actionsHtml = `
      <div class="navbar__actions">
        <a href="${basePath}pages/login.html" class="btn btn--ghost btn--sm">Sign In</a>
        <a href="${basePath}pages/signup.html" class="btn btn--gradient btn--sm">Get Started</a>
      </div>
    `;
  }

  mount.innerHTML = `
    <nav class="navbar" aria-label="Main Navigation">
      <div class="container navbar__inner">
        <a href="${basePath}index.html" class="navbar__brand">
          <div class="navbar__logo-icon">
            <i data-lucide="file-check-2"></i>
          </div>
          <span class="navbar__brand-text">ResumeAI</span>
        </a>

        ${navLinksHtml}
        ${actionsHtml}

        <button class="navbar__toggle" id="navbar-mobile-toggle" aria-label="Toggle menu">
          <i data-lucide="menu"></i>
        </button>
      </div>
    </nav>
  `;

  // Setup mobile toggle
  const toggleBtn = qs('#navbar-mobile-toggle', mount);
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const links = qs('.navbar__links', mount);
      if (links) {
        links.classList.toggle('d-flex');
        links.classList.toggle('navbar__links--mobile');
      }
    });
  }

  renderIcons();
}

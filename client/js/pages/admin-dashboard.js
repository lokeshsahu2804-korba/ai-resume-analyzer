/**
 * Admin Dashboard Controller (pages/admin-dashboard.js)
 * Hydrates real-time platform metrics, system health diagnostics, application stage progress, and recent activity.
 */

import { authService } from '../services/auth.service.js';
import { getAdminStatsApi, getAdminHealthApi } from '../api/admin.api.js';
import { showToast } from '../components/toast.js';
import { renderIcons } from '../utils/dom.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Authorization Guard: Admin only
  const isAuth = await authService.requireAuthGuard();
  if (!isAuth) return;

  const user = authService.getUser();
  if (user?.role !== 'admin') {
    showToast('Admin access required', 'error');
    window.location.href = '../dashboard.html';
    return;
  }

  // Metric Elements
  const totalUsersEl = document.getElementById('metric-total-users');
  const usersBreakdownEl = document.getElementById('metric-users-breakdown');
  const totalResumesEl = document.getElementById('metric-total-resumes');
  const resumesParsedEl = document.getElementById('metric-resumes-parsed');
  const totalAnalysesEl = document.getElementById('metric-total-analyses');
  const activeJobsEl = document.getElementById('metric-active-jobs');
  const totalAppsEl = document.getElementById('metric-total-apps');

  // Health Elements
  const healthOverallBadge = document.getElementById('health-overall-badge');
  const expressStatusBadge = document.getElementById('health-express-status');
  const expressDetailsEl = document.getElementById('health-express-details');
  const mongoStatusBadge = document.getElementById('health-mongo-status');
  const mongoDetailsEl = document.getElementById('health-mongo-details');
  const fastapiStatusBadge = document.getElementById('health-fastapi-status');
  const fastapiDetailsEl = document.getElementById('health-fastapi-details');

  // Pipeline Elements
  const appsTotalBadge = document.getElementById('health-apps-total-badge');
  const stageAppliedCount = document.getElementById('stage-applied-count');
  const stageAppliedBar = document.getElementById('stage-applied-bar');
  const stageInterviewCount = document.getElementById('stage-interview-count');
  const stageInterviewBar = document.getElementById('stage-interview-bar');
  const stageOfferedCount = document.getElementById('stage-offered-count');
  const stageOfferedBar = document.getElementById('stage-offered-bar');
  const stageTerminalCount = document.getElementById('stage-terminal-count');
  const stageTerminalBar = document.getElementById('stage-terminal-bar');

  // Activity Table
  const activityBody = document.getElementById('admin-recent-activity-body');
  const refreshBtn = document.getElementById('btn-refresh-stats');

  async function loadDashboard() {
    try {
      // Fetch Stats and Health in parallel
      const [statsRes, healthRes] = await Promise.all([
        getAdminStatsApi(),
        getAdminHealthApi().catch(() => null)
      ]);

      const data = statsRes?.data || {};
      const overview = data.overview || {};
      const stages = data.applicationsByStage || {};
      const activity = data.recentActivity || {};

      // 1. Hydrate KPI Cards
      if (totalUsersEl) totalUsersEl.textContent = overview.totalUsers ?? 0;
      if (usersBreakdownEl) {
        usersBreakdownEl.textContent = `${overview.freeUsers ?? 0} Free • ${overview.premiumUsers ?? 0} Pro (${overview.adminUsers ?? 0} Admins)`;
      }
      if (totalResumesEl) totalResumesEl.textContent = overview.totalResumes ?? 0;
      if (resumesParsedEl) {
        resumesParsedEl.textContent = `${overview.parsedResumes ?? 0} parsed with structured entities`;
      }
      if (totalAnalysesEl) totalAnalysesEl.textContent = overview.resumesAnalyzed ?? 0;
      if (activeJobsEl) activeJobsEl.textContent = overview.activeJobs ?? 0;
      if (totalAppsEl) {
        totalAppsEl.textContent = `${overview.totalApplications ?? 0} applications logged`;
      }

      // 2. Hydrate Pipeline Progress
      const totalApps = overview.totalApplications || 0;
      if (appsTotalBadge) appsTotalBadge.textContent = `${totalApps} Submissions`;

      if (stageAppliedCount) stageAppliedCount.textContent = stages.applied ?? 0;
      if (stageAppliedBar) {
        const p = totalApps ? Math.round(((stages.applied || 0) / totalApps) * 100) : 0;
        stageAppliedBar.style.width = `${p}%`;
      }

      if (stageInterviewCount) stageInterviewCount.textContent = stages.interviewing ?? 0;
      if (stageInterviewBar) {
        const p = totalApps ? Math.round(((stages.interviewing || 0) / totalApps) * 100) : 0;
        stageInterviewBar.style.width = `${p}%`;
      }

      if (stageOfferedCount) stageOfferedCount.textContent = stages.offered ?? 0;
      if (stageOfferedBar) {
        const p = totalApps ? Math.round(((stages.offered || 0) / totalApps) * 100) : 0;
        stageOfferedBar.style.width = `${p}%`;
      }

      const terminalTotal = (stages.rejected || 0) + (stages.withdrawn || 0);
      if (stageTerminalCount) stageTerminalCount.textContent = terminalTotal;
      if (stageTerminalBar) {
        const p = totalApps ? Math.round((terminalTotal / totalApps) * 100) : 0;
        stageTerminalBar.style.width = `${p}%`;
      }

      // 3. Hydrate Health Status
      const health = healthRes?.data;
      if (health) {
        if (healthOverallBadge) {
          healthOverallBadge.textContent = health.overallStatus === 'healthy' ? 'Operational' : 'Degraded';
          healthOverallBadge.className = `badge ${health.overallStatus === 'healthy' ? 'badge--success' : 'badge--warning'} font-bold`;
        }

        if (expressDetailsEl && health.services?.express) {
          expressDetailsEl.textContent = `Port 5001 • Uptime: ${health.services.express.uptimeSeconds}s • RSS: ${health.services.express.memoryUsageMB}MB`;
        }

        if (mongoStatusBadge && health.services?.mongodb) {
          const m = health.services.mongodb;
          mongoStatusBadge.textContent = m.status === 'healthy' ? 'Connected' : 'Offline';
          mongoStatusBadge.className = `badge ${m.status === 'healthy' ? 'badge--success' : 'badge--danger'}`;
        }

        if (fastapiStatusBadge && health.services?.fastapi) {
          const f = health.services.fastapi;
          fastapiStatusBadge.textContent = f.status === 'healthy' ? 'Active' : 'Offline';
          fastapiStatusBadge.className = `badge ${f.status === 'healthy' ? 'badge--success' : 'badge--danger'}`;
        }
      }

      // 4. Hydrate Recent Activity
      if (activityBody) {
        const recentUsers = activity.recentUsers || [];
        const recentApps = activity.recentApplications || [];

        const combinedActivity = [
          ...recentUsers.map((u) => ({
            type: 'User Registered',
            badgeClass: 'badge--primary',
            user: u.name,
            email: u.email,
            details: `Plan: ${u.subscription?.plan?.toUpperCase() || 'FREE'} (${u.role})`,
            date: new Date(u.createdAt)
          })),
          ...recentApps.map((a) => ({
            type: 'Job Application',
            badgeClass: 'badge--info',
            user: a.userName,
            email: a.userEmail,
            details: `${a.jobTitle} at ${a.company} (Score: ${Math.round(a.matchScore || 0)}%)`,
            date: new Date(a.createdAt)
          }))
        ].sort((a, b) => b.date - a.date).slice(0, 8);

        if (combinedActivity.length === 0) {
          activityBody.innerHTML = '<tr><td colspan="4" class="text-center text-xs text-muted py-md">No recent platform activity recorded.</td></tr>';
        } else {
          activityBody.innerHTML = combinedActivity
            .map((item) => `
              <tr>
                <td><span class="badge ${item.badgeClass}">${item.type}</span></td>
                <td>
                  <div class="font-semibold text-primary">${item.user}</div>
                  <div class="text-xs text-muted">${item.email}</div>
                </td>
                <td class="text-xs text-secondary">${item.details}</td>
                <td class="text-xs text-muted">${item.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
              </tr>
            `)
            .join('');
        }
      }

      renderIcons();
    } catch (err) {
      showToast(err.message || 'Failed to load platform analytics', 'error');
    }
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      showToast('Refreshing platform metrics...', 'info');
      loadDashboard();
    });
  }

  await loadDashboard();
});

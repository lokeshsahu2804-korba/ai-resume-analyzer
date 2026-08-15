/**
 * User Dashboard Page Controller (pages/dashboard.js)
 * Hydrates user session details, monthly limits, latest ATS score, saved jobs count, application pipeline metrics, and top matched recommendations.
 */

import { authService } from '../services/auth.service.js';
import { getSubscriptionApi } from '../api/user.api.js';
import { getUserAnalysesApi } from '../api/analysis.api.js';
import { getRecommendedJobsApi } from '../api/jobMatching.api.js';
import { getSavedJobsApi } from '../api/savedJob.api.js';
import { getApplicationStatsApi } from '../api/application.api.js';
import { renderIcons } from '../utils/dom.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Enforce authentication guard
  const isAuthenticated = await authService.requireAuthGuard();
  if (!isAuthenticated) return;

  const user = authService.getUser();
  const greetingSpan = document.getElementById('dashboard-greeting-name');
  const monthlyLimitValue = document.getElementById('dashboard-monthly-limit-value');
  const monthlyLimitBadge = document.getElementById('dashboard-monthly-limit-badge');
  const atsScoreValue = document.getElementById('dashboard-ats-score-value');
  const atsScoreBadge = document.getElementById('dashboard-ats-score-badge');
  const savedJobsValue = document.getElementById('dashboard-saved-jobs-value');
  const savedJobsBadge = document.getElementById('dashboard-saved-jobs-badge');
  const activeAppsValue = document.getElementById('dashboard-active-apps-value');
  const activeAppsBadge = document.getElementById('dashboard-active-apps-badge');
  const topMatchesContainer = document.getElementById('dashboard-top-matches-container');
  const matchesSubtitle = document.getElementById('dashboard-matches-subtitle');
  const matchesViewAll = document.getElementById('dashboard-matches-view-all');

  // Hydrate User Greeting
  if (greetingSpan && user?.name) {
    const firstName = user.name.split(' ')[0];
    greetingSpan.textContent = firstName;
  }

  // Hydrate Monthly Limit Card from Subscription API
  try {
    const response = await getSubscriptionApi();
    const { usageLimits, plan } = response?.data || {};

    if (monthlyLimitValue && usageLimits) {
      const used = usageLimits.resumeAnalysesUsed || 0;
      const limit = plan === 'premium' ? '∞' : usageLimits.resumeAnalysesLimit || 3;
      monthlyLimitValue.innerHTML = `${used}<span class="text-sm text-muted">/${limit}</span>`;
    }

    if (monthlyLimitBadge) {
      if (plan === 'premium') {
        monthlyLimitBadge.textContent = 'Pro tier (Unlimited)';
        monthlyLimitBadge.className = 'badge badge--gradient';
      } else {
        monthlyLimitBadge.textContent = 'Free tier quota';
      }
    }
  } catch (err) {
    // Non-critical background metric fetch
  }

  // Hydrate Saved Jobs Metric Card
  try {
    const savedRes = await getSavedJobsApi(1, 1);
    const totalSaved = savedRes?.data?.total || 0;
    if (savedJobsValue) savedJobsValue.textContent = totalSaved;
    if (savedJobsBadge) savedJobsBadge.textContent = totalSaved === 1 ? '1 role bookmarked' : `${totalSaved} roles bookmarked`;
  } catch (err) {
    // Non-critical metric fetch
  }

  // Hydrate Active Applications Metric Card
  try {
    const statsRes = await getApplicationStatsApi();
    const stats = statsRes?.data?.stats;
    if (stats) {
      if (activeAppsValue) activeAppsValue.textContent = stats.active || 0;
      if (activeAppsBadge) {
        activeAppsBadge.textContent = stats.interviewing > 0
          ? `${stats.interviewing} in interview round`
          : `${stats.applied} submitted`;
      }
    }
  } catch (err) {
    // Non-critical metric fetch
  }

  // Hydrate Latest ATS Score Card from Analysis API
  try {
    const analysisRes = await getUserAnalysesApi(1, 1);
    const latestAnalysis = analysisRes?.data?.analyses?.[0];

    if (latestAnalysis && atsScoreValue) {
      const score = Math.round(latestAnalysis.atsScore?.overall || 0);
      atsScoreValue.innerHTML = `${score}<span class="text-sm text-muted">/100</span>`;

      if (atsScoreBadge) {
        if (score >= 80) {
          atsScoreBadge.className = 'badge badge--success';
          atsScoreBadge.textContent = 'High ATS Compatibility';
        } else if (score >= 60) {
          atsScoreBadge.className = 'badge badge--primary';
          atsScoreBadge.textContent = 'Good ATS Alignment';
        } else {
          atsScoreBadge.className = 'badge badge--warning';
          atsScoreBadge.textContent = 'Needs Optimization';
        }
      }
    }
  } catch (err) {
    // Non-critical background metric fetch
  }

  // Hydrate Top Matched Jobs from Recommendations API
  if (topMatchesContainer) {
    try {
      const recRes = await getRecommendedJobsApi({ limit: 3 });
      const { jobs, total, hasResume, activeResumeName } = recRes?.data || {};

      if (matchesSubtitle && activeResumeName) {
        matchesSubtitle.textContent = `Calibrated against ${activeResumeName}`;
      }
      if (matchesViewAll && total !== undefined) {
        matchesViewAll.textContent = `View all ${total} \u2192`;
      }

      if (!jobs || jobs.length === 0) {
        topMatchesContainer.innerHTML = `
          <div class="p-md text-center text-xs text-muted">
            ${hasResume ? 'No active jobs matched your criteria.' : 'Upload a resume to see personalized matched roles.'}
          </div>
        `;
      } else {
        topMatchesContainer.innerHTML = jobs
          .map((job) => {
            const score = job.matchScore !== null && job.matchScore !== undefined ? Math.round(job.matchScore) : null;
            let badgeClass = 'badge--secondary';
            if (score >= 85) badgeClass = 'badge--match';
            else if (score >= 70) badgeClass = 'badge--primary';
            else if (score >= 50) badgeClass = 'badge--warning';

            const badgeHtml = score !== null
              ? `<span class="badge ${badgeClass}">${score}% Match</span>`
              : `<span class="badge badge--secondary">Unrated</span>`;

            return `
              <a href="job-details.html?id=${job._id}" class="p-md d-flex justify-between items-center" style="background: rgba(255,255,255,0.02); border-radius: var(--radius-md); text-decoration: none; color: inherit; transition: background var(--transition-fast);">
                <div>
                  <div class="text-sm font-semibold text-primary">${job.title}</div>
                  <div class="text-xs text-muted">${job.company} • ${job.location}</div>
                </div>
                ${badgeHtml}
              </a>
            `;
          })
          .join('');
      }
      renderIcons();
    } catch (err) {
      topMatchesContainer.innerHTML = `
        <div class="p-md text-center text-xs text-muted">
          Explore open tech roles in our jobs directory.
        </div>
      `;
    }
  }
});

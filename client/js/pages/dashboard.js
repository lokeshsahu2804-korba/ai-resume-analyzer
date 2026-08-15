/**
 * User Dashboard Page Controller (pages/dashboard.js)
 * Applies authentication route guard and hydrates user session details, monthly limits, and latest ATS score.
 */

import { authService } from '../services/auth.service.js';
import { getSubscriptionApi } from '../api/user.api.js';
import { getUserAnalysesApi } from '../api/analysis.api.js';

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
});

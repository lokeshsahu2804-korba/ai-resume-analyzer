/**
 * User Dashboard Page Controller (pages/dashboard.js)
 * Applies authentication route guard and hydrates user session details and monthly limits.
 */

import { authService } from '../services/auth.service.js';
import { getSubscriptionApi } from '../api/user.api.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Enforce authentication guard
  const isAuthenticated = await authService.requireAuthGuard();
  if (!isAuthenticated) return;

  const user = authService.getUser();
  const greetingSpan = document.getElementById('dashboard-greeting-name');
  const monthlyLimitValue = document.getElementById('dashboard-monthly-limit-value');
  const monthlyLimitBadge = document.getElementById('dashboard-monthly-limit-badge');

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
});

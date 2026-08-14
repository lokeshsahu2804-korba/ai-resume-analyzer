/**
 * Account Settings Page Controller (pages/settings.js)
 * Manages password updates, subscription quota rendering, and account deletion.
 */

import { authService } from '../services/auth.service.js';
import { changePasswordApi, getSubscriptionApi, deleteAccountApi } from '../api/user.api.js';
import { showToast } from '../components/toast.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Enforce authentication guard
  const isAuthenticated = await authService.requireAuthGuard();
  if (!isAuthenticated) return;

  const passwordForm = document.getElementById('password-form');
  const currentPasswordInput = document.getElementById('current-password');
  const newPasswordInput = document.getElementById('new-password');
  const confirmNewPasswordInput = document.getElementById('confirm-new-password');
  const submitPasswordBtn = document.getElementById('btn-update-password');

  const subscriptionBadge = document.getElementById('subscription-plan-badge');
  const quotaText = document.getElementById('quota-text');
  const quotaProgressBar = document.getElementById('quota-progress-bar');
  const btnDeleteAccount = document.getElementById('btn-delete-account');

  // Load and render subscription / quota metrics
  async function loadSubscriptionData() {
    try {
      const response = await getSubscriptionApi();
      const { subscription, usageLimits, plan } = response?.data || {};

      const isPremium = plan === 'premium' || subscription?.plan === 'premium';
      if (subscriptionBadge) {
        subscriptionBadge.textContent = isPremium ? 'Pro Member' : 'Free Plan';
        subscriptionBadge.className = `badge ${isPremium ? 'badge--gradient' : 'badge--primary'}`;
      }

      if (usageLimits && quotaText && quotaProgressBar) {
        const used = usageLimits.resumeAnalysesUsed || 0;
        const limit = isPremium ? 'Unlimited' : usageLimits.resumeAnalysesLimit || 3;
        const remaining = isPremium ? 'Unlimited' : Math.max(0, limit - used);

        quotaText.textContent = isPremium
          ? `${used} analyses used (Unlimited Pro tier)`
          : `${remaining} of ${limit} remaining`;

        const percentage = isPremium ? 100 : Math.min(100, Math.round((used / limit) * 100));
        quotaProgressBar.style.width = `${percentage}%`;
      }
    } catch (err) {
      // Non-critical diagnostic error
    }
  }

  await loadSubscriptionData();

  // Handle Password Update Form
  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const currentPassword = currentPasswordInput?.value;
      const newPassword = newPasswordInput?.value;
      const confirmNewPassword = confirmNewPasswordInput?.value;

      if (!currentPassword || !newPassword || !confirmNewPassword) {
        showToast('Please fill in all password fields', 'warning');
        return;
      }

      if (newPassword.length < 8) {
        showToast('New password must be at least 8 characters long', 'warning');
        return;
      }

      if (newPassword !== confirmNewPassword) {
        showToast('New passwords do not match. Please verify.', 'error');
        confirmNewPasswordInput?.focus();
        return;
      }

      const originalText = submitPasswordBtn ? submitPasswordBtn.innerHTML : 'Update Password';
      if (submitPasswordBtn) {
        submitPasswordBtn.disabled = true;
        submitPasswordBtn.innerHTML = '<span class="spinner spinner--sm"></span> Updating...';
      }

      try {
        await changePasswordApi({ currentPassword, newPassword });
        showToast('Password updated successfully!', 'success');
        passwordForm.reset();
      } catch (err) {
        showToast(err.message || 'Failed to update password', 'error');
      } finally {
        if (submitPasswordBtn) {
          submitPasswordBtn.disabled = false;
          submitPasswordBtn.innerHTML = originalText;
        }
      }
    });
  }

  // Handle Account Deletion
  if (btnDeleteAccount) {
    btnDeleteAccount.addEventListener('click', async () => {
      const confirmed = window.confirm(
        'Are you sure you want to permanently delete your account? This action cannot be undone.'
      );

      if (!confirmed) return;

      try {
        await deleteAccountApi();
        showToast('Your account has been deleted successfully.', 'info');
        setTimeout(() => {
          window.location.href = 'signup.html';
        }, 600);
      } catch (err) {
        showToast(err.message || 'Failed to delete account', 'error');
      }
    });
  }
});

/**
 * User Profile Page Controller (pages/profile.js)
 * Pre-fills user profile form from database and handles live updates.
 */

import { authService } from '../services/auth.service.js';
import { getProfileApi, updateProfileApi } from '../api/user.api.js';
import { showToast } from '../components/toast.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Enforce authentication guard
  const isAuthenticated = await authService.requireAuthGuard();
  if (!isAuthenticated) return;

  const profileForm = document.getElementById('profile-form');
  const nameInput = document.getElementById('profile-name');
  const emailInput = document.getElementById('profile-email');
  const phoneInput = document.getElementById('profile-phone');
  const locationInput = document.getElementById('profile-location');
  const bioInput = document.getElementById('profile-bio');
  const linkedinInput = document.getElementById('profile-linkedin');
  const githubInput = document.getElementById('profile-github');
  const portfolioInput = document.getElementById('profile-portfolio');
  const submitBtn = document.getElementById('btn-save-profile');

  const profileHeaderName = document.getElementById('profile-header-name');
  const profileHeaderSubtitle = document.getElementById('profile-header-subtitle');
  const profileHeaderAvatar = document.getElementById('profile-header-avatar');

  // Load and pre-fill profile data from API
  async function loadProfile() {
    try {
      const response = await getProfileApi();
      const user = response?.data?.user;
      if (!user) return;

      // Update Form Fields
      if (nameInput) nameInput.value = user.name || '';
      if (emailInput) emailInput.value = user.email || '';
      if (phoneInput) phoneInput.value = user.profile?.phone || '';
      if (locationInput) locationInput.value = user.profile?.location || '';
      if (bioInput) bioInput.value = user.profile?.bio || '';
      if (linkedinInput) linkedinInput.value = user.profile?.linkedin || '';
      if (githubInput) githubInput.value = user.profile?.github || '';
      if (portfolioInput) portfolioInput.value = user.profile?.portfolio || '';

      // Update Header Card
      const initials = (user.name || 'User')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

      if (profileHeaderAvatar) profileHeaderAvatar.textContent = initials;
      if (profileHeaderName) profileHeaderName.textContent = user.name || 'User';
      if (profileHeaderSubtitle) {
        const roleText = user.role === 'admin' ? 'Platform Admin' : user.plan === 'premium' ? 'Pro Member' : 'Free Member';
        const locText = user.profile?.location ? ` • ${user.profile.location}` : '';
        profileHeaderSubtitle.textContent = `${roleText}${locText}`;
      }
    } catch (err) {
      showToast('Failed to load user profile details', 'error');
    }
  }

  await loadProfile();

  // Handle Form Submission
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const payload = {
        name: nameInput?.value.trim(),
        phone: phoneInput?.value.trim(),
        location: locationInput?.value.trim(),
        bio: bioInput?.value.trim(),
        linkedin: linkedinInput?.value.trim(),
        github: githubInput?.value.trim(),
        portfolio: portfolioInput?.value.trim()
      };

      const originalText = submitBtn ? submitBtn.innerHTML : 'Save Changes';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner spinner--sm"></span> Saving...';
      }

      try {
        const response = await updateProfileApi(payload);
        const updatedUser = response?.data?.user;

        showToast('Profile updated successfully!', 'success');
        authService.user = updatedUser;
        authService.notify();

        // Refresh Header Card
        await loadProfile();
      } catch (err) {
        showToast(err.message || 'Failed to update profile', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }
      }
    });
  }
});

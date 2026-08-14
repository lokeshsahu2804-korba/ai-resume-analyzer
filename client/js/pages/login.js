/**
 * Login Page Controller (pages/login.js)
 * Handles user login form validation, loading states, and redirection.
 */

import { authService } from '../services/auth.service.js';
import { showToast } from '../components/toast.js';

document.addEventListener('DOMContentLoaded', async () => {
  // If already logged in, redirect straight to dashboard
  const alreadyAuth = await authService.redirectIfAuthenticated();
  if (alreadyAuth) return;

  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const submitBtn = document.getElementById('btn-login');

  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showToast('Please enter both email and password', 'warning');
      return;
    }

    // Set loading state
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner spinner--sm"></span> Signing In...';

    try {
      await authService.login(email, password);
      showToast('Signed in successfully!', 'success');

      // Determine redirect destination
      const urlParams = new URLSearchParams(window.location.search);
      const returnUrl = urlParams.get('returnUrl');
      const destination = returnUrl ? decodeURIComponent(returnUrl) : 'dashboard.html';

      setTimeout(() => {
        window.location.href = destination;
      }, 500);
    } catch (err) {
      showToast(err.message || 'Failed to sign in. Please check your credentials.', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
});

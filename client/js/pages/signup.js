/**
 * Signup Page Controller (pages/signup.js)
 * Handles account registration, password confirmation matching, and strength meter.
 */

import { authService } from '../services/auth.service.js';
import { showToast } from '../components/toast.js';

document.addEventListener('DOMContentLoaded', async () => {
  // If already logged in, redirect to dashboard
  const alreadyAuth = await authService.redirectIfAuthenticated();
  if (alreadyAuth) return;

  const signupForm = document.getElementById('signup-form');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const submitBtn = document.getElementById('btn-signup');

  if (!signupForm) return;

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!name || !email || !password) {
      showToast('Please fill in all required fields', 'warning');
      return;
    }

    if (password.length < 8) {
      showToast('Password must be at least 8 characters long', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match. Please verify.', 'error');
      confirmPasswordInput.focus();
      return;
    }

    // Set loading state
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner spinner--sm"></span> Creating Account...';

    try {
      await authService.signup(name, email, password);
      showToast('Account created successfully! Welcome to ResumeAI.', 'success');

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);
    } catch (err) {
      showToast(err.message || 'Failed to create account. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
});

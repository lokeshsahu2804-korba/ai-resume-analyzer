/**
 * Frontend Authentication Service (services/auth.service.js)
 * Manages user session state, login/signup/logout actions, and page route guards.
 */

import { signupApi, loginApi, logoutApi, getMeApi } from '../api/auth.api.js';

class AuthService {
  constructor() {
    this.user = null;
    this.isInitialized = false;
    this.listeners = [];
  }

  /**
   * Subscribe to auth state changes
   * @param {Function} callback - (user) => void
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  notify() {
    this.listeners.forEach((cb) => cb(this.user));
  }

  /**
   * Restores user session from httpOnly cookie on initial page load.
   */
  async initAuth() {
    if (this.isInitialized) return this.user;

    try {
      const response = await getMeApi();
      this.user = response?.data?.user || null;
    } catch (err) {
      this.user = null;
    } finally {
      this.isInitialized = true;
      this.notify();
    }

    return this.user;
  }

  isAuthenticated() {
    return !!this.user;
  }

  getUser() {
    return this.user;
  }

  isAdmin() {
    return this.user?.role === 'admin';
  }

  isPremium() {
    return this.user?.plan === 'premium' || this.user?.role === 'admin';
  }

  async signup(name, email, password) {
    const response = await signupApi({ name, email, password });
    this.user = response?.data?.user || null;
    this.notify();
    return this.user;
  }

  async login(email, password) {
    const response = await loginApi({ email, password });
    this.user = response?.data?.user || null;
    this.notify();
    return this.user;
  }

  async logout() {
    try {
      await logoutApi();
    } finally {
      this.user = null;
      this.notify();
      window.location.href = window.location.pathname.includes('/pages/')
        ? 'login.html'
        : 'pages/login.html';
    }
  }

  /**
   * Route Guard: Redirect to login if user is not authenticated.
   */
  async requireAuthGuard() {
    await this.initAuth();
    if (!this.isAuthenticated()) {
      const currentPath = encodeURIComponent(window.location.pathname);
      const loginUrl = window.location.pathname.includes('/pages/')
        ? `login.html?returnUrl=${currentPath}`
        : `pages/login.html?returnUrl=${currentPath}`;
      window.location.href = loginUrl;
      return false;
    }
    return true;
  }

  /**
   * Route Guard: Redirect to dashboard if user is already logged in.
   */
  async redirectIfAuthenticated() {
    await this.initAuth();
    if (this.isAuthenticated()) {
      const dashboardUrl = window.location.pathname.includes('/pages/')
        ? 'dashboard.html'
        : 'pages/dashboard.html';
      window.location.href = dashboardUrl;
      return true;
    }
    return false;
  }
}

export const authService = new AuthService();

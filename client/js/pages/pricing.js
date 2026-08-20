/**
 * Pricing Page Controller (pages/pricing.js)
 * Manages subscription lifecycle states, expiration warnings, renewal extensions, cancellation, and transaction history.
 */

import { authService } from '../services/auth.service.js';
import { createOrderApi, verifyPaymentApi, getPaymentsApi, cancelSubscriptionApi } from '../api/payment.api.js';
import { getSubscriptionApi } from '../api/user.api.js';
import { showToast } from '../components/toast.js';
import { qs, renderIcons } from '../utils/dom.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await authService.initAuth();
  const ctaContainer = qs('#premium-cta-container');
  const userStatusBadge = qs('#user-current-plan-badge');
  const alertBanner = qs('#subscription-alert-banner');
  const historySection = qs('#payment-history-section');
  const historyList = qs('#payment-history-list');

  let isProcessingPayment = false;

  async function checkSubscriptionState() {
    if (!user) {
      renderUnauthenticatedState();
      return;
    }

    try {
      const data = await getSubscriptionApi();
      const sub = data?.data?.subscription || {};
      const plan = data?.data?.plan || sub.plan || 'free';
      const now = new Date();
      const hasValidEnd = sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > now;
      const isExpired = sub.status === 'expired' || (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) <= now);
      const isCancelled = sub.status === 'cancelled' && hasValidEnd;
      const isActive = (plan === 'premium' || sub.plan === 'premium') && sub.status === 'active' && hasValidEnd;

      if (isActive) {
        renderActivePremiumState(sub);
      } else if (isCancelled) {
        renderCancelledState(sub);
      } else if (isExpired && sub.currentPeriodEnd) {
        renderExpiredState(sub);
      } else {
        renderEligibleUpgradeState();
      }

      loadPaymentHistory();
    } catch (err) {
      console.warn('Subscription fetch notice:', err.message);
      renderEligibleUpgradeState();
    }
  }

  function renderUnauthenticatedState() {
    if (alertBanner) alertBanner.innerHTML = '';
    if (ctaContainer) {
      ctaContainer.innerHTML = `
        <a href="login.html?redirect=pricing.html" class="btn btn--gradient btn--lg w-full text-center">
          <i data-lucide="lock"></i> Login to Upgrade (₹499)
        </a>
      `;
      renderIcons();
    }
  }

  function renderActivePremiumState(sub) {
    const periodEndDate = new Date(sub.currentPeriodEnd);
    const periodEndStr = periodEndDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const daysRemaining = Math.max(0, Math.ceil((periodEndDate - Date.now()) / (1000 * 60 * 60 * 24)));
    const isExpiringSoon = daysRemaining <= 3;

    if (userStatusBadge) {
      userStatusBadge.textContent = isExpiringSoon ? `Expiring in ${daysRemaining}d` : `Active Pro (${daysRemaining}d left)`;
      userStatusBadge.className = isExpiringSoon ? 'badge badge--warning font-bold' : 'badge badge--gradient font-bold';
    }

    if (alertBanner) {
      if (isExpiringSoon) {
        alertBanner.innerHTML = `
          <div class="p-md mb-xl" style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-md);">
            <div class="d-flex items-center gap-xs text-sm font-bold" style="color: #f59e0b;">
              <i data-lucide="alert-triangle" style="width: 18px; height: 18px;"></i>
              Your Premium Pro access expires in ${daysRemaining} day(s) on ${periodEndStr}.
            </div>
            <p class="text-xs text-muted mt-2xs">Extend your subscription now to maintain uninterrupted unlimited AI resume analyses and matching.</p>
          </div>
        `;
      } else {
        alertBanner.innerHTML = '';
      }
    }

    if (ctaContainer) {
      ctaContainer.innerHTML = `
        <div class="p-md text-center mb-md" style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-md);">
          <div class="d-flex items-center justify-center gap-xs text-sm font-bold text-success mb-2xs">
            <i data-lucide="check-circle" style="width: 18px; height: 18px;"></i>
            Active Premium Pro Access
          </div>
          <p class="text-xs text-muted">Unlimited analyses active through ${periodEndStr} (${daysRemaining} days left)</p>
        </div>
        <div class="d-flex flex-col gap-sm">
          <button class="btn btn--gradient btn--lg w-full text-center" id="btn-upgrade-premium">
            <i data-lucide="sparkles"></i> Extend Access (+30 Days) (₹499)
          </button>
          <button class="btn btn--outline btn--sm w-full text-center" id="btn-cancel-subscription" style="color: var(--color-muted); border-color: rgba(255,255,255,0.1);">
            <i data-lucide="x-circle"></i> Cancel Subscription
          </button>
        </div>
      `;
      renderIcons();

      const upgradeBtn = qs('#btn-upgrade-premium');
      if (upgradeBtn) upgradeBtn.addEventListener('click', handleUpgradeClick);

      const cancelBtn = qs('#btn-cancel-subscription');
      if (cancelBtn) cancelBtn.addEventListener('click', handleCancelClick);
    }
  }

  function renderCancelledState(sub) {
    const periodEndStr = sub.currentPeriodEnd
      ? new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      : 'the end of billing cycle';

    if (userStatusBadge) {
      userStatusBadge.textContent = 'Cancelled';
      userStatusBadge.className = 'badge badge--secondary font-bold';
    }

    if (alertBanner) {
      alertBanner.innerHTML = `
        <div class="p-md mb-xl" style="background: rgba(148, 163, 184, 0.1); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: var(--radius-md);">
          <div class="d-flex items-center gap-xs text-sm font-bold text-secondary">
            <i data-lucide="info" style="width: 18px; height: 18px;"></i>
            Subscription cancellation registered.
          </div>
          <p class="text-xs text-muted mt-2xs">You retain full Premium Pro access with unlimited analyses until ${periodEndStr}.</p>
        </div>
      `;
    }

    if (ctaContainer) {
      ctaContainer.innerHTML = `
        <button class="btn btn--gradient btn--lg w-full text-center" id="btn-upgrade-premium">
          <i data-lucide="refresh-cw"></i> Re-Activate / Extend (+30 Days) (₹499)
        </button>
      `;
      renderIcons();

      const upgradeBtn = qs('#btn-upgrade-premium');
      if (upgradeBtn) upgradeBtn.addEventListener('click', handleUpgradeClick);
    }
  }

  function renderExpiredState(sub) {
    const expiredDateStr = new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    if (userStatusBadge) {
      userStatusBadge.textContent = 'Expired';
      userStatusBadge.className = 'badge badge--danger font-bold';
    }

    if (alertBanner) {
      alertBanner.innerHTML = `
        <div class="p-md mb-xl" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-md);">
          <div class="d-flex items-center gap-xs text-sm font-bold text-danger">
            <i data-lucide="alert-circle" style="width: 18px; height: 18px;"></i>
            Your Premium Pro access expired on ${expiredDateStr}.
          </div>
          <p class="text-xs text-muted mt-2xs">Renew now to unlock unlimited AI ATS analyses, bullet point suggestions, and matching.</p>
        </div>
      `;
    }

    if (ctaContainer) {
      ctaContainer.innerHTML = `
        <button class="btn btn--gradient btn--lg w-full text-center" id="btn-upgrade-premium">
          <i data-lucide="sparkles"></i> Renew Premium (₹499)
        </button>
      `;
      renderIcons();

      const upgradeBtn = qs('#btn-upgrade-premium');
      if (upgradeBtn) upgradeBtn.addEventListener('click', handleUpgradeClick);
    }
  }

  function renderEligibleUpgradeState() {
    if (alertBanner) alertBanner.innerHTML = '';
    if (userStatusBadge) {
      userStatusBadge.textContent = 'Most Popular';
      userStatusBadge.className = 'badge badge--gradient';
    }

    if (ctaContainer) {
      ctaContainer.innerHTML = `
        <button class="btn btn--gradient btn--lg w-full text-center" id="btn-upgrade-premium">
          <i data-lucide="sparkles"></i> Upgrade to Premium (₹499)
        </button>
      `;
      renderIcons();

      const upgradeBtn = qs('#btn-upgrade-premium');
      if (upgradeBtn) upgradeBtn.addEventListener('click', handleUpgradeClick);
    }
  }

  async function handleCancelClick() {
    if (!confirm('Are you sure you want to cancel your Premium subscription? You will retain unlimited access until the end of your current 30-day period.')) {
      return;
    }

    try {
      const res = await cancelSubscriptionApi();
      if (res?.success) {
        showToast(res.message || 'Subscription cancelled. Access remains active until billing period ends.', 'success', 'Cancellation Confirmed');
        await checkSubscriptionState();
      } else {
        throw new Error(res?.message || 'Cancellation failed');
      }
    } catch (err) {
      showToast(err.message || 'Could not cancel subscription', 'error');
    }
  }

  async function handleUpgradeClick() {
    if (isProcessingPayment) return;

    const currentUser = authService.getUser();
    if (!currentUser) {
      window.location.href = 'login.html?redirect=pricing.html';
      return;
    }

    const upgradeBtn = qs('#btn-upgrade-premium');
    if (upgradeBtn) {
      upgradeBtn.disabled = true;
      upgradeBtn.innerHTML = `<div class="spinner spinner--xs"></div> Initializing Razorpay Checkout...`;
    }

    isProcessingPayment = true;

    try {
      // 1. Request Server to Create Order
      const orderRes = await createOrderApi('premium');
      const orderData = orderRes?.data;

      if (!orderData || !orderData.orderId) {
        throw new Error(orderRes?.message || 'Failed to initialize payment order');
      }

      // Check if Razorpay script is loaded
      if (typeof Razorpay === 'undefined') {
        throw new Error('Razorpay Checkout SDK is loading. Please check your internet connection.');
      }

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount, // in paise
        currency: orderData.currency || 'INR',
        name: 'ResumeAI Platform',
        description: 'Premium Pro 30-Day Unlimited Access',
        order_id: orderData.orderId,
        prefill: {
          name: currentUser.name || '',
          email: currentUser.email || ''
        },
        theme: {
          color: '#6366f1'
        },
        handler: async function (response) {
          if (upgradeBtn) {
            upgradeBtn.innerHTML = `<div class="spinner spinner--xs"></div> Verifying Payment...`;
          }

          try {
            // 3. Cryptographically Verify Signature on Backend
            const verifyRes = await verifyPaymentApi({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });

            if (verifyRes?.success) {
              showToast('Payment verified! Premium Pro is active.', 'success', 'Payment Successful');
              
              // Update user object locally
              if (verifyRes.data?.user) {
                authService.updateUser(verifyRes.data.user);
              }

              // Re-check state from server
              await checkSubscriptionState();
              loadPaymentHistory();
            } else {
              throw new Error(verifyRes?.message || 'Payment verification failed');
            }
          } catch (vErr) {
            showToast(vErr.message || 'Signature verification failed. Please contact support.', 'error');
            await checkSubscriptionState();
          } finally {
            isProcessingPayment = false;
          }
        },
        modal: {
          ondismiss: function () {
            isProcessingPayment = false;
            checkSubscriptionState();
            showToast('Payment checkout was cancelled.', 'info');
          }
        }
      };

      const rzpModal = new Razorpay(options);
      rzpModal.on('payment.failed', function (resp) {
        showToast(resp.error?.description || 'Payment transaction failed', 'error');
        isProcessingPayment = false;
        checkSubscriptionState();
      });

      rzpModal.open();
    } catch (err) {
      showToast(err.message || 'Could not initiate checkout', 'error');
      isProcessingPayment = false;
      await checkSubscriptionState();
    }
  }

  async function loadPaymentHistory() {
    if (!historySection || !historyList) return;

    try {
      const res = await getPaymentsApi({ limit: 5 });
      const payments = res?.data?.payments || [];

      if (payments.length === 0) {
        historySection.classList.add('d-none');
        return;
      }

      historySection.classList.remove('d-none');
      historyList.innerHTML = payments
        .map((p) => {
          const date = new Date(p.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
          const amountINR = (p.amount / 100).toFixed(0);
          const isPaid = p.status === 'paid';
          const badgeClass = isPaid ? 'badge--success' : p.status === 'refunded' ? 'badge--secondary' : 'badge--danger';

          return `
            <tr>
              <td class="font-mono text-xs">${date}</td>
              <td class="font-bold text-sm">₹${amountINR}</td>
              <td><span class="badge ${badgeClass} text-xs">${p.status.toUpperCase()}</span></td>
              <td class="font-mono text-xs text-muted">${p.razorpayPaymentId || p.razorpayOrderId}</td>
            </tr>
          `;
        })
        .join('');
    } catch (err) {
      // Non-critical background fetch
    }
  }

  await checkSubscriptionState();
});

/**
 * Pricing Page Controller (pages/pricing.js)
 * Manages subscription status display, Razorpay checkout modal lifecycle, payment verification, and transaction history.
 */

import { authService } from '../services/auth.service.js';
import { createOrderApi, verifyPaymentApi, getPaymentsApi } from '../api/payment.api.js';
import { showToast } from '../components/toast.js';
import { qs, renderIcons } from '../utils/dom.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = authService.getUser();
  const ctaContainer = qs('#premium-cta-container');
  const userStatusBadge = qs('#user-current-plan-badge');
  const historySection = qs('#payment-history-section');
  const historyList = qs('#payment-history-list');

  let isProcessingPayment = false;

  async function checkSubscriptionState() {
    if (!user) {
      renderUnauthenticatedState();
      return;
    }

    try {
      const token = authService.getToken();
      const res = await fetch('/api/users/subscription', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      const sub = data?.data?.subscription || {};
      const isPremium = (sub.plan === 'premium' || data?.data?.plan === 'premium') && sub.status === 'active';

      if (isPremium) {
        renderActivePremiumState(sub);
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
    const periodEnd = sub.currentPeriodEnd
      ? new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      : 'Active';

    if (userStatusBadge) {
      userStatusBadge.textContent = 'Active Pro Plan';
      userStatusBadge.className = 'badge badge--gradient font-bold';
    }

    if (ctaContainer) {
      ctaContainer.innerHTML = `
        <div class="p-md text-center" style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-md);">
          <div class="d-flex items-center justify-center gap-xs text-sm font-bold text-success mb-2xs">
            <i data-lucide="check-circle" style="width: 18px; height: 18px;"></i>
            Active Premium Pro Access
          </div>
          <p class="text-xs text-muted">Unlimited AI analysis active through ${periodEnd}</p>
        </div>
      `;
      renderIcons();
    }
  }

  function renderEligibleUpgradeState() {
    if (ctaContainer) {
      ctaContainer.innerHTML = `
        <button class="btn btn--gradient btn--lg w-full text-center" id="btn-upgrade-premium">
          <i data-lucide="sparkles"></i> Upgrade to Premium (₹499)
        </button>
      `;
      renderIcons();

      const upgradeBtn = qs('#btn-upgrade-premium');
      if (upgradeBtn) {
        upgradeBtn.addEventListener('click', handleUpgradeClick);
      }
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
              showToast('Payment verified! Welcome to Premium Pro.', 'success', 'Upgrade Complete');
              
              // Update user object locally
              if (verifyRes.data?.user) {
                authService.updateUser(verifyRes.data.user);
              }

              // Re-render active state
              renderActivePremiumState(verifyRes.data?.subscription || { plan: 'premium', status: 'active' });
              loadPaymentHistory();
            } else {
              throw new Error(verifyRes?.message || 'Payment verification failed');
            }
          } catch (vErr) {
            showToast(vErr.message || 'Signature verification failed. Please contact support.', 'error');
            renderEligibleUpgradeState();
          } finally {
            isProcessingPayment = false;
          }
        },
        modal: {
          ondismiss: function () {
            isProcessingPayment = false;
            renderEligibleUpgradeState();
            showToast('Payment checkout was cancelled.', 'info');
          }
        }
      };

      const rzpModal = new Razorpay(options);
      rzpModal.on('payment.failed', function (resp) {
        showToast(resp.error?.description || 'Payment transaction failed', 'error');
        isProcessingPayment = false;
        renderEligibleUpgradeState();
      });

      rzpModal.open();
    } catch (err) {
      showToast(err.message || 'Could not initiate checkout', 'error');
      isProcessingPayment = false;
      renderEligibleUpgradeState();
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

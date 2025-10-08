import React, { useEffect, useRef, useState, useCallback } from 'react';

interface StartupSubscriptionStepProps {
  userEmail: string;
  onSuccess: () => void;
  onBack: () => void;
  razorpayCustomerId?: string; // optional; pass if you already have it
  subscriptionButtonId: string; // Razorpay Subscription Button ID
}

const StartupSubscriptionStep: React.FC<StartupSubscriptionStepProps> = ({
  userEmail,
  onSuccess,
  onBack,
  razorpayCustomerId,
  subscriptionButtonId
}) => {
  const [isCleaning, setIsCleaning] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [hasCheckedStatus, setHasCheckedStatus] = useState<boolean>(false);
  // Guard against double-initialization (e.g., React StrictMode / remounts)
  const widgetInitRef = useRef<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const runCleanup = async () => {
      try {
        // If we have a known Razorpay customer id, request server-side cleanup
        if (razorpayCustomerId) {
          await fetch('/api/razorpay/cleanup-customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_id: razorpayCustomerId })
          });
        }
      } catch (e) {
        // Non-blocking; we still proceed to show the button
        if (isMounted) setError('Could not clean previous payment methods. You can continue.');
      } finally {
        if (isMounted) setIsCleaning(false);
      }
    };

    runCleanup();
    return () => { isMounted = false; };
  }, [razorpayCustomerId]);

  const handleSuccess = useCallback(() => {
    try {
      localStorage.removeItem('startupPaymentRequired');
      localStorage.removeItem('startupPaymentInProgress');
    } catch {}
    onSuccess();
  }, [onSuccess]);

  // Check subscription status on mount to prevent unauthorized access
  useEffect(() => {
    if (hasCheckedStatus) return;

    const checkSubscriptionStatus = async () => {
      try {
        const supabaseClient = (window as any)?.supabase;
        let userId: string | undefined = undefined;
        if (supabaseClient?.auth?.getUser) {
          const result = await supabaseClient.auth.getUser();
          userId = result?.data?.user?.id;
        }
        if (!userId) {
          setHasCheckedStatus(true);
          return;
        }

        const response = await fetch(`/api/billing/subscription-status?user_id=${encodeURIComponent(userId)}`);
        if (response.ok) {
          const status = await response.json();
          // Only proceed if user has a PAID subscription (not just trial without payment method)
          if (status?.status === 'active' && !status?.is_in_trial) {
            handleSuccess();
            return;
          }
          // If in trial but no payment method collected yet, show payment button
        }
        setHasCheckedStatus(true);
      } catch (e) {
        console.warn('Failed to check subscription status:', e);
        setHasCheckedStatus(true);
      }
    };

    checkSubscriptionStatus();
  }, [hasCheckedStatus, handleSuccess]);

  // Check subscription status (reusable function) - declare before effects that depend on it
  const checkSubscriptionStatus = useCallback(async () => {
    try {
      const supabaseClient = (window as any)?.supabase;
      let userId: string | undefined = undefined;
      if (supabaseClient?.auth?.getUser) {
        const result = await supabaseClient.auth.getUser();
        userId = result?.data?.user?.id;
      }
      
      if (!userId) return false;

      const response = await fetch(`/api/billing/subscription-status?user_id=${encodeURIComponent(userId)}`);
      if (response.ok) {
        const status = await response.json();
        if (status?.status === 'active' || status?.is_in_trial === true) {
          handleSuccess();
          return true;
        }
      }
      return false;
    } catch (e) {
      console.warn('Failed to check subscription status:', e);
      return false;
    }
  }, [handleSuccess]);

  // Load Razorpay subscription button script (requires checkout.js first)
  useEffect(() => {
    if (isCleaning || !hasCheckedStatus) return;

    // Prevent duplicate initialization across remounts/StrictMode
    if (widgetInitRef.current) return;
    widgetInitRef.current = true;
    
    const container = mountRef.current;
    if (!container) return;

    // Clean previous content
    container.innerHTML = '';

    // If script tag already exists globally, don't inject again
    const existing = document.querySelector('script[data-rzp-subscription-button="true"]');
    if (existing) {
      return; // Razorpay will render the button automatically
    }

    // Ensure Razorpay checkout.js is loaded before the subscription button widget
    const ensureCheckoutJs = () => {
      const w = window as any;
      if (w.Razorpay) return Promise.resolve();
      if (w.__rzpCheckoutReady) return w.__rzpCheckoutReady as Promise<void>;
      w.__rzpCheckoutReady = new Promise<void>((resolve, reject) => {
        try {
          if (w.Razorpay) return resolve();
          const existingCheckout = document.querySelector('script[data-razorpay-checkout="true"]') as HTMLScriptElement | null;
          if (!existingCheckout) {
            const checkout = document.createElement('script');
            checkout.src = 'https://checkout.razorpay.com/v1/checkout.js';
            checkout.async = true;
            checkout.setAttribute('data-razorpay-checkout', 'true');
            checkout.onload = () => resolve();
            checkout.onerror = () => reject(new Error('Failed to load Razorpay checkout.js'));
            document.head.appendChild(checkout);
          } else {
            // Wait for an existing load to complete
            let waited = 0;
            const waitInterval = setInterval(() => {
              waited += 100;
              if (w.Razorpay || waited >= 8000) {
                clearInterval(waitInterval);
                return w.Razorpay ? resolve() : reject(new Error('Razorpay checkout.js not available'));
              }
            }, 100);
          }
        } catch (e) {
          reject(e as any);
        }
      });
      return w.__rzpCheckoutReady as Promise<void>;
    };

    // Resolve the subscription button id from prop or env, sanitize to a valid format (pl_...)
    const envButtonId = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_RAZORPAY_SUBSCRIPTION_BUTTON_ID) || '';
    const providedId = subscriptionButtonId || envButtonId || 'pl_RMvYPEir7kvx3E';
    const match = providedId.match(/pl_[A-Za-z0-9]+/);
    const safeButtonId = match ? match[0] : 'pl_RMvYPEir7kvx3E';

    // Remove noisy heuristic warnings; rely on real Razorpay errors/logs

    // Create and mount the widget only after checkout.js is ready
    // Guard to mount only one widget per page
    const w = window as any;
    if (w.__rzpSubscriptionWidgetMounted) return;

    ensureCheckoutJs()
      .then(() => {
        if (w.__rzpSubscriptionWidgetMounted) return;
        // Create a proper form element for Razorpay
        const form = document.createElement('form');
        form.id = 'razorpay-subscription-form';
        form.style.width = '100%';
        form.style.display = 'flex';
        form.style.justifyContent = 'center';

        // Create the script element properly
        const script = document.createElement('script');
        script.src = 'https://cdn.razorpay.com/static/widget/subscription-button.js';
        script.setAttribute('data-subscription_button_id', safeButtonId);
        script.setAttribute('data-button_theme', 'brand-color');
        script.setAttribute('data-rzp-subscription-button', 'true'); // our guard marker
        script.async = true;

        script.onload = () => {
          console.log('Razorpay subscription button script loaded successfully');
          w.__rzpSubscriptionWidgetMounted = true;
        };

        script.onerror = (error) => {
          console.error('Failed to load Razorpay subscription button script:', error);
          setError('Could not load payment button. Check network/AdBlock and try again.');
        };

        // Append script to form and form to container once
        form.appendChild(script);
        container.appendChild(form);
      })
      .catch((e) => {
        console.error('Failed to initialize Razorpay widget:', e);
        setError('We could not load the payment widget. Please refresh and try again.');
      });

    // Listen for subscription events (once)
    const handleSubscriptionEvent = async (event: any) => {
      try {
        const subscriptionId = event?.detail?.subscription_id;
        if (!subscriptionId) return;

        try { localStorage.setItem('startupPaymentInProgress', '1'); } catch {}

        // Resolve current user id from Supabase client
        const supabaseClient = (window as any)?.supabase;
        let userId: string | undefined = undefined;
        if (supabaseClient?.auth?.getUser) {
          const result = await supabaseClient.auth.getUser();
          userId = result?.data?.user?.id;
        }
        if (!userId) return;

        // Record subscription in backend which persists to Supabase
        await fetch('/api/billing/record-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            razorpay_subscription_id: subscriptionId,
            plan_type: 'monthly',
            startup_count: 1
          })
        });

        // Recheck status after short delay
        setTimeout(() => {
          checkSubscriptionStatus();
        }, 1500);
      } catch (e) {
        console.warn('Failed to record subscription after event:', e);
        setTimeout(() => {
          checkSubscriptionStatus();
        }, 2000);
      }
    };

    window.addEventListener('razorpay-subscription-created', handleSubscriptionEvent, { once: false });
    window.addEventListener('razorpay-subscription-activated', handleSubscriptionEvent, { once: false });
    window.addEventListener('razorpay-payment-captured', handleSubscriptionEvent, { once: false });
    
    return () => {
      window.removeEventListener('razorpay-subscription-created', handleSubscriptionEvent);
      window.removeEventListener('razorpay-subscription-activated', handleSubscriptionEvent);
      window.removeEventListener('razorpay-payment-captured', handleSubscriptionEvent);
      if (container) {
        container.innerHTML = '';
      }
      try {
        // Remove any previously injected subscription widget script so reopening works
        const existingWidget = document.querySelector('script[data-rzp-subscription-button="true"]');
        if (existingWidget && existingWidget.parentElement) {
          existingWidget.parentElement.removeChild(existingWidget);
        }
      } catch {}
      // Allow remount on next open
      try { (window as any).__rzpSubscriptionWidgetMounted = false; } catch {}
    };
  }, [isCleaning, hasCheckedStatus, subscriptionButtonId, checkSubscriptionStatus]);

  // (moved earlier)

  return (
    <div className="w-full max-w-lg mx-auto p-6 bg-white rounded-md shadow">
      {isCleaning && (
        <div className="mb-4 text-sm text-slate-500">Preparing payment…</div>
      )}
      {error && (
        <div className="mb-4 text-sm text-amber-600">{error}</div>
      )}

      {!isCleaning && hasCheckedStatus && (
        <div className="mb-2">
          <div ref={mountRef} className="flex justify-center" />
        </div>
      )}

      {!isCleaning && !hasCheckedStatus && (
        <div className="mb-2 text-sm text-slate-500 text-center">Checking…</div>
      )}

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded border border-slate-300 text-slate-700"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default StartupSubscriptionStep;
import React, { useCallback, useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { CheckCircle, AlertCircle, Loader2, Shield, CreditCard, X, BadgeCheck } from 'lucide-react';
import { RealRazorpayService } from '../lib/realRazorpayService';
import { paymentService } from '../lib/paymentService';

interface StartupPaymentStepProps {
  userName: string;
  userEmail: string;
  applicationId: string;
  onSuccess: () => void;
  onBack: () => void;
}

export const StartupPaymentStep: React.FC<StartupPaymentStepProps> = ({
  userName,
  userEmail,
  applicationId,
  onSuccess,
  onBack
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Subscription-style breakdown: trial messaging + ₹1 verification today
  // Keep total at ₹1; show an example split visually
  const total = 1;
  const gstRate = 0.18;
  // Choose a base such that base + gst rounds to ₹1 (purely presentational for now)
  const base = 0.85; // ₹0.85
  const gst = Math.max(0, +(base * gstRate).toFixed(2)); // ≈ ₹0.15
  const isProdEnv = (typeof process !== 'undefined' && (process as any)?.env?.NODE_ENV === 'production') || (window as any).env?.NODE_ENV === 'production';
  const trialSecondsDefault = isProdEnv ? 7 * 24 * 60 * 60 : 120; // 7 days in prod, 2 minutes in dev
  const trialLabel = isProdEnv ? '7-day free trial included. Cancel anytime during the trial.' : '2-minute free trial included (dev). Auto-charge after trial.';
  const nextChargeDate = new Date(Date.now() + trialSecondsDefault * 1000).toLocaleDateString();

  const handlePayOneRupee = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const service = new RealRazorpayService();

      // Create a ₹1 INR order (amount in rupees here; API converts to paise)
      const orderData = await service.createOrder(applicationId, 1, 'INR', `startup_reg_${Date.now()}`);

      await service.initializePayment(
        orderData.orderId,
        orderData.amount,
        orderData.currency,
        'Track My Startup',
        'Startup Registration - Initial Verification Charge',
        userName,
        userEmail,
        '',
        async () => {
          setSuccess(true);
          setIsProcessing(false);
          try {
            // Resolve authenticated user to get UUID
            const { data } = await (window as any).supabase?.auth?.getUser?.() || { data: null };
            const userId = data?.user?.id || userEmail; // fallback to email if not available

            // Start 7-day trial subscription record for Startup basic plan
            const plans = await paymentService.getSubscriptionPlans('Startup', 'Global');
            const planId = plans?.[0]?.id;
            if (userId && planId) {
              await paymentService.startTrial(userId, planId, 1);
              // Optional: create Razorpay subscription with trial for auto-billing
              try {
                const resp = await fetch('/api/razorpay/create-subscription', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ plan_id: (window as any).env?.RAZORPAY_STARTUP_PLAN_ID || 'REPLACE_WITH_YOUR_RAZORPAY_PLAN_ID', trial_days: 7 })
                });
                if (resp.ok) {
                  const sub = await resp.json();
                  if (sub?.id) {
                    // Ensure Razorpay script is loaded
                    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
                    if (!existingScript) {
                      const script = document.createElement('script');
                      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                      script.async = true;
                      document.head.appendChild(script);
                      await new Promise(resolve => { script.onload = resolve; });
                    }

                    // Open Razorpay Subscription Checkout to collect mandate
                    const key = (window as any).env?.RAZORPAY_KEY_ID || (window as any).env?.VITE_RAZORPAY_KEY_ID || (process as any)?.env?.VITE_RAZORPAY_KEY_ID || '';
                    const options: any = {
                      key: key || 'rzp_test_1234567890',
                      subscription_id: sub.id,
                      name: 'Track My Startup',
                      description: 'Authorize subscription for auto-billing after trial',
                      prefill: { name: userName, email: userEmail },
                      theme: { color: '#3B82F6' },
                      handler: async () => {
                        try {
                          await paymentService.setRazorpaySubscription(userId, sub.id);
                        } catch {
                          // ignore
                        }
                        onSuccess();
                      },
                      modal: { ondismiss: () => setIsProcessing(false) }
                    };
                    const rzp = new (window as any).Razorpay(options);
                    rzp.open();
                    return; // Defer onSuccess to handler
                  }
                }
              } catch (e) {
                console.warn('Razorpay subscription creation skipped or failed:', e);
              }
            }
          } catch (e) {
            console.warn('Trial setup warning:', e);
          }
          onSuccess();
        },
        (e) => {
          setIsProcessing(false);
          setError(e?.message || 'Payment failed. Please try again.');
        }
      );
    } catch (e: any) {
      setIsProcessing(false);
      setError(e?.message || 'Unable to initiate payment.');
    }
  }, [applicationId, userEmail, userName, onSuccess]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-white" />
            <h2 className="text-white text-lg font-semibold">Startup Subscription Verification</h2>
          </div>
          <button onClick={onBack} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6 grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-700">
              <BadgeCheck className="w-5 h-5 text-emerald-500" />
              <span className="font-medium">Startup Basic Plan</span>
            </div>
            <div className="rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm px-3 py-2">
              {trialLabel}
            </div>
            <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
              <li>Access to onboarding and compliance tools</li>
              <li>Secure payments powered by Razorpay</li>
              <li>Can be upgraded later to full plans</li>
            </ul>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm text-slate-700">
              <span>Base Fee (trial)</span>
              <span>₹{base.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-700 mt-1">
              <span>GST (18%)</span>
              <span>₹{gst.toFixed(2)}</span>
            </div>
            <div className="h-px bg-slate-200 my-3" />
            <div className="flex items-center justify-between text-slate-900 font-semibold">
              <span>Due today (verification)</span>
              <span className="text-lg">₹{total.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-700 mt-3">
              <span>Next charge after trial</span>
              <span className="font-medium">{nextChargeDate}</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">We’ll remind you before your trial ends. Choose a plan anytime.</p>
          </div>
        </div>

        <div className="px-6 pb-6">
          {success ? (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-green-700 font-medium">Payment successful!</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md mb-4">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <Button onClick={onBack} variant="secondary" disabled={isProcessing}>Back</Button>
                <Button onClick={handlePayOneRupee} disabled={isProcessing} className="inline-flex items-center gap-2">
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Processing…
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" /> Start Free Trial (Pay ₹1 verify)
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StartupPaymentStep;



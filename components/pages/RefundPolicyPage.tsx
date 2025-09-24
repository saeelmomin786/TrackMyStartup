import React from 'react';
import { ArrowLeft } from 'lucide-react';

const RefundPolicyPage: React.FC = () => {
  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-brand-primary hover:text-brand-secondary mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Cancellation & Refund Policy</h1>
          <p className="text-slate-600 mb-2">Track My Startup</p>
          <p className="text-sm text-slate-500 mb-8">Effective Date: 23-09-2025</p>

          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
            <div className="prose prose-slate max-w-none">
              <div className="mb-6">
                <p className="text-slate-600 mb-4">
                  This policy outlines the procedures for canceling your subscription to "Track My Startup" and the conditions under which a refund may be issued.
                </p>
              </div>

              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">Part A: Cancellation Policy</h2>
                
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-slate-900 mb-4">1. Your Right to Cancel</h3>
                  <p className="text-slate-600 mb-4">
                    You have the right to cancel your subscription at any time. You can manage your subscription and initiate a cancellation directly from your account settings or billing dashboard within the platform.
                  </p>
                </div>

                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-slate-900 mb-4">2. Effect of Cancellation</h3>
                  <ul className="list-disc list-inside text-slate-600 space-y-2 mb-4">
                    <li><strong>For Monthly Subscriptions:</strong> When you cancel a monthly subscription, you will retain full access to your paid features until the end of your current billing period. At the end of that period, your account will be downgraded to our free plan (if available) or access will be restricted, and you will not be charged again.</li>
                    <li><strong>For Annual Subscriptions:</strong> When you cancel an annual subscription, you will retain full access to your paid features until the end of your one-year subscription term. You will not be charged for the subsequent year.</li>
                  </ul>
                </div>

                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-slate-900 mb-4">3. Data Retention After Cancellation</h3>
                  <p className="text-slate-600 mb-4">
                    Upon cancellation, your data will be retained on our servers for a grace period of ninety (90) days. During this period, you can resubscribe to regain access to your data. After 90 days, we reserve the right to permanently delete your data from our systems.
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">Part B: Refund Policy</h2>
                
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-slate-900 mb-4">1. 14-Day Money-Back Guarantee (New Customers)</h3>
                  <p className="text-slate-600 mb-4">
                    We offer a 14-day money-back guarantee for your first subscription purchase. If you are not satisfied with our service for any reason, you may request a full refund within 14 calendar days of your initial payment. This guarantee applies only to your first purchase and does not apply to subsequent renewals.
                  </p>
                </div>

                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-slate-900 mb-4">2. Subscription Renewals</h3>
                  <ul className="list-disc list-inside text-slate-600 space-y-2 mb-4">
                    <li><strong>Monthly Renewals:</strong> Payments for monthly subscription renewals are non-refundable.</li>
                    <li><strong>Annual Renewals:</strong> Payments for annual subscription renewals are non-refundable. We will send a reminder email to your registered address before your annual renewal date.</li>
                  </ul>
                </div>

                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-slate-900 mb-4">3. How to Request a Refund</h3>
                  <p className="text-slate-600 mb-4">
                    To request a refund under the 14-Day Money-Back Guarantee, you must contact our support team at <a href="mailto:support@trackmystartup.com" className="text-brand-primary hover:underline">support@trackmystartup.com</a> within the 14-day period. Please provide your account details and the reason for your request.
                  </p>
                </div>

                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-slate-900 mb-4">4. Exceptions</h3>
                  <p className="text-slate-600 mb-4">
                    Refunds outside of the 14-day guarantee will not be issued, except in cases of a significant, prolonged platform outage or a billing error on our part. These exceptions will be reviewed on a case-by-case basis.
                  </p>
                </div>

                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-slate-900 mb-4">5. Processing Time</h3>
                  <p className="text-slate-600 mb-4">
                    Approved refunds will be processed within 5-10 business days and will be credited back to the original method of payment.
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Contact Information</h2>
                <p className="text-slate-600">
                  For cancellation requests, refund inquiries, or questions about this policy, please contact us:
                  <br />
                  <strong>Phone:</strong> <a href="tel:+919146169956" className="text-brand-primary hover:underline">+91 91461 69956</a>
                  <br />
                  <strong>Address:</strong> 1956/2 Wada Road, Rajgurunagar 410505, India
                  <br />
                  <strong>Email:</strong> <a href="mailto:support@trackmystartup.com" className="text-brand-primary hover:underline">support@trackmystartup.com</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicyPage;

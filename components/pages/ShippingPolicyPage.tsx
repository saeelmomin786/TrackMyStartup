import React from 'react';
import { ArrowLeft } from 'lucide-react';

const ShippingPolicyPage: React.FC = () => {
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Shipping Policy</h1>
          <p className="text-slate-600 mb-2">Track My Startup</p>
          <p className="text-sm text-slate-500 mb-8">Effective Date: 23-09-2025</p>

          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
            <div className="prose prose-slate max-w-none">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Scope of Policy</h2>
                <p className="text-slate-600 mb-4">
                  This Service Delivery Policy outlines how "Track My Startup" provides users with access to our platform and its services upon subscription. As a digital Software-as-a-Service (SaaS) platform, we do not ship physical goods. All services are delivered electronically.
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Account Activation and Access</h2>
                <p className="text-slate-600 mb-4">
                  Upon successful completion of your registration and payment, your "Track My Startup" account will be activated immediately. You will receive a confirmation email sent to the address you provided during registration. This email will include your login credentials or a link to set up your password and access your account dashboard.
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">3. Service Delivery Timeline</h2>
                <ul className="list-disc list-inside text-slate-600 space-y-2 mb-4">
                  <li><strong>Instant Access:</strong> Access to the platform is granted instantaneously once your payment is successfully processed by our payment gateway.</li>
                  <li><strong>Confirmation Email:</strong> The confirmation email is dispatched within minutes of successful registration. If you do not receive this email within one hour, please check your spam or junk mail folder before contacting support.</li>
                </ul>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Communication</h2>
                <p className="text-slate-600 mb-4">
                  All communications regarding your service delivery, including account activation, billing notifications, and platform updates, will be sent to the email address associated with your account. It is your responsibility to keep this email address up to date.
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">5. System Requirements</h2>
                <p className="text-slate-600 mb-4">
                  To access and use the "Track My Startup" platform, you will need a stable internet connection and a modern web browser (e.g., Chrome, Firefox, Safari, Edge).
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">6. No Physical Shipping</h2>
                <p className="text-slate-600 mb-4">
                  No physical products, software CDs, or printed materials will be shipped to you. Your access to the platform is entirely digital.
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Contact Information</h2>
                <p className="text-slate-600">
                  For any questions regarding service delivery or account access, please contact us:
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

export default ShippingPolicyPage;

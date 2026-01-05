import React from 'react';
import { ArrowLeft } from 'lucide-react';
import SEOHead from '../SEOHead';

const PrivacyPolicyPage: React.FC = () => {
  const handleBack = () => {
    window.history.back();
  };

  const siteUrl = 'https://trackmystartup.com';
  const canonicalUrl = `${siteUrl}/privacy-policy`;

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title="Privacy Policy - TrackMyStartup | Data Protection & Privacy"
        description="Read TrackMyStartup's Privacy Policy to understand how we collect, use, store, and protect your personal data when using our platform."
        canonicalUrl={canonicalUrl}
        ogImage={`${siteUrl}/Track.png`}
        ogType="website"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          '@id': canonicalUrl,
          name: 'Privacy Policy',
          description: 'TrackMyStartup Privacy Policy - Data protection and privacy information',
          publisher: {
            '@type': 'Organization',
            name: 'TrackMyStartup'
          }
        }}
      />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-brand-primary hover:text-brand-secondary mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
          <p className="text-slate-600 mb-8">E&P Community Farms</p>

          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
            <div className="prose prose-slate max-w-none">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Privacy Policy of E&P Community Farms</h2>
                <p className="text-slate-600 mb-4">
                  This Privacy Policy describes how E&P Community Farms ("we," "our," "us," or "the Owner") collects, uses, stores, and protects the personal data of users ("you," "your," or "User") when accessing or using our website www.trackmystartup.com and related services.
                </p>
                <p className="text-slate-600 mb-4">
                  By using this Website, you agree to the practices described in this Privacy Policy. Please read it carefully.
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Information We Collect</h2>
                <p className="text-slate-600 mb-2">We may collect the following types of information:</p>
                <ul className="list-disc list-inside text-slate-600 space-y-2">
                  <li><strong>Personal Information:</strong> Name, email address, phone number, organization, and login details when you register or contact us.</li>
                  <li><strong>Business Information:</strong> Startup details, investment-related information, compliance documents, and other data uploaded by Users for monitoring purposes.</li>
                  <li><strong>Usage Data:</strong> IP address, browser type, operating system, referral source, and browsing behavior within our platform.</li>
                  <li><strong>Cookies and Tracking Technologies:</strong> We use cookies and similar tools to enhance User experience and analyze platform performance.</li>
                </ul>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">2. How We Use Your Information</h2>
                <p className="text-slate-600 mb-2">We use the collected information for purposes including:</p>
                <ul className="list-disc list-inside text-slate-600 space-y-2">
                  <li>Providing and improving our compliance and monitoring services.</li>
                  <li>Facilitating communication between investors, incubators, and startups.</li>
                  <li>Ensuring platform security, fraud prevention, and compliance with applicable laws.</li>
                  <li>Personalizing User experience and providing relevant insights.</li>
                  <li>Sending service updates, notifications, or promotional material (where consent is provided).</li>
                </ul>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">3. Data Sharing and Disclosure</h2>
                <p className="text-slate-600 mb-2">We do not sell or rent personal data. However, we may share information in the following cases:</p>
                <ul className="list-disc list-inside text-slate-600 space-y-2">
                  <li><strong>With Consent:</strong> When Users explicitly agree to share information.</li>
                  <li><strong>With Service Providers:</strong> Third-party vendors that help us deliver services (e.g., hosting, analytics, communication tools).</li>
                  <li><strong>For Legal Reasons:</strong> If required by law, regulation, or legal process.</li>
                  <li><strong>Business Transfers:</strong> In case of mergers, acquisitions, or sale of assets.</li>
                </ul>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Data Retention</h2>
                <p className="text-slate-600">
                  We retain personal data only as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce agreements. After this period, data will be securely deleted or anonymized.
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Data Security</h2>
                <p className="text-slate-600">
                  We implement technical and organizational measures to safeguard your data against unauthorized access, disclosure, alteration, or destruction. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">6. User Rights</h2>
                <p className="text-slate-600 mb-2">Depending on applicable laws, Users may have the right to:</p>
                <ul className="list-disc list-inside text-slate-600 space-y-2">
                  <li>Access, update, or delete their personal data.</li>
                  <li>Restrict or object to certain data processing activities.</li>
                  <li>Withdraw consent at any time where processing is based on consent.</li>
                  <li>Request data portability.</li>
                </ul>
                <p className="text-slate-600 mt-4">
                  Requests may be submitted via the contact details provided below.
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">7. International Data Transfers</h2>
                <p className="text-slate-600">
                  If you are accessing the Website from outside India, please note that your data may be transferred and stored on servers located in jurisdictions with different data protection laws.
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">8. Cookies Policy</h2>
                <p className="text-slate-600">
                  Our Website uses cookies to improve functionality, analyze usage, and deliver personalized experiences. Users may control cookie settings through their browser, but some features may not function properly without cookies.
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">9. Children's Privacy</h2>
                <p className="text-slate-600">
                  Our services are not directed to individuals under 18. We do not knowingly collect personal data from minors. If you believe a child has provided us with personal information, please contact us immediately.
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">10. Changes to This Policy</h2>
                <p className="text-slate-600">
                  We may update this Privacy Policy from time to time. Users will be notified of significant changes through the Website or email. Continued use of the Website after changes constitutes acceptance of the revised Privacy Policy.
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">11. Contact Information</h2>
                <p className="text-slate-600">
                  For questions, concerns, or requests regarding this Privacy Policy, please contact:
                  <br />
                  E&P Community Farms
                  <br />
                  Email: <a href="mailto:support@trackmystartup.com" className="text-brand-primary hover:underline">support@trackmystartup.com</a>
                  <br />
                  Website: <a href="https://www.trackmystartup.com" className="text-brand-primary hover:underline" target="_blank" rel="noopener noreferrer">www.trackmystartup.com</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;

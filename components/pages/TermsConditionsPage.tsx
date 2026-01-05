import React from 'react';
import { ArrowLeft } from 'lucide-react';
import SEOHead from '../SEOHead';

const TermsConditionsPage: React.FC = () => {
  const handleBack = () => {
    window.history.back();
  };

  const siteUrl = 'https://trackmystartup.com';
  const canonicalUrl = `${siteUrl}/terms-conditions`;

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title="Terms & Conditions - TrackMyStartup | Platform Terms of Service"
        description="Read TrackMyStartup's Terms and Conditions. Understand the rules, regulations, and terms of service for using our startup tracking platform."
        canonicalUrl={canonicalUrl}
        ogImage={`${siteUrl}/Track.png`}
        ogType="website"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          '@id': canonicalUrl,
          name: 'Terms & Conditions',
          description: 'TrackMyStartup Terms and Conditions - Platform terms of service and usage rules',
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms & Conditions</h1>
          <p className="text-slate-600 mb-8">Track My Startup</p>

          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
            <div className="prose prose-slate max-w-none">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Terms and Conditions of Track My Startup</h2>
                <p className="text-slate-600 mb-4">
                  These Terms govern:
                </p>
                <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
                  <li>the use of this Website (www.trackmystartup.com), and</li>
                  <li>any other related agreement or legal relationship with the Owner,</li>
                </ul>
                <p className="text-slate-600 mb-4">
                  in a legally binding way. By accessing or using the Website, you agree to these Terms and Conditions. Please read this document carefully.
                </p>
                <p className="text-slate-600 mb-4">
                  <strong>This Website is provided by:</strong><br />
                  Track My Startup<br />
                  Owner contact email: <a href="mailto:saeel.momin@gmail.com" className="text-brand-primary hover:underline">saeel.momin@gmail.com</a>
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">1. What Users Should Know at a Glance</h2>
                <ul className="list-disc list-inside text-slate-600 space-y-2">
                  <li>These Terms apply to all Users of the Website.</li>
                  <li>Some provisions may apply differently to Consumers (individuals using for personal purposes) and Business Users (investors, incubators, startups). Where applicable, such distinctions will be clearly mentioned.</li>
                  <li>Unless otherwise stated, all provisions apply equally to all Users.</li>
                </ul>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Terms of Use</h2>
                <p className="text-slate-600 mb-2">By using this Website, Users confirm that they:</p>
                <ul className="list-disc list-inside text-slate-600 space-y-2">
                  <li>Are at least 18 years of age.</li>
                  <li>Have the legal authority to enter into binding agreements.</li>
                  <li>Will use the Website in compliance with applicable laws and these Terms.</li>
                </ul>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">3. Services Provided</h2>
                <p className="text-slate-600 mb-4">
                  E&P Community Farms offers compliance and investment monitoring tools to investors, incubators, and other stakeholders for tracking startup progress.
                </p>
                <p className="text-slate-600 mb-4">
                  The Owner reserves the right to add, modify, suspend, or discontinue services at any time.
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Content on This Website</h2>
                <p className="text-slate-600 mb-4">
                  Unless otherwise specified, all content, tools, and features available on this Website are owned or licensed by the Owner.
                </p>
                <ul className="list-disc list-inside text-slate-600 space-y-2">
                  <li>Users may not copy, modify, distribute, or exploit any content except as explicitly permitted.</li>
                  <li>Business data uploaded by Users remains their property, but by uploading it, Users grant E&P Community Farms a license to use such data solely for providing the services.</li>
                </ul>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Acceptable Use</h2>
                <p className="text-slate-600 mb-2">Users agree not to:</p>
                <ul className="list-disc list-inside text-slate-600 space-y-2">
                  <li>Use the Website for unlawful, harmful, or fraudulent activities.</li>
                  <li>Upload false, misleading, or infringing information.</li>
                  <li>Attempt to hack, disrupt, or interfere with the Website's functionality.</li>
                  <li>Reproduce, resell, or exploit services without written permission.</li>
                </ul>
                <p className="text-slate-600 mt-4">
                  Violation of these rules may result in suspension or termination of access.
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Access to External Resources</h2>
                <p className="text-slate-600">
                  The Website may contain links to third-party resources. E&P Community Farms has no control over such resources and is not responsible for their content, availability, or practices.
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Liability and Indemnification</h2>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Disclaimer of Warranties</h3>
                <p className="text-slate-600 mb-4">
                  The Website is provided on an "as is" and "as available" basis. We make no guarantees about accuracy, availability, or error-free operation.
                </p>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Limitation of Liability</h3>
                <p className="text-slate-600 mb-2">To the fullest extent permitted by law, E&P Community Farms shall not be liable for:</p>
                <ul className="list-disc list-inside text-slate-600 space-y-2 mb-4">
                  <li>Any indirect, incidental, or consequential damages.</li>
                  <li>Loss of profits, business opportunities, or data.</li>
                  <li>Unauthorized access to or use of User information.</li>
                </ul>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Indemnification</h3>
                <p className="text-slate-600">
                  Users agree to indemnify and hold harmless E&P Community Farms, its affiliates, officers, employees, and partners from any claims, liabilities, damages, or expenses arising from their use of the Website or violation of these Terms.
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">8. Privacy Policy</h2>
                <p className="text-slate-600">
                  The collection and processing of personal data are governed by our Privacy Policy, available on the Website.
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">9. Service Interruption</h2>
                <p className="text-slate-600">
                  We reserve the right to interrupt or suspend services temporarily for maintenance, system updates, or unforeseen events. In case of termination of services, we will provide reasonable notice where possible.
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">10. Intellectual Property Rights</h2>
                <p className="text-slate-600 mb-4">
                  All intellectual property rights related to the Website, including trademarks, service marks, logos, and software, remain the exclusive property of E&P Community Farms or its licensors.
                </p>
                <p className="text-slate-600">
                  Users may not use these without prior written consent.
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">11. Changes to These Terms</h2>
                <p className="text-slate-600">
                  We may update these Terms from time to time. Users will be notified through the Website or via email when significant changes occur. Continued use of the Website implies acceptance of the updated Terms.
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">12. Governing Law and Jurisdiction</h2>
                <p className="text-slate-600">
                  These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Pune, Maharashtra, India.
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">13. Severability</h2>
                <p className="text-slate-600">
                  If any provision of these Terms is found invalid or unenforceable, the remaining provisions will remain in effect.
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">14. Contact Information</h2>
                <p className="text-slate-600">
                  For any questions or concerns regarding these Terms, please contact:
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

export default TermsConditionsPage;

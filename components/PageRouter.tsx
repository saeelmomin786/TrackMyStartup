import React from 'react';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import RefundPolicyPage from './pages/RefundPolicyPage';
import ShippingPolicyPage from './pages/ShippingPolicyPage';
import TermsConditionsPage from './pages/TermsConditionsPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import ProductsPage from './pages/ProductsPage';

const PageRouter: React.FC = () => {
  const path = window.location.pathname;

  switch (path) {
    case '/privacy-policy':
      return <PrivacyPolicyPage />;
    case '/cancellation-refunds':
      return <RefundPolicyPage />;
    case '/shipping':
      return <ShippingPolicyPage />;
    case '/terms-conditions':
      return <TermsConditionsPage />;
    case '/about':
      return <AboutPage />;
    case '/contact':
      return <ContactPage />;
    case '/products':
      return <ProductsPage />;
    default:
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Page Not Found</h1>
            <p className="text-slate-600 mb-6">The page you're looking for doesn't exist.</p>
            <button
              onClick={() => window.history.back()}
              className="bg-brand-primary text-white px-6 py-2 rounded-md hover:bg-brand-secondary transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      );
  }
};

export default PageRouter;


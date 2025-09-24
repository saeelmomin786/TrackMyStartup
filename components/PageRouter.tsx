import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import RefundPolicyPage from './pages/RefundPolicyPage';
import ShippingPolicyPage from './pages/ShippingPolicyPage';
import TermsConditionsPage from './pages/TermsConditionsPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import ProductsPage from './pages/ProductsPage';

const PageRouter: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Routes>
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/cancellation-refunds" element={<RefundPolicyPage />} />
      <Route path="/shipping" element={<ShippingPolicyPage />} />
      <Route path="/terms-conditions" element={<TermsConditionsPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route 
        path="*" 
        element={
          <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900 mb-4">Page Not Found</h1>
              <p className="text-slate-600 mb-6">The page you're looking for doesn't exist.</p>
              <button
                onClick={() => navigate(-1)}
                className="bg-brand-primary text-white px-6 py-2 rounded-md hover:bg-brand-secondary transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        } 
      />
    </Routes>
  );
};

export default PageRouter;


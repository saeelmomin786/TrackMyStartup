import React from 'react';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import RefundPolicyPage from './pages/RefundPolicyPage';
import ShippingPolicyPage from './pages/ShippingPolicyPage';
import TermsConditionsPage from './pages/TermsConditionsPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import ProductsPage from './pages/ProductsPage';
import DiagnosticPage from './DiagnosticPage';
import StartupsServicePage from './pages/StartupsServicePage';
import IncubationCentersServicePage from './pages/IncubationCentersServicePage';
import InvestorsServicePage from './pages/InvestorsServicePage';
import InvestmentAdvisorsServicePage from './pages/InvestmentAdvisorsServicePage';
import CAServicePage from './pages/CAServicePage';
import CSServicePage from './pages/CSServicePage';
import MentorsServicePage from './pages/MentorsServicePage';
import UnifiedMentorNetworkPage from './pages/UnifiedMentorNetworkPage';
import TMSVirtualConferencePage from './pages/TMSVirtualConferencePage';
import GrantOpportunitiesPage from './pages/GrantOpportunitiesPage';
import BlogsPage from './pages/BlogsPage';
import BlogDetailPage from './pages/BlogDetailPage';
import EventsPage from './pages/EventsPage';
import TMSVirtualConferenceDetailPage from './pages/TMSVirtualConferenceDetailPage';

const PageRouter: React.FC = () => {
  const path = window.location.pathname;

  // Handle service routes
  if (path.startsWith('/services/')) {
    const servicePath = path.replace('/services/', '');
    switch (servicePath) {
      case 'startups':
        return <StartupsServicePage />;
      case 'incubation-centers':
        return <IncubationCentersServicePage />;
      case 'investors':
        return <InvestorsServicePage />;
      case 'investment-advisors':
        return <InvestmentAdvisorsServicePage />;
      case 'ca':
        return <CAServicePage />;
      case 'cs':
        return <CSServicePage />;
      case 'mentors':
        return <MentorsServicePage />;
      default:
        return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900 mb-4">Service Not Found</h1>
              <p className="text-slate-600 mb-6">The service page you're looking for doesn't exist.</p>
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
  }

  // Handle blog detail pages (e.g., /blogs/some-blog-slug)
  if (path.startsWith('/blogs/') && path !== '/blogs') {
    return <BlogDetailPage />;
  }

  // Handle event detail pages (e.g., /events/tms-virtual-conference)
  if (path.startsWith('/events/') && path !== '/events') {
    const eventSlug = path.replace('/events/', '');
    if (eventSlug === 'tms-virtual-conference') {
      return <TMSVirtualConferenceDetailPage />;
    }
    // Add more event detail pages here as needed
  }

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
    case '/diagnostic':
      return <DiagnosticPage />;
    case '/unified-mentor-network':
      return <UnifiedMentorNetworkPage />;
    case '/tms-virtual-conference':
      return <TMSVirtualConferencePage />;
    case '/grant-opportunities':
      return <GrantOpportunitiesPage />;
    case '/blogs':
      return <BlogsPage />;
    case '/events':
      return <EventsPage />;
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


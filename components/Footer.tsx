import React from 'react';
import { Mail, Phone, MapPin, ExternalLink } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const handleLinkClick = (url: string) => {
    // Navigate to the URL
    window.location.href = url;
  };

  return (
    <footer className="bg-slate-900 text-white mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Track My Startup</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Comprehensive platform for tracking startup growth, compliance, and investments. Built for investors, founders, and professionals.
            </p>
            <div className="flex space-x-4">
              <a href="mailto:support@trackmystartup.com" className="w-8 h-8 bg-brand-primary/20 rounded-full flex items-center justify-center hover:bg-brand-primary/30 transition-colors">
                <Mail className="h-4 w-4 text-brand-primary" />
              </a>
              <a href="tel:+919146169956" className="w-8 h-8 bg-brand-primary/20 rounded-full flex items-center justify-center hover:bg-brand-primary/30 transition-colors">
                <Phone className="h-4 w-4 text-brand-primary" />
              </a>
              <div className="w-8 h-8 bg-brand-primary/20 rounded-full flex items-center justify-center">
                <MapPin className="h-4 w-4 text-brand-primary" />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="text-md font-semibold text-white">Contact Info</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <a href="mailto:support@trackmystartup.com" className="flex items-start space-x-3 hover:opacity-80 transition-opacity">
                  <Mail className="h-4 w-4 text-brand-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-slate-300 text-sm">General Support</p>
                    <p className="text-white text-sm">support@trackmystartup.com</p>
                  </div>
                </a>
              </div>
              <div className="flex items-start space-x-3">
                <a href="mailto:startup@trackmystartup.com" className="flex items-start space-x-3 hover:opacity-80 transition-opacity">
                  <Mail className="h-4 w-4 text-brand-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-slate-300 text-sm">Startup Support</p>
                    <p className="text-white text-sm">startup@trackmystartup.com</p>
                  </div>
                </a>
              </div>
              <div className="flex items-start space-x-3">
                <a href="mailto:investor@trackmystartup.com" className="flex items-start space-x-3 hover:opacity-80 transition-opacity">
                  <Mail className="h-4 w-4 text-brand-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-slate-300 text-sm">Investor Relations</p>
                    <p className="text-white text-sm">investor@trackmystartup.com</p>
                  </div>
                </a>
              </div>
              <div className="flex items-start space-x-3">
                <a href="tel:+919146169956" className="flex items-start space-x-3 hover:opacity-80 transition-opacity">
                  <Phone className="h-4 w-4 text-brand-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-slate-300 text-sm">Phone</p>
                    <p className="text-white text-sm">+91 91461 69956</p>
                  </div>
                </a>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-brand-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-slate-300 text-sm">Address</p>
                  <p className="text-white text-sm">E&P Community Farms<br />1956/2 Wada Road<br />Rajgurunagar 410505, India</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-md font-semibold text-white">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => handleLinkClick('/about')}
                  className="text-slate-300 hover:text-white text-sm transition-colors duration-200 flex items-center group"
                >
                  About Us - E&P Community Farms
                  <ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLinkClick('/contact')}
                  className="text-slate-300 hover:text-white text-sm transition-colors duration-200 flex items-center group"
                >
                  Contact - E&P Community Farms
                  <ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLinkClick('/products')}
                  className="text-slate-300 hover:text-white text-sm transition-colors duration-200 flex items-center group"
                >
                  Product Price & Registration
                  <ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </li>
            </ul>
          </div>

          {/* Specialized Contacts */}
          <div className="space-y-4">
            <h4 className="text-md font-semibold text-white">Specialized Support</h4>
            <ul className="space-y-2">
              <li>
                <a href="mailto:incubation_center@trackmystartup.com" className="text-slate-300 hover:text-white text-sm transition-colors duration-200 flex items-center group">
                  Incubation Centers
                  <ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a href="mailto:investment_advisor@trackmystartup.com" className="text-slate-300 hover:text-white text-sm transition-colors duration-200 flex items-center group">
                  Investment Advisors
                  <ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <button
                  onClick={() => handleLinkClick('/privacy-policy')}
                  className="text-slate-300 hover:text-white text-sm transition-colors duration-200 flex items-center group"
                >
                  Privacy Policy
                  <ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLinkClick('/terms-conditions')}
                  className="text-slate-300 hover:text-white text-sm transition-colors duration-200 flex items-center group"
                >
                  Terms & Conditions
                  <ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLinkClick('/cancellation-refunds')}
                  className="text-slate-300 hover:text-white text-sm transition-colors duration-200 flex items-center group"
                >
                  Cancellation & Refunds
                  <ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLinkClick('/shipping')}
                  className="text-slate-300 hover:text-white text-sm transition-colors duration-200 flex items-center group"
                >
                  Shipping Policy
                  <ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-slate-700 mt-8 pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="text-center sm:text-left">
              <p className="text-slate-400 text-sm">
                © {currentYear} E&P Community Farms. All rights reserved.
              </p>
              <p className="text-slate-500 text-xs mt-1">
                Powered by E&P Community Farms
              </p>
              <p className="text-slate-500 text-xs mt-1">
                Specialized Support by E&P Community Farms
              </p>
            </div>
            <div className="flex items-center space-x-6">
              <button
                onClick={() => handleLinkClick('/home')}
                className="text-slate-400 hover:text-white text-sm transition-colors duration-200"
              >
                Home
              </button>
              <button
                onClick={() => handleLinkClick('/contact')}
                className="text-slate-400 hover:text-white text-sm transition-colors duration-200"
              >
                Contact
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

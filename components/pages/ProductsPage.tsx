import React from 'react';
import { ArrowLeft, Package, DollarSign, CheckCircle } from 'lucide-react';
import SEOHead from '../SEOHead';

const ProductsPage: React.FC = () => {
  const handleBack = () => {
    window.history.back();
  };

  const products = [
    {
      name: "Farm Management Package",
      price: "$299/month",
      description: "Complete farm management solution with crop planning, inventory tracking, and financial reporting.",
      features: ["Crop Planning", "Inventory Management", "Financial Reports", "Weather Integration"]
    },
    {
      name: "Community Farm Program",
      price: "$199/month",
      description: "Collaborative farming program for community-based agricultural projects.",
      features: ["Community Dashboard", "Resource Sharing", "Collaborative Planning", "Progress Tracking"]
    },
    {
      name: "Sustainable Practices Guide",
      price: "$99/month",
      description: "Comprehensive guide to sustainable farming practices and environmental stewardship.",
      features: ["Best Practices", "Environmental Impact", "Certification Support", "Expert Consultation"]
    }
  ];

  const siteUrl = 'https://trackmystartup.com';
  const canonicalUrl = `${siteUrl}/products`;

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title="Products - TrackMyStartup | Startup Management Solutions"
        description="Explore TrackMyStartup's comprehensive suite of products for startup management, compliance tracking, investment management, and ecosystem collaboration."
        canonicalUrl={canonicalUrl}
        ogImage={`${siteUrl}/Track.png`}
        ogType="website"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Products',
          description: 'TrackMyStartup products and solutions for startup management',
          url: canonicalUrl,
          publisher: {
            '@type': 'Organization',
            name: 'TrackMyStartup',
            url: siteUrl
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

        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Product Price & Registration</h1>
          <p className="text-slate-600 mb-8">E AND P Community Farms</p>

          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 mb-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Our Products & Services</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Choose from our comprehensive range of agricultural solutions designed to help you succeed in modern farming. 
                All our products come with full support and training from our expert team.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {products.map((product, index) => (
                <div key={index} className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-brand-primary/10 rounded-full flex items-center justify-center">
                      <Package className="h-5 w-5 text-brand-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">{product.name}</h3>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <span className="text-2xl font-bold text-green-600">{product.price}</span>
                  </div>

                  <p className="text-slate-600 mb-4 text-sm">{product.description}</p>

                  <ul className="space-y-2 mb-6">
                    {product.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-slate-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button className="w-full bg-brand-primary text-white py-2 px-4 rounded-md hover:bg-brand-secondary transition-colors duration-200">
                    Register Now
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Registration Process</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-brand-primary font-bold">1</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Choose Package</h3>
                <p className="text-slate-600 text-sm">Select the product that best fits your needs</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-brand-primary font-bold">2</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Complete Form</h3>
                <p className="text-slate-600 text-sm">Fill out our registration form with your details</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-brand-primary font-bold">3</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Payment</h3>
                <p className="text-slate-600 text-sm">Secure payment processing for your subscription</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-brand-primary font-bold">4</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Get Started</h3>
                <p className="text-slate-600 text-sm">Access your account and begin using our services</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;


import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ServicePageLayoutProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  description: string;
  features: Array<{
    title: string;
    description: string;
  }>;
  benefits: string[];
  ctaText?: string;
  ctaLink?: string;
}

const ServicePageLayout: React.FC<ServicePageLayoutProps> = ({
  title,
  subtitle,
  icon: Icon,
  description,
  features,
  benefits,
  ctaText = 'Get Started',
  ctaLink = '/register',
}) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-primary/10 rounded-full mb-4">
              <Icon className="h-8 w-8 text-brand-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">{title}</h1>
            <p className="text-lg text-slate-600">{subtitle}</p>
          </div>

          {/* Description */}
          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 mb-8">
            <p className="text-slate-700 leading-relaxed text-lg">{description}</p>
          </div>

          {/* Features */}
          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-6">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="border-l-4 border-brand-primary pl-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-6">Benefits</h2>
            <ul className="space-y-3">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-brand-primary mt-1">•</span>
                  <span className="text-slate-700">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-brand-primary to-brand-secondary rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Ready to Get Started?</h2>
            <p className="text-white/90 mb-6">
              Join thousands of users who trust Track My Startup to manage their ecosystem.
            </p>
            <a
              href={ctaLink}
              className="inline-flex items-center gap-2 bg-white text-brand-primary px-6 py-3 rounded-md font-semibold hover:bg-slate-50 transition-colors"
            >
              {ctaText}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicePageLayout;




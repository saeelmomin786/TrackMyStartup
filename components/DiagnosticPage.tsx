import React from 'react';
import NetworkDiagnostic from './NetworkDiagnostic';
import SEOHead from './SEOHead';

const DiagnosticPage: React.FC = () => {
  const siteUrl = 'https://trackmystartup.com';
  const canonicalUrl = `${siteUrl}/diagnostic`;

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead
        title="Startup Diagnostic - TrackMyStartup | Assess Your Startup Health"
        description="Use our comprehensive startup diagnostic tool to assess your startup's health, identify areas for improvement, and get actionable insights for growth."
        canonicalUrl={canonicalUrl}
        ogImage={`${siteUrl}/Track.png`}
        ogType="website"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Startup Diagnostic',
          description: 'Comprehensive startup diagnostic tool to assess startup health and growth',
          url: canonicalUrl,
          publisher: {
            '@type': 'Organization',
            name: 'TrackMyStartup',
            url: siteUrl
          }
        }}
      />
      <NetworkDiagnostic />
    </div>
  );
};

export default DiagnosticPage;


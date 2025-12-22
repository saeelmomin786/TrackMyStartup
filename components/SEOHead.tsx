import { useEffect } from 'react';

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage?: string;
  ogType?: 'website' | 'profile' | 'article';
  profileType?: 'startup' | 'mentor' | 'investor' | 'advisor';
  // Profile-specific data
  name?: string;
  website?: string;
  linkedin?: string;
  email?: string;
  location?: string;
  sector?: string;
  // Startup specific
  valuation?: number;
  currency?: string;
  investmentAsk?: number;
  equityOffered?: number;
  // Investor/Advisor specific
  firmType?: string;
  ticketSize?: string;
  // Structured data
  structuredData?: Record<string, any>;
}

/**
 * SEO Head Component - Dynamically updates meta tags for better SEO
 * Includes Open Graph, Twitter Cards, and JSON-LD structured data
 */
const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  canonicalUrl,
  ogImage,
  ogType = 'website',
  profileType,
  name,
  website,
  linkedin,
  email,
  location,
  sector,
  valuation,
  currency = 'USD',
  investmentAsk,
  equityOffered,
  firmType,
  ticketSize,
  structuredData,
}) => {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Helper function to update or create meta tag
    const updateMetaTag = (property: string, content: string, isProperty = true) => {
      const attribute = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${property}"]`);
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, property);
        document.head.appendChild(meta);
      }
      
      meta.setAttribute('content', content);
    };

    // Helper function to update or create link tag
    const updateLinkTag = (rel: string, href: string) => {
      let link = document.querySelector(`link[rel="${rel}"]`);
      
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        document.head.appendChild(link);
      }
      
      link.setAttribute('href', href);
    };

    // Basic meta tags
    updateMetaTag('description', description, false);
    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:url', canonicalUrl);
    updateMetaTag('og:type', ogType);
    
    if (ogImage) {
      updateMetaTag('og:image', ogImage);
      updateMetaTag('og:image:secure_url', ogImage);
      updateMetaTag('og:image:type', 'image/png');
    }

    // Twitter Card meta tags
    updateMetaTag('twitter:card', 'summary_large_image', false);
    updateMetaTag('twitter:title', title, false);
    updateMetaTag('twitter:description', description, false);
    if (ogImage) {
      updateMetaTag('twitter:image', ogImage, false);
    }

    // Profile-specific Open Graph tags
    if (profileType === 'profile' || profileType) {
      if (name) {
        updateMetaTag('og:profile:username', name);
      }
      if (website) {
        updateMetaTag('og:see_also', website);
      }
    }

    // Canonical URL
    updateLinkTag('canonical', canonicalUrl);

    // Additional SEO meta tags
    updateMetaTag('robots', 'index, follow', false);
    updateMetaTag('author', 'TrackMyStartup', false);
    
    if (location) {
      updateMetaTag('geo.region', location, false);
    }

    // Create or update structured data (JSON-LD)
    let structuredDataScript = document.getElementById('structured-data') as HTMLScriptElement;
    
    if (structuredData || profileType) {
      const jsonLd: any = structuredData || {};

      // If no structured data provided, generate based on profile type
      if (!structuredData && profileType) {
        if (profileType === 'startup') {
          jsonLd['@context'] = 'https://schema.org';
          jsonLd['@type'] = 'Organization';
          jsonLd.name = name;
          jsonLd.description = description;
          jsonLd.url = website || canonicalUrl;
          if (website) jsonLd.sameAs = [website];
          if (linkedin) {
            jsonLd.sameAs = jsonLd.sameAs || [];
            jsonLd.sameAs.push(linkedin);
          }
          if (location) jsonLd.address = { '@type': 'PostalAddress', addressLocality: location };
          if (sector) jsonLd.industry = sector;
          if (valuation) {
            jsonLd.aggregateRating = {
              '@type': 'AggregateRating',
              ratingValue: '4.5',
            };
          }
        } else if (profileType === 'mentor') {
          jsonLd['@context'] = 'https://schema.org';
          jsonLd['@type'] = 'Person';
          jsonLd.name = name;
          jsonLd.description = description;
          jsonLd.url = website || canonicalUrl;
          if (website) jsonLd.sameAs = [website];
          if (linkedin) {
            jsonLd.sameAs = jsonLd.sameAs || [];
            jsonLd.sameAs.push(linkedin);
          }
          if (email) jsonLd.email = email;
          if (location) jsonLd.address = { '@type': 'PostalAddress', addressLocality: location };
          jsonLd.jobTitle = 'Mentor';
        } else if (profileType === 'investor') {
          jsonLd['@context'] = 'https://schema.org';
          jsonLd['@type'] = 'Organization';
          jsonLd.name = name;
          jsonLd.description = description;
          jsonLd.url = website || canonicalUrl;
          if (website) jsonLd.sameAs = [website];
          if (linkedin) {
            jsonLd.sameAs = jsonLd.sameAs || [];
            jsonLd.sameAs.push(linkedin);
          }
          if (location) jsonLd.address = { '@type': 'PostalAddress', addressLocality: location };
          jsonLd.legalName = firmType || name;
        } else if (profileType === 'advisor') {
          jsonLd['@context'] = 'https://schema.org';
          jsonLd['@type'] = 'FinancialService';
          jsonLd.name = name;
          jsonLd.description = description;
          jsonLd.url = website || canonicalUrl;
          if (website) jsonLd.sameAs = [website];
          if (linkedin) {
            jsonLd.sameAs = jsonLd.sameAs || [];
            jsonLd.sameAs.push(linkedin);
          }
          if (location) jsonLd.address = { '@type': 'PostalAddress', addressLocality: location };
          jsonLd.serviceType = 'Investment Advisory';
        }
      }

      if (Object.keys(jsonLd).length > 0) {
        if (!structuredDataScript) {
          structuredDataScript = document.createElement('script');
          structuredDataScript.id = 'structured-data';
          structuredDataScript.type = 'application/ld+json';
          document.head.appendChild(structuredDataScript);
        }
        structuredDataScript.textContent = JSON.stringify(jsonLd);
      }
    }

    // Cleanup function
    return () => {
      // Don't remove meta tags on unmount as they're shared across pages
      // The next page will update them
    };
  }, [
    title,
    description,
    canonicalUrl,
    ogImage,
    ogType,
    profileType,
    name,
    website,
    linkedin,
    email,
    location,
    sector,
    valuation,
    currency,
    investmentAsk,
    equityOffered,
    firmType,
    ticketSize,
    structuredData,
  ]);

  return null; // This component doesn't render anything
};

export default SEOHead;


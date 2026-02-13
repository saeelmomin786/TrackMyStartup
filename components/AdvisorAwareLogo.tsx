import React, { useState, useEffect } from 'react';
import LogoTMS from './public/logoTMS.svg';
import { investmentService } from '../lib/database';
import { supabase } from '../lib/supabase';

interface AdvisorAwareLogoProps {
  currentUser?: any;
  className?: string;
  alt?: string;
  onClick?: () => void;
  showText?: boolean;
  textClassName?: string;
}

const AdvisorAwareLogo: React.FC<AdvisorAwareLogoProps> = ({ 
  currentUser, 
  className = "h-40 w-40 sm:h-48 sm:w-48 object-contain cursor-pointer hover:opacity-80 transition-opacity",
  alt = "TrackMyStartup",
  onClick,
  showText = true,
  textClassName = "text-2xl sm:text-3xl font-bold text-slate-900"
}) => {
  const [advisorInfo, setAdvisorInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const normalizeDomain = (domain: string): string =>
    domain
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '')
      .trim();

  // Detect if we're on a subdomain
  const isOnSubdomain = (): boolean => {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    // Handle localhost for development
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost:')) {
      return false;
    }
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const subdomain = parts[0];
      if (subdomain && subdomain !== 'www') {
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    const fetchAdvisorInfo = async () => {
      setLoading(true);
      try {
        if (isOnSubdomain()) {
          const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
          const normalizedDomain = normalizeDomain(hostname);

          console.log('🔍 AdvisorAwareLogo: Fetching advisor by domain:', normalizedDomain);

          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('auth_user_id, name, firm_name, logo_url, investor_advisor_domain')
            .eq('role', 'Investment Advisor')
            .ilike('investor_advisor_domain', normalizedDomain)
            .maybeSingle();

          if (profileData?.logo_url) {
            setAdvisorInfo(profileData);
            return;
          }

          const { data: userData } = await supabase
            .from('users')
            .select('id, name, firm_name, logo_url, investor_advisor_domain')
            .eq('role', 'Investment Advisor')
            .ilike('investor_advisor_domain', normalizedDomain)
            .maybeSingle();

          setAdvisorInfo(userData || null);
          return;
        }

        const userAdvisorCode = currentUser?.investment_advisor_code_entered || currentUser?.investment_advisor_code;
        console.log('🔍 AdvisorAwareLogo: Fetching advisor by code:', userAdvisorCode);

        if (!userAdvisorCode) {
          setAdvisorInfo(null);
          return;
        }

        const advisor = await investmentService.getInvestmentAdvisorByCode(userAdvisorCode);
        setAdvisorInfo(advisor);
      } catch (error) {
        console.error('Error fetching advisor info:', error);
        setAdvisorInfo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAdvisorInfo();

    // Refresh advisor info every 30 seconds to pick up logo updates
    const refreshInterval = setInterval(() => {
      fetchAdvisorInfo();
    }, 30000); // 30 seconds

    return () => clearInterval(refreshInterval);
  }, [currentUser?.investment_advisor_code_entered, currentUser?.investment_advisor_code, currentUser?.role]);

  // Simple swapping logic: If advisor has logo, show it. Otherwise, show default.
  const shouldShowAdvisorLogo = advisorInfo?.logo_url && !loading;
  const isSubdomain = isOnSubdomain();
  
  if (shouldShowAdvisorLogo) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <img 
          src={`${advisorInfo.logo_url}?t=${Date.now()}`} 
          alt={advisorInfo.firm_name || advisorInfo.name || 'Advisor Logo'} 
          className={className}
          onClick={onClick}
          onError={() => {
            console.log('🔍 AdvisorAwareLogo: Advisor logo failed to load, falling back to TrackMyStartup');
            setAdvisorInfo(null);
          }}
        />
        {showText && (
          <div>
            <h1 className={textClassName}>
              {advisorInfo.firm_name || advisorInfo.name || 'Advisor'}
            </h1>
            {!isSubdomain && (
              <p className="text-xs text-blue-600 mt-1">Supported by Track My Startup</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // On subdomains: show neutral skeleton while loading, default logo if no advisor logo
  if (isSubdomain && loading) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`${className} bg-slate-200 rounded-lg animate-pulse`} />
      </div>
    );
  }

  // Default TrackMyStartup logo (fallback when no advisor logo is found)
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <img 
        src={LogoTMS} 
        alt={alt} 
        className={className}
        onClick={onClick}
      />
    </div>
  );
};

export default AdvisorAwareLogo;

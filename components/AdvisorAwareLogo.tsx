import React, { useState, useEffect } from 'react';
import LogoTMS from './public/logoTMS.svg';
import { investmentService } from '../lib/database';

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

  useEffect(() => {
    const fetchAdvisorInfo = async () => {
      console.log('🔍 AdvisorAwareLogo: Checking user data:', {
        hasUser: !!currentUser,
        role: currentUser?.role,
        advisorCodeEntered: currentUser?.investment_advisor_code_entered
      });

      // Only fetch if user has an investment advisor code
      if (currentUser?.investment_advisor_code_entered && 
          (currentUser?.role === 'Investor' || currentUser?.role === 'Startup')) {
        setLoading(true);
        try {
          console.log('🔍 AdvisorAwareLogo: Fetching advisor for code:', currentUser.investment_advisor_code_entered);
          const advisor = await investmentService.getInvestmentAdvisorByCode(currentUser.investment_advisor_code_entered);
          console.log('🔍 AdvisorAwareLogo: Advisor data received:', advisor);
          setAdvisorInfo(advisor);
        } catch (error) {
          console.error('Error fetching advisor info:', error);
          setAdvisorInfo(null);
        } finally {
          setLoading(false);
        }
      } else {
        console.log('🔍 AdvisorAwareLogo: No advisor code or wrong role, using default logo');
        setAdvisorInfo(null);
      }
    };

    fetchAdvisorInfo();
  }, [currentUser?.investment_advisor_code_entered, currentUser?.role]);

  // Simple swapping logic: If advisor has logo, show it. Otherwise, show default.
  const shouldShowAdvisorLogo = advisorInfo?.logo_url && !loading;
  
  if (shouldShowAdvisorLogo) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <img 
          src={advisorInfo.logo_url} 
          alt={advisorInfo.name || 'Advisor Logo'} 
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
              {advisorInfo.name || 'Advisor'}
            </h1>
            <p className="text-xs text-blue-600 mt-1">Supported by Track My Startup</p>
          </div>
        )}
      </div>
    );
  }

  // Default TrackMyStartup logo
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <img 
        src={LogoTMS} 
        alt={alt} 
        className={className}
        onClick={onClick}
      />
      {/* Note: LogoTMS.svg already contains the "Track My Startup" text, so no additional text needed */}
    </div>
  );
};

export default AdvisorAwareLogo;

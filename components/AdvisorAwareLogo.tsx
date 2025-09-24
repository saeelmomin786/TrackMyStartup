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
  className = "h-7 w-7 sm:h-8 sm:w-8 scale-[5] sm:scale-[5] origin-left cursor-pointer hover:opacity-80 transition-opacity",
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
        } finally {
          setLoading(false);
        }
      } else {
        console.log('🔍 AdvisorAwareLogo: No advisor code or wrong role, using default logo');
      }
    };

    fetchAdvisorInfo();
  }, [currentUser?.investment_advisor_code_entered, currentUser?.role]);

  // If user has an advisor with a logo, show advisor logo
  if (advisorInfo?.logo_url) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <img 
          src={advisorInfo.logo_url} 
          alt={advisorInfo.name || 'Advisor Logo'} 
          className={className}
          onClick={onClick}
          onError={(e) => {
            // Fallback to TrackMyStartup logo if advisor logo fails to load
            e.currentTarget.style.display = 'none';
            const fallbackImg = e.currentTarget.nextElementSibling as HTMLImageElement;
            if (fallbackImg) {
              fallbackImg.style.display = 'block';
            }
          }}
        />
        <img 
          src={LogoTMS} 
          alt={alt} 
          className={className}
          onClick={onClick}
          style={{ display: 'none' }}
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
      {showText && (
        <h1 className={textClassName}>
          TrackMyStartup
        </h1>
      )}
    </div>
  );
};

export default AdvisorAwareLogo;

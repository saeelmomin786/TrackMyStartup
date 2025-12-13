import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Briefcase, MapPin, DollarSign, Image as ImageIcon, Video, Globe, Linkedin, Share2, Eye } from 'lucide-react';

interface InvestmentAdvisorProfile {
  id?: string;
  user_id: string;
  advisor_name?: string;
  firm_name?: string;
  global_hq?: string;
  website?: string;
  linkedin_link?: string;
  email?: string;
  geography?: string[];
  service_types?: string[];
  investment_stages?: string[];
  domain?: string[];
  minimum_investment?: number;
  maximum_investment?: number;
  currency?: string;
  service_description?: string;
  logo_url?: string;
  video_url?: string;
  media_type?: 'logo' | 'video';
  user?: {
    name?: string;
    email?: string;
  };
}

interface InvestmentAdvisorCardProps {
  advisor: InvestmentAdvisorProfile;
  onView?: (advisor: InvestmentAdvisorProfile) => void;
  isPublicPage?: boolean;
  isAuthenticated?: boolean;
  currentUser?: {
    id: string;
    role?: string;
    email?: string;
  } | null;
}

const InvestmentAdvisorCard: React.FC<InvestmentAdvisorCardProps> = ({ 
  advisor, 
  onView, 
  isPublicPage = false, 
  isAuthenticated = false, 
  currentUser = null 
}) => {
  const getYoutubeEmbedUrl = (url?: string): string | null => {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com')) {
        const videoId = urlObj.searchParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      } else if (urlObj.hostname.includes('youtu.be')) {
        const videoId = urlObj.pathname.slice(1);
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }
    } catch {
      return null;
    }
    return null;
  };

  const formatCurrency = (value?: number, currency?: string) => {
    if (!value) return 'N/A';
    const currencyCode = currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      notation: 'compact',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Prefer video when provided; otherwise show logo; fallback to placeholder
  const videoEmbedUrl = advisor.video_url ? getYoutubeEmbedUrl(advisor.video_url) : null;

  const handleShare = async () => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('view', 'advisor');
    if (advisor.id) {
      url.searchParams.set('advisorId', advisor.id);
    } else if (advisor.user_id) {
      url.searchParams.set('userId', advisor.user_id);
    }
    const shareUrl = url.toString();
    
    const displayName = advisor.firm_name || advisor.advisor_name || 'Investment Advisor';
    const shareText = `Investment Advisor: ${displayName}\nFirm: ${advisor.firm_name || 'N/A'}\nLocation: ${advisor.global_hq || 'N/A'}\nInvestment Range: ${advisor.minimum_investment && advisor.maximum_investment ? `${formatCurrency(advisor.minimum_investment, advisor.currency)} - ${formatCurrency(advisor.maximum_investment, advisor.currency)}` : 'N/A'}\n\nView advisor profile: ${shareUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: displayName + ' - Investment Advisor Profile',
          text: shareText,
          url: shareUrl,
        });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        alert('Investment Advisor profile link copied to clipboard!');
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Investment Advisor profile link copied to clipboard!');
      }
    } catch (err) {
      console.error('Share failed', err);
      if (err instanceof Error && err.name !== 'AbortError') {
        alert('Unable to share. Try copying manually.');
      }
    }
  };

  const handleCardClick = () => {
    if (isPublicPage || window.location.href.includes('view=advisor')) {
      return;
    }

    if (onView) {
      onView(advisor);
    } else {
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.set('view', 'advisor');
      if (advisor.id) {
        url.searchParams.set('advisorId', advisor.id);
      } else if (advisor.user_id) {
        url.searchParams.set('userId', advisor.user_id);
      }
      window.location.href = url.toString();
    }
  };

  return (
    <Card 
      className={`!p-0 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-white ${!isPublicPage ? 'cursor-pointer' : ''}`}
      onClick={!isPublicPage ? handleCardClick : undefined}
    >
      {/* Media Section */}
      <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
        {videoEmbedUrl ? (
          <div className="relative w-full h-full">
            <iframe
              src={videoEmbedUrl}
              title={`Video for ${advisor.firm_name || advisor.advisor_name || 'Investment Advisor'}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full"
            />
          </div>
        ) : advisor.logo_url ? (
          <div className="w-full h-full flex items-center justify-center bg-white p-6">
            <img 
              src={advisor.logo_url} 
              alt={`${advisor.firm_name || advisor.advisor_name || 'Advisor'} logo`}
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <div className="text-center">
              <ImageIcon className="h-16 w-16 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No media available</p>
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-5 sm:p-6 relative">
        {/* Share Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleShare();
          }}
          className="absolute top-5 right-5 sm:top-6 sm:right-6 z-10 p-2 bg-white hover:bg-slate-50 rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center border border-slate-200"
          title="Share advisor profile"
        >
          <Share2 className="h-4 w-4 text-slate-700" />
        </button>

        {/* Header Section */}
        <div className="mb-4 pr-10">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">
            {/* Priority: firm_name (from users table/registration) > advisor_name (from profile) > user.name > default */}
            {advisor.firm_name || advisor.advisor_name || advisor.user?.name || 'Investment Advisor'}
          </h3>
          {/* Show advisor_name as subtitle if firm_name is being used as main name */}
          {advisor.firm_name && advisor.advisor_name && advisor.advisor_name !== advisor.firm_name && (
            <p className="text-sm text-slate-600">{advisor.advisor_name}</p>
          )}
        </div>

        {/* Single Line: Firm Name, Location, Investment Range */}
        <div className="flex flex-wrap items-center gap-3 text-sm mb-4 pb-4 border-b border-slate-200">
          {advisor.firm_name && (
            <span className="text-slate-700 font-medium">{advisor.firm_name}</span>
          )}
          {advisor.global_hq && (
            <>
              {advisor.firm_name && <span className="text-slate-300">•</span>}
              <span className="text-slate-600 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-slate-500" />
                <span className="capitalize">{advisor.global_hq}</span>
              </span>
            </>
          )}
          {advisor.minimum_investment && advisor.maximum_investment && (
            <>
              {(advisor.firm_name || advisor.global_hq) && <span className="text-slate-300">•</span>}
              <span className="text-slate-600 flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-slate-500" />
                <span>{formatCurrency(advisor.minimum_investment, advisor.currency)} - {formatCurrency(advisor.maximum_investment, advisor.currency)}</span>
              </span>
            </>
          )}
        </div>

        {/* Contact Links */}
        {(advisor.website || advisor.linkedin_link) && (
          <div className="flex flex-wrap items-center gap-4 mb-4 pb-4 border-b border-slate-200">
            {advisor.website && (
              isAuthenticated ? (
                <a
                  href={advisor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-1.5 text-sm font-medium transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  Website
                </a>
              ) : (
                <span className="text-slate-400 flex items-center gap-1.5 text-sm font-medium cursor-not-allowed" title="Login to access">
                  <Globe className="h-4 w-4" />
                  Website
                </span>
              )
            )}
            {advisor.linkedin_link && (
              isAuthenticated ? (
                <a
                  href={advisor.linkedin_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-1.5 text-sm font-medium transition-colors"
                >
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </a>
              ) : (
                <span className="text-slate-400 flex items-center gap-1.5 text-sm font-medium cursor-not-allowed" title="Login to access">
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </span>
              )
            )}
          </div>
        )}

        {/* Service Details */}
        <div className="space-y-4">
          {/* Service Types and Investment Stages in one line */}
          {(advisor.service_types && advisor.service_types.length > 0) || (advisor.investment_stages && advisor.investment_stages.length > 0) ? (
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {advisor.service_types && advisor.service_types.length > 0 && (
                  <>
                    <span className="text-xs font-medium text-slate-500">Services:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {advisor.service_types.slice(0, 3).map((type, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-md">
                          {type}
                        </span>
                      ))}
                      {advisor.service_types.length > 3 && (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md">
                          +{advisor.service_types.length - 3} more
                        </span>
                      )}
                    </div>
                  </>
                )}
                {advisor.investment_stages && advisor.investment_stages.length > 0 && (
                  <>
                    {advisor.service_types && advisor.service_types.length > 0 && (
                      <span className="text-slate-300 mx-1">•</span>
                    )}
                    <span className="text-xs font-medium text-slate-500">Stages:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {advisor.investment_stages.slice(0, 3).map((stage, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-md">
                          {stage}
                        </span>
                      ))}
                      {advisor.investment_stages.length > 3 && (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md">
                          +{advisor.investment_stages.length - 3} more
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {/* Geography and Domain in one line */}
          {(advisor.geography && advisor.geography.length > 0) || (advisor.domain && advisor.domain.length > 0) ? (
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {advisor.geography && advisor.geography.length > 0 && (
                  <>
                    <span className="text-xs font-medium text-slate-500">Geography:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {advisor.geography.slice(0, 3).map((geo, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-md">
                          {geo}
                        </span>
                      ))}
                      {advisor.geography.length > 3 && (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md">
                          +{advisor.geography.length - 3} more
                        </span>
                      )}
                    </div>
                  </>
                )}
                {advisor.domain && advisor.domain.length > 0 && (
                  <>
                    {advisor.geography && advisor.geography.length > 0 && (
                      <span className="text-slate-300 mx-1">•</span>
                    )}
                    <span className="text-xs font-medium text-slate-500">Domain:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {advisor.domain.slice(0, 3).map((d, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-md">
                          {d}
                        </span>
                      ))}
                      {advisor.domain.length > 3 && (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md">
                          +{advisor.domain.length - 3} more
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {/* Management Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-2">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500">Startups Under Management</div>
              <div className="text-lg font-semibold text-slate-900">{advisor.startups_under_management ?? 0}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500">Investors Under Management</div>
              <div className="text-lg font-semibold text-slate-900">{advisor.investors_under_management ?? 0}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500">Successful Fundraises</div>
              <div className="text-lg font-semibold text-slate-900">{advisor.successful_fundraises_startups ?? 0}</div>
            </div>
          </div>

          {/* Verified (On-Platform) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-2">
            <div className="bg-emerald-50 rounded-lg p-3">
              <div className="text-xs text-emerald-700">Verified Startups</div>
              <div className="text-lg font-semibold text-emerald-800">{advisor.verified_startups_under_management ?? 0}</div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3">
              <div className="text-xs text-emerald-700">Verified Investors</div>
              <div className="text-lg font-semibold text-emerald-800">{advisor.verified_investors_under_management ?? 0}</div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3">
              <div className="text-xs text-emerald-700">Verified Fundraises</div>
              <div className="text-lg font-semibold text-emerald-800">{advisor.verified_successful_fundraises_startups ?? 0}</div>
            </div>
          </div>

          {/* Service Description */}
          {advisor.service_description && (
            <div>
              <div className="text-xs font-medium text-slate-500 mb-2">Service Description</div>
              <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">{advisor.service_description}</p>
            </div>
          )}
        </div>

        {/* Action Button - For non-public pages */}
        {onView && !isPublicPage && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => onView(advisor)}
            className="w-full mt-4"
          >
            <Eye className="h-4 w-4 mr-2" /> View Profile
          </Button>
        )}
      </div>
    </Card>
  );
};

export default InvestmentAdvisorCard;



import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Briefcase, MapPin, DollarSign, TrendingUp, Eye, Image as ImageIcon, Video, Globe, Linkedin, Mail, Building2, Share2, Send, UserPlus } from 'lucide-react';
import { createSlug, createProfileUrl } from '../../lib/slugUtils';

interface InvestorProfile {
  id?: string;
  user_id: string;
  firm_type?: string;
  global_hq?: string;
  investor_name?: string;
  website?: string;
  linkedin_link?: string;
  email?: string;
  geography?: string[];
  ticket_size_min?: number;
  ticket_size_max?: number;
  investment_stages?: string[];
  investment_thesis?: string;
  funding_requirements?: string;
  funding_stages?: string[];
  target_countries?: string[];
  company_size?: string;
  logo_url?: string;
  video_url?: string;
  media_type?: 'logo' | 'video';
  user?: {
    name?: string;
    email?: string;
  };
}

interface InvestorCardProps {
  investor: InvestorProfile;
  onView?: (investor: InvestorProfile) => void;
  totalStartupsInvested?: number;
  isPublicPage?: boolean;
  isAuthenticated?: boolean;
  currentUser?: {
    id: string;
    role?: string;
    email?: string;
  } | null;
  onConnect?: () => void;
  onApproach?: () => void;
}

const InvestorCard: React.FC<InvestorCardProps> = ({ investor, onView, totalStartupsInvested, isPublicPage = false, isAuthenticated = false, currentUser = null, onConnect, onApproach }) => {
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

  const formatCurrency = (value?: number, currency: string = 'USD') => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      notation: 'compact',
      maximumFractionDigits: 0
    }).format(value);
  };

  const videoEmbedUrl = investor.media_type === 'video' && investor.video_url 
    ? getYoutubeEmbedUrl(investor.video_url) 
    : null;

  const handleShare = async () => {
    // Create clean public shareable link similar to startup sharing
    const investorName = investor.investor_name || investor.user?.name || 'Investor';
    const slug = createSlug(investorName);
    const baseUrl = window.location.origin + window.location.pathname;
    
    let shareUrl: string;
    if (investor.id) {
      shareUrl = createProfileUrl(baseUrl, 'investor', 'investorId', investor.id, slug);
    } else if (investor.user_id) {
      shareUrl = createProfileUrl(baseUrl, 'investor', 'userId', investor.user_id, slug);
    } else {
      return;
    }
    
    const investorCurrency = (investor as any).currency || 'USD';
    const shareText = `Investor: ${investor.investor_name || 'Investor'}\nFirm Type: ${investor.firm_type || 'N/A'}\nLocation: ${investor.global_hq || 'N/A'}\nInvestment Range: ${investor.ticket_size_min && investor.ticket_size_max ? `${formatCurrency(investor.ticket_size_min, investorCurrency)} - ${formatCurrency(investor.ticket_size_max, investorCurrency)}` : 'N/A'}\n\nView investor profile: ${shareUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: investor.investor_name || 'Investor Profile',
          text: shareText,
          url: shareUrl,
        });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        alert('Investor profile link copied to clipboard!');
      } else {
        // Fallback: hidden textarea copy
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Investor profile link copied to clipboard!');
      }
    } catch (err) {
      console.error('Share failed', err);
      if (err instanceof Error && err.name !== 'AbortError') {
        alert('Unable to share. Try copying manually.');
      }
    }
  };

  const handleCardClick = () => {
    // Don't navigate if we're already on a public investor page
    if (isPublicPage || window.location.href.includes('view=investor')) {
      return;
    }

    if (onView) {
      onView(investor);
    } else {
      // Navigate to public investor profile page via URL (similar to startup sharing)
      const investorName = investor.investor_name || investor.user?.name || 'Investor';
      const slug = createSlug(investorName);
      const baseUrl = window.location.origin + window.location.pathname;
      
      let url: string;
      if (investor.id) {
        url = createProfileUrl(baseUrl, 'investor', 'investorId', investor.id, slug);
      } else if (investor.user_id) {
        url = createProfileUrl(baseUrl, 'investor', 'userId', investor.user_id, slug);
      } else {
        return;
      }
      window.location.href = url;
    }
  };

  return (
    <Card 
      className={`!p-0 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-white ${!isPublicPage ? 'cursor-pointer' : ''}`}
      onClick={!isPublicPage ? handleCardClick : undefined}
    >
      {/* Media Section */}
      <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
        {investor.media_type === 'logo' && investor.logo_url ? (
          <div className="w-full h-full flex items-center justify-center bg-white p-6">
            <img 
              src={investor.logo_url} 
              alt={`${investor.investor_name || 'Investor'} logo`}
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                // Fallback if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        ) : videoEmbedUrl ? (
          <div className="relative w-full h-full">
            <iframe
              src={videoEmbedUrl}
              title={`Video for ${investor.investor_name}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <div className="text-center">
              {investor.media_type === 'logo' ? (
                <ImageIcon className="h-16 w-16 mx-auto mb-2 opacity-50" />
              ) : (
                <Video className="h-16 w-16 mx-auto mb-2 opacity-50" />
              )}
              <p className="text-sm">No media available</p>
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-5 sm:p-6 relative">
        {/* Share Button - Top Right Corner of Content Section */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent card click when clicking share button
            handleShare();
          }}
          className="absolute top-5 right-5 sm:top-6 sm:right-6 z-10 p-2 bg-white hover:bg-slate-50 rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center border border-slate-200"
          title="Share investor profile"
        >
          <Share2 className="h-4 w-4 text-slate-700" />
        </button>

        {/* Header Section */}
        <div className="mb-4 pr-10">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">
            {investor.investor_name || investor.user?.name || 'Investor'}
          </h3>
        </div>

        {/* Single Line: Firm Type, Location, Investment Range, Number of Startups */}
        <div className="flex flex-wrap items-center gap-3 text-sm mb-4 pb-4 border-b border-slate-200">
          {investor.firm_type && (
            <span className="text-slate-700 font-medium">{investor.firm_type}</span>
          )}
          {investor.global_hq && (
            <>
              {investor.firm_type && <span className="text-slate-300">•</span>}
              <span className="text-slate-600 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-slate-500" />
                <span className="capitalize">{investor.global_hq}</span>
              </span>
            </>
          )}
          {investor.ticket_size_min && investor.ticket_size_max && (
            <>
              {(investor.firm_type || investor.global_hq) && <span className="text-slate-300">•</span>}
              <span className="text-slate-600 flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-slate-500" />
                <span>{formatCurrency(investor.ticket_size_min, (investor as any).currency || 'USD')} - {formatCurrency(investor.ticket_size_max, (investor as any).currency || 'USD')}</span>
              </span>
            </>
          )}
          {totalStartupsInvested !== undefined && (
            <>
              {(investor.firm_type || investor.global_hq || (investor.ticket_size_min && investor.ticket_size_max)) && <span className="text-slate-300">•</span>}
              <span className="text-slate-600 flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-slate-500" />
                <span>Startups Invested: <span className="font-semibold text-slate-900">{totalStartupsInvested}</span></span>
              </span>
            </>
          )}
        </div>

            {/* Contact Links */}
            {(investor.website || investor.linkedin_link) && (
              <div className="flex flex-wrap items-center gap-4 mb-4 pb-4 border-b border-slate-200">
                {investor.website && (
                  isAuthenticated ? (
                    <a
                      href={investor.website}
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
                {investor.linkedin_link && (
                  isAuthenticated ? (
                    <a
                      href={investor.linkedin_link}
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

        {/* Investment Details */}
        <div className="space-y-4">
          {/* Investment Stages and Geography in one line */}
          {(investor.investment_stages && investor.investment_stages.length > 0) || (investor.geography && investor.geography.length > 0) ? (
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {investor.investment_stages && investor.investment_stages.length > 0 && (
                  <>
                    <span className="text-xs font-medium text-slate-500">Investment Stages:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {investor.investment_stages.slice(0, 3).map((stage, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-md">
                          {stage}
                        </span>
                      ))}
                      {investor.investment_stages.length > 3 && (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md">
                          +{investor.investment_stages.length - 3} more
                        </span>
                      )}
                    </div>
                  </>
                )}
                {investor.geography && investor.geography.length > 0 && (
                  <>
                    {investor.investment_stages && investor.investment_stages.length > 0 && (
                      <span className="text-slate-300 mx-1">•</span>
                    )}
                    <span className="text-xs font-medium text-slate-500">Geography:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {investor.geography.slice(0, 3).map((geo, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-md">
                          {geo}
                        </span>
                      ))}
                      {investor.geography.length > 3 && (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md">
                          +{investor.geography.length - 3} more
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {/* Investment Thesis */}
          {investor.investment_thesis && (
            <div>
              <div className="text-xs font-medium text-slate-500 mb-2">Investment Thesis</div>
              <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">{investor.investment_thesis}</p>
            </div>
          )}
        </div>

        {/* Action Buttons - Only show on public page */}
        {isPublicPage && (
          <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onConnect}
            >
              <Mail className="h-4 w-4 mr-2" />
              Connect
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={onApproach}
            >
              <Send className="h-4 w-4 mr-2" />
              Pitch
            </Button>
          </div>
        )}

        {/* Action Button - For non-public pages */}
        {onView && !isPublicPage && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => onView(investor)}
            className="w-full"
          >
            <Eye className="h-4 w-4 mr-2" /> View Profile
          </Button>
        )}
      </div>
    </Card>
  );
};

export default InvestorCard;


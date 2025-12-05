import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Briefcase, MapPin, DollarSign, TrendingUp, Eye, Image as ImageIcon, Video, Globe, Linkedin, Mail } from 'lucide-react';

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
}

const InvestorCard: React.FC<InvestorCardProps> = ({ investor, onView }) => {
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

  const formatCurrency = (value?: number) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 0
    }).format(value);
  };

  const videoEmbedUrl = investor.media_type === 'video' && investor.video_url 
    ? getYoutubeEmbedUrl(investor.video_url) 
    : null;

  return (
    <Card className="!p-0 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-white">
      {/* Media Section */}
      <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {investor.media_type === 'logo' && investor.logo_url ? (
          <div className="w-full h-full flex items-center justify-center bg-white p-4">
            <img 
              src={investor.logo_url} 
              alt={`${investor.investor_name || 'Investor'} logo`}
              className="max-w-full max-h-full object-contain"
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
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-2xl font-bold text-slate-800 mb-2">
              {investor.investor_name || investor.user?.name || 'Investor'}
            </h3>
            {investor.firm_type && (
              <p className="text-slate-600 font-medium mb-2">{investor.firm_type}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {investor.global_hq && (
                <span className="text-slate-500 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {investor.global_hq}
                </span>
              )}
              {investor.ticket_size_min && investor.ticket_size_max && (
                <>
                  {investor.global_hq && <span className="text-slate-300">•</span>}
                  <span className="text-slate-500 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {formatCurrency(investor.ticket_size_min)} - {formatCurrency(investor.ticket_size_max)}
                  </span>
                </>
              )}
            </div>
            
            {/* Contact Links */}
            {(investor.website || investor.linkedin_link || investor.email) && (
              <div className="flex flex-wrap items-center gap-3 mt-2">
                {investor.website && (
                  <a
                    href={investor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
                  >
                    <Globe className="h-3 w-3" />
                    Website
                  </a>
                )}
                {investor.linkedin_link && (
                  <a
                    href={investor.linkedin_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
                  >
                    <Linkedin className="h-3 w-3" />
                    LinkedIn
                  </a>
                )}
                {investor.email && (
                  <a
                    href={`mailto:${investor.email}`}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
                  >
                    <Mail className="h-3 w-3" />
                    Email
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Investment Details */}
        <div className="space-y-3 mb-4">
          {investor.investment_stages && investor.investment_stages.length > 0 && (
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">Investment Stages</div>
              <div className="flex flex-wrap gap-1">
                {investor.investment_stages.slice(0, 3).map((stage, idx) => (
                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {stage}
                  </span>
                ))}
                {investor.investment_stages.length > 3 && (
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">
                    +{investor.investment_stages.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {investor.geography && investor.geography.length > 0 && (
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">Geography</div>
              <div className="flex flex-wrap gap-1">
                {investor.geography.slice(0, 3).map((geo, idx) => (
                  <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    {geo}
                  </span>
                ))}
                {investor.geography.length > 3 && (
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">
                    +{investor.geography.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {investor.investment_thesis && (
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">Investment Thesis</div>
              <p className="text-sm text-slate-700 line-clamp-2">{investor.investment_thesis}</p>
            </div>
          )}
        </div>

        {/* Action Button */}
        {onView && (
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


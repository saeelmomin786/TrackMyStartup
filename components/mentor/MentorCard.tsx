import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Briefcase, MapPin, Users, TrendingUp, Eye, Image as ImageIcon, Video, Globe, Linkedin, Mail, Award, DollarSign } from 'lucide-react';

interface MentorProfile {
  id?: string;
  user_id: string;
  mentor_name?: string;
  mentor_type?: string;
  location?: string;
  website?: string;
  linkedin_link?: string;
  email?: string;
  expertise_areas?: string[];
  sectors?: string[];
  mentoring_stages?: string[];
  years_of_experience?: number;
  companies_mentored?: number;
  companies_founded?: number;
  current_role?: string;
  previous_companies?: string[];
  mentoring_approach?: string;
  availability?: string;
  preferred_engagement?: string;
  fee_type?: string;
  fee_amount_min?: number;
  fee_amount_max?: number;
  fee_currency?: string;
  fee_description?: string;
  logo_url?: string;
  video_url?: string;
  media_type?: 'logo' | 'video';
  user?: {
    name?: string;
    email?: string;
  };
}

interface MentorCardProps {
  mentor: MentorProfile;
  onView?: (mentor: MentorProfile) => void;
}

const MentorCard: React.FC<MentorCardProps> = ({ mentor, onView }) => {
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
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
        notation: 'compact',
        maximumFractionDigits: 0
      }).format(value);
    } catch {
      return `${currency || 'USD'} ${value.toLocaleString()}`;
    }
  };

  const formatCurrencySimple = (value?: number, currency?: string) => {
    if (!value) return '';
    const currencySymbols: { [key: string]: string } = {
      'USD': '$',
      'INR': '₹',
      'EUR': '€',
      'GBP': '£',
      'SGD': 'S$',
      'AED': 'AED '
    };
    const symbol = currencySymbols[currency || 'USD'] || currency || '$';
    return `${symbol}${value.toLocaleString()}`;
  };

  const formatFeeRange = () => {
    if (!mentor.fee_type) return null;
    
    if (mentor.fee_type === 'Free') {
      return 'Free';
    }
    
    if (mentor.fee_type === 'Equity-based') {
      return 'Equity-based';
    }
    
    if (mentor.fee_amount_min && mentor.fee_amount_max) {
      if (mentor.fee_amount_min === mentor.fee_amount_max) {
        return formatCurrencySimple(mentor.fee_amount_min, mentor.fee_currency);
      }
      // Show both amounts with their currencies
      const minStr = formatCurrencySimple(mentor.fee_amount_min, mentor.fee_currency);
      const maxStr = formatCurrencySimple(mentor.fee_amount_max, mentor.fee_currency);
      return `${minStr} - ${maxStr}`;
    }
    
    if (mentor.fee_amount_min) {
      return formatCurrencySimple(mentor.fee_amount_min, mentor.fee_currency);
    }
    
    return mentor.fee_type;
  };

  const videoEmbedUrl = mentor.media_type === 'video' && mentor.video_url 
    ? getYoutubeEmbedUrl(mentor.video_url) 
    : null;

  return (
    <Card className="!p-0 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-white">
      {/* Media Section */}
      <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {mentor.media_type === 'logo' && mentor.logo_url ? (
          <div className="w-full h-full flex items-center justify-center bg-white p-4">
            <img 
              src={mentor.logo_url} 
              alt={`${mentor.mentor_name || 'Mentor'} logo`}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : videoEmbedUrl ? (
          <div className="relative w-full h-full">
            <iframe
              src={videoEmbedUrl}
              title={`Video for ${mentor.mentor_name}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <div className="text-center">
              {mentor.media_type === 'logo' ? (
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
      <div className="p-5 sm:p-6">
        {/* Header Section */}
        <div className="mb-5">
          <h3 className="text-2xl font-bold text-slate-800 mb-1">
            {mentor.mentor_name || mentor.user?.name || 'Mentor'}
          </h3>
          {mentor.mentor_type && (
            <p className="text-slate-600 font-medium text-sm mb-3">{mentor.mentor_type}</p>
          )}
          
          {/* Experience Info */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 mb-3">
            {mentor.years_of_experience && (
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-slate-500" />
                {mentor.years_of_experience} years
              </span>
            )}
            {mentor.companies_mentored && (
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-slate-500" />
                {mentor.companies_mentored} mentored
              </span>
            )}
          </div>
        </div>

        {/* Mentoring Details */}
        <div className="space-y-4 mb-5">
          {mentor.expertise_areas && mentor.expertise_areas.length > 0 && (
            <div>
              <div className="text-xs font-medium text-slate-500 mb-2">Expertise Areas</div>
              <div className="flex flex-wrap gap-1.5">
                {mentor.expertise_areas.map((area, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full border border-blue-200">
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {mentor.sectors && mentor.sectors.length > 0 && (
            <div>
              <div className="text-xs font-medium text-slate-500 mb-2">Sectors</div>
              <div className="flex flex-wrap gap-1.5">
                {mentor.sectors.map((sector, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full border border-green-200">
                    {sector}
                  </span>
                ))}
              </div>
            </div>
          )}

          {mentor.mentoring_approach && (
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1.5">Mentoring Approach</div>
              <p className="text-sm text-slate-700 leading-relaxed">{mentor.mentoring_approach}</p>
            </div>
          )}

          {(mentor.availability || mentor.preferred_engagement) && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              {mentor.availability && (
                <>
                  <span className="font-medium">Availability:</span>
                  <span>{mentor.availability}</span>
                </>
              )}
              {mentor.preferred_engagement && (
                <>
                  {mentor.availability && <span className="text-slate-300">•</span>}
                  <span className="font-medium">Engagement:</span>
                  <span>{mentor.preferred_engagement}</span>
                </>
              )}
            </div>
          )}

          {mentor.fee_type && (
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1.5">Fee Structure</div>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-green-600 flex-shrink-0" />
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold text-slate-800">
                    {formatFeeRange()}
                  </span>
                  {mentor.fee_type !== 'Free' && mentor.fee_type !== 'Equity-based' && (
                    <span className="text-xs text-slate-500">({mentor.fee_type})</span>
                  )}
                </div>
              </div>
              {mentor.fee_description && (
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{mentor.fee_description}</p>
              )}
            </div>
          )}
        </div>

        {/* Contact Links */}
        {(mentor.website || mentor.linkedin_link || mentor.email) && (
          <div className="pt-4 border-t border-slate-200 mt-4">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              {mentor.website && mentor.website.trim() && (
                <a
                  href={mentor.website.startsWith('http') ? mentor.website : `https://${mentor.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Globe className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Website</span>
                </a>
              )}
              {mentor.linkedin_link && mentor.linkedin_link.trim() && (
                <a
                  href={mentor.linkedin_link.startsWith('http') ? mentor.linkedin_link : `https://${mentor.linkedin_link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Linkedin className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">LinkedIn</span>
                </a>
              )}
              {mentor.email && mentor.email.trim() && (
                <a
                  href={`mailto:${mentor.email}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Email</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        {onView && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => onView(mentor)}
            className="w-full"
          >
            <Eye className="h-4 w-4 mr-2" /> View Profile
          </Button>
        )}
      </div>
    </Card>
  );
};

export default MentorCard;


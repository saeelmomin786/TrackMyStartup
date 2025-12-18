import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { mentorService } from '../../lib/mentorService';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Briefcase, MapPin, Users, TrendingUp, Eye, Image as ImageIcon, Video, Globe, Linkedin, Mail, Award, DollarSign, ChevronDown, ChevronUp, Share2 } from 'lucide-react';

interface ProfessionalExperience {
  id: number;
  company: string;
  position: string;
  description?: string;
  from_date: string;
  to_date?: string;
  currently_working: boolean;
}

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
  equity_amount_min?: number;
  equity_amount_max?: number;
  fee_description?: string;
  logo_url?: string;
  video_url?: string;
  media_type?: 'logo' | 'video';
  // Metrics from dashboard
  startupsMentoring?: number;
  startupsMentoredPreviously?: number;
  verifiedStartupsMentored?: number;
  user?: {
    name?: string;
    email?: string;
  };
}

interface MentorCardProps {
  mentor: MentorProfile;
  onView?: (mentor: MentorProfile) => void;
  onConnect?: () => void;
  connectLabel?: string;
  connectDisabled?: boolean;
}

const MentorCard: React.FC<MentorCardProps> = ({ mentor, onView, onConnect, connectLabel, connectDisabled }) => {
  const [professionalExperiences, setProfessionalExperiences] = useState<ProfessionalExperience[]>([]);
  const [showProfessionalExp, setShowProfessionalExp] = useState(false);
  const [loadingExp, setLoadingExp] = useState(false);
  const [metrics, setMetrics] = useState({
    startupsMentoring: mentor.startupsMentoring ?? 0,
    startupsMentoredPreviously: mentor.startupsMentoredPreviously ?? 0,
    verifiedStartupsMentored: mentor.verifiedStartupsMentored ?? 0,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const handleShare = async () => {
    if (!mentor.user_id && !mentor.id) return;

    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('view', 'mentor');
    if (mentor.id) {
      url.searchParams.set('mentorId', mentor.id);
    } else if (mentor.user_id) {
      url.searchParams.set('userId', mentor.user_id);
    }
    const shareUrl = url.toString();

    const mentorName = mentor.mentor_name || mentor.user?.name || 'Mentor';
    const location = mentor.location || '';
    const expertise = (mentor.expertise_areas || []).join(', ');
    const sectors = (mentor.sectors || []).join(', ');

    const shareText = [
      `Mentor: ${mentorName}`,
      location ? `Location: ${location}` : null,
      expertise ? `Expertise: ${expertise}` : null,
      sectors ? `Sectors: ${sectors}` : null,
      '',
      `View mentor profile: ${shareUrl}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${mentorName} - Mentor Profile`,
          text: shareText,
          url: shareUrl,
        });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        alert('Mentor profile link copied to clipboard!');
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Mentor profile link copied to clipboard!');
      }
    } catch (err) {
      console.error('Share failed', err);
      if (err instanceof Error && err.name !== 'AbortError') {
        alert('Unable to share. Try copying manually.');
      }
    }
  };

  // Fetch metrics if not provided
  useEffect(() => {
    if (mentor.user_id && (!mentor.startupsMentoring && !mentor.startupsMentoredPreviously && !mentor.verifiedStartupsMentored)) {
      loadMetrics();
    }
  }, [mentor.user_id]);

  const loadMetrics = async () => {
    if (!mentor.user_id || loadingMetrics) return;
    
    setLoadingMetrics(true);
    try {
      const mentorMetrics = await mentorService.getMentorMetrics(mentor.user_id);
      setMetrics({
        startupsMentoring: mentorMetrics.startupsMentoring,
        startupsMentoredPreviously: mentorMetrics.startupsMentoredPreviously,
        verifiedStartupsMentored: mentorMetrics.verifiedStartupsMentored,
      });
    } catch (error) {
      console.error('Error loading mentor metrics:', error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    if (showProfessionalExp && mentor.user_id) {
      loadProfessionalExperiences();
    }
  }, [showProfessionalExp, mentor.user_id]);

  const loadProfessionalExperiences = async () => {
    if (professionalExperiences.length > 0) return; // Already loaded
    
    setLoadingExp(true);
    try {
      const { data, error } = await supabase
        .from('mentor_professional_experience')
        .select('*')
        .eq('mentor_id', mentor.user_id)
        .order('from_date', { ascending: false });

      if (error) {
        console.error('Error loading professional experiences:', error);
      } else if (data) {
        setProfessionalExperiences(data);
      }
    } catch (error) {
      console.error('Error loading professional experiences:', error);
    } finally {
      setLoadingExp(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Present';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    } catch {
      return dateString;
    }
  };

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
    <Card className="w-full max-w-2xl mx-auto !p-0 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-white">
      {/* Media Section */}
      <div className="relative w-full aspect-[16/7] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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
      <div className="p-4 sm:p-5 relative">
        {/* Share Button */}
        {(mentor.id || mentor.user_id) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className="absolute top-5 right-5 sm:top-6 sm:right-6 z-10 p-2 bg-white hover:bg-slate-50 rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center border border-slate-200"
            title="Share mentor profile"
          >
            <Share2 className="h-4 w-4 text-slate-700" />
          </button>
        )}

        {/* Header Section */}
        <div className="mb-5 pr-10">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-1">
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
          </div>
        </div>

        {/* Mentoring Stats */}
        <div className="mb-5 p-3 bg-slate-50 rounded-lg border border-slate-200">
          {loadingMetrics ? (
            <div className="text-center py-2 text-sm text-slate-500">Loading metrics...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div>
                <div className="text-base sm:text-lg font-bold text-slate-800">
                  {metrics.startupsMentoring}
                </div>
                <div className="text-xs text-slate-600 mt-1">Startup Mentoring</div>
                <div className="text-xs text-slate-500">(Active)</div>
              </div>
              <div>
                <div className="text-base sm:text-lg font-bold text-slate-800">
                  {metrics.startupsMentoredPreviously}
                </div>
                <div className="text-xs text-slate-600 mt-1">Previously Mentored</div>
              </div>
              <div>
                <div className="text-base sm:text-lg font-bold text-slate-800">
                  {metrics.startupsMentoring + metrics.startupsMentoredPreviously}
                </div>
                <div className="text-xs text-slate-600 mt-1">Startups Mentored</div>
                <div className="text-xs text-slate-500">(Total)</div>
              </div>
              <div>
                <div className="text-base sm:text-lg font-bold text-blue-600">
                  {metrics.verifiedStartupsMentored}
                </div>
                <div className="text-xs text-slate-600 mt-1">Verified Mentored</div>
                <div className="text-xs text-blue-600">(TMS Users)</div>
              </div>
            </div>
          )}
        </div>

        {/* Mentoring Details */}
        <div className="space-y-4 mb-5">
          {/* Expertise Areas & Sectors in one line */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          {mentor.mentoring_approach && (
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1.5">Mentoring Approach</div>
              <p className="text-sm text-slate-700 leading-relaxed">{mentor.mentoring_approach}</p>
            </div>
          )}

          {/* Availability & Fee Structure in one line */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mentor.availability && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="font-medium">Availability:</span>
                <span>{mentor.availability}</span>
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
        </div>

        {/* Professional Experience Section */}
        <div className="mb-5">
          <button
            onClick={() => setShowProfessionalExp(!showProfessionalExp)}
            className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Professional Experience</span>
              {professionalExperiences.length > 0 && (
                <span className="text-xs text-slate-500">({professionalExperiences.length})</span>
              )}
            </div>
            {showProfessionalExp ? (
              <ChevronUp className="h-4 w-4 text-slate-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-600" />
            )}
          </button>

          {showProfessionalExp && (
            <div className="mt-3 space-y-3">
              {loadingExp ? (
                <div className="text-center py-4 text-sm text-slate-500">Loading...</div>
              ) : professionalExperiences.length > 0 ? (
                professionalExperiences.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3 bg-white border border-slate-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-800 text-sm">{exp.position}</h4>
                        <p className="text-sm text-slate-600 font-medium">{exp.company}</p>
                      </div>
                      <div className="text-xs text-slate-500 text-right">
                        {formatDate(exp.from_date)} - {exp.currently_working ? 'Present' : formatDate(exp.to_date)}
                      </div>
                    </div>
                    {exp.description && (
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">{exp.description}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-sm text-slate-500">
                  No professional experience added yet
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {(onConnect || onView) && (
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            {onConnect && (
              <Button
                size="sm"
                variant="primary"
                disabled={connectDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onConnect();
                }}
                className="sm:flex-1"
              >
                {connectLabel || 'Connect'}
              </Button>
            )}
            {onView && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onView(mentor)}
                className="sm:flex-1"
              >
                View Full Profile
              </Button>
            )}
          </div>
        )}

        {/* Contact Links */}
        {(mentor.website || mentor.linkedin_link) && (
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


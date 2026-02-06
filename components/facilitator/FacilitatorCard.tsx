import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Building2, MapPin, Users, Image as ImageIcon, Video, Globe, Linkedin, Share2, Eye } from 'lucide-react';
import { createSlug } from '../../lib/slugUtils';

interface FacilitatorProfile {
  id?: string;
  user_id: string;
  center_name?: string;
  organization_name?: string;
  country?: string;
  website?: string;
  linkedin_link?: string;
  email?: string;
  geography?: string[];
  program_types?: string[];
  focus_stages?: string[];
  focus_domains?: string[];
  incubation_capacity?: number;
  currency?: string;
  center_description?: string;
  logo_url?: string;
  video_url?: string;
  media_type?: 'logo' | 'video';
  startups_incubated?: number;
  startups_graduated?: number;
  startups_funded?: number;
  verified_startups_incubated?: number;
  verified_startups_graduated?: number;
  verified_startups_funded?: number;
  user?: {
    name?: string;
    email?: string;
  };
}

interface FacilitatorCardProps {
  facilitator: FacilitatorProfile;
  onView?: (facilitator: FacilitatorProfile) => void;
  isPublicPage?: boolean;
  isAuthenticated?: boolean;
  currentUser?: {
    id: string;
    role?: string;
    email?: string;
  } | null;
}

const FacilitatorCard: React.FC<FacilitatorCardProps> = ({ 
  facilitator, 
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

  const videoEmbedUrl = facilitator.video_url ? getYoutubeEmbedUrl(facilitator.video_url) : null;

  const handleShare = async () => {
    const centerName = facilitator.center_name || 'Incubation Center';
    const slug = createSlug(centerName);
    const baseUrl = window.location.origin;
    
    // For now, create a simple URL format for facilitators
    // Format: /facilitator/center-name
    const shareUrl = slug ? `${baseUrl}/facilitator/${slug}` : baseUrl;
    
    const displayName = facilitator.center_name || facilitator.organization_name || 'Incubation Center';
    const shareText = `Incubation Center: ${displayName}\nOrganization: ${facilitator.organization_name || 'N/A'}\nLocation: ${facilitator.country || 'N/A'}\nPrograms: ${facilitator.program_types?.join(', ') || 'N/A'}\n\nView center profile: ${shareUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: displayName + ' - Incubation Center Profile',
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert('Profile link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Media Section */}
      {facilitator.media_type === 'video' && videoEmbedUrl ? (
        <div className="w-full h-48 bg-slate-100">
          <iframe
            src={videoEmbedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : facilitator.logo_url ? (
        <div className="w-full h-48 bg-slate-100 flex items-center justify-center">
          <img
            src={facilitator.logo_url}
            alt={facilitator.center_name || 'Center logo'}
            className="max-h-full max-w-full object-contain p-4"
          />
        </div>
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Building2 className="w-20 h-20 text-white opacity-50" />
        </div>
      )}

      <div className="p-6 space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            {facilitator.center_name || facilitator.organization_name || 'Incubation Center'}
          </h3>
          {facilitator.organization_name && facilitator.center_name !== facilitator.organization_name && (
            <p className="text-sm text-slate-600 mt-1">{facilitator.organization_name}</p>
          )}
        </div>

        {/* Location */}
        {facilitator.country && (
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{facilitator.country}</span>
          </div>
        )}

        {/* Program Types */}
        {facilitator.program_types && facilitator.program_types.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-700 mb-2">Programs Offered</h4>
            <div className="flex flex-wrap gap-2">
              {facilitator.program_types.slice(0, 3).map((type) => (
                <span
                  key={type}
                  className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium"
                >
                  {type}
                </span>
              ))}
              {facilitator.program_types.length > 3 && (
                <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                  +{facilitator.program_types.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Focus Areas */}
        <div className="grid grid-cols-2 gap-3">
          {facilitator.focus_stages && facilitator.focus_stages.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-700 mb-1">Focus Stages</h4>
              <div className="flex flex-wrap gap-1">
                {facilitator.focus_stages.slice(0, 2).map((stage) => (
                  <span key={stage} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                    {stage}
                  </span>
                ))}
                {facilitator.focus_stages.length > 2 && (
                  <span className="text-xs text-slate-500">+{facilitator.focus_stages.length - 2}</span>
                )}
              </div>
            </div>
          )}

          {facilitator.focus_domains && facilitator.focus_domains.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-700 mb-1">Focus Domains</h4>
              <div className="flex flex-wrap gap-1">
                {facilitator.focus_domains.slice(0, 2).map((domain) => (
                  <span key={domain} className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                    {domain}
                  </span>
                ))}
                {facilitator.focus_domains.length > 2 && (
                  <span className="text-xs text-slate-500">+{facilitator.focus_domains.length - 2}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Incubation Capacity */}
        {facilitator.incubation_capacity && facilitator.incubation_capacity > 0 && (
          <div className="flex items-center gap-2 text-slate-700">
            <Users className="w-4 h-4" />
            <span className="text-sm">Capacity: <strong>{facilitator.incubation_capacity}</strong> startups</span>
          </div>
        )}

        {/* Description */}
        {facilitator.center_description && (
          <p className="text-sm text-slate-600 line-clamp-3">
            {facilitator.center_description}
          </p>
        )}

        {/* Metrics */}
        {(facilitator.startups_incubated || facilitator.startups_graduated || facilitator.startups_funded) ? (
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-200">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{facilitator.startups_incubated || 0}</div>
              <div className="text-xs text-slate-600">Incubated</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{facilitator.startups_graduated || 0}</div>
              <div className="text-xs text-slate-600">Graduated</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{facilitator.startups_funded || 0}</div>
              <div className="text-xs text-slate-600">Funded</div>
            </div>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
          {facilitator.website && (
            <a
              href={facilitator.website}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Visit website"
            >
              <Globe className="w-4 h-4" />
            </a>
          )}
          {facilitator.linkedin_link && (
            <a
              href={facilitator.linkedin_link}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="LinkedIn profile"
            >
              <Linkedin className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={handleShare}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors ml-auto"
            title="Share profile"
          >
            <Share2 className="w-4 h-4" />
          </button>
          {onView && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => onView(facilitator)}
              icon={<Eye className="w-4 h-4" />}
            >
              View
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default FacilitatorCard;

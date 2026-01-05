import React from 'react';
import { Share2, Eye, User, Users } from 'lucide-react';
import { createSlug, createProfileUrl } from '../../lib/slugUtils';
import Button from '../ui/Button';

interface MentorProfile {
  id?: string;
  user_id: string;
  mentor_name?: string;
  mentor_type?: string;
  location?: string;
  current_role?: string;
  logo_url?: string;
  years_of_experience?: number;
  // Metrics
  startupsMentoring?: number;
  startupsMentoredPreviously?: number;
  verifiedStartupsMentored?: number;
  // Experience years
  startupExperienceYears?: number;
  professionalExperienceYears?: number;
}

interface MentorGridCardProps {
  mentor: MentorProfile;
  onConnect?: () => void;
  connectLabel?: string;
  connectDisabled?: boolean;
}

const MentorGridCard: React.FC<MentorGridCardProps> = ({ 
  mentor, 
  onConnect, 
  connectLabel = 'Connect',
  connectDisabled = false 
}) => {
  const handleShare = async () => {
    if (!mentor.user_id && !mentor.id) return;

    const mentorName = mentor.mentor_name || 'Mentor';
    const slug = createSlug(mentorName);
    const baseUrl = window.location.origin;
    const shareUrl = createProfileUrl(baseUrl, 'mentor', slug, mentor.user_id || mentor.id);

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${mentorName} - Mentor Profile`,
          text: `Check out ${mentorName}'s mentor profile on Track My Startup`,
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

  const handleViewMore = () => {
    const mentorName = mentor.mentor_name || 'Mentor';
    const slug = createSlug(mentorName);
    const baseUrl = window.location.origin;
    const profileUrl = createProfileUrl(baseUrl, 'mentor', slug, mentor.user_id || mentor.id);
    window.location.href = profileUrl;
  };

  const startupsMentoring = mentor.startupsMentoring ?? 0;
  const startupsMentoredPreviously = mentor.startupsMentoredPreviously ?? 0;
  const totalStartupsMentored = startupsMentoring + startupsMentoredPreviously;
  const verifiedMentored = mentor.verifiedStartupsMentored ?? 0;
  
  // Experience years - use provided values or calculate from years_of_experience
  const startupExperienceYears = mentor.startupExperienceYears ?? 0;
  const professionalExperienceYears = mentor.professionalExperienceYears ?? mentor.years_of_experience ?? 0;
  
  // Debug log to verify values are being passed
  if (process.env.NODE_ENV === 'development' && mentor.mentor_name) {
    console.log(`MentorCard ${mentor.mentor_name}: startupExperienceYears=${startupExperienceYears}, professionalExperienceYears=${professionalExperienceYears}`);
  }

  const primaryDesignation = mentor.mentor_type || mentor.current_role || 'Mentor';

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 overflow-hidden flex flex-col relative">
      {/* Share Button - Top Right Corner */}
      {(mentor.id || mentor.user_id) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleShare();
          }}
          className="absolute top-4 right-4 z-10 p-2 bg-white hover:bg-slate-50 rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center border border-slate-200"
          title="Share mentor profile"
        >
          <Share2 className="h-4 w-4 text-slate-700" />
        </button>
      )}

      {/* Profile Image Section */}
      <div className="flex justify-center pt-6 pb-4">
        {mentor.logo_url ? (
          <img 
            src={mentor.logo_url} 
            alt={mentor.mentor_name || 'Mentor'}
            className="w-28 h-28 rounded-full object-cover border-2 border-slate-200"
          />
        ) : (
          <div className="w-28 h-28 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
            <User className="h-14 w-14 text-slate-400" />
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="px-4 pb-4 flex-1 flex flex-col">
        {/* Name */}
        <div className="text-center mb-3">
          <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
            {mentor.mentor_name || 'Mentor'}
          </h3>
        </div>

        {/* Mentor, Location, Experience, and Designation */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
          <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full border border-blue-200">
            Mentor
          </span>
          {mentor.location && (
            <span className="text-xs text-slate-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              {mentor.location}
            </span>
          )}
          {mentor.years_of_experience && (
            <span className="text-xs text-slate-600 flex items-center gap-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              <Users className="h-3 w-3 text-slate-500" />
              {mentor.years_of_experience} {mentor.years_of_experience === 1 ? 'year' : 'years'} exp
            </span>
          )}
          <span className="text-xs font-medium text-slate-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
            {primaryDesignation}
          </span>
        </div>

        {/* Stats Grid - 2x2 layout */}
        <div className="grid grid-cols-2 gap-3 mb-4 pt-3 border-t border-slate-100">
          <div className="text-center">
            <div className="text-xl font-bold text-slate-800">{startupExperienceYears}</div>
            <div className="text-xs text-slate-500 leading-tight mt-1">Startup Experience</div>
            <div className="text-[10px] text-slate-400 leading-tight">(years)</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-slate-800">{professionalExperienceYears}</div>
            <div className="text-xs text-slate-500 leading-tight mt-1">Professional Experience</div>
            <div className="text-[10px] text-slate-400 leading-tight">(years)</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-slate-800">{totalStartupsMentored}</div>
            <div className="text-xs text-slate-500 leading-tight mt-1">Startups Mentored</div>
            <div className="text-[10px] text-slate-400 leading-tight">(Total)</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{verifiedMentored}</div>
            <div className="text-xs text-blue-600 leading-tight mt-1">Verified Mentored</div>
            <div className="text-[10px] text-blue-500 leading-tight">(TMS Users)</div>
          </div>
        </div>

        {/* Action Row */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
          {/* View More Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleViewMore}
            className="flex-1 text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            View More
          </Button>

          {/* Connect Button */}
          <Button
            size="sm"
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              if (!connectDisabled && onConnect) {
                onConnect();
              }
            }}
            disabled={connectDisabled}
            className="flex-1 text-xs"
          >
            {connectLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MentorGridCard;


import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { mentorService } from '../../lib/mentorService';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Briefcase, MapPin, Users, TrendingUp, Eye, Image as ImageIcon, Video, Globe, Linkedin, Mail, Award, DollarSign, ChevronDown, ChevronUp, Share2, Building2 } from 'lucide-react';
import { createSlug, createProfileUrl } from '../../lib/slugUtils';

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
  isPublicView?: boolean; // If true, skip loading metrics (for public pages)
  currentUserId?: string | null; // Current authenticated user ID (to check if viewing own profile)
}

interface StartupAssignment {
  id: number;
  mentor_id: string;
  startup_id?: number;
  status: 'active' | 'completed' | 'cancelled';
  assigned_at: string;
  completed_at?: string;
  notes?: string;
  startup?: {
    id: number;
    name: string;
    sector?: string;
  };
}

interface FoundedStartup {
  id: number;
  mentor_id: string;
  startup_id?: number;
  founded_at: string;
  notes?: string;
  startup?: {
    id: number;
    name: string;
    sector?: string;
  };
}

const MentorCard: React.FC<MentorCardProps> = ({ mentor, onView, onConnect, connectLabel, connectDisabled, isPublicView = false, currentUserId = null }) => {
  const [professionalExperiences, setProfessionalExperiences] = useState<ProfessionalExperience[]>([]);
  const [showProfessionalExp, setShowProfessionalExp] = useState(false);
  const [loadingExp, setLoadingExp] = useState(false);
  const [startupAssignments, setStartupAssignments] = useState<StartupAssignment[]>([]);
  const [showMentoringExp, setShowMentoringExp] = useState(false);
  const [loadingMentoringExp, setLoadingMentoringExp] = useState(false);
  const [foundedStartups, setFoundedStartups] = useState<FoundedStartup[]>([]);
  const [showStartupExp, setShowStartupExp] = useState(false);
  const [loadingStartupExp, setLoadingStartupExp] = useState(false);
  const [metrics, setMetrics] = useState(() => ({
    startupsMentoring: mentor.startupsMentoring ?? 0,
    startupsMentoredPreviously: mentor.startupsMentoredPreviously ?? 0,
    verifiedStartupsMentored: mentor.verifiedStartupsMentored ?? 0,
  }));
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const handleShare = async () => {
    if (!mentor.user_id && !mentor.id) return;

    const mentorName = mentor.mentor_name || mentor.user?.name || 'Mentor';
    const slug = createSlug(mentorName);
    const baseUrl = window.location.origin;
    
    // Use SEO-friendly path-based URL
    const shareUrl = createProfileUrl(baseUrl, 'mentor', slug, mentor.user_id || mentor.id);

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

  // Update metrics when mentor prop changes (especially for public views where metrics are loaded asynchronously)
  useEffect(() => {
    // Always update metrics from mentor prop if they exist (even if 0)
    if (mentor.startupsMentoring !== undefined || 
        mentor.startupsMentoredPreviously !== undefined || 
        mentor.verifiedStartupsMentored !== undefined) {
      setMetrics(prevMetrics => {
        const newMetrics = {
          startupsMentoring: mentor.startupsMentoring !== undefined ? mentor.startupsMentoring : prevMetrics.startupsMentoring,
          startupsMentoredPreviously: mentor.startupsMentoredPreviously !== undefined ? mentor.startupsMentoredPreviously : prevMetrics.startupsMentoredPreviously,
          verifiedStartupsMentored: mentor.verifiedStartupsMentored !== undefined ? mentor.verifiedStartupsMentored : prevMetrics.verifiedStartupsMentored,
        };
        
        // Only update if values actually changed
        if (newMetrics.startupsMentoring !== prevMetrics.startupsMentoring ||
            newMetrics.startupsMentoredPreviously !== prevMetrics.startupsMentoredPreviously ||
            newMetrics.verifiedStartupsMentored !== prevMetrics.verifiedStartupsMentored) {
          return newMetrics;
        }
        return prevMetrics;
      });
    }
  }, [mentor.startupsMentoring, mentor.startupsMentoredPreviously, mentor.verifiedStartupsMentored]);

  // Fetch metrics if not provided (only for authenticated users viewing their own profile, not on public pages)
  useEffect(() => {
    // Skip metrics loading on public pages or if not viewing own profile
    if (isPublicView) return;
    if (currentUserId && mentor.user_id !== currentUserId) return;
    
    if (mentor.user_id && (!mentor.startupsMentoring && !mentor.startupsMentoredPreviously && !mentor.verifiedStartupsMentored)) {
      loadMetrics();
    }
  }, [mentor.user_id, isPublicView, currentUserId]);

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
    if (showProfessionalExp && (mentor.user_id || mentor.id)) {
      loadProfessionalExperiences();
    }
  }, [showProfessionalExp, mentor.user_id, mentor.id]);

  useEffect(() => {
    if (showMentoringExp && (mentor.user_id || mentor.id)) {
      loadStartupAssignments();
    }
  }, [showMentoringExp, mentor.user_id, mentor.id]);

  useEffect(() => {
    if (showStartupExp && (mentor.user_id || mentor.id)) {
      loadFoundedStartups();
    }
  }, [showStartupExp, mentor.user_id, mentor.id]);

  // Helper function to get user_id from mentor profile id
  const getUserIdFromMentorId = async (mentorProfileId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('mentor_profiles')
        .select('user_id')
        .eq('id', mentorProfileId)
        .single();
      
      if (error) {
        console.error('Error fetching user_id from mentor profile:', error);
        return null;
      }
      
      return data?.user_id || null;
    } catch (error) {
      console.error('Error in getUserIdFromMentorId:', error);
      return null;
    }
  };

  const loadProfessionalExperiences = async () => {
    if (professionalExperiences.length > 0) return; // Already loaded
    
    let mentorUserId = mentor.user_id;
    if (!mentorUserId && mentor.id) {
      mentorUserId = await getUserIdFromMentorId(mentor.id);
    }
    
    if (!mentorUserId) {
      console.error('No mentor_id available for loading professional experiences');
      setLoadingExp(false);
      return;
    }
    
    setLoadingExp(true);
    try {
      const { data, error } = await supabase
        .from('mentor_professional_experience')
        .select('*')
        .eq('mentor_id', mentorUserId)
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

  const loadStartupAssignments = async () => {
    if (startupAssignments.length > 0) return; // Already loaded
    
    let mentorUserId = mentor.user_id;
    if (!mentorUserId && mentor.id) {
      mentorUserId = await getUserIdFromMentorId(mentor.id);
    }
    
    if (!mentorUserId) {
      console.error('No mentor_id available for loading startup assignments');
      setLoadingMentoringExp(false);
      return;
    }
    
    setLoadingMentoringExp(true);
    try {
      const { data, error } = await supabase
        .from('mentor_startup_assignments')
        .select(`
          *,
          startups (
            id,
            name,
            sector
          )
        `)
        .eq('mentor_id', mentorUserId)
        .in('status', ['active', 'completed'])
        .order('assigned_at', { ascending: false });

      if (error) {
        console.error('Error loading startup assignments:', error);
      } else if (data) {
        setStartupAssignments(data as StartupAssignment[]);
      }
    } catch (error) {
      console.error('Error loading startup assignments:', error);
    } finally {
      setLoadingMentoringExp(false);
    }
  };

  const loadFoundedStartups = async () => {
    if (foundedStartups.length > 0) return; // Already loaded
    
    let mentorUserId = mentor.user_id;
    if (!mentorUserId && mentor.id) {
      mentorUserId = await getUserIdFromMentorId(mentor.id);
    }
    
    if (!mentorUserId) {
      console.error('No mentor_id available for loading founded startups');
      setLoadingStartupExp(false);
      return;
    }
    
    setLoadingStartupExp(true);
    try {
      const { data, error } = await supabase
        .from('mentor_founded_startups')
        .select(`
          *,
          startups (
            id,
            name,
            sector
          )
        `)
        .eq('mentor_id', mentorUserId)
        .order('founded_at', { ascending: false });

      if (error) {
        console.error('Error loading founded startups:', error);
      } else if (data) {
        setFoundedStartups(data as FoundedStartup[]);
      }
    } catch (error) {
      console.error('Error loading founded startups:', error);
    } finally {
      setLoadingStartupExp(false);
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

  const formatFeeRange = (type: 'fees' | 'stockOptions' = 'fees') => {
    if (!mentor.fee_type) return null;
    
    if (mentor.fee_type === 'Free') {
      return 'Free';
    }
    
    // For Stock Options type
    if (type === 'stockOptions') {
      if (mentor.equity_amount_min && mentor.equity_amount_max) {
        if (mentor.equity_amount_min === mentor.equity_amount_max) {
          return formatCurrencySimple(mentor.equity_amount_min, mentor.fee_currency);
        }
        const minStr = formatCurrencySimple(mentor.equity_amount_min, mentor.fee_currency);
        const maxStr = formatCurrencySimple(mentor.equity_amount_max, mentor.fee_currency);
        return `${minStr} - ${maxStr}`;
      }
      if (mentor.equity_amount_min) {
        return formatCurrencySimple(mentor.equity_amount_min, mentor.fee_currency);
      }
      return 'Stock Options';
    }
    
    // For Fees type
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
    
    return mentor.fee_type === 'Stock Options' ? 'Stock Options' : mentor.fee_type;
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
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800 flex-1">
              {mentor.mentor_name || mentor.user?.name || 'Mentor'}
            </h3>
            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full border border-blue-200 whitespace-nowrap">
              Mentor
            </span>
          </div>
          
          {/* Location and Experience Info */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 mb-3">
            {mentor.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-slate-500" />
                {mentor.location}
              </span>
            )}
            {mentor.years_of_experience && (
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-slate-500" />
                Experience: {mentor.years_of_experience} {mentor.years_of_experience === 1 ? 'year' : 'years'}
              </span>
            )}
          </div>
          
          {mentor.mentor_type && (
            <p className="text-slate-600 font-medium text-sm mb-3">{mentor.mentor_type}</p>
          )}
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

          {mentor.mentoring_stages && mentor.mentoring_stages.length > 0 && (
            <div>
              <div className="text-xs font-medium text-slate-500 mb-2">Mentoring Stages</div>
              <div className="flex flex-wrap gap-1.5">
                {mentor.mentoring_stages.map((stage, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full border border-purple-200">
                    {stage}
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
                {mentor.fee_type === 'Hybrid' ? (
                  <div className="space-y-2">
                    {/* Fees display */}
                    {(mentor.fee_amount_min || mentor.fee_amount_max) && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800">
                            {formatFeeRange('fees')}
                          </span>
                          <span className="text-xs text-slate-500">(Fees)</span>
                        </div>
                      </div>
                    )}
                    {/* Stock Options display */}
                    {(mentor.equity_amount_min || mentor.equity_amount_max) && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800">
                            {formatFeeRange('stockOptions')}
                          </span>
                          <span className="text-xs text-slate-500">(Stock Options)</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800">
                        {formatFeeRange('fees')}
                      </span>
                      {mentor.fee_type !== 'Free' && mentor.fee_type !== 'Stock Options' && (
                        <span className="text-xs text-slate-500">({mentor.fee_type})</span>
                      )}
                    </div>
                  </div>
                )}
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

        {/* Mentoring Experience Section */}
        <div className="mb-5">
          <button
            onClick={() => setShowMentoringExp(!showMentoringExp)}
            className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Mentoring Experience</span>
              {startupAssignments.length > 0 && (
                <span className="text-xs text-slate-500">({startupAssignments.length})</span>
              )}
            </div>
            {showMentoringExp ? (
              <ChevronUp className="h-4 w-4 text-slate-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-600" />
            )}
          </button>

          {showMentoringExp && (
            <div className="mt-3 space-y-3">
              {loadingMentoringExp ? (
                <div className="text-center py-4 text-sm text-slate-500">Loading...</div>
              ) : startupAssignments.length > 0 ? (
                startupAssignments.map((assignment) => {
                  // Get startup name from either startup object or notes
                  let startupName = 'Unknown Startup';
                  if (assignment.startup?.name) {
                    startupName = assignment.startup.name;
                  } else if (assignment.notes) {
                    try {
                      const notesData = JSON.parse(assignment.notes);
                      startupName = notesData.startup_name || startupName;
                    } catch {
                      // If notes is not JSON, use it as-is
                      startupName = assignment.notes;
                    }
                  }

                  const startDate = formatDate(assignment.assigned_at);
                  const endDate = assignment.completed_at 
                    ? formatDate(assignment.completed_at)
                    : assignment.status === 'active' 
                      ? 'Present' 
                      : 'N/A';

                  return (
                    <div
                      key={assignment.id}
                      className="p-3 bg-white border border-slate-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-800 text-sm">{startupName}</h4>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              assignment.status === 'active' 
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              {assignment.status === 'active' ? 'Active' : 'Completed'}
                            </span>
                          </div>
                          {assignment.startup?.sector && (
                            <p className="text-xs text-slate-600 font-medium">{assignment.startup.sector}</p>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 text-right">
                          {startDate} - {endDate}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-sm text-slate-500">
                  No mentoring experience added yet
                </div>
              )}
            </div>
          )}
        </div>

        {/* Startup Experience Section */}
        <div className="mb-5">
          <button
            onClick={() => setShowStartupExp(!showStartupExp)}
            className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Startup Experience</span>
              {foundedStartups.length > 0 && (
                <span className="text-xs text-slate-500">({foundedStartups.length})</span>
              )}
            </div>
            {showStartupExp ? (
              <ChevronUp className="h-4 w-4 text-slate-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-600" />
            )}
          </button>

          {showStartupExp && (
            <div className="mt-3 space-y-3">
              {loadingStartupExp ? (
                <div className="text-center py-4 text-sm text-slate-500">Loading...</div>
              ) : foundedStartups.length > 0 ? (
                foundedStartups.map((startup) => {
                  // Get startup name from either startup object or notes
                  let startupName = 'Unknown Startup';
                  if (startup.startup?.name) {
                    startupName = startup.startup.name;
                  } else if (startup.notes) {
                    try {
                      const notesData = JSON.parse(startup.notes);
                      startupName = notesData.startup_name || startupName;
                    } catch {
                      // If notes is not JSON, use it as-is
                      startupName = startup.notes;
                    }
                  }

                  const foundedDate = formatDate(startup.founded_at);

                  return (
                    <div
                      key={startup.id}
                      className="p-3 bg-white border border-slate-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800 text-sm">{startupName}</h4>
                          {startup.startup?.sector && (
                            <p className="text-xs text-slate-600 font-medium mt-1">{startup.startup.sector}</p>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 text-right">
                          Founded: {foundedDate}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-sm text-slate-500">
                  No startup experience added yet
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
                variant={connectLabel === 'Requested' ? 'outline' : 'primary'}
                disabled={connectDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!connectDisabled) {
                    onConnect();
                  }
                }}
                className={`sm:flex-1 ${connectLabel === 'Requested' ? 'cursor-not-allowed opacity-60' : ''}`}
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
                <>
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
                  <span className="text-xs text-orange-600 font-medium italic">
                    {mentor.mentor_name || mentor.user?.name || 'Mentor'} (Mentor) Supported by Track My Startup.
                  </span>
                </>
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


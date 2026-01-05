import React, { useState, useEffect, useMemo } from 'react';
import { Startup, FundraisingDetails, InvestmentRecord, UserRole, Founder, ComplianceStatus, InvestmentOffer } from '../types';
import { AuthUser } from '../lib/auth';
import Button from './ui/Button';
import Card from './ui/Card';
import { ArrowLeft, LayoutDashboard, User, ShieldCheck, Banknote, Users, TableProperties, Building2, Menu, Bell, Wrench, DollarSign, Briefcase, FileText, Shield, Eye, Search, CheckCircle, Video, X, MapPin, Globe, Linkedin, ChevronDown, ChevronUp, Share2 } from 'lucide-react';
import { investmentService } from '../lib/database';
import { supabase } from '../lib/supabase';

import StartupDashboardTab from './startup-health/StartupDashboardTab';
import NotificationBadge from './startup-health/NotificationBadge';
import NotificationsView from './startup-health/NotificationsView';
import ProfileTab from './startup-health/ProfileTab';
import ComplianceTab from './startup-health/ComplianceTab';
import FinancialsTab from './startup-health/FinancialsTab';
import EmployeesTab from './startup-health/EmployeesTab';
import CapTableTab from './startup-health/CapTableTab';
import FundraisingTab from './startup-health/FundraisingTab';
import StartupProfilePage from './StartupProfilePage';
import { getQueryParam, setQueryParam } from '../lib/urlState';
import ConnectMentorRequestModal from './mentor/ConnectMentorRequestModal';
import StartupRequestsSection from './mentor/StartupRequestsSection';
import ScheduledSessionsSection from './mentor/ScheduledSessionsSection';
import SchedulingModal from './mentor/SchedulingModal';
import StartupMentorScheduleSection from './startup/StartupMentorScheduleSection';
import { formatDateDDMMYYYY } from '../lib/dateTimeUtils';
import { mentorService } from '../lib/mentorService';
import { createSlug, createProfileUrl } from '../lib/slugUtils';
import Modal from './ui/Modal';

const ArrowLeftIcon = ArrowLeft;

// Component for mentor card with metrics and professional experience
const MentorCardWithDetails: React.FC<{
  mentor: any;
  videoEmbedUrl: string | null;
  onConnect: () => void;
}> = ({ mentor, videoEmbedUrl, onConnect }) => {
  const [metrics, setMetrics] = useState(() => {
    // Initialize with mentor prop values if available, otherwise 0
    const initialMetrics = {
      startupsMentoring: mentor.startupsMentoring !== undefined ? mentor.startupsMentoring : 0,
      startupsMentoredPreviously: mentor.startupsMentoredPreviously !== undefined ? mentor.startupsMentoredPreviously : 0,
      verifiedStartupsMentored: mentor.verifiedStartupsMentored !== undefined ? mentor.verifiedStartupsMentored : 0,
    };
    console.log('📊 MentorCardWithDetails: Initial metrics state:', {
      mentorName: mentor.mentor_name,
      mentorUserId: mentor.user_id,
      initialMetrics,
      mentorProps: {
        startupsMentoring: mentor.startupsMentoring,
        startupsMentoredPreviously: mentor.startupsMentoredPreviously,
        verifiedStartupsMentored: mentor.verifiedStartupsMentored,
      },
      hasMetricsInProp: mentor.startupsMentoring !== undefined || 
                        mentor.startupsMentoredPreviously !== undefined || 
                        mentor.verifiedStartupsMentored !== undefined,
    });
    return initialMetrics;
  });
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [metricsLoaded, setMetricsLoaded] = useState(false);
  const [professionalExperiences, setProfessionalExperiences] = useState<any[]>([]);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [showProfessionalExpModal, setShowProfessionalExpModal] = useState(false);
  const [loadingExp, setLoadingExp] = useState(false);
  const [showProfessionalExp, setShowProfessionalExp] = useState(false);
  const [startupAssignments, setStartupAssignments] = useState<any[]>([]);
  const [showMentoringExp, setShowMentoringExp] = useState(false);
  const [loadingMentoringExp, setLoadingMentoringExp] = useState(false);
  const [foundedStartups, setFoundedStartups] = useState<any[]>([]);
  const [showStartupExp, setShowStartupExp] = useState(false);
  const [loadingStartupExp, setLoadingStartupExp] = useState(false);

  // Update metrics when mentor prop changes (if metrics are already loaded)
  useEffect(() => {
    // Always update metrics from mentor prop if they exist (even if 0)
    const hasMetricsInProp = mentor.startupsMentoring !== undefined || 
                              mentor.startupsMentoredPreviously !== undefined || 
                              mentor.verifiedStartupsMentored !== undefined;
    
    if (hasMetricsInProp) {
      const newMetrics = {
        startupsMentoring: mentor.startupsMentoring ?? 0,
        startupsMentoredPreviously: mentor.startupsMentoredPreviously ?? 0,
        verifiedStartupsMentored: mentor.verifiedStartupsMentored ?? 0,
      };
      
      console.log('📊 MentorCardWithDetails: Updating metrics from mentor prop:', {
        mentorName: mentor.mentor_name,
        mentorUserId: mentor.user_id,
        propValues: {
          startupsMentoring: mentor.startupsMentoring,
          startupsMentoredPreviously: mentor.startupsMentoredPreviously,
          verifiedStartupsMentored: mentor.verifiedStartupsMentored,
        },
        newMetrics: {
          startupsMentoring: newMetrics.startupsMentoring,
          startupsMentoredPreviously: newMetrics.startupsMentoredPreviously,
          verifiedStartupsMentored: newMetrics.verifiedStartupsMentored,
        },
        currentMetrics: {
          startupsMentoring: metrics.startupsMentoring,
          startupsMentoredPreviously: metrics.startupsMentoredPreviously,
          verifiedStartupsMentored: metrics.verifiedStartupsMentored,
        },
        willUpdate: JSON.stringify(newMetrics) !== JSON.stringify(metrics),
      });
      
      // Always update to ensure state is in sync with prop
      setMetrics(prevMetrics => {
        // Check if values actually changed
        const valuesChanged = prevMetrics.startupsMentoring !== newMetrics.startupsMentoring ||
                              prevMetrics.startupsMentoredPreviously !== newMetrics.startupsMentoredPreviously ||
                              prevMetrics.verifiedStartupsMentored !== newMetrics.verifiedStartupsMentored;
        
        if (valuesChanged) {
          console.log('📊 MentorCardWithDetails: State updated!', {
            mentorName: mentor.mentor_name,
            from: prevMetrics,
            to: newMetrics,
          });
        } else {
          console.log('📊 MentorCardWithDetails: Metrics unchanged, keeping current state', {
            mentorName: mentor.mentor_name,
            currentMetrics: {
              startupsMentoring: prevMetrics.startupsMentoring,
              startupsMentoredPreviously: prevMetrics.startupsMentoredPreviously,
              verifiedStartupsMentored: prevMetrics.verifiedStartupsMentored,
            },
            newMetrics: {
              startupsMentoring: newMetrics.startupsMentoring,
              startupsMentoredPreviously: newMetrics.startupsMentoredPreviously,
              verifiedStartupsMentored: newMetrics.verifiedStartupsMentored,
            },
            propValues: {
              startupsMentoring: mentor.startupsMentoring,
              startupsMentoredPreviously: mentor.startupsMentoredPreviously,
              verifiedStartupsMentored: mentor.verifiedStartupsMentored,
            },
          });
        }
        
        // Always return newMetrics to ensure state matches prop
        return newMetrics;
      });
      setMetricsLoaded(true);
    }
  }, [mentor.startupsMentoring, mentor.startupsMentoredPreviously, mentor.verifiedStartupsMentored, mentor.user_id, mentor.mentor_name]);

  // Load metrics if not provided (check for undefined, not just falsy values)
  useEffect(() => {
    if (!mentor.user_id) return;
    
    const hasMetricsInProp = mentor.startupsMentoring !== undefined || 
                              mentor.startupsMentoredPreviously !== undefined || 
                              mentor.verifiedStartupsMentored !== undefined;
    
    if (!hasMetricsInProp && !metricsLoaded) {
      console.log('📊 MentorCardWithDetails: Metrics not provided, loading for:', mentor.mentor_name || mentor.user_id);
      loadMetrics();
    } else if (hasMetricsInProp) {
      console.log('📊 MentorCardWithDetails: Metrics already provided for:', mentor.mentor_name || mentor.user_id);
      setMetricsLoaded(true);
    }
  }, [mentor.user_id]);

  // Load professional experiences when modal opens or dropdown opens
  useEffect(() => {
    if ((showProfessionalExpModal || showProfessionalExp) && mentor.user_id && professionalExperiences.length === 0) {
      loadProfessionalExperiences();
    }
  }, [showProfessionalExpModal, showProfessionalExp, mentor.user_id]);

  // Load startup assignments when mentoring experience dropdown opens
  useEffect(() => {
    if (showMentoringExp && mentor.user_id) {
      loadStartupAssignments();
    }
  }, [showMentoringExp, mentor.user_id]);

  // Load founded startups when startup experience dropdown opens
  useEffect(() => {
    if (showStartupExp && mentor.user_id) {
      loadFoundedStartups();
    }
  }, [showStartupExp, mentor.user_id]);

  const loadMetrics = async () => {
    if (!mentor.user_id || loadingMetrics || metricsLoaded) return;
    setLoadingMetrics(true);
    try {
      console.log('📊 MentorCardWithDetails: Loading metrics for:', mentor.mentor_name || mentor.user_id);
      const mentorMetrics = await mentorService.getMentorMetrics(mentor.user_id);
      console.log('📊 MentorCardWithDetails: Loaded metrics:', mentorMetrics);
      setMetrics({
        startupsMentoring: mentorMetrics.startupsMentoring,
        startupsMentoredPreviously: mentorMetrics.startupsMentoredPreviously,
        verifiedStartupsMentored: mentorMetrics.verifiedStartupsMentored,
      });
      setMetricsLoaded(true);
    } catch (error) {
      console.error('❌ MentorCardWithDetails: Error loading mentor metrics:', error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const loadProfessionalExperiences = async () => {
    if (loadingExp || professionalExperiences.length > 0) return;
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

  const loadStartupAssignments = async () => {
    if (startupAssignments.length > 0) return;
    
    let mentorUserId = mentor.user_id;
    if (!mentorUserId && mentor.id) {
      // Try to get user_id from profile id
      const { data: profile } = await supabase
        .from('mentor_profiles')
        .select('user_id')
        .eq('id', mentor.id)
        .maybeSingle();
      if (profile?.user_id) {
        mentorUserId = profile.user_id;
      }
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
        setStartupAssignments(data);
      }
    } catch (error) {
      console.error('Error loading startup assignments:', error);
    } finally {
      setLoadingMentoringExp(false);
    }
  };

  const loadFoundedStartups = async () => {
    if (foundedStartups.length > 0) return;
    
    let mentorUserId = mentor.user_id;
    if (!mentorUserId && mentor.id) {
      // Try to get user_id from profile id
      const { data: profile } = await supabase
        .from('mentor_profiles')
        .select('user_id')
        .eq('id', mentor.id)
        .maybeSingle();
      if (profile?.user_id) {
        mentorUserId = profile.user_id;
      }
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
        setFoundedStartups(data);
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
      // Handle both ISO timestamp strings and YYYY-MM-DD date strings
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    } catch {
      return dateString;
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
      const minStr = formatCurrencySimple(mentor.fee_amount_min, mentor.fee_currency);
      const maxStr = formatCurrencySimple(mentor.fee_amount_max, mentor.fee_currency);
      return `${minStr} - ${maxStr}`;
    }
    
    if (mentor.fee_amount_min) {
      return formatCurrencySimple(mentor.fee_amount_min, mentor.fee_currency);
    }
    
    return mentor.fee_type === 'Stock Options' ? 'Stock Options' : mentor.fee_type;
  };

  const handleShare = async () => {
    if (!mentor.user_id && !mentor.id) return;

    const mentorName = mentor.mentor_name || 'Mentor';
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

  return (
    <Card className="p-6 relative">
      {/* Share Button - Top Right Corner */}
      {(mentor.id || mentor.user_id) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleShare();
          }}
          className="absolute top-6 right-6 z-10 p-2 bg-white hover:bg-slate-50 rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center border border-slate-200"
          title="Share mentor profile"
        >
          <Share2 className="h-4 w-4 text-slate-700" />
        </button>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Media Section - Right Side */}
        <div className="md:w-1/3">
          {mentor.media_type === 'logo' && mentor.logo_url ? (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-white flex items-center justify-center border border-slate-200">
              <img
                src={mentor.logo_url}
                alt={`${mentor.mentor_name || 'Mentor'} logo`}
                className="w-full h-full object-contain p-4"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ) : videoEmbedUrl ? (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
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
            <div className="w-full aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Users className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No media available</p>
              </div>
            </div>
          )}
        </div>

        {/* Content Section - Left Side */}
        <div className="md:w-2/3 flex flex-col relative">
          {/* Header */}
          <div className="mb-3 pr-10">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-xl font-bold text-slate-800 flex-1">
                {mentor.mentor_name || 'Mentor'}
              </h3>
              <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full border border-green-200 whitespace-nowrap">
                Mentor
              </span>
            </div>
            
            {/* Location and Experience */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 mb-2">
              {mentor.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-500" />
                  {mentor.location}
                </span>
              )}
              {mentor.years_of_experience && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-slate-500" />
                  {mentor.years_of_experience} {mentor.years_of_experience === 1 ? 'year' : 'years'} experience
                </span>
              )}
            </div>

            {mentor.mentor_type && (
              <p className="text-slate-600 font-medium text-sm mb-2">{mentor.mentor_type}</p>
            )}
          </div>


          {/* Mentoring Details */}
          <div className="space-y-4 mb-4">
            {/* Expertise Areas & Sectors in one line */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mentor.expertise_areas && mentor.expertise_areas.length > 0 && (
              <div>
                  <div className="text-xs font-medium text-slate-500 mb-2">Expertise Areas</div>
                <div className="flex flex-wrap gap-1.5">
                    {mentor.expertise_areas.map((area: string, idx: number) => (
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
                    {mentor.sectors.map((sector: string, idx: number) => (
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
                  {mentor.mentoring_stages.map((stage: string, idx: number) => (
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

          {/* Experience Buttons - 4 buttons in 2 rows */}
          <div className="mb-4 space-y-2">
            {/* Row 1: Professional Experience and Startup Experience */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowProfessionalExpModal(true)}
                className="flex items-center justify-center gap-2"
              >
                <Briefcase className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Professional Experience</span>
                {professionalExperiences.length > 0 && (
                  <span className="text-xs">({professionalExperiences.length})</span>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowStartupExp(!showStartupExp)}
                className="flex items-center justify-center gap-2"
              >
                <Building2 className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Startup Experience</span>
                {foundedStartups.length > 0 && (
                  <span className="text-xs">({foundedStartups.length})</span>
                )}
              </Button>
            </div>
            {/* Row 2: Mentoring Experience and View Experience (Metrics) */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowMentoringExp(!showMentoringExp)}
                className="flex items-center justify-center gap-2"
              >
                <Users className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Mentoring Experience</span>
                {startupAssignments.length > 0 && (
                  <span className="text-xs">({startupAssignments.length})</span>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowMetricsModal(true)}
                className="flex items-center justify-center gap-2"
              >
                <Users className="h-4 w-4" />
                <span className="text-xs sm:text-sm">View Experience</span>
              </Button>
            </div>
          </div>

          {/* Dropdown sections for Mentoring and Startup Experience (shown when buttons clicked) */}
          {showMentoringExp && (
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              {loadingMentoringExp ? (
                <div className="text-center py-4 text-sm text-slate-500">Loading...</div>
              ) : startupAssignments.length > 0 ? (
                <div className="space-y-3">
                  {startupAssignments.map((assignment) => {
                    let startupName = 'Unknown Startup';
                    if (assignment.startup?.name) {
                      startupName = assignment.startup.name;
                    } else if (assignment.notes) {
                      try {
                        const notesData = JSON.parse(assignment.notes);
                        startupName = notesData.startup_name || startupName;
                      } catch {
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
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-slate-500">
                  No mentoring experience added yet
                </div>
              )}
            </div>
          )}

          {showStartupExp && (
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              {loadingStartupExp ? (
                <div className="text-center py-4 text-sm text-slate-500">Loading...</div>
              ) : foundedStartups.length > 0 ? (
                <div className="space-y-3">
                  {foundedStartups.map((startup) => {
                    // Get startup name from either startup object or notes
                    let startupName = 'Unknown Startup';
                    let position = '';
                    let sector = '';
                    let fromDate = '';
                    let toDate = '';
                    let currentlyInPosition = false;
                    
                    if (startup.startup?.name) {
                      startupName = startup.startup.name;
                    }
                    
                    if (startup.notes) {
                      try {
                        const notesData = JSON.parse(startup.notes);
                        startupName = notesData.startup_name || startupName;
                        position = notesData.position || '';
                        sector = notesData.sector || '';
                        fromDate = notesData.from_date || '';
                        // Handle to_date: it can be null, empty string, or a date string
                        toDate = (notesData.to_date && notesData.to_date !== 'null') ? notesData.to_date : '';
                        // Check currently_in_position - it should be explicitly true
                        currentlyInPosition = notesData.currently_in_position === true;
                      } catch {
                        // If notes is not JSON, use it as-is for name
                        if (!startup.startup?.name) {
                          startupName = startup.notes;
                        }
                      }
                    }
                    
                    // Fallback to startup object sector if not in notes
                    if (!sector && startup.startup?.sector) {
                      sector = startup.startup.sector;
                    }

                    // Format date range
                    let dateRange = '';
                    if (fromDate) {
                      const fromDateFormatted = formatDate(fromDate);
                      // If currently in position, show "Present"
                      if (currentlyInPosition) {
                        dateRange = `${fromDateFormatted} - Present`;
                      } else if (toDate && toDate.trim() !== '') {
                        // If to_date exists and is not empty, show the date range
                        const toDateFormatted = formatDate(toDate);
                        dateRange = `${fromDateFormatted} - ${toDateFormatted}`;
                      } else {
                        // If no to_date and not currently in position, just show from date
                        dateRange = fromDateFormatted;
                      }
                    } else {
                      // Fallback to founded_at if no from_date in notes
                      dateRange = formatDate(startup.founded_at);
                    }

                    return (
                      <div
                        key={startup.id}
                        className="p-3 bg-white border border-slate-200 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-800 text-sm">{startupName}</h4>
                            {position && (
                              <p className="text-xs text-slate-600 font-medium mt-1">{position}</p>
                            )}
                            {sector && (
                              <p className="text-xs text-slate-500 mt-0.5">{sector}</p>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 text-right ml-2">
                            {dateRange}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-slate-500">
                  No startup experience added yet
                </div>
              )}
            </div>
          )}

          {/* Action Buttons and Links */}
          <div className="mt-auto pt-4 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4">
                {mentor.website && mentor.website.trim() && (
                  <a
                    href={mentor.website.startsWith('http') ? mentor.website : `https://${mentor.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
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
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Linkedin className="h-4 w-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">LinkedIn</span>
                  </a>
                    <span className="text-xs text-orange-600 font-medium italic">
                      {mentor.mentor_name || 'Mentor'} (Mentor) Supported by Track My Startup.
                    </span>
                  </>
                )}
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={onConnect}
              >
                Connect
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Experience Metrics Modal */}
      {showMetricsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-slate-900">
                Mentoring Experience - {mentor.mentor_name || 'Mentor'}
              </h3>
              <button
                onClick={() => setShowMetricsModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              {loadingMetrics ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading metrics...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                  {(() => {
                    const activeValue = mentor.startupsMentoring !== undefined ? mentor.startupsMentoring : metrics.startupsMentoring;
                    const previousValue = mentor.startupsMentoredPreviously !== undefined ? mentor.startupsMentoredPreviously : metrics.startupsMentoredPreviously;
                    const totalValue = activeValue + previousValue;
                    const verifiedValue = mentor.verifiedStartupsMentored !== undefined ? mentor.verifiedStartupsMentored : metrics.verifiedStartupsMentored;
                    
                    console.log(`📊 RENDERING metrics for ${mentor.mentor_name}:`, {
                      propValues: {
                        startupsMentoring: mentor.startupsMentoring,
                        startupsMentoredPreviously: mentor.startupsMentoredPreviously,
                        verifiedStartupsMentored: mentor.verifiedStartupsMentored,
                      },
                      stateValues: {
                        startupsMentoring: metrics.startupsMentoring,
                        startupsMentoredPreviously: metrics.startupsMentoredPreviously,
                        verifiedStartupsMentored: metrics.verifiedStartupsMentored,
                      },
                      renderedValues: {
                        active: activeValue,
                        previous: previousValue,
                        total: totalValue,
                        verified: verifiedValue,
                      },
                    });
                    
                    return null;
                  })()}
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-3xl font-bold text-slate-800 mb-2">
                      {mentor.startupsMentoring !== undefined ? mentor.startupsMentoring : metrics.startupsMentoring}
                    </div>
                    <div className="text-sm text-slate-600 font-medium">Startup Mentoring</div>
                    <div className="text-xs text-slate-500 mt-1">(Active)</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-3xl font-bold text-slate-800 mb-2">
                      {mentor.startupsMentoredPreviously !== undefined ? mentor.startupsMentoredPreviously : metrics.startupsMentoredPreviously}
                    </div>
                    <div className="text-sm text-slate-600 font-medium">Previously Mentored</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-3xl font-bold text-slate-800 mb-2">
                      {(mentor.startupsMentoring !== undefined ? mentor.startupsMentoring : metrics.startupsMentoring) + 
                       (mentor.startupsMentoredPreviously !== undefined ? mentor.startupsMentoredPreviously : metrics.startupsMentoredPreviously)}
                    </div>
                    <div className="text-sm text-slate-600 font-medium">Startups Mentored</div>
                    <div className="text-xs text-slate-500 mt-1">(Total)</div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {mentor.verifiedStartupsMentored !== undefined ? mentor.verifiedStartupsMentored : metrics.verifiedStartupsMentored}
                    </div>
                    <div className="text-sm text-slate-600 font-medium">Verified Mentored</div>
                    <div className="text-xs text-blue-600 mt-1">(TMS Users)</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Professional Experience Modal */}
      {showProfessionalExpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-slate-900">
                Professional Experience - {mentor.mentor_name || 'Mentor'}
              </h3>
              <button
                onClick={() => setShowProfessionalExpModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              {loadingExp ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading professional experience...</p>
                </div>
              ) : professionalExperiences.length > 0 ? (
                <div className="space-y-4">
                  {professionalExperiences.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-4 bg-white border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800 text-base mb-1">{exp.position}</h4>
                          <p className="text-sm text-slate-600 font-medium">{exp.company}</p>
                        </div>
                        <div className="text-sm text-slate-500 text-right ml-4">
                          {formatDate(exp.from_date)} - {exp.currently_working ? 'Present' : formatDate(exp.to_date)}
                        </div>
                      </div>
                      {exp.description && (
                        <p className="text-sm text-slate-700 mt-3 leading-relaxed">{exp.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Briefcase className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">No Professional Experience</h3>
                  <p className="text-slate-600">
                    No professional experience has been added yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};


interface StartupHealthViewProps {
  startup: Startup;
  userRole?: UserRole;
  user?: AuthUser;
  onBack: () => void;
  onActivateFundraising: (details: FundraisingDetails, startup: Startup) => void;
  onInvestorAdded: (investment: InvestmentRecord, startup: Startup) => void;
  onUpdateFounders: (startupId: number, founders: Founder[]) => void;
  isViewOnly?: boolean; // New prop for view-only mode (for CA viewing)
  investmentOffers?: InvestmentOffer[];
  onProcessOffer?: (offerId: number, status: 'approved' | 'rejected' | 'accepted' | 'completed') => void;
  onTrialButtonClick?: () => void; // Add trial button click handler
}

type TabId = 'dashboard' | 'profile' | 'compliance' | 'financials' | 'employees' | 'capTable' | 'fundraising' | 'services';

const StartupHealthView: React.FC<StartupHealthViewProps> = ({ startup, userRole, user, onBack, onActivateFundraising, onInvestorAdded, onUpdateFounders, isViewOnly = false, investmentOffers = [], onProcessOffer, onTrialButtonClick }) => {
    // Check if this is a facilitator accessing the startup
    const isFacilitatorAccess = isViewOnly && userRole === 'Startup Facilitation Center';
    
    // Get the target tab for facilitator access
    const facilitatorTargetTab = (window as any).facilitatorTargetTab;
    
    // Initialize activeTab - always start with dashboard for regular users
    // If facilitator is accessing, use the target tab or default to compliance
    const [activeTab, setActiveTab] = useState<TabId>(() => {
        if (isFacilitatorAccess) {
            if (facilitatorTargetTab === 'full' || facilitatorTargetTab === 'dashboard') {
                return 'dashboard'; // Full access or dashboard access - start with dashboard
            } else if (facilitatorTargetTab === 'compliance') {
                return 'compliance'; // Only compliance access
            }
            return 'dashboard'; // Default to dashboard for investors/advisors viewing portfolio
        }
        
        // Prefer URL param if provided; otherwise default to dashboard
        const fromUrl = (getQueryParam('tab') as TabId) || 'dashboard';
        return fromUrl;
    });
    const [currentStartup, setCurrentStartup] = useState<Startup>(startup);
    const [localOffers, setLocalOffers] = useState<InvestmentOffer[]>(investmentOffers || []);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showAccountPage, setShowAccountPage] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [profileUpdateTrigger, setProfileUpdateTrigger] = useState(0);
    const [servicesSubTab, setServicesSubTab] = useState<'explore' | 'requested' | 'my-services'>('explore');
    
    // State for service exploration
    const [selectedServiceType, setSelectedServiceType] = useState<string | null>(null);
    const [mentors, setMentors] = useState<any[]>([]);
    const [loadingMentors, setLoadingMentors] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // State for mentor connection
    const [connectModalOpen, setConnectModalOpen] = useState(false);
    const [selectedMentor, setSelectedMentor] = useState<any>(null);
    const [startupRequests, setStartupRequests] = useState<any[]>([]);
    const [acceptedMentorRequests, setAcceptedMentorRequests] = useState<any[]>([]);
    
    // State for scheduling
    const [schedulingModalOpen, setSchedulingModalOpen] = useState(false);
    const [selectedMentorForScheduling, setSelectedMentorForScheduling] = useState<any>(null);
    const [viewScheduleSectionOpen, setViewScheduleSectionOpen] = useState(false);
    const [selectedMentorForView, setSelectedMentorForView] = useState<any>(null);
    
    // Update currentStartup when startup prop changes (important for facilitator access)
    useEffect(() => {
        console.log('🔄 StartupHealthView: Startup prop changed, updating currentStartup');
        console.log('📊 New startup data:', startup);
        setCurrentStartup(startup);
    }, [startup]);
    
    // Update currentStartup when startup prop changes (important for facilitator access)
    useEffect(() => {
        console.log('🔄 StartupHealthView: Startup prop changed, updating currentStartup');
        console.log('📊 New startup data:', startup);
        setCurrentStartup(startup);
    }, [startup]);

    const viewLabels = useMemo(() => {
        const name = currentStartup?.name || startup?.name || 'Startup';

        if (isFacilitatorAccess) {
            return {
                title: `${name} - Facilitator Access`,
                subtitle: facilitatorTargetTab === 'full'
                    ? 'Facilitator view-only access to all tabs (except opportunities)'
                    : 'Facilitator view-only access to compliance tab only',
            };
        }

        if (!isViewOnly) {
            return {
                title: name,
                subtitle: 'Comprehensive startup monitoring dashboard',
            };
        }

        switch (userRole) {
            case 'Investor':
                return {
                    title: `${name} - Investor Review`,
                    subtitle: 'Investor due diligence dashboard',
                };
            case 'Investment Advisor':
                return {
                    title: `${name} - Advisor Review`,
                    subtitle: 'Advisor read-only monitoring dashboard',
                };
            case 'CA':
                return {
                    title: `${name} - CA Review`,
                    subtitle: 'CA compliance review and monitoring dashboard',
                };
            case 'CS':
                return {
                    title: `${name} - CS Review`,
                    subtitle: 'CS compliance review and monitoring dashboard',
                };
            default:
                return {
                    title: `${name} - Read Only`,
                    subtitle: 'Read-only monitoring dashboard',
                };
        }
    }, [currentStartup?.name, startup?.name, isFacilitatorAccess, facilitatorTargetTab, isViewOnly, userRole]);
    
    const offersForStartup = (localOffers || investmentOffers || []).filter((o: any) => {
        const matches = (
            o.startupId === currentStartup.id ||
            (o.startup && o.startup.id === currentStartup.id) ||
            o.startupName === currentStartup.name
        );
        
        // Debug logging
        if (process.env.NODE_ENV === 'development') {
            console.log('🔍 StartupHealthView - Filtering offer:', {
                offerId: o.id,
                offerStartupId: o.startupId,
                offerStartupName: o.startupName,
                currentStartupId: currentStartup.id,
                currentStartupName: currentStartup.name,
                matches: matches,
                stage: (o as any).stage
            });
        }
        
        return matches;
    });

    // Keep local offers in sync when props change
    useEffect(() => {
        if (investmentOffers && investmentOffers.length > 0) {
            console.log('🔍 StartupHealthView - Investment offers prop changed:', investmentOffers);
            console.log('🔍 StartupHealthView - Offers count:', investmentOffers.length);
            setLocalOffers(investmentOffers);
        }
    }, [investmentOffers]);

    // Load startup requests for mentor connections
    const loadStartupRequests = async () => {
        if (!currentStartup?.id || !user?.id) return;
        
        try {
            // CRITICAL FIX: mentor_requests.requester_id references auth.users(id), not profile_id
            // Get auth_user_id to ensure RLS policy allows the query
            const { data: { user: authUser } } = await supabase.auth.getUser();
            const authUserId = authUser?.id;
            
            if (!authUserId) {
                console.error('Error: Not authenticated');
                return;
            }
            
            const { mentorService } = await import('../lib/mentorService');
            // Get all requests where this startup is involved
            const { data: requests, error } = await supabase
                .from('mentor_requests')
                .select('*')
                .eq('startup_id', currentStartup.id)
                .eq('requester_id', authUserId)  // Use auth_user_id for RLS policy
                .order('requested_at', { ascending: false });

            if (error) {
                console.error('Error loading startup requests:', error);
                return;
            }

            // Map requests to include startup details
            // Filter out accepted requests (they should appear in "My Services" tab)
            // Since we're filtering by currentStartup.id, all requests will be for this startup
            const mappedRequests = (requests || [])
                .filter((req: any) => req.status !== 'accepted') // Exclude accepted requests
                .map((req: any) => {
                    return {
                        ...req,
                        startup_name: currentStartup?.name || 'Unknown Startup',
                        startup_website: currentStartup?.domain || '',
                        startup_sector: currentStartup?.sector || ''
                    };
                });

            setStartupRequests(mappedRequests);
        } catch (error) {
            console.error('Error loading startup requests:', error);
        }
    };

    // Load accepted mentor requests for "My Services" tab
    const loadAcceptedMentorRequests = async () => {
        if (!currentStartup?.id || !user?.id) return;
        
        try {
            // CRITICAL FIX: mentor_requests.requester_id references auth.users(id), not profile_id
            // Get auth_user_id to ensure RLS policy allows the query
            const { data: { user: authUser } } = await supabase.auth.getUser();
            const authUserId = authUser?.id;
            
            if (!authUserId) {
                console.error('Error: Not authenticated');
                return;
            }
            
            const { data: requests, error } = await supabase
                .from('mentor_requests')
                .select('*')
                .eq('startup_id', currentStartup.id)
                .eq('requester_id', authUserId)  // Use auth_user_id for RLS policy
                .eq('status', 'accepted')
                .order('responded_at', { ascending: false });

            if (error) {
                console.error('Error loading accepted mentor requests:', error);
                return;
            }

            // Enrich with mentor profile data and assignment ID
            const mappedRequests = await Promise.all((requests || []).map(async (req: any) => {
                let mentorName = 'Unknown Mentor';
                let assignmentId: number | null = null;
                
                try {
                    const { data: mentorProfile } = await supabase
                        .from('mentor_profiles')
                        .select('mentor_name')
                        .eq('user_id', req.mentor_id)
                        .maybeSingle();
                    
                    if (mentorProfile?.mentor_name) {
                        mentorName = mentorProfile.mentor_name;
                    } else {
                        // Try user_profiles
                        const { data: userProfile } = await supabase
                            .from('user_profiles')
                            .select('name')
                            .eq('auth_user_id', req.mentor_id)
                            .maybeSingle();
                        
                        if (userProfile?.name) {
                            mentorName = userProfile.name;
                        }
                    }
                } catch (err) {
                    console.warn('Error fetching mentor name:', err);
                }

                // Get the assignment ID for this mentor-startup pair
                try {
                    const { data: assignment } = await supabase
                        .from('mentor_startup_assignments')
                        .select('id')
                        .eq('mentor_id', req.mentor_id)
                        .eq('startup_id', currentStartup.id)
                        .eq('status', 'active')
                        .maybeSingle();
                    
                    if (assignment) {
                        assignmentId = assignment.id;
                    }
                } catch (err) {
                    console.warn('Error fetching assignment ID:', err);
                }

                return {
                    ...req,
                    mentor_name: mentorName,
                    startup_name: currentStartup?.name || 'Unknown Startup',
                    startup_website: currentStartup?.domain || '',
                    startup_sector: currentStartup?.sector || '',
                    assignment_id: assignmentId
                };
            }));

            setAcceptedMentorRequests(mappedRequests);
        } catch (error) {
            console.error('Error loading accepted mentor requests:', error);
        }
    };

    useEffect(() => {
        if (activeTab === 'services' && servicesSubTab === 'requested') {
            loadStartupRequests();
            // Also check if any requests were accepted (mentor accepted)
            checkForAcceptedRequests();
        } else if (activeTab === 'services' && servicesSubTab === 'my-services') {
            loadAcceptedMentorRequests();
        }
    }, [activeTab, servicesSubTab, currentStartup?.id, user?.id]);

    // Load mentors when Mentor service type is selected
    useEffect(() => {
        if (selectedServiceType === 'Mentor' && activeTab === 'services' && servicesSubTab === 'explore') {
            loadMentors();
        }
    }, [selectedServiceType, activeTab, servicesSubTab]);


    const loadMentors = async () => {
        setLoadingMentors(true);
        try {
            const mentorProfiles = await mentorService.getAllMentorProfiles();
            console.log('📊 Loaded mentor profiles:', mentorProfiles.length);
            
            // Load metrics for each mentor
            const mentorsWithMetrics = await Promise.all(
                mentorProfiles.map(async (mentor: any) => {
                    if (!mentor.user_id) {
                        console.warn('⚠️ Mentor missing user_id:', mentor);
                        return {
                            ...mentor,
                            startupsMentoring: 0,
                            startupsMentoredPreviously: 0,
                            verifiedStartupsMentored: 0,
                        };
                    }
                    
                    try {
                        const metrics = await mentorService.getMentorMetrics(mentor.user_id);
                        console.log(`✅ Loaded metrics for ${mentor.mentor_name || mentor.user_id}:`, metrics);
                        return {
                            ...mentor,
                            startupsMentoring: metrics.startupsMentoring,
                            startupsMentoredPreviously: metrics.startupsMentoredPreviously,
                            verifiedStartupsMentored: metrics.verifiedStartupsMentored,
                        };
                    } catch (metricsError) {
                        console.error('❌ Could not load metrics for mentor:', mentor.user_id, mentor.mentor_name, metricsError);
                        return {
                            ...mentor,
                            startupsMentoring: 0,
                            startupsMentoredPreviously: 0,
                            verifiedStartupsMentored: 0,
                        };
                    }
                })
            );
            
            console.log('📊 Final mentors with metrics:', mentorsWithMetrics.length, 'mentors');
            // Log first few mentors' metrics to verify
            mentorsWithMetrics.slice(0, 3).forEach((mentor: any, index: number) => {
              console.log(`📊 Mentor ${index + 1} metrics:`, {
                name: mentor.mentor_name,
                user_id: mentor.user_id,
                startupsMentoring: mentor.startupsMentoring,
                startupsMentoredPreviously: mentor.startupsMentoredPreviously,
                verifiedStartupsMentored: mentor.verifiedStartupsMentored,
                hasAllMetrics: mentor.startupsMentoring !== undefined && 
                              mentor.startupsMentoredPreviously !== undefined && 
                              mentor.verifiedStartupsMentored !== undefined,
              });
            });
            setMentors(mentorsWithMetrics);
        } catch (error) {
            console.error('❌ Error loading mentors:', error);
            setMentors([]);
        } finally {
            setLoadingMentors(false);
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

    const formatFeeRange = (mentor: any) => {
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
            const minStr = formatCurrencySimple(mentor.fee_amount_min, mentor.fee_currency);
            const maxStr = formatCurrencySimple(mentor.fee_amount_max, mentor.fee_currency);
            return `${minStr} - ${maxStr}`;
        }
        
        if (mentor.fee_amount_min) {
            return formatCurrencySimple(mentor.fee_amount_min, mentor.fee_currency);
        }
        
        return mentor.fee_type;
    };

    // Check if any requests were accepted by mentor and switch to My Services
    const checkForAcceptedRequests = async () => {
        if (!currentStartup?.id || !user?.id) return;
        
        try {
            // CRITICAL FIX: mentor_requests.requester_id references auth.users(id), not profile_id
            // Get auth_user_id to ensure RLS policy allows the query
            const { data: { user: authUser } } = await supabase.auth.getUser();
            const authUserId = authUser?.id;
            
            if (!authUserId) {
                console.error('Error: Not authenticated');
                return;
            }
            
            const { data: acceptedRequests, error } = await supabase
                .from('mentor_requests')
                .select('id, responded_at')
                .eq('startup_id', currentStartup.id)
                .eq('requester_id', authUserId)  // Use auth_user_id for RLS policy
                .eq('status', 'accepted')
                .order('responded_at', { ascending: false })
                .limit(1);

            if (!error && acceptedRequests && acceptedRequests.length > 0) {
                // Check if this is a newly accepted request (accepted in last 5 minutes)
                const newestAccepted = acceptedRequests[0];
                if (newestAccepted.responded_at) {
                    const acceptedTime = new Date(newestAccepted.responded_at).getTime();
                    const now = Date.now();
                    const fiveMinutesAgo = now - (5 * 60 * 1000);
                    
                    // If accepted within last 5 minutes, auto-switch to My Services
                    if (acceptedTime > fiveMinutesAgo) {
                        setServicesSubTab('my-services');
                        loadAcceptedMentorRequests();
                        // Show notification
                        alert('Great news! A mentor has accepted your connection request. Check "My Services" to see your active connections.');
                    }
                }
            }
        } catch (err) {
            console.error('Error checking for accepted requests:', err);
        }
    };

    // Fallback fetch for startup users: if no offers came via props, fetch directly
    useEffect(() => {
        let cancelled = false;
        const shouldFetch = (investmentOffers?.length || 0) === 0 && currentStartup?.id;
        
        console.log('🔍 StartupHealthView - Fallback fetch check:', {
            investmentOffersLength: investmentOffers?.length || 0,
            currentStartupId: currentStartup?.id,
            shouldFetch: shouldFetch
        });
        
        if (shouldFetch) {
            console.log('🔍 StartupHealthView - Fetching offers for startup:', currentStartup.id);
            investmentService.getOffersForStartup(currentStartup.id).then(rows => {
                console.log('🔍 StartupHealthView - Fetched offers:', rows);
                if (!cancelled) setLocalOffers(rows as any);
            }).catch((error) => {
                console.error('🔍 StartupHealthView - Error fetching offers:', error);
            });
        }
        return () => { cancelled = true; };
    }, [currentStartup?.id]);

    // Save activeTab to localStorage whenever it changes (only for facilitator access)
    useEffect(() => {
        // Only save tab state for facilitator access, not for regular users
        if (isFacilitatorAccess) {
            localStorage.setItem('startupHealthActiveTab', activeTab);
        }
    }, [activeTab, isFacilitatorAccess]);

    const handleProfileUpdate = (updatedStartup: Startup) => {
        console.log('🔄 StartupHealthView: Profile updated, updating currentStartup and triggering ComplianceTab refresh...', {
            startupId: updatedStartup.id,
            hasProfile: !!updatedStartup.profile,
            subsidiaries: updatedStartup.profile?.subsidiaries?.length || 0
        });
        setCurrentStartup(updatedStartup);
        // Trigger profile update for ComplianceTab
        setProfileUpdateTrigger(prev => prev + 1);
    };

    const handleEsopUpdate = () => {
        console.log('🔄 StartupHealthView: ESOP updated, refreshing startup data...');
        // Force a refresh of the startup data to get updated price per share
        setCurrentStartup(prev => ({ ...prev }));
    };

    const handleUpdateCompliance = (startupId: number, taskId: string, checker: 'ca' | 'cs', newStatus: ComplianceStatus) => {
        // Update the compliance check in the startup
        const updatedComplianceChecks = currentStartup.complianceChecks?.map(check => 
            check.taskId === taskId 
                ? { ...check, [checker === 'ca' ? 'caStatus' : 'csStatus']: newStatus }
                : check
        ) || [];

        setCurrentStartup(prev => ({
            ...prev,
            complianceChecks: updatedComplianceChecks
        }));
    };

    const handleTabChange = (tabId: TabId) => {
        setActiveTab(tabId);
        setQueryParam('tab', tabId, true);
        setIsMobileMenuOpen(false); // Close mobile menu when tab changes
    };

    const tabs = isFacilitatorAccess 
        ? [
            // Facilitator users see limited tabs based on access level
            { id: 'dashboard', name: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
            { id: 'profile', name: 'Profile', icon: <Building2 className="w-4 h-4" /> },
            { id: 'compliance', name: 'Compliance', icon: <ShieldCheck className="w-4 h-4" /> },
            { id: 'financials', name: 'Financials', icon: <Banknote className="w-4 h-4" /> },
            { id: 'employees', name: 'Employees', icon: <Users className="w-4 h-4" /> },
            { id: 'capTable', name: 'Equity Allocation', icon: <TableProperties className="w-4 h-4" /> },
            { id: 'fundraising', name: 'Fundraising', icon: <Banknote className="w-4 h-4" /> },
            { id: 'services', name: 'Services', icon: <Wrench className="w-4 h-4" /> },
          ]
        : [
            // Regular startup users see all tabs; programs moved under Fundraising → Grant / Incubation Programs
            { id: 'dashboard', name: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
            { id: 'profile', name: 'Profile', icon: <Building2 className="w-4 h-4" /> },
            { id: 'compliance', name: 'Compliance', icon: <ShieldCheck className="w-4 h-4" /> },
            { id: 'financials', name: 'Financials', icon: <Banknote className="w-4 h-4" /> },
            { id: 'employees', name: 'Employees', icon: <Users className="w-4 h-4" /> },
            { id: 'capTable', name: 'Equity Allocation', icon: <TableProperties className="w-4 h-4" /> },
            { id: 'fundraising', name: 'Fundraising', icon: <Banknote className="w-4 h-4" /> },
            { id: 'services', name: 'Services', icon: <Wrench className="w-4 h-4" /> },
          ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <StartupDashboardTab startup={currentStartup} isViewOnly={isViewOnly} offers={offersForStartup} onProcessOffer={onProcessOffer} currentUser={user} onTrialButtonClick={onTrialButtonClick} />;
            case 'profile':
                return <ProfileTab startup={currentStartup} userRole={userRole} onProfileUpdate={handleProfileUpdate} isViewOnly={isViewOnly} />;
            case 'compliance':
                return <ComplianceTab 
                    startup={currentStartup} 
                    currentUser={user} 
                    onUpdateCompliance={handleUpdateCompliance}
                    isViewOnly={isViewOnly}
                    allowCAEdit={userRole === 'CA' || userRole === 'CS'}
                    onProfileUpdated={profileUpdateTrigger}
                />;
            case 'financials':
                return <FinancialsTab startup={currentStartup} userRole={userRole} isViewOnly={isViewOnly} />;
            case 'employees':
                return <EmployeesTab startup={currentStartup} userRole={userRole} isViewOnly={isViewOnly} onEsopUpdated={handleEsopUpdate} />;
            case 'capTable':
                return (
                  <CapTableTab 
                    startup={currentStartup}
                    userRole={userRole}
                    user={user}
                    onActivateFundraising={onActivateFundraising}
                    onInvestorAdded={onInvestorAdded}
                    onUpdateFounders={onUpdateFounders}
                    isViewOnly={isViewOnly}
                  />
                );
            case 'fundraising':
                return (
                  <FundraisingTab
                    startup={currentStartup}
                    userRole={userRole}
                    user={user}
                    isViewOnly={isViewOnly}
                    onActivateFundraising={onActivateFundraising}
                  />
                );
            case 'services':
                return (
                  <div className="space-y-6 animate-fade-in">
                    <Card className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div>
                          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                            Services
                          </h2>
                          <p className="text-sm text-slate-600 mt-1">
                            Discover and manage services for your startup – mentors, advisors, CA/CS, and incubation support.
                          </p>
                        </div>
                      </div>

                      {/* Services sub-tabs */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Button
                          size="sm"
                          variant={servicesSubTab === 'explore' ? 'primary' : 'outline'}
                          onClick={() => setServicesSubTab('explore')}
                        >
                          <Search className="h-4 w-4 mr-2" />
                          Explore
                        </Button>
                        <Button
                          size="sm"
                          variant={servicesSubTab === 'requested' ? 'primary' : 'outline'}
                          onClick={() => setServicesSubTab('requested')}
                        >
                          <Bell className="h-4 w-4 mr-2" />
                          Requested
                        </Button>
                        <Button
                          size="sm"
                          variant={servicesSubTab === 'my-services' ? 'primary' : 'outline'}
                          onClick={() => setServicesSubTab('my-services')}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          My Services
                        </Button>
                      </div>

                      {servicesSubTab === 'explore' && (
                        <div className="space-y-6">
                          {selectedServiceType === null ? (
                            <>
                              <div>
                                <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">
                                  Explore Service Providers
                                </h3>
                                <p className="text-sm text-slate-600">
                                  Browse different types of collaborators and connect with them.
                                </p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {[
                                  { role: 'Investment Advisor', icon: Briefcase, color: 'bg-purple-100 text-purple-700 hover:bg-purple-200', description: 'Connect with investment advisors' },
                                  { role: 'Mentor', icon: Users, color: 'bg-green-100 text-green-700 hover:bg-green-200', description: 'Connect with mentors' },
                                  { role: 'CA', icon: FileText, color: 'bg-orange-100 text-orange-700 hover:bg-orange-200', description: 'Connect with Chartered Accountants' },
                                  { role: 'CS', icon: Shield, color: 'bg-pink-100 text-pink-700 hover:bg-pink-200', description: 'Connect with Company Secretaries' },
                                  { role: 'Incubation', icon: Building2, color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200', description: 'Connect with incubation centers' },
                                ]
                                .filter((profileType) => {
                                  // Hide Investment Advisor if startup already has an investment advisor
                                  if (profileType.role === 'Investment Advisor' && currentStartup?.investment_advisor_code) {
                                    return false;
                                  }
                                  return true;
                                })
                                .map((profileType) => {
                                  const IconComponent = profileType.icon;
                                  return (
                                    <Card
                                      key={profileType.role}
                                      className="p-5 hover:shadow-lg transition-all duration-200 border border-slate-200 text-center"
                                    >
                                      <div className="flex flex-col items-center">
                                        <div className={`w-14 h-14 rounded-full ${profileType.color} flex items-center justify-center mb-3 transition-colors`}>
                                          <IconComponent className="h-7 w-7" />
                                        </div>
                                        <h4 className="text-sm sm:text-base font-semibold text-slate-900 mb-1">
                                          {profileType.role}
                                        </h4>
                                        <p className="text-xs sm:text-sm text-slate-600 mb-3">
                                          {profileType.description}
                                        </p>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setSelectedServiceType(profileType.role);
                                          }}
                                        >
                                          <Eye className="h-3 w-3 mr-2" />
                                          Explore
                                        </Button>
                                      </div>
                                    </Card>
                                  );
                                })}
                              </div>
                            </>
                          ) : selectedServiceType === 'Mentor' ? (
                            <div className="space-y-4">
                              {/* Back button and header */}
                              <div className="flex items-center gap-4 mb-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedServiceType(null);
                                  }}
                                >
                                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                                  Back
                                </Button>
                                <div>
                                  <h3 className="text-lg font-semibold text-slate-900">
                                    Explore Mentors
                                  </h3>
                                  <p className="text-sm text-slate-600">
                                    Browse available mentors and connect with them.
                                  </p>
                                </div>
                              </div>

                              {/* Search bar */}
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                  type="text"
                                  placeholder="Search mentors by name, location, or expertise..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>

                              {/* Loading state */}
                              {loadingMentors && (
                                <Card className="text-center py-12">
                                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                  <p className="text-slate-600">Loading mentors...</p>
                                </Card>
                              )}

                              {/* Mentors list */}
                              {!loadingMentors && (
                                <>
                                  {mentors.filter(mentor => {
                                    if (!searchTerm.trim()) return true;
                                    const search = searchTerm.toLowerCase();
                                    return (
                                      mentor.mentor_name?.toLowerCase().includes(search) ||
                                      mentor.location?.toLowerCase().includes(search) ||
                                      mentor.mentor_type?.toLowerCase().includes(search) ||
                                      mentor.expertise_areas?.some((area: string) => area.toLowerCase().includes(search)) ||
                                      mentor.sectors?.some((sector: string) => sector.toLowerCase().includes(search))
                                    );
                                  }).length === 0 ? (
                                    <Card className="text-center py-12">
                                      <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                                      <h3 className="text-lg font-semibold text-slate-800 mb-2">
                                        {searchTerm ? 'No mentors found' : 'No mentors available'}
                                      </h3>
                                      <p className="text-slate-600">
                                        {searchTerm 
                                          ? 'Try adjusting your search terms.' 
                                          : 'Check back later for available mentors.'}
                                      </p>
                                    </Card>
                                  ) : (
                                    <div className="space-y-6">
                                      {mentors.filter(mentor => {
                                        if (!searchTerm.trim()) return true;
                                        const search = searchTerm.toLowerCase();
                                        return (
                                          mentor.mentor_name?.toLowerCase().includes(search) ||
                                          mentor.location?.toLowerCase().includes(search) ||
                                          mentor.mentor_type?.toLowerCase().includes(search) ||
                                          mentor.expertise_areas?.some((area: string) => area.toLowerCase().includes(search)) ||
                                          mentor.sectors?.some((sector: string) => sector.toLowerCase().includes(search))
                                        );
                                      }).map((mentor) => {
                                        const videoEmbedUrl = mentor.media_type === 'video' && mentor.video_url 
                                          ? getYoutubeEmbedUrl(mentor.video_url) 
                                          : null;

                                        // Create a component for each mentor card with its own state
                                        // Use a key that includes metrics to force re-render when metrics change
                                        const mentorKey = `${mentor.id || mentor.user_id}-${mentor.startupsMentoring ?? 0}-${mentor.startupsMentoredPreviously ?? 0}-${mentor.verifiedStartupsMentored ?? 0}`;
                                        return <MentorCardWithDetails 
                                          key={mentorKey} 
                                          mentor={mentor} 
                                          videoEmbedUrl={videoEmbedUrl}
                                          onConnect={() => {
                                            setSelectedMentor(mentor);
                                            setConnectModalOpen(true);
                                          }}
                                        />;
                                      })}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          ) : null}
                        </div>
                      )}

                      {servicesSubTab === 'requested' && (
                        <StartupRequestsSection
                          requests={startupRequests}
                          onRequestAction={() => {
                            loadStartupRequests();
                            // Check if any requests were accepted by mentor
                            checkForAcceptedRequests();
                          }}
                          onRequestAccepted={() => {
                            // Switch to My Services tab when startup accepts negotiation
                            setServicesSubTab('my-services');
                            loadAcceptedMentorRequests();
                          }}
                        />
                      )}

                      {servicesSubTab === 'my-services' && (
                        <div className="space-y-4">
                          {/* Accepted Mentor Connections */}
                          {acceptedMentorRequests.length > 0 && (
                            <Card>
                              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                Accepted Mentor Connections
                              </h3>
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b border-slate-200">
                                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Mentor</th>
                                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Accepted Date</th>
                                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {acceptedMentorRequests.map((request) => (
                                      <tr key={request.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="py-3 px-4">
                                          <div className="font-medium text-slate-900">{request.mentor_name || 'Unknown Mentor'}</div>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-slate-600">
                                          {request.responded_at ? formatDateDDMMYYYY(request.responded_at) : 'N/A'}
                                        </td>
                                        <td className="py-3 px-4">
                                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Accepted</span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                            onClick={() => {
                                              setSelectedMentorForView(request);
                                              setViewScheduleSectionOpen(true);
                                            }}
                                          >
                                            <Eye className="mr-1 h-3 w-3" /> View
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </Card>
                          )}
                          
                          <ScheduledSessionsSection
                            startupId={currentStartup.id}
                            userType="Startup"
                          />
                          
                          {acceptedMentorRequests.length === 0 && (
                            <div className="text-center py-4 text-slate-600">
                              <p className="text-sm">
                                Accepted services and ongoing relationships will appear here.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  </div>
                );
            default:
                return null;
        }
    };
    
  // If account page is shown, render the account page instead of the main dashboard
  if (showAccountPage) {
    return (
      <StartupProfilePage 
        currentUser={user} 
        startup={currentStartup} 
        onBack={() => setShowAccountPage(false)} 
        onProfileUpdate={(updatedUser) => {
          // Handle profile updates if needed
          console.log('Profile updated:', updatedUser);
        }}
      />
    );
  }

  // If notifications are shown, render the notifications view instead of the main dashboard
  if (showNotifications) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white shadow-sm border-b">
          <div className="w-full px-3 sm:px-4 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-start sm:justify-between items-start sm:items-center py-3 sm:py-4 gap-3 sm:gap-0">
              <div className="flex items-start sm:items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                <div className="bg-blue-100 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                  <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg sm:text-xl font-semibold text-slate-900 truncate">
                    {currentStartup.name} - Notifications
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Stay updated with your program applications and messages
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Card className="!p-0 sm:!p-0">
          <div className="p-3 sm:p-4 lg:p-6">
            <NotificationsView 
              startupId={currentStartup.id} 
              onClose={() => setShowNotifications(false)} 
            />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
        <div className="bg-white shadow-sm border-b">
            <div className="w-full px-3 sm:px-4 lg:px-8">
                <div className="flex flex-col sm:flex-row justify-start sm:justify-between items-start sm:items-center py-3 sm:py-4 gap-3 sm:gap-0">
                    <div className="flex items-start sm:items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                        <div className="bg-blue-100 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                            <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-lg sm:text-xl font-semibold text-slate-900 truncate">
                                {viewLabels.title}
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500 mt-1">
                                {viewLabels.subtitle}
                            </p>
                            {isFacilitatorAccess && (
                                <div className="mt-1">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                        facilitatorTargetTab === 'full' 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-blue-100 text-blue-800'
                                    }`}>
                                        🔒 Facilitator {facilitatorTargetTab === 'full' ? 'Full Access' : 'Compliance Access Only'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
                        {/* Notification Button - Only show for startup users */}
                        {userRole === 'Startup' && !isViewOnly && (
                            <div className="relative inline-block">
                                <Button 
                                    onClick={() => setShowNotifications(true)} 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full sm:w-auto pr-10"
                                >
                                    <Bell className="mr-2 h-4 w-4" />
                                    <span className="hidden sm:inline">Notifications</span>
                                    <span className="sm:hidden">Notifications</span>
                                </Button>
                                <NotificationBadge startupId={currentStartup.id} badgeOnly className="absolute -top-2 -right-2" />
                            </div>
                        )}
                        {/* Account Button - Only show for startup users */}
                        {userRole === 'Startup' && !isViewOnly && (
                            <Button 
                                onClick={() => setShowAccountPage(true)} 
                                variant="outline" 
                                size="sm" 
                                className="w-full sm:w-auto"
                            >
                                <User className="mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Account</span>
                                <span className="sm:hidden">Account</span>
                            </Button>
                        )}
                        {userRole !== 'Startup' && onBack && (
                            <Button onClick={onBack} variant="secondary" size="sm" className="w-full sm:w-auto">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Back to Portfolio</span>
                                <span className="sm:hidden">Back</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>

      <Card className="!p-0 sm:!p-0">
        {/* Mobile Menu Button */}
        <div className="sm:hidden border-b border-slate-200 p-3">
          <Button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            size="sm"
          >
            <Menu className="h-4 w-4" />
            {tabs.find(tab => tab.id === activeTab)?.name || 'Dashboard'}
          </Button>
        </div>

        {/* Mobile Tab Menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden bg-white border-b border-slate-200 p-3 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-brand-primary text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {tab.icon}
                {tab.name}
              </button>
            ))}
          </div>
        )}

        {/* Desktop Tab Navigation */}
        <div className="hidden sm:block border-b border-slate-200">
            <nav className="-mb-px flex justify-center space-x-2 sm:space-x-4 px-2 sm:px-4 overflow-x-auto" aria-label="Tabs">
                {tabs.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)} 
                        className={`${activeTab === tab.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} flex items-center whitespace-nowrap py-3 px-2 sm:px-3 border-b-2 font-medium text-base transition-colors`}
                    >
                       {tab.icon}
                       <span className="ml-2">{tab.name}</span>
                    </button>
                ))}
            </nav>
        </div>
        <div className="p-3 sm:p-4 lg:p-6">
            {renderTabContent()}
        </div>
      </Card>

      {/* Connect Mentor Request Modal */}
      {connectModalOpen && selectedMentor && (
        <ConnectMentorRequestModal
          isOpen={connectModalOpen}
          onClose={() => {
            setConnectModalOpen(false);
            setSelectedMentor(null);
          }}
          mentorId={selectedMentor.user_id || selectedMentor.id}
          mentorName={selectedMentor.name}
          mentorFeeType={selectedMentor.fee_type}
          mentorFeeAmount={selectedMentor.fee_amount}
          mentorFeeAmountMin={selectedMentor.fee_amount_min || selectedMentor.fee_amount}
          mentorFeeAmountMax={selectedMentor.fee_amount_max || selectedMentor.fee_amount}
          mentorEquityPercentage={selectedMentor.equity_percentage}
          mentorCurrency={selectedMentor.fee_currency || 'USD'}
          startupId={currentStartup.id}
          requesterId={user?.id!}
          onRequestSent={() => {
            loadStartupRequests();
            setServicesSubTab('requested'); // Switch to "Requested" tab
            setConnectModalOpen(false);
            setSelectedMentor(null);
          }}
        />
      )}

      {/* View Schedule Section Modal */}
      {viewScheduleSectionOpen && selectedMentorForView && currentStartup?.id && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-slate-900">
                Schedule Management - {selectedMentorForView.mentor_name || 'Mentor'}
              </h3>
              <button
                onClick={() => {
                  setViewScheduleSectionOpen(false);
                  setSelectedMentorForView(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <StartupMentorScheduleSection
                startupId={currentStartup.id}
                mentorId={selectedMentorForView.mentor_id}
                assignmentId={selectedMentorForView.assignment_id || 0}
                mentorName={selectedMentorForView.mentor_name || 'Mentor'}
                onUpdate={async () => {
                  await loadAcceptedMentorRequests();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Scheduling Modal */}
      {schedulingModalOpen && selectedMentorForScheduling && currentStartup?.id && (
        <SchedulingModal
          isOpen={schedulingModalOpen}
          onClose={() => {
            setSchedulingModalOpen(false);
            setSelectedMentorForScheduling(null);
          }}
          mentorId={selectedMentorForScheduling.mentor_id}
          startupId={currentStartup.id}
          assignmentId={selectedMentorForScheduling.assignment_id}
          onSessionBooked={async () => {
            // Reload accepted requests to refresh data
            await loadAcceptedMentorRequests();
          }}
        />
      )}

    </div>
  );
};

export default StartupHealthView;
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Startup, InvestmentType, ComplianceStatus } from '../types';
import { Eye, Users, TrendingUp, DollarSign, Building2, Film, Search, Heart, CheckCircle, Star, Shield, LayoutGrid, FileText, Clock, CheckCircle2, X, Mail, UserPlus, Plus, Send, Copy, Briefcase, Share2, Video, Linkedin, Globe, ExternalLink, HelpCircle, Bell, CheckSquare, XCircle, Trash2, Calendar, Edit, Save, Image as ImageIcon, Upload, Link, Cloud } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { getQueryParam, setQueryParam } from '../lib/urlState';
import { AuthUser } from '../lib/auth';
import { investorService, ActiveFundraisingStartup } from '../lib/investorService';
import { mentorService, MentorMetrics, MentorRequest, MentorAssignment } from '../lib/mentorService';
import { supabase } from '../lib/supabase';
import { getVideoEmbedUrl } from '../lib/videoUtils';
import { investorConnectionRequestService, InvestorConnectionRequest } from '../lib/investorConnectionRequestService';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Input from './ui/Input';
import Select from './ui/Select';
import ProfilePage from './ProfilePage';
import StartupHealthView from './StartupHealthView';
import MentorDataForm from './MentorDataForm';
import MentorProfileForm from './mentor/MentorProfileForm';
import MentorCard from './mentor/MentorCard';
import { AddProfileModal } from './AddProfileModal';
import MentorPendingRequestsSection from './mentor/MentorPendingRequestsSection';
import SchedulingModal from './mentor/SchedulingModal';
import ScheduledSessionsSection from './mentor/ScheduledSessionsSection';
import ManageAvailabilityModal from './mentor/ManageAvailabilityModal';
import PastSessionsSection from './mentor/PastSessionsSection';
import ShareSlotsModal from './mentor/ShareSlotsModal';
import AvailabilitySlotsDisplay from './mentor/AvailabilitySlotsDisplay';
import MentorStartupScheduleSection from './mentor/MentorStartupScheduleSection';

interface MentorViewProps {
  currentUser: AuthUser | null;
  users: User[];
  startups: Startup[];
  onViewStartup: (id: number, targetTab?: string) => void;
}

const MentorView: React.FC<MentorViewProps> = ({
  currentUser,
  users,
  startups,
  onViewStartup
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'discover' | 'portfolio' | 'collaboration' | 'schedule'>(() => {
    const fromUrl = (getQueryParam('tab') as any) || 'dashboard';
    const valid = ['dashboard', 'discover', 'portfolio', 'collaboration', 'schedule'];
    return valid.includes(fromUrl) ? fromUrl : 'dashboard';
  });

  useEffect(() => {
    setQueryParam('tab', activeTab, true);
  }, [activeTab]);

  const [showProfilePage, setShowProfilePage] = useState(false);
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [activeFundraisingStartups, setActiveFundraisingStartups] = useState<ActiveFundraisingStartup[]>([]);
  const [isLoadingPitches, setIsLoadingPitches] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [discoverySubTab, setDiscoverySubTab] = useState<'all' | 'verified' | 'favorites' | 'due-diligence'>('all');
  const [showOnlyDueDiligence, setShowOnlyDueDiligence] = useState(false);
  const [dueDiligenceStartups, setDueDiligenceStartups] = useState<Set<number>>(new Set());
  const [favoritedPitches, setFavoritedPitches] = useState<Set<number>>(new Set());
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [showOnlyValidated, setShowOnlyValidated] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<number | null>(null);
  const [selectedPitchId, setSelectedPitchId] = useState<number | null>(null);

  // Collaboration state
  const [collaborationSubTab, setCollaborationSubTab] = useState<'explore-collaborators' | 'my-collaborators' | 'requests'>('explore-collaborators');
  const [collaboratorRequests, setCollaboratorRequests] = useState<InvestorConnectionRequest[]>([]);
  const [collaborators, setCollaborators] = useState<InvestorConnectionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Mentor metrics state
  const [mentorMetrics, setMentorMetrics] = useState<MentorMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formSection, setFormSection] = useState<'active' | 'completed' | 'founded' | null>(null);
  
  // Mentor profile state
  const [previewProfile, setPreviewProfile] = useState<any>(null);
  
  // Currency state - get from profile or default to USD
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  
  // Update currency when profile changes
  useEffect(() => {
    if (previewProfile?.fee_currency) {
      setSelectedCurrency(previewProfile.fee_currency);
    } else {
      // Try to load currency from profile if not in previewProfile
      const loadCurrency = async () => {
        if (currentUser?.id) {
          try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
              const { data: profileData } = await supabase
                .from('mentor_profiles')
                .select('fee_currency')
                .eq('user_id', authUser.id)
                .maybeSingle();
              
              if (profileData && (profileData as any).fee_currency) {
                setSelectedCurrency((profileData as any).fee_currency);
              }
            }
          } catch (error) {
            console.error('Error loading currency:', error);
          }
        }
      };
      loadCurrency();
    }
  }, [previewProfile, currentUser?.id]);
  
  // Tab state for mentor startups section
  const [mentorStartupsTab, setMentorStartupsTab] = useState<'active' | 'completed' | 'founded'>('active');
  
  // State for Add Profile Modal
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  
  // State for Scheduling Modal
  const [schedulingModalOpen, setSchedulingModalOpen] = useState(false);
  const [selectedAssignmentForScheduling, setSelectedAssignmentForScheduling] = useState<any>(null);
  const [shareSlotsModalOpen, setShareSlotsModalOpen] = useState(false);
  const [selectedAssignmentForSharing, setSelectedAssignmentForSharing] = useState<any>(null);
  const [scheduleSectionOpen, setScheduleSectionOpen] = useState(false);
  const [selectedAssignmentForSchedule, setSelectedAssignmentForSchedule] = useState<any>(null);
  
  // State for Manage Availability Modal
  const [manageAvailabilityModalOpen, setManageAvailabilityModalOpen] = useState(false);
  
  // State for Schedule Tab Sub-tabs
  const [scheduleSubTab, setScheduleSubTab] = useState<'availability' | 'sessions'>('availability');
  
  // State for Launching Soon modal
  const [showLaunchingSoonModal, setShowLaunchingSoonModal] = useState(false);
  
  // State for profile editing and save refs
  const [isEditingProfile, setIsEditingProfile] = useState(true);
  const profileFormSaveRef = useRef<(() => Promise<void>) | null>(null);
  const profileFormEditingRef = useRef<{ isEditing: boolean; setIsEditing: (val: boolean) => void } | null>(null);
  
  // State for profile photo input mode
  const [photoInputMode, setPhotoInputMode] = useState<'url' | 'file'>('url');

  // Sync previewProfile changes back to form when editing sections on right side
  useEffect(() => {
    if (previewProfile && isEditingProfile) {
      // This will trigger the externalProfile sync in MentorProfileForm
    }
  }, [previewProfile, isEditingProfile]);
  
  // Show launching soon modal when collaboration tab is opened
  useEffect(() => {
    if (activeTab === 'collaboration') {
      setShowLaunchingSoonModal(true);
    }
  }, [activeTab]);
  
  // Handle navigation from profile form to dashboard
  const handleNavigateToDashboard = (section?: 'active' | 'completed' | 'founded') => {
    setActiveTab('dashboard');
    if (section) {
      setFormSection(section);
      setShowAddForm(true);
      // Set the appropriate tab in the startups section
      if (section === 'active') {
        setMentorStartupsTab('active');
      } else if (section === 'completed') {
        setMentorStartupsTab('completed');
      } else if (section === 'founded') {
        setMentorStartupsTab('founded');
      }
    }
  };
  
  // Reset form section when form is closed
  useEffect(() => {
    if (!showAddForm) {
      setFormSection(null);
    }
  }, [showAddForm]);
  
  // Set initial tab based on available data
  useEffect(() => {
    if (mentorMetrics) {
      if (mentorMetrics.activeAssignments.length > 0) {
        setMentorStartupsTab('active');
      } else if (mentorMetrics.completedAssignments.length > 0) {
        setMentorStartupsTab('completed');
      } else if (mentorMetrics.foundedStartups.length > 0) {
        setMentorStartupsTab('founded');
      }
    }
  }, [mentorMetrics]);

  // Fetch mentor metrics
  const fetchMetrics = async () => {
    if (!currentUser?.id) return;
    
    setIsLoadingMetrics(true);
    try {
      const metrics = await mentorService.getMentorMetrics(currentUser.id);
      setMentorMetrics(metrics);
    } catch (error) {
      console.error('Error fetching mentor metrics:', error);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'portfolio') {
      fetchMetrics();
    }
  }, [currentUser?.id, activeTab]);

  // Load mentor's favorites from database
  useEffect(() => {
    const loadFavorites = async () => {
      // Get auth user ID (required for foreign key constraint)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const authUserId = authUser.id;
      
      try {
        const { data, error } = await supabase
          .from('investor_favorites')
          .select('startup_id')
          .eq('investor_id', authUserId); // Use auth user ID, not profile ID
        
        if (error) {
          // If table doesn't exist yet, silently fail (table will be created by SQL script)
          if (error.code !== 'PGRST116') {
            console.error('Error loading favorites:', error);
          }
          return;
        }
        
        if (data) {
          const favoriteIds = new Set(data.map((fav: any) => fav.startup_id));
          setFavoritedPitches(favoriteIds);
        }
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    };

    if (currentUser?.id) {
      loadFavorites();
    }
  }, [currentUser?.id]);

  // Fetch active fundraising startups for discover section
  useEffect(() => {
    if (activeTab === 'discover') {
      const fetchPitches = async () => {
        setIsLoadingPitches(true);
        try {
          const pitches = await investorService.getActiveFundraisingStartups();
          setActiveFundraisingStartups(pitches);
        } catch (error) {
          console.error('Error fetching pitches:', error);
        } finally {
          setIsLoadingPitches(false);
        }
      };
      fetchPitches();
    }
  }, [activeTab]);

  // Load collaborator requests
  useEffect(() => {
    if (currentUser?.id && activeTab === 'collaboration') {
      const loadConnectionRequests = async () => {
        setLoadingRequests(true);
        try {
          // Load from investor_connection_requests (for requests TO the mentor)
          // This includes requests from ALL profile types: Investor, Investment Advisor, Mentor, CA, CS, Incubator, etc.
          const investorRequests = await investorConnectionRequestService.getRequestsForInvestor(currentUser.id!);
          // Filter out only Startup requests (startups go to Service Requests, not Collaboration)
          // All other profiles (Investor, Advisor, Mentor, CA, CS, Incubator, etc.) are collaborators
          const collaboratorSide = (investorRequests || []).filter(
            r => r.requester_type !== 'Startup'
          );

          // Also load requests FROM the mentor to other profiles (where mentor is the requester)
          // This ensures both parties see each other in "My Collaborators"
          // Supports collaboration with ALL profile types
          // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
          const { data: { user: authUser } } = await supabase.auth.getUser();
          const authUserId = authUser?.id || currentUser.id;
          
          const { data: requestsFromMentor, error: requesterError } = await supabase
            .from('investor_connection_requests')
            .select('*')
            .eq('requester_id', authUserId) // Use auth.uid() instead of profile ID
            .neq('requester_type', 'Startup') // Exclude startup requests (those are handled separately)
            .order('created_at', { ascending: false });

          if (requesterError) {
            console.error('Error loading requests from mentor:', requesterError);
          }

          // Merge both sides - requests TO mentor and FROM mentor
          const allCollaboratorRequests = [...collaboratorSide, ...(requestsFromMentor || [])];
          
          setCollaboratorRequests(collaboratorSide); // Only show incoming requests in "Collaborator Requests" tab
          
          // Set accepted requests as collaborators from BOTH sides
          // This ensures both parties see each other after acceptance
          const acceptedToMentor = collaboratorSide.filter(r => r.status === 'accepted');
          const acceptedFromMentor = (requestsFromMentor || []).filter(r => r.status === 'accepted');
          setCollaborators([...acceptedToMentor, ...acceptedFromMentor]);
        } catch (error) {
          console.error('Error loading connection requests:', error);
        } finally {
          setLoadingRequests(false);
        }
      };
      loadConnectionRequests();
    }
  }, [currentUser?.id, activeTab]);

  // Filter pitches based on search and sub-tabs
  const filteredPitches = useMemo(() => {
    let filtered = [...activeFundraisingStartups];

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(pitch =>
        pitch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pitch.sector.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sub-tab filters
    if (showOnlyFavorites) {
      filtered = filtered.filter(pitch => favoritedPitches.has(pitch.id));
    }

    if (showOnlyValidated) {
      filtered = filtered.filter(pitch => pitch.isStartupNationValidated);
    }

    if (showOnlyDueDiligence) {
      filtered = filtered.filter(pitch => dueDiligenceStartups.has(pitch.id));
    }

    return filtered;
  }, [activeFundraisingStartups, searchTerm, showOnlyFavorites, showOnlyValidated, showOnlyDueDiligence, favoritedPitches, dueDiligenceStartups]);

  const handleViewStartup = (startup: Startup | ActiveFundraisingStartup) => {
    if ('id' in startup && typeof startup.id === 'number') {
      const fullStartup = startups.find(s => s.id === startup.id);
      if (fullStartup) {
        setSelectedStartup(fullStartup);
      } else {
        // If startup not in our list, try to view it via onViewStartup
        onViewStartup(startup.id);
      }
    }
  };

  const openStartupPublicPage = (startupId: number) => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('view', 'startup');
    url.searchParams.set('startupId', String(startupId));
    window.open(url.toString(), '_blank');
  };

  const handleBack = () => {
    setSelectedStartup(null);
  };

  const handleFavoriteToggle = async (startupId: number) => {
    // Get auth user ID (required for foreign key constraint)
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      alert('Please log in to favorite startups.');
      return;
    }
    const authUserId = authUser.id;
    
    const isCurrentlyFavorited = favoritedPitches.has(startupId);
    
    // Optimistically update UI
    setFavoritedPitches(prev => {
      const newSet = new Set(prev);
      if (isCurrentlyFavorited) {
        newSet.delete(startupId);
      } else {
        newSet.add(startupId);
      }
      return newSet;
    });
    
    try {
      if (isCurrentlyFavorited) {
        // Remove favorite
        const { error } = await supabase
          .from('investor_favorites')
          .delete()
          .eq('investor_id', authUserId) // Use auth user ID, not profile ID
          .eq('startup_id', startupId);
        
        if (error) {
          // Revert optimistic update on error
          setFavoritedPitches(prev => {
            const newSet = new Set(prev);
            newSet.add(startupId);
            return newSet;
          });
          
          if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
            alert('Permission denied. Please ensure RLS policies allow mentors to manage favorites. You may need to run the FIX_MENTOR_FAVORITES.sql script in your Supabase database.');
          } else {
            throw error;
          }
        }
      } else {
        // Add favorite
        const { error } = await supabase
          .from('investor_favorites')
          .insert([{
            investor_id: authUserId, // Use auth user ID, not profile ID (satisfies foreign key)
            startup_id: startupId
          }]);
        
        if (error) {
          // Revert optimistic update on error
          setFavoritedPitches(prev => {
            const newSet = new Set(prev);
            newSet.delete(startupId);
            return newSet;
          });
          
          if (error.code === '23505') {
            // Unique constraint violation - already favorited (shouldn't happen but handle gracefully)
            console.log('Already favorited');
          } else if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
            alert('Permission denied. Please ensure RLS policies allow mentors to manage favorites. You may need to run the FIX_MENTOR_FAVORITES.sql script in your Supabase database.');
          } else {
            throw error;
          }
        }
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      const errorMessage = error?.message || error?.details || 'Unknown error occurred';
      const errorCode = error?.code || 'UNKNOWN';
      alert(`Failed to update favorite. Error: ${errorCode} - ${errorMessage}`);
    }
  };

  const handleShare = async (pitch: ActiveFundraisingStartup) => {
    try {
      // Create clean public shareable link
      const { createSlug, createProfileUrl } = await import('../lib/slugUtils');
      const startupName = pitch.name || 'Startup';
      const slug = createSlug(startupName);
      const baseUrl = window.location.origin;
      const shareUrl = createProfileUrl(baseUrl, 'startup', slug, String(pitch.id));
      
      // Try Web Share API first (works on mobile and some desktop browsers)
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Check out ${pitch.name}`,
            text: `${pitch.name} - ${pitch.sector}`,
            url: shareUrl
          });
          return; // Successfully shared
        } catch (shareError: any) {
          // User cancelled or share failed, fall through to clipboard
          if (shareError.name === 'AbortError') {
            return; // User cancelled, don't show error
          }
        }
      }
      
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert(`Link copied to clipboard!\n\n${shareUrl}`);
      } catch (clipboardError) {
        // Clipboard API failed, show URL in prompt
        const userConfirmed = confirm(
          `Share this startup pitch:\n\n${pitch.name}\n\nCopy this link:\n${shareUrl}\n\nClick OK to copy, or Cancel to close.`
        );
        if (userConfirmed) {
          // Create a temporary textarea to select and copy
          const textarea = document.createElement('textarea');
          textarea.value = shareUrl;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          try {
            document.execCommand('copy');
            alert('Link copied to clipboard!');
          } catch (err) {
            alert(`Please copy this link manually:\n\n${shareUrl}`);
          }
          document.body.removeChild(textarea);
        }
      }
    } catch (error: any) {
      console.error('Error sharing:', error);
      alert(`Failed to share. Please copy this link manually:\n\n${window.location.origin}/startup/${pitch.id}`);
    }
  };

  const handleDueDiligenceClick = (pitch: ActiveFundraisingStartup) => {
    if (dueDiligenceStartups.has(pitch.id)) {
      setDueDiligenceStartups(prev => {
        const next = new Set(prev);
        next.delete(pitch.id);
        return next;
      });
    } else {
      setDueDiligenceStartups(prev => {
        const next = new Set(prev);
        next.add(pitch.id);
        return next;
      });
    }
  };

  const handleConnect = async (pitch: ActiveFundraisingStartup) => {
    if (!currentUser?.id) {
      alert('Please log in to connect with startups.');
      return;
    }

    // Find the startup in the startups array to get the user_id
    const startup = startups.find(s => s.id === pitch.id);
    if (!startup) {
      alert('Startup information not found.');
      return;
    }

    try {
      // Check if a request already exists (pending or accepted)
      const existingCheck = await investorConnectionRequestService.checkExistingRequest(
        startup.user_id, // investor_id (the startup owner)
        currentUser.id    // requester_id (the mentor)
      );

      if (existingCheck.exists) {
        if (existingCheck.status === 'accepted') {
          alert('You are already connected with this startup!');
          return;
        } else if (existingCheck.status === 'pending') {
          alert('You already have a pending connection request with this startup. Please wait for their response.');
          return;
        }
      }

      // Create a connection request using investor_connection_requests table
      // This allows mentors to connect with startups and other users
      // Generate SEO-friendly URL
      const { createSlug, createProfileUrl } = await import('../lib/slugUtils');
      const startupName = startup.name || 'Startup';
      const slug = createSlug(startupName);
      const baseUrl = window.location.origin;
      const startupProfileUrl = createProfileUrl(baseUrl, 'startup', slug, String(startup.id));
      
      await investorConnectionRequestService.createRequest({
        investor_id: startup.user_id,
        requester_id: currentUser.id,
        requester_type: 'Mentor',
        startup_id: startup.id,
        startup_profile_url: startupProfileUrl,
        message: `${currentUser.name || 'A mentor'} wants to connect with your startup.`
      });

      alert(`Connection request sent to ${pitch.name}!`);
    } catch (error: any) {
      console.error('Error in handleConnect:', error);
      if (error.message && error.message.includes('already connected')) {
        alert(error.message);
      } else {
        alert('Failed to send connection request. Please try again.');
      }
    }
  };

  const handleInviteToTMS = async (startupName: string, emailId?: string, assignment?: any) => {
    let contactEmail = emailId?.trim();
    
    // If email not in notes, try to get it from startup's user profile if startup exists on TMS
    if (!contactEmail && assignment?.startup_id) {
      try {
        // Get startup's user_id from startups table
        const { data: startupData, error: startupError } = await supabase
          .from('startups')
          .select('user_id')
          .eq('id', assignment.startup_id)
          .single();
        
        if (!startupError && startupData && (startupData as any).user_id) {
          const userId = (startupData as any).user_id;
          // Get email from user_profiles
          const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('email')
            .eq('auth_user_id', userId)
            .eq('role', 'Startup')
            .single();
          
          if (!profileError && userProfile && (userProfile as any).email) {
            contactEmail = (userProfile as any).email;
          }
        }
      } catch (error) {
        console.error('Error fetching startup email:', error);
      }
    }

    if (!contactEmail) {
      alert('Email address is required to send the invitation. Please ensure the startup has a valid email address in the assignment notes or the startup is registered on TMS.');
      return;
    }

    if (!currentUser?.mentor_code) {
      alert('Mentor information not available. Please refresh and try again.');
      return;
    }

    const mentorName = currentUser?.name || 'Mentor';
    const mentorCode = currentUser.mentor_code;

    try {
      const response = await fetch('/api/invite-startup-mentor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startupName,
          contactEmail: contactEmail,
          contactName: startupName,
          mentorCode,
          mentorName
        }),
      });

      if (!response.ok) {
        let errorData;
        const responseText = await response.text();
        try {
          errorData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('API error - could not parse JSON:', responseText);
          errorData = { error: `Server error (${response.status}): ${responseText || 'Unknown error'}` };
        }
        console.error('API error response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        alert(`Failed to send invite: ${errorData.error || errorData.message || `Error ${response.status}`}`);
        return;
      }

      const result = await response.json();
      
      if (result.success) {
        alert(`Invitation email sent successfully to ${contactEmail}!`);
      } else {
        alert(`Failed to send invite: ${result.error || result.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error sending invite:', error);
      alert(`Failed to send invite: ${error.message || 'Unknown error occurred. Please try again.'}`);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP, or SVG)');
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File size too large. Please upload an image smaller than 10MB');
      return;
    }

    try {
      // Get auth user ID for file naming
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        alert('Not authenticated. Please log in again.');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${authUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `mentor-logos/${fileName}`;

      console.log('Uploading profile photo:', { filePath, fileSize: file.size, fileType: file.type });

      const { error: uploadError } = await supabase.storage
        .from('mentor-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        let errorMessage = 'Failed to upload profile photo';
        
        if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('does not exist')) {
          errorMessage = 'Storage bucket not found. Please contact administrator to set up mentor-assets bucket.';
        } else if (uploadError.message?.includes('new row violates row-level security') || uploadError.message?.includes('permission')) {
          errorMessage = 'Permission denied. Please check storage bucket policies. Error: ' + uploadError.message;
        } else if (uploadError.message) {
          errorMessage = `Upload failed: ${uploadError.message}`;
        }
        
        alert(errorMessage);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('mentor-assets')
        .getPublicUrl(filePath);

      console.log('Profile photo uploaded successfully:', publicUrl);
      setPreviewProfile({ 
        ...previewProfile, 
        logo_url: publicUrl,
        media_type: 'logo'
      });
      alert('Profile photo uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading profile photo:', error);
      alert(`Failed to upload profile photo: ${error.message || 'Unknown error'}`);
    }
  };

  if (selectedStartup) {
    return (
      <StartupHealthView
        startup={selectedStartup}
        userRole="Mentor"
        user={currentUser}
        onBack={handleBack}
        onActivateFundraising={() => {}}
        onInvestorAdded={() => {}}
        onUpdateFounders={() => {}}
        isViewOnly={true}
        investmentOffers={[]}
        onProcessOffer={() => {}}
      />
    );
  }

  if (showProfilePage) {
    return (
      <ProfilePage
        user={currentUser}
        onBack={() => setShowProfilePage(false)}
        onProfileUpdate={() => {}}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">Mentor Dashboard</h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">Welcome back, {currentUser?.name || 'Mentor'}</p>
              {currentUser?.mentor_code && (
                <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <span className="text-xs text-slate-500">Your Mentor Code:</span>
                  <div className="flex items-center gap-2 bg-blue-50 px-2 sm:px-3 py-1 rounded-md border border-blue-200">
                    <span className="text-xs sm:text-sm font-mono font-semibold text-blue-700">
                      {currentUser.mentor_code}
                    </span>
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(currentUser.mentor_code || '');
                          alert('Mentor code copied to clipboard!');
                        } catch (error) {
                          console.error('Failed to copy code:', error);
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Copy mentor code"
                    >
                      <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex overflow-x-auto space-x-2 sm:space-x-4 md:space-x-6 lg:space-x-8 -mb-px scrollbar-hide">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-3 sm:py-4 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap flex-shrink-0 ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <LayoutGrid className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Dash</span>
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`py-3 sm:py-4 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap flex-shrink-0 ${
                activeTab === 'schedule'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              Schedule
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`py-3 sm:py-4 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap flex-shrink-0 ${
                activeTab === 'discover'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Film className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              <span className="hidden md:inline">Discover Pitches</span>
              <span className="md:hidden">Discover</span>
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`py-3 sm:py-4 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap flex-shrink-0 ${
                activeTab === 'portfolio'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              Portfolio
            </button>
            <button
              onClick={() => setActiveTab('collaboration')}
              className={`py-3 sm:py-4 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm flex items-center relative whitespace-nowrap flex-shrink-0 ${
                activeTab === 'collaboration'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Collaboration</span>
              <span className="sm:hidden">Collab</span>
              {collaboratorRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-xs font-semibold text-white bg-amber-500 rounded-full">
                  {collaboratorRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            {isLoadingMetrics ? (
              <Card className="text-center py-20">
                <div className="max-w-sm mx-auto">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">Loading Dashboard...</h3>
                  <p className="text-slate-500">Fetching your mentor metrics</p>
                </div>
              </Card>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <Card className="flex-1 p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-slate-500">Requests Received</p>
                        <p className="text-xl sm:text-2xl font-bold text-slate-800 mt-1">{mentorMetrics?.requestsReceived || 0}</p>
                      </div>
                      <div className="p-2 sm:p-3 bg-blue-100 rounded-full flex-shrink-0 ml-2">
                        <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                      </div>
                    </div>
                  </Card>
                  <Card className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">Startups Mentoring</p>
                        <p className="text-2xl font-bold text-slate-800">{mentorMetrics?.startupsMentoring || 0}</p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-full">
                        <Building2 className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </Card>
                  <Card className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">Mentored Previously</p>
                        <p className="text-2xl font-bold text-slate-800">{mentorMetrics?.startupsMentoredPreviously || 0}</p>
                      </div>
                      <div className="p-3 bg-purple-100 rounded-full">
                        <CheckCircle2 className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  </Card>
                  <Card className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">Startup Experience</p>
                        <p className="text-2xl font-bold text-slate-800">{mentorMetrics?.startupsFounded || 0}</p>
                      </div>
                      <div className="p-3 bg-orange-100 rounded-full">
                        <Star className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                  </Card>
                  <Card className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">Total Earnings (Fees)</p>
                        <p className="text-2xl font-bold text-slate-800">
                          {mentorService.formatCurrency(mentorMetrics?.totalEarningsFees || 0, selectedCurrency)}
                        </p>
                      </div>
                      <div className="p-3 bg-yellow-100 rounded-full">
                        <DollarSign className="h-6 w-6 text-yellow-600" />
                      </div>
                    </div>
                  </Card>
                  <Card className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">Total Earnings (ESOP)</p>
                        <p className="text-2xl font-bold text-slate-800">
                          {mentorService.formatCurrency(mentorMetrics?.totalEarningsESOP || 0, selectedCurrency)}
                        </p>
                      </div>
                      <div className="p-3 bg-indigo-100 rounded-full">
                        <TrendingUp className="h-6 w-6 text-indigo-600" />
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Pending Request */}
                <MentorPendingRequestsSection
                  requests={mentorMetrics?.pendingRequests || []}
                  onRequestAction={async () => {
                                          // Reload mentor metrics
                                          if (currentUser?.id) {
                                            const metrics = await mentorService.getMentorMetrics(currentUser.id);
                                            setMentorMetrics(metrics);
                    }
                  }}
                />

                {/* Combined Mentor Startups Section */}
                {mentorMetrics && (
                  <Card>
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base sm:text-lg font-semibold text-slate-700">My Startups</h3>
                        <Button
                          variant={showAddForm ? "outline" : "primary"}
                          size="sm"
                          onClick={() => setShowAddForm(!showAddForm)}
                        >
                          {showAddForm ? (
                            <>
                              <X className="h-4 w-4 mr-2" /> Hide Form
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" /> Add/Edit Data
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {/* Add/Edit Data Form - Show when button is clicked */}
                      {showAddForm && currentUser?.id && (
                        <div className="mb-4 pb-4 border-b border-slate-200">
                          <MentorDataForm
                            mentorId={currentUser.id}
                            startups={startups}
                            onUpdate={fetchMetrics}
                            mentorMetrics={mentorMetrics}
                            initialSection={formSection || undefined}
                          />
                        </div>
                      )}
                      
                      {/* Tabs */}
                      <div className="border-b border-slate-200">
                        <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto scrollbar-hide" aria-label="Tabs">
                          <button
                            onClick={() => setMentorStartupsTab('active')}
                            className={`py-2 px-1 sm:px-2 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                              mentorStartupsTab === 'active'
                                ? 'border-green-500 text-green-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-1 sm:gap-2">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="hidden sm:inline">Currently Mentoring</span>
                              <span className="sm:hidden">Active</span>
                              <span>({mentorMetrics.activeAssignments.length})</span>
                            </div>
                          </button>
                          <button
                            onClick={() => setMentorStartupsTab('completed')}
                            className={`py-2 px-1 sm:px-2 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                              mentorStartupsTab === 'completed'
                                ? 'border-purple-500 text-purple-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-1 sm:gap-2">
                              <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="hidden sm:inline">Previously Mentored</span>
                              <span className="sm:hidden">Previous</span>
                              <span>({mentorMetrics.completedAssignments.length})</span>
                            </div>
                          </button>
                          <button
                            onClick={() => setMentorStartupsTab('founded')}
                            className={`py-2 px-1 sm:px-2 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                              mentorStartupsTab === 'founded'
                                ? 'border-orange-500 text-orange-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-1 sm:gap-2">
                              <Star className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="hidden sm:inline">Startup Experience</span>
                              <span className="sm:hidden">Experience</span>
                              <span>({mentorMetrics.foundedStartups.length})</span>
                            </div>
                          </button>
                        </nav>
                      </div>
                    </div>

                    {/* Currently Mentoring Tab Content */}
                    {mentorStartupsTab === 'active' && mentorMetrics.activeAssignments.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Startup Name</th>
                              <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Website</th>
                              <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Sector</th>
                              <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">From Date</th>
                              <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Fee</th>
                              <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">ESOP</th>
                              <th className="px-4 sm:px-6 py-3 text-right text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-200">
                            {mentorMetrics.activeAssignments.map(assignment => {
                              // Parse notes to get startup_name, email_id, website, and sector
                              let startupName = assignment.startup?.name || `Startup #${assignment.startup_id || 'N/A'}`;
                              let emailId = '';
                              let website = '';
                              let sector = '';
                              let fromDate = '';
                              
                              if (assignment.notes) {
                                try {
                                  const notesData = JSON.parse(assignment.notes);
                                  startupName = notesData.startup_name || startupName;
                                  emailId = notesData.email_id || '';
                                  website = notesData.website || '';
                                  sector = notesData.sector || '';
                                  fromDate = notesData.from_date || '';
                                } catch (e) {
                                  // Notes is not JSON, use startup data
                                  website = assignment.startup?.domain || '';
                                  sector = assignment.startup?.sector || '';
                                }
                              } else if (assignment.startup) {
                                website = assignment.startup.domain || '';
                                sector = assignment.startup.sector || '';
                              }
                              
                              // If from_date not in notes, use assigned_at
                              if (!fromDate && assignment.assigned_at) {
                                fromDate = assignment.assigned_at.split('T')[0];
                              }

                              return (
                                <tr key={assignment.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-slate-900">
                                      {startupName}
                                    </div>
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {website ? (
                                      <a 
                                        href={website.startsWith('http') ? website : `https://${website}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-blue-600 hover:underline"
                                      >
                                        {website}
                                      </a>
                                    ) : 'N/A'}
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {sector || 'N/A'}
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {fromDate || 'N/A'}
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {mentorService.formatCurrency(assignment.fee_amount || 0, assignment.fee_currency || selectedCurrency)}
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {assignment.esop_percentage > 0 ? `${assignment.esop_percentage}%` : 'N/A'}
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-2">
                                      {/* Schedule button - only for TMS startups */}
                                      {assignment.startup && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-green-600 border-green-300 hover:bg-green-50"
                                          onClick={() => {
                                            setSelectedAssignmentForSchedule(assignment);
                                            setScheduleSectionOpen(true);
                                          }}
                                        >
                                          <Calendar className="mr-1 h-3 w-3" /> Schedule
                                        </Button>
                                      )}
                                      {/* Only show Invite to TMS if assignment didn't come from a request */}
                                      {!(assignment as any).fromRequest && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleInviteToTMS(startupName, emailId, assignment)}
                                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                        >
                                          <Send className="mr-1 h-3 w-3" /> Invite to TMS
                                        </Button>
                                      )}
                                      {assignment.startup && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleViewStartup(assignment.startup!)}
                                        >
                                          <Eye className="mr-2 h-4 w-4" /> View
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-purple-600 border-purple-300 hover:bg-purple-50"
                                        onClick={async () => {
                                          if (confirm(`Mark ${startupName} as completed? This will move it to Previously Mentored section.`)) {
                                            const success = await mentorService.completeMentoringAssignment(assignment.id);
                                            if (success) {
                                              // Reload mentor metrics
                                              if (currentUser?.id) {
                                                const metrics = await mentorService.getMentorMetrics(currentUser.id);
                                                setMentorMetrics(metrics);
                                                // Switch to Previously Mentored tab to show the moved startup
                                                if (metrics.completedAssignments.length > 0) {
                                                  setMentorStartupsTab('completed');
                                                }
                                              }
                                            } else {
                                              alert('Failed to mark mentoring as completed. Please try again.');
                                            }
                                          }
                                        }}
                                      >
                                        <CheckCircle2 className="mr-1 h-3 w-3" /> Terminate
                                      </Button>
                                      {/* Only show Delete button for manually entered startups (not TMS startups) */}
                                      {!assignment.startup && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-red-600 border-red-300 hover:bg-red-50"
                                          onClick={async () => {
                                            if (confirm(`Are you sure you want to delete ${startupName}? This action cannot be undone.`)) {
                                              const success = await mentorService.deleteMentoringAssignment(assignment.id);
                                              if (success) {
                                                // Reload mentor metrics
                                                if (currentUser?.id) {
                                                  const metrics = await mentorService.getMentorMetrics(currentUser.id);
                                                  setMentorMetrics(metrics);
                                                }
                                              } else {
                                                alert('Failed to delete mentoring assignment. Please try again.');
                                              }
                                            }
                                          }}
                                        >
                                          <Trash2 className="mr-1 h-3 w-3" /> Delete
                                        </Button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                    </div>
                    )}

                    {/* Previously Mentored Tab Content */}
                    {mentorStartupsTab === 'completed' && mentorMetrics.completedAssignments.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Startup Name</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Website</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Sector</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">From Date</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">To Date</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Fee Earned</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">ESOP Value</th>
                            <th className="px-4 sm:px-6 py-3 text-right text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {mentorMetrics.completedAssignments.map(assignment => {
                            // Parse notes to get startup_name, email_id, website, and sector
                            let startupName = assignment.startup?.name || `Startup #${assignment.startup_id || 'N/A'}`;
                            let emailId = '';
                            let website = '';
                            let sector = '';
                            let fromDate = '';
                            let toDate = '';
                            
                            if (assignment.notes) {
                              try {
                                const notesData = JSON.parse(assignment.notes);
                                startupName = notesData.startup_name || startupName;
                                emailId = notesData.email_id || '';
                                website = notesData.website || '';
                                sector = notesData.sector || '';
                                fromDate = notesData.from_date || '';
                                toDate = notesData.to_date || '';
                              } catch (e) {
                                // Notes is not JSON, use startup data
                                website = assignment.startup?.domain || '';
                                sector = assignment.startup?.sector || '';
                              }
                            } else if (assignment.startup) {
                              website = assignment.startup.domain || '';
                              sector = assignment.startup.sector || '';
                            }
                            
                            // If from_date not in notes, use assigned_at
                            if (!fromDate && assignment.assigned_at) {
                              fromDate = assignment.assigned_at.split('T')[0];
                            }
                            
                            // If to_date not in notes but completed_at exists, use completed_at
                            if (!toDate && assignment.completed_at) {
                              toDate = assignment.completed_at.split('T')[0];
                            }

                            return (
                                <tr key={assignment.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-slate-900">
                                      {startupName}
                                    </div>
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {website ? (
                                      <a 
                                        href={website.startsWith('http') ? website : `https://${website}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-blue-600 hover:underline"
                                      >
                                        {website}
                                      </a>
                                    ) : 'N/A'}
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {sector || 'N/A'}
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {fromDate || 'N/A'}
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {toDate || 'N/A'}
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {mentorService.formatCurrency(assignment.fee_amount || 0, assignment.fee_currency || selectedCurrency)}
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {mentorService.formatCurrency(assignment.esop_value || 0, selectedCurrency)}
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleInviteToTMS(startupName, emailId, assignment)}
                                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                      >
                                        <Send className="mr-1 h-3 w-3" /> Invite to TMS
                                      </Button>
                                      {assignment.startup && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleViewStartup(assignment.startup!)}
                                        >
                                          <Eye className="mr-2 h-4 w-4" /> View
                                        </Button>
                                      )}
                                      {/* Only show Delete button for manually entered startups (not TMS startups) */}
                                      {!assignment.startup && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-red-600 border-red-300 hover:bg-red-50"
                                          onClick={async () => {
                                            if (confirm(`Are you sure you want to delete ${startupName}? This action cannot be undone.`)) {
                                              const success = await mentorService.deleteMentoringAssignment(assignment.id);
                                              if (success) {
                                                // Reload mentor metrics
                                                if (currentUser?.id) {
                                                  const metrics = await mentorService.getMentorMetrics(currentUser.id);
                                                  setMentorMetrics(metrics);
                                                }
                                              } else {
                                                alert('Failed to delete mentoring assignment. Please try again.');
                                              }
                                            }
                                          }}
                                        >
                                          <Trash2 className="mr-1 h-3 w-3" /> Delete
                                        </Button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                          })}
                          </tbody>
                        </table>
                    </div>
                    )}

                    {/* Startup Experience Tab Content */}
                    {mentorStartupsTab === 'founded' && mentorMetrics.foundedStartups.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Startup Name</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Website</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Sector</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Current Valuation</th>
                            <th className="px-4 sm:px-6 py-3 text-right text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {mentorMetrics.foundedStartups.map(startup => {
                              // Get email_id, website, and sector from the startup object
                              const emailId = (startup as any).email_id || '';
                              const website = (startup as any).website || startup.domain || '';
                              const sector = (startup as any).sector || startup.sector || '';
                              
                              // Check if startup is on TMS (has user_id or is a valid TMS startup)
                              // If startup was created from notes (manually entered), it won't have user_id
                              const isOnTMS = startup.user_id || (startup.id && typeof startup.id === 'number' && startup.id > 0 && !startup.notes);

                              return (
                                <tr key={startup.id || `manual-${startup.name}`} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-slate-900">{startup.name}</div>
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {website ? (
                                      <a 
                                        href={website.startsWith('http') ? website : `https://${website}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-blue-600 hover:underline"
                                      >
                                        {website}
                                      </a>
                                    ) : 'N/A'}
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {sector || 'N/A'}
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {formatCurrency(startup.currentValuation || 0, startup.currency || selectedCurrency)}
                                  </td>
                                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-2">
                                      {isOnTMS ? (
                                        // Startup is already on TMS - show View button
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleViewStartup(startup as Startup)}
                                        >
                                          <Eye className="mr-2 h-4 w-4" /> View
                                        </Button>
                                      ) : (
                                        // Startup not on TMS yet - show Add to TMS button
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setShowAddProfileModal(true)}
                                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                        >
                                          <UserPlus className="mr-1 h-3 w-3" /> Add to TMS
                                        </Button>
                                      )}
                                      {/* Delete button for manually entered startups */}
                                      {!isOnTMS && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-red-600 border-red-300 hover:bg-red-50"
                                          onClick={async () => {
                                            if (confirm(`Are you sure you want to delete ${startup.name}? This action cannot be undone.`)) {
                                              const success = await mentorService.deleteFoundedStartup(startup.id);
                                              if (success) {
                                                // Reload mentor metrics
                                                if (currentUser?.id) {
                                                  const metrics = await mentorService.getMentorMetrics(currentUser.id);
                                                  setMentorMetrics(metrics);
                                                }
                                              } else {
                                                alert('Failed to delete startup experience. Please try again.');
                                              }
                                            }
                                          }}
                                        >
                                          <Trash2 className="mr-1 h-3 w-3" /> Delete
                                        </Button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                    </div>
                    )}

                    {/* Empty state messages */}
                    {mentorStartupsTab === 'active' && mentorMetrics.activeAssignments.length === 0 && (
                      <div className="text-center py-8 text-slate-500">
                        <Clock className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-sm">No active mentoring assignments.</p>
                      </div>
                    )}
                    {mentorStartupsTab === 'completed' && mentorMetrics.completedAssignments.length === 0 && (
                      <div className="text-center py-8 text-slate-500">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-sm">No previously mentored startups.</p>
                      </div>
                    )}
                    {mentorStartupsTab === 'founded' && mentorMetrics.foundedStartups.length === 0 && (
                      <div className="text-center py-8 text-slate-500">
                        <Star className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-sm">No startup experience.</p>
                      </div>
                    )}
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'discover' && (
          <div className="animate-fade-in max-w-6xl mx-auto w-full">
            {/* Enhanced Header */}
            <div className="mb-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">Discover Pitches</h2>
                <p className="text-sm text-slate-600">Watch startup videos and explore opportunities</p>
              </div>
              
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search startups by name or sector..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
              
              {/* Discovery Sub-Tabs */}
              <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-2 sm:space-x-4 md:space-x-8 overflow-x-auto pb-2" aria-label="Discovery Tabs">
                  <button
                    onClick={() => {
                      setDiscoverySubTab('all');
                      setShowOnlyValidated(false);
                      setShowOnlyFavorites(false);
                      setShowOnlyDueDiligence(false);
                    }}
                    className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
                      discoverySubTab === 'all'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Film className="h-3 w-3 sm:h-4 sm:w-4" />
                    All
                  </button>
                  
                  <button
                    onClick={() => {
                      setDiscoverySubTab('verified');
                      setShowOnlyValidated(true);
                      setShowOnlyFavorites(false);
                      setShowOnlyDueDiligence(false);
                    }}
                    className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
                      discoverySubTab === 'verified'
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Verified</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setDiscoverySubTab('favorites');
                      setShowOnlyValidated(false);
                      setShowOnlyFavorites(true);
                      setShowOnlyDueDiligence(false);
                    }}
                    className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
                      discoverySubTab === 'favorites'
                        ? 'border-red-500 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${discoverySubTab === 'favorites' ? 'fill-current' : ''}`} />
                    <span className="hidden sm:inline">Favorites</span>
                    <span className="sm:hidden">Fav</span>
                  </button>
                </nav>
              </div>
                
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 p-3 sm:p-4 rounded-xl border border-blue-100 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex items-center gap-2 text-slate-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs sm:text-sm font-medium">
                    {`${activeFundraisingStartups.length} active pitches`}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-slate-500">
                  <Film className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-xs sm:text-sm">Pitch Reels</span>
                </div>
              </div>
            </div>
                
            <div className="space-y-6 sm:space-y-8">
              {isLoadingPitches ? (
                <Card className="text-center py-20">
                  <div className="max-w-sm mx-auto">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">Loading Pitches...</h3>
                    <p className="text-slate-500">Fetching active fundraising startups</p>
                  </div>
                </Card>
              ) : filteredPitches.length === 0 ? (
                <Card className="text-center py-20">
                  <div className="max-w-sm mx-auto">
                    <Film className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">
                      {searchTerm.trim()
                        ? 'No Matching Startups'
                        : showOnlyValidated 
                          ? 'No Verified Startups' 
                          : showOnlyFavorites 
                            ? 'No Favorited Pitches'
                            : 'No Active Fundraising'
                      }
                    </h3>
                    <p className="text-slate-500">
                      {searchTerm.trim()
                        ? 'No startups found matching your search. Try adjusting your search terms or filters.'
                        : showOnlyValidated
                          ? 'No Startup Nation verified startups are currently fundraising. Try removing the verification filter or check back later.'
                          : showOnlyFavorites 
                            ? 'Start favoriting pitches to see them here.'
                            : 'No startups are currently fundraising. Check back later for new opportunities.'
                      }
                    </p>
                  </div>
                </Card>
              ) : (
                filteredPitches.map(inv => {
                  const videoEmbedInfo = inv.pitchVideoUrl ? getVideoEmbedUrl(inv.pitchVideoUrl, false) : null;
                  const embedUrl = videoEmbedInfo?.embedUrl || null;
                  const videoSource = videoEmbedInfo?.source || null;
                  const isFavorited = favoritedPitches.has(inv.id);

                  return (
                    <Card key={inv.id} className="p-6">
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Video/Logo Section */}
                        <div className="md:w-1/3">
                          {embedUrl ? (
                            playingVideoId === inv.id ? (
                              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
                                {videoSource === 'direct' ? (
                                  <video
                                    src={embedUrl}
                                    controls
                                    autoPlay
                                    muted
                                    playsInline
                                    className="absolute top-0 left-0 w-full h-full object-cover"
                                  >
                                    Your browser does not support the video tag.
                                  </video>
                                ) : (
                                  <iframe
                                    src={embedUrl}
                                    title={`Pitch video for ${inv.name}`}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="absolute top-0 left-0 w-full h-full"
                                  />
                                )}
                              </div>
                            ) : (
                              <div
                                className="relative w-full aspect-video rounded-lg overflow-hidden bg-black cursor-pointer group"
                                onClick={() => { setPlayingVideoId(inv.id); setSelectedPitchId(inv.id); }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-all duration-300">
                                    <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            )
                          ) : inv.logoUrl && inv.logoUrl !== '#' ? (
                            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-white flex items-center justify-center">
                              <img
                                src={inv.logoUrl}
                                alt={`${inv.name} logo`}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-full aspect-video bg-slate-200 rounded-lg flex items-center justify-center">
                              <Video className="h-12 w-12 text-slate-400" />
                            </div>
                          )}
                        </div>

                        {/* Content Section */}
                        <div className="md:w-2/3 flex flex-col relative">
                          {/* Header Section */}
                          <div className="mb-3">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h3 className="text-xl font-bold text-slate-800 flex-1">{inv.name}</h3>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleShare(inv)}
                                className="flex-shrink-0"
                              >
                                <Share2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge status={inv.complianceStatus} />
                              {inv.isStartupNationValidated && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Verified
                                </span>
                              )}
                              <span className="text-sm text-slate-600">{inv.sector}</span>
                            </div>
                          </div>

                          {/* Investment Details */}
                          <div className="mb-4">
                            {/* Investment Ask and Equity in one line */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-500">Investment Ask:</span>
                                <span className="text-xs font-medium text-slate-600">
                                  {investorService.formatCurrency(inv.investmentValue, inv.currency || selectedCurrency)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-500">Equity:</span>
                                <span className="text-xs font-medium text-slate-600">{inv.equityAllocation}%</span>
                              </div>
                            </div>
                            {/* Round Type, Currency, Stage, Domain in one line */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                              {inv.fundraisingType && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-slate-500">Round Type:</span>
                                  <span className="text-xs font-medium text-slate-600">{inv.fundraisingType}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-500">Currency:</span>
                                <span className="text-xs font-medium text-slate-600">{inv.currency || selectedCurrency}</span>
                              </div>
                              {inv.stage && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-slate-500">Stage:</span>
                                  <span className="text-xs font-medium text-slate-600">{inv.stage}</span>
                                </div>
                              )}
                              {inv.domain && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-slate-500">Domain:</span>
                                  <span className="text-xs font-medium text-slate-600">{inv.domain}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Links & Documents Section */}
                          <div className="mb-4 pb-3 border-b border-slate-200">
                            <div className="text-xs font-medium text-slate-500 mb-2">Links & Documents</div>
                            <div className="flex flex-wrap gap-2">
                              {inv.websiteUrl && inv.websiteUrl !== '#' && (
                                <a
                                  href={inv.websiteUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                >
                                  <Globe className="h-3.5 w-3.5" />
                                  Website
                                  <ExternalLink className="h-3 w-3 opacity-50" />
                                </a>
                              )}
                              {inv.linkedInUrl && inv.linkedInUrl !== '#' && (
                                <a
                                  href={inv.linkedInUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                >
                                  <Linkedin className="h-3.5 w-3.5" />
                                  LinkedIn
                                  <ExternalLink className="h-3 w-3 opacity-50" />
                                </a>
                              )}
                              {inv.pitchDeckUrl && inv.pitchDeckUrl !== '#' && (
                                <a
                                  href={inv.pitchDeckUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  Pitch Deck
                                  <ExternalLink className="h-3 w-3 opacity-50" />
                                </a>
                              )}
                              {inv.onePagerUrl && inv.onePagerUrl !== '#' && (
                                <a
                                  href={inv.onePagerUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  One-Pager
                                  <ExternalLink className="h-3 w-3 opacity-50" />
                                </a>
                              )}
                              {inv.businessPlanUrl && inv.businessPlanUrl !== '#' && (
                                <a
                                  href={inv.businessPlanUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  Business Plan
                                  <ExternalLink className="h-3 w-3 opacity-50" />
                                </a>
                              )}
                              {(!inv.websiteUrl || inv.websiteUrl === '#') && 
                               (!inv.linkedInUrl || inv.linkedInUrl === '#') && 
                               (!inv.pitchDeckUrl || inv.pitchDeckUrl === '#') && 
                               (!inv.onePagerUrl || inv.onePagerUrl === '#') && 
                               (!inv.businessPlanUrl || inv.businessPlanUrl === '#') && (
                                <span className="text-xs text-slate-400 italic">No links available</span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2 pt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFavoriteToggle(inv.id)}
                            >
                              <Heart className={`h-4 w-4 mr-2 ${isFavorited ? 'fill-current text-red-500' : ''}`} />
                              {isFavorited ? 'Favorited' : 'Favorite'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="space-y-6 animate-fade-in">
            {/* Two-column layout: Form on left, Preview on right */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch">
              {/* Left: Mentor Profile Form */}
              {currentUser && (
                <Card className="p-3 sm:p-4 md:p-6 h-full">
                  <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base sm:text-lg font-semibold text-slate-900">Mentor Profile</h2>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Fill out your mentor profile details. Changes will be reflected in the preview.
                      </p>
                    </div>
                    <Button
                      variant={isEditingProfile ? "outline" : "primary"}
                      size="sm"
                      onClick={() => {
                        if (profileFormEditingRef.current) {
                          profileFormEditingRef.current.setIsEditing(!isEditingProfile);
                        }
                        setIsEditingProfile(!isEditingProfile);
                      }}
                      className="w-full sm:w-auto flex-shrink-0"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">{isEditingProfile ? 'Cancel Editing' : 'Edit Profile'}</span>
                      <span className="sm:hidden">{isEditingProfile ? 'Cancel' : 'Edit'}</span>
                    </Button>
                  </div>
                  <MentorProfileForm
                    currentUser={currentUser}
                    mentorMetrics={mentorMetrics}
                    onSave={async (profile) => {
                      // Validate fee amounts before saving
                      if ((profile.fee_type === 'Fees' || profile.fee_type === 'Hybrid') &&
                          profile.fee_amount_min !== null && 
                          profile.fee_amount_min !== undefined &&
                          profile.fee_amount_max !== null && 
                          profile.fee_amount_max !== undefined &&
                          profile.fee_amount_min >= profile.fee_amount_max) {
                        alert('Minimum fee amount must be less than maximum fee amount. Please correct the values before saving.');
                        return;
                      }
                      
                      // Also validate previewProfile fee amounts
                      if ((previewProfile?.fee_type === 'Fees' || previewProfile?.fee_type === 'Hybrid') &&
                          previewProfile.fee_amount_min !== null && 
                          previewProfile.fee_amount_min !== undefined &&
                          previewProfile.fee_amount_max !== null && 
                          previewProfile.fee_amount_max !== undefined &&
                          previewProfile.fee_amount_min >= previewProfile.fee_amount_max) {
                        alert('Minimum fee amount must be less than maximum fee amount. Please correct the values before saving.');
                        return;
                      }
                      
                      console.log('Profile saved:', profile);
                      // Update previewProfile with saved data to ensure consistency
                      setPreviewProfile(profile);
                      setIsEditingProfile(false);
                      if (profileFormEditingRef.current) {
                        profileFormEditingRef.current.setIsEditing(false);
                      }
                      // Update currency when profile is saved
                      if (profile.fee_currency) {
                        setSelectedCurrency(profile.fee_currency);
                      }
                      // Reload metrics to ensure all data is fresh
                      if (currentUser?.id) {
                        await fetchMetrics();
                      }
                    }}
                    onProfileChange={(profile) => {
                      // Update previewProfile whenever form state changes
                      setPreviewProfile(profile);
                    }}
                    isViewOnly={!isEditingProfile}
                    onNavigateToDashboard={handleNavigateToDashboard}
                    startups={startups}
                    onMetricsUpdate={fetchMetrics}
                    excludeSections={['feeStructure', 'media']}
                    externalProfile={previewProfile}
                    onSaveRef={(saveFn) => {
                      profileFormSaveRef.current = saveFn;
                    }}
                    onEditingStateRef={(state) => {
                      profileFormEditingRef.current = state;
                      setIsEditingProfile(state.isEditing);
                    }}
                  />
                </Card>
              )}

              {/* Right: Mentor Profile Card Preview + Fee Structure + Media */}
              <div className="flex flex-col h-full w-full lg:max-w-xl lg:mx-auto space-y-3 sm:space-y-4">
                <div className="mb-3">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900">Your Mentor Card</h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    This is how your profile will appear to startups on the Discover page
                  </p>
                </div>
                {previewProfile && currentUser ? (
                  <MentorCard
                    mentor={{
                      ...previewProfile,
                      startupsMentoring: mentorMetrics?.startupsMentoring ?? 0,
                      startupsMentoredPreviously: mentorMetrics?.startupsMentoredPreviously ?? 0,
                      verifiedStartupsMentored: mentorMetrics?.verifiedStartupsMentored ?? 0,
                      user: {
                        name: currentUser.name || currentUser.email?.split('@')[0],
                        email: currentUser.email
                      }
                    }}
                    onView={undefined}
                  />
                ) : (
                  <Card className="flex-1 !p-0 overflow-hidden shadow-lg border-0 bg-white">
                    <div className="w-full aspect-[16/9] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                      <div className="text-center text-slate-400">
                        <Briefcase className="h-16 w-16 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Fill out the form to see preview</p>
                      </div>
                    </div>
                    <div className="p-4 sm:p-6">
                      <div className="h-32 bg-slate-50 rounded"></div>
                    </div>
                  </Card>
                )}

                {/* Fee Structure Section - Moved to Right Side */}
                {previewProfile && (
                  <Card className="p-3 sm:p-4 md:p-6">
                    <div className="space-y-4">
                      <div className="border-b pb-2">
                        <h4 className="text-base font-medium text-slate-700 mb-1">Fee Structure</h4>
                        <p className="text-sm font-medium text-amber-600">
                          Note: Track My Startup will charge 20% of mentoring fees to cover operations.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <Select
                          label="Fee Type"
                          value={previewProfile.fee_type || ''}
                          onChange={(e) => {
                            setPreviewProfile({ ...previewProfile, fee_type: e.target.value });
                          }}
                          disabled={!isEditingProfile}
                        >
                          <option value="">Select Fee Type</option>
                          <option value="Free">Free</option>
                          <option value="Fees">Fees</option>
                          <option value="Stock Options">Stock Options</option>
                          <option value="Hybrid">Hybrid</option>
                        </Select>

                        {(previewProfile.fee_type === 'Fees' || previewProfile.fee_type === 'Hybrid') && (
                          <Select
                            label="Currency"
                            value={previewProfile.fee_currency || 'USD'}
                            onChange={(e) => {
                              const newCurrency = e.target.value;
                              setPreviewProfile({ ...previewProfile, fee_currency: newCurrency });
                              setSelectedCurrency(newCurrency);
                            }}
                            disabled={!isEditingProfile}
                          >
                            <option value="USD">USD</option>
                            <option value="INR">INR</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                            <option value="SGD">SGD</option>
                            <option value="AED">AED</option>
                          </Select>
                        )}

                        {(previewProfile.fee_type === 'Fees' || previewProfile.fee_type === 'Hybrid') && (
                          <>
                            <div>
                              <Input
                                label="Minimum Fee Amount"
                                type="number"
                                value={previewProfile.fee_amount_min?.toString() || ''}
                                onChange={(e) => {
                                  const minValue = e.target.value ? parseFloat(e.target.value) : null;
                                  setPreviewProfile({ ...previewProfile, fee_amount_min: minValue });
                                }}
                                disabled={!isEditingProfile}
                                placeholder="e.g., 1000"
                                className={
                                  previewProfile.fee_amount_min !== null && 
                                  previewProfile.fee_amount_max !== null && 
                                  previewProfile.fee_amount_min >= previewProfile.fee_amount_max
                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                                    : ''
                                }
                              />
                              {previewProfile.fee_amount_min !== null && 
                               previewProfile.fee_amount_max !== null && 
                               previewProfile.fee_amount_min >= previewProfile.fee_amount_max && (
                                <p className="mt-1 text-sm text-red-600">
                                  Minimum fee must be less than maximum fee
                                </p>
                              )}
                            </div>
                            <div>
                              <Input
                                label="Maximum Fee Amount"
                                type="number"
                                value={previewProfile.fee_amount_max?.toString() || ''}
                                onChange={(e) => {
                                  const maxValue = e.target.value ? parseFloat(e.target.value) : null;
                                  setPreviewProfile({ ...previewProfile, fee_amount_max: maxValue });
                                }}
                                disabled={!isEditingProfile}
                                placeholder="e.g., 5000"
                                className={
                                  previewProfile.fee_amount_min !== null && 
                                  previewProfile.fee_amount_max !== null && 
                                  previewProfile.fee_amount_min >= previewProfile.fee_amount_max
                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                                    : ''
                                }
                              />
                              {previewProfile.fee_amount_min !== null && 
                               previewProfile.fee_amount_max !== null && 
                               previewProfile.fee_amount_min >= previewProfile.fee_amount_max && (
                                <p className="mt-1 text-sm text-red-600">
                                  Maximum fee must be greater than minimum fee
                                </p>
                              )}
                            </div>
                          </>
                        )}

                        {(previewProfile.fee_type === 'Stock Options' || previewProfile.fee_type === 'Hybrid') && (
                          <>
                            <Input
                              label="Minimum Stock Options Amount (ESOP)"
                              type="number"
                              step="0.01"
                              min="0"
                              value={previewProfile.equity_amount_min?.toString() || ''}
                              onChange={(e) => {
                                setPreviewProfile({ ...previewProfile, equity_amount_min: e.target.value ? parseFloat(e.target.value) : null });
                              }}
                              disabled={!isEditingProfile}
                              placeholder="e.g., 1000"
                            />
                            <Input
                              label="Maximum Stock Options Amount (ESOP)"
                              type="number"
                              step="0.01"
                              min="0"
                              value={previewProfile.equity_amount_max?.toString() || ''}
                              onChange={(e) => {
                                setPreviewProfile({ ...previewProfile, equity_amount_max: e.target.value ? parseFloat(e.target.value) : null });
                              }}
                              disabled={!isEditingProfile}
                              placeholder="e.g., 5000"
                            />
                          </>
                        )}

                        <div className="sm:col-span-2">
                          <Input
                            label="Fee Description"
                            type="text"
                            value={previewProfile.fee_description || ''}
                            onChange={(e) => {
                              setPreviewProfile({ ...previewProfile, fee_description: e.target.value });
                            }}
                            disabled={!isEditingProfile}
                            placeholder="Additional details about your fee structure"
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Profile Photo / Video Section - Moved to Right Side */}
                {previewProfile && (
                  <Card className="p-3 sm:p-4 md:p-6">
                    <div className="space-y-4">
                      <h4 className="text-base font-medium text-slate-700 border-b pb-2">Profile Photo / Video</h4>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Media Type</label>
                        <div className="flex gap-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="media_type"
                              value="logo"
                              checked={previewProfile.media_type === 'logo'}
                              onChange={() => {
                                setPreviewProfile({ ...previewProfile, media_type: 'logo' });
                              }}
                              disabled={!isEditingProfile}
                              className="mr-2"
                            />
                            <ImageIcon className="h-4 w-4 mr-1" />
                            <span className="text-sm text-slate-600">Profile Photo</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="media_type"
                              value="video"
                              checked={previewProfile.media_type === 'video'}
                              onChange={() => {
                                setPreviewProfile({ ...previewProfile, media_type: 'video' });
                              }}
                              disabled={!isEditingProfile}
                              className="mr-2"
                            />
                            <Video className="h-4 w-4 mr-1" />
                            <span className="text-sm text-slate-600">Profile Video</span>
                          </label>
                        </div>
                      </div>

                      {previewProfile.media_type === 'logo' ? (
                        <div className="space-y-4">
                          <label className="block text-sm font-medium text-slate-700 mb-2">Profile Photo</label>
                          {previewProfile.logo_url && (
                            <div className="mb-4">
                              <img src={previewProfile.logo_url} alt="Profile Photo" className="h-24 w-24 object-contain border border-slate-200 rounded" />
                            </div>
                          )}
                          {isEditingProfile && (
                            <>
                              {/* URL Input Field - Shown when URL mode is selected */}
                              {photoInputMode === 'url' && (
                                <Input
                                  label="Profile Photo URL"
                                  type="url"
                                  value={previewProfile.logo_url || ''}
                                  onChange={(e) => {
                                    setPreviewProfile({ ...previewProfile, logo_url: e.target.value });
                                  }}
                                  disabled={!isEditingProfile}
                                  placeholder="Paste your cloud drive link here..."
                                />
                              )}
                              
                              {/* File Upload - Shown when File mode is selected */}
                              {photoInputMode === 'file' && (
                                <div className="space-y-2">
                                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                                    <label className="cursor-pointer flex flex-col items-center justify-center space-y-2">
                                      <Cloud className="w-8 h-8 text-gray-400" />
                                      <div className="text-center">
                                        <p className="text-sm font-medium text-gray-700">Click to upload profile photo</p>
                                        <p className="text-xs text-gray-500">Max 10MB • JPEG, PNG, GIF, WebP, SVG</p>
                                      </div>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        className="hidden"
                                      />
                                    </label>
                                  </div>
                                </div>
                              )}

                              {/* Input Mode Toggle Buttons */}
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant={photoInputMode === 'url' ? 'primary' : 'outline'}
                                  size="sm"
                                  onClick={() => setPhotoInputMode('url')}
                                  className="flex items-center gap-2"
                                >
                                  <Link className="w-4 h-4" />
                                  Cloud Drive <span className="text-xs opacity-90">(Recommended)</span>
                                </Button>
                                <span className="text-sm text-slate-500 font-medium">OR</span>
                                <Button
                                  type="button"
                                  variant={photoInputMode === 'file' ? 'primary' : 'outline'}
                                  size="sm"
                                  onClick={() => setPhotoInputMode('file')}
                                  className="flex items-center gap-2"
                                >
                                  <Cloud className="w-4 h-4 flex-shrink-0" />
                                  <div className="flex flex-col items-start leading-none">
                                    <span className="text-xs">Upload</span>
                                    <span className="text-xs">File</span>
                                  </div>
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <Input
                          label="Profile Video URL"
                          value={previewProfile.video_url || ''}
                          onChange={(e) => {
                            setPreviewProfile({ ...previewProfile, video_url: e.target.value });
                          }}
                          disabled={!isEditingProfile}
                          placeholder="https://www.youtube.com/watch?v=..."
                        />
                      )}

                      {/* Save Button - Full Width */}
                      {isEditingProfile && (
                        <Button
                          variant="primary"
                          className="w-full"
                          onClick={async () => {
                            if (profileFormSaveRef.current) {
                              await profileFormSaveRef.current();
                            }
                          }}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save Profile
                        </Button>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-6 animate-fade-in">
            {/* Schedule Tab Header */}
            <Card>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Schedule Management</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Manage your availability slots and view all scheduled sessions
                  </p>
                </div>
                <Button
                  onClick={() => setManageAvailabilityModalOpen(true)}
                  variant="outline"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Manage Availability
                </Button>
              </div>

              {/* Sub-tabs for Schedule */}
              <div className="border-b border-slate-200 mb-4 sm:mb-6">
                <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto scrollbar-hide" aria-label="Schedule Tabs">
                  <button
                    onClick={() => setScheduleSubTab('availability')}
                    className={`py-2 sm:py-3 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center flex-shrink-0 ${
                      scheduleSubTab === 'availability'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Clock className="h-4 w-4 mr-1 sm:mr-2" />
                    Availability
                  </button>
                  <button
                    onClick={() => setScheduleSubTab('sessions')}
                    className={`py-2 sm:py-3 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center flex-shrink-0 ${
                      scheduleSubTab === 'sessions'
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Calendar className="h-4 w-4 mr-1 sm:mr-2" />
                    My Sessions
                  </button>
                </nav>
              </div>

              {/* Availability Sub-tab */}
              {scheduleSubTab === 'availability' && currentUser?.id && (
                <div>
                  <AvailabilitySlotsDisplay mentorId={currentUser.id} />
                </div>
              )}

              {/* My Sessions Sub-tab - Shows both Upcoming and Past Sessions */}
              {scheduleSubTab === 'sessions' && currentUser?.id && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Upcoming Sessions</h3>
                    <ScheduledSessionsSection
                      mentorId={currentUser.id}
                      userType="Mentor"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Past Sessions</h3>
                    <PastSessionsSection
                      mentorId={currentUser.id}
                    />
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'collaboration' && (
          <div className="space-y-6 animate-fade-in relative">
            {/* Launching Soon Modal */}
            {showLaunchingSoonModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setShowLaunchingSoonModal(false)}>
                <Card className="bg-white border-2 border-blue-300 shadow-xl w-full max-w-md mx-auto relative" onClick={(e) => e.stopPropagation()}>
                  <div className="py-8 sm:py-10 px-6 text-center relative">
                    <button
                      onClick={() => setShowLaunchingSoonModal(false)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors z-10"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                      <Clock className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                      Launching Soon
                    </h3>
                    <p className="text-base sm:text-lg text-slate-600 max-w-md mx-auto mb-6">
                      This feature is coming soon! Stay tuned for exciting collaboration tools.
                    </p>
                    <Button
                      variant="primary"
                      onClick={() => setShowLaunchingSoonModal(false)}
                      className="w-full sm:w-auto"
                    >
                      Got it
                    </Button>
                  </div>
                </Card>
              </div>
            )}
            
            <Card className={showLaunchingSoonModal ? 'opacity-60 pointer-events-none' : ''}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Collaboration</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Manage collaboration with all profiles: Investors, Investment Advisors, Mentors, CA, CS, Incubators, and more
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  size="sm"
                  variant={collaborationSubTab === 'explore-collaborators' ? 'primary' : 'outline'}
                  onClick={() => setShowLaunchingSoonModal(true)}
                  disabled={true}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Explore Collaborators
                </Button>
                <Button
                  size="sm"
                  variant={collaborationSubTab === 'my-collaborators' ? 'primary' : 'outline'}
                  onClick={() => setShowLaunchingSoonModal(true)}
                  disabled={true}
                >
                  My Collaborators
                </Button>
                <Button
                  size="sm"
                  variant={collaborationSubTab === 'requests' ? 'primary' : 'outline'}
                  onClick={() => setShowLaunchingSoonModal(true)}
                  disabled={true}
                >
                  Collaborator Requests
                  {collaboratorRequests.filter(r => r.status === 'pending').length > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-white bg-amber-500 rounded-full">
                      {collaboratorRequests.filter(r => r.status === 'pending').length}
                    </span>
                  )}
                </Button>
              </div>

              {loadingRequests && collaborationSubTab !== 'explore-collaborators' ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading collaboration data...</p>
                </div>
              ) : collaborationSubTab === 'explore-collaborators' ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Explore by Profile Type</h3>
                    <p className="text-sm text-slate-600 mb-6">Browse and connect with different types of collaborators</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[
                      { role: 'Investor', icon: DollarSign, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200', description: 'Connect with investors' },
                      { role: 'Investment Advisor', icon: Briefcase, color: 'bg-purple-100 text-purple-700 hover:bg-purple-200', description: 'Connect with investment advisors' },
                      { role: 'Mentor', icon: Users, color: 'bg-green-100 text-green-700 hover:bg-green-200', description: 'Connect with mentors' },
                      { role: 'CA', icon: FileText, color: 'bg-orange-100 text-orange-700 hover:bg-orange-200', description: 'Connect with Chartered Accountants' },
                      { role: 'CS', icon: Shield, color: 'bg-pink-100 text-pink-700 hover:bg-pink-200', description: 'Connect with Company Secretaries' },
                      { role: 'Incubation', icon: Building2, color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200', description: 'Connect with incubation centers' },
                    ].map((profileType) => {
                      const IconComponent = profileType.icon;
                      return (
                        <Card
                          key={profileType.role}
                          className="p-6 hover:shadow-lg transition-all duration-200 border border-slate-200 text-center"
                        >
                          <div className="flex flex-col items-center">
                            <div className={`w-16 h-16 rounded-full ${profileType.color} flex items-center justify-center mb-4 transition-colors`}>
                              <IconComponent className="h-8 w-8" />
                            </div>
                            <h4 className="text-lg font-semibold text-slate-900 mb-2">
                              {profileType.role}
                            </h4>
                            <p className="text-sm text-slate-600 mb-4">
                              {profileType.description}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => setShowLaunchingSoonModal(true)}
                              disabled={true}
                            >
                              <Eye className="h-3 w-3 mr-2" />
                              Explore
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ) : collaborationSubTab === 'my-collaborators' ? (
                collaborators.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">No collaborators yet</p>
                    <p className="text-sm text-slate-500 mt-1">Accepted collaboration requests from all profiles will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {collaborators.map((request) => (
                      <Card key={request.id} className="p-0 overflow-hidden border border-slate-200">
                        <div className="flex flex-col md:flex-row gap-4">
                          {/* Media / Avatar */}
                          <div className="md:w-1/4 bg-slate-50 flex items-center justify-center p-6">
                            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-semibold">
                              {request.requester_type?.[0] || 'C'}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="w-full md:w-3/4 p-4 sm:p-6 flex flex-col gap-2 sm:gap-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="success">Accepted</Badge>
                                  <span className="text-xs text-slate-500">{new Date(request.created_at).toLocaleDateString()}</span>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 capitalize">
                                  {request.requester_type || 'Collaborator'}
                                </h3>
                                <p className="text-sm text-slate-600">Requester ID: {request.requester_id}</p>
                              </div>
                              {request.advisor_profile_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setShowLaunchingSoonModal(true)}
                                  className="flex-shrink-0"
                                  disabled={true}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Profile
                                </Button>
                              )}
                            </div>

                            {request.message && request.message.trim() && (
                              <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap">
                                {request.message}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )
              ) : collaboratorRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">No collaborator requests yet</p>
                  <p className="text-sm text-slate-500 mt-1">Connection requests from all profiles (Investors, Advisors, Mentors, CA, CS, Incubators, etc.) will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {collaboratorRequests.map((request) => (
                    <Card key={request.id} className="p-0 overflow-hidden border border-slate-200">
                      <div className="flex flex-col md:flex-row gap-4">
                        {/* Media / Avatar */}
                        <div className="md:w-1/4 bg-slate-50 flex items-center justify-center p-6">
                          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xl font-semibold">
                            {request.requester_type?.[0] || 'C'}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="md:w-3/4 p-4 sm:p-6 flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={request.status === 'pending' ? 'warning' : request.status === 'accepted' ? 'success' : 'danger'}>
                                  {request.status}
                                </Badge>
                                <span className="text-xs text-slate-500">{new Date(request.created_at).toLocaleDateString()}</span>
                              </div>
                              <h3 className="text-lg font-semibold text-slate-900 capitalize">
                                {request.requester_type || 'Collaborator'} Request
                              </h3>
                              <p className="text-sm text-slate-600">Requester ID: {request.requester_id}</p>
                            </div>
                            {request.advisor_profile_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowLaunchingSoonModal(true)}
                                className="flex-shrink-0"
                                disabled={true}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Profile
                              </Button>
                            )}
                          </div>

                          {request.message && request.message.trim() && (
                            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap">
                              {request.message}
                            </div>
                          )}

                          {request.status === 'pending' && (
                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => setShowLaunchingSoonModal(true)}
                                disabled={true}
                              >
                                <CheckSquare className="h-4 w-4 mr-2" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowLaunchingSoonModal(true)}
                                disabled={true}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
      
      {/* Add Profile Modal */}
      <AddProfileModal
        isOpen={showAddProfileModal}
        onClose={() => setShowAddProfileModal(false)}
        onProfileCreated={() => {
          setShowAddProfileModal(false);
          // Optionally reload metrics or refresh data
          if (currentUser?.id) {
            mentorService.getMentorMetrics(currentUser.id).then(setMentorMetrics);
          }
        }}
      />

      {/* Schedule Section Modal */}
      {scheduleSectionOpen && selectedAssignmentForSchedule && selectedAssignmentForSchedule.startup && currentUser?.id && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-slate-900">
                Schedule Management - {selectedAssignmentForSchedule.startup?.name || 'Startup'}
              </h3>
              <button
                onClick={() => {
                  setScheduleSectionOpen(false);
                  setSelectedAssignmentForSchedule(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <MentorStartupScheduleSection
                mentorId={currentUser.id}
                startupId={selectedAssignmentForSchedule.startup?.id || selectedAssignmentForSchedule.startup_id}
                assignmentId={selectedAssignmentForSchedule.id}
                startupName={selectedAssignmentForSchedule.startup?.name || 'Startup'}
                onUpdate={async () => {
                  if (currentUser?.id) {
                    const metrics = await mentorService.getMentorMetrics(currentUser.id);
                    setMentorMetrics(metrics);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Share Slots Modal */}
      {shareSlotsModalOpen && selectedAssignmentForSharing && selectedAssignmentForSharing.startup && (
        <ShareSlotsModal
          isOpen={shareSlotsModalOpen}
          onClose={() => {
            setShareSlotsModalOpen(false);
            setSelectedAssignmentForSharing(null);
          }}
          mentorId={currentUser?.id!}
          startupId={selectedAssignmentForSharing.startup_id}
          startupName={selectedAssignmentForSharing.startup.name || 'Startup'}
          assignmentId={selectedAssignmentForSharing.id}
        />
      )}

      {/* Scheduling Modal (for direct booking if needed) */}
      {schedulingModalOpen && selectedAssignmentForScheduling && (
        <SchedulingModal
          isOpen={schedulingModalOpen}
          onClose={() => {
            setSchedulingModalOpen(false);
            setSelectedAssignmentForScheduling(null);
          }}
          mentorId={currentUser?.id!}
          startupId={selectedAssignmentForScheduling.startup_id}
          assignmentId={selectedAssignmentForScheduling.id}
          onSessionBooked={async () => {
            // Reload metrics
            if (currentUser?.id) {
              const metrics = await mentorService.getMentorMetrics(currentUser.id);
              setMentorMetrics(metrics);
            }
          }}
        />
      )}

      {/* Manage Availability Modal */}
      {currentUser?.id && (
        <ManageAvailabilityModal
          isOpen={manageAvailabilityModalOpen}
          onClose={() => setManageAvailabilityModalOpen(false)}
          mentorId={currentUser.id}
        />
      )}
    </div>
  );
};

export default MentorView;


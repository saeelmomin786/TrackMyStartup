import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getQueryParam } from '../lib/urlState';
import { getVideoEmbedUrl } from '../lib/videoUtils';
import Card from './ui/Card';
import Button from './ui/Button';
import { ArrowLeft, Search, DollarSign, Briefcase, Users, FileText, Shield, Building2, Globe, Linkedin, Mail, Video, Image as ImageIcon, Eye, UserPlus, Share2, ExternalLink, MapPin, CheckCircle } from 'lucide-react';
import InvestorCard from './investor/InvestorCard';
import InvestmentAdvisorCard from './investment-advisor/InvestmentAdvisorCard';
import MentorCard from './mentor/MentorCard';
import { investorConnectionRequestService } from '../lib/investorConnectionRequestService';
import { advisorConnectionRequestService } from '../lib/advisorConnectionRequestService';
import { authService } from '../lib/auth';

interface ExploreProfilesPageProps {}

const ExploreProfilesPage: React.FC<ExploreProfilesPageProps> = () => {
  const role = getQueryParam('role');
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load current user for authentication
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Error loading current user:', err);
        setIsAuthenticated(false);
      }
    };
    loadCurrentUser();
  }, []);

  useEffect(() => {
    const loadProfiles = async () => {
      if (!role) {
        setError('Role type is required');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (role === 'Investor') {
          // Load investor profiles
          const { data, error: investorError } = await supabase
            .from('investor_profiles')
            .select('*')
            .order('investor_name', { ascending: true });

          // Handle 404 or table not found errors gracefully
          if (investorError) {
            if (investorError.code === 'PGRST116' || investorError.message?.includes('404') || investorError.message?.includes('relation') || investorError.message?.includes('does not exist')) {
              console.warn('Investor profiles table not found or empty:', investorError);
              setProfiles([]);
              setLoading(false);
              return;
            }
            throw investorError;
          }
          
          // Get user data separately if needed
          const userIds = [...new Set((data || []).map(p => p.user_id).filter(Boolean))];
          let userMap = new Map();
          
          if (userIds.length > 0) {
            const { data: usersData } = await supabase
              .from('users')
              .select('id, name')
              .in('id', userIds);
            
            if (usersData) {
              userMap = new Map(usersData.map(u => [u.id, u]));
            }
          }
          
          const profilesWithUsers = (data || []).map(profile => ({
            ...profile,
            user: userMap.get(profile.user_id) || { id: profile.user_id, name: '' }
          }));
          setProfiles(profilesWithUsers);
        } else if (role === 'Investment Advisor') {
          // Load investment advisor profiles
          const { data, error: advisorError } = await supabase
            .from('investment_advisor_profiles')
            .select('*')
            .order('advisor_name', { ascending: true });

          // Handle 404 or table not found errors gracefully
          if (advisorError) {
            if (advisorError.code === 'PGRST116' || advisorError.message?.includes('404') || advisorError.message?.includes('relation') || advisorError.message?.includes('does not exist')) {
              console.warn('Investment advisor profiles table not found or empty:', advisorError);
              setProfiles([]);
              setLoading(false);
              return;
            }
            throw advisorError;
          }
          
          // Get user data separately
          const userIds = [...new Set((data || []).map(p => p.user_id).filter(Boolean))];
          let userMap = new Map();
          
          if (userIds.length > 0) {
            const { data: usersData } = await supabase
              .from('users')
              .select('id, name, firm_name')
              .in('id', userIds);
            
            if (usersData) {
              userMap = new Map(usersData.map(u => [u.id, u]));
            }
          }
          
          const profilesWithUsers = (data || []).map(profile => {
            const user = userMap.get(profile.user_id);
            return {
              ...profile,
              firm_name: user?.firm_name || profile.firm_name,
              user: user || { id: profile.user_id, name: '' }
            };
          });
          setProfiles(profilesWithUsers);
        } else if (role === 'Mentor') {
          // Load mentor profiles
          const { data, error: mentorError } = await supabase
            .from('mentor_profiles')
            .select('*')
            .order('mentor_name', { ascending: true });

          // Handle 404 or table not found errors gracefully
          if (mentorError) {
            // If table doesn't exist (404), return empty array
            if (mentorError.code === 'PGRST116' || mentorError.message?.includes('404') || mentorError.message?.includes('relation') || mentorError.message?.includes('does not exist')) {
              console.warn('Mentor profiles table not found or empty:', mentorError);
              setProfiles([]);
              setLoading(false);
              return;
            }
            throw mentorError;
          }
          
          // Get user data separately
          const userIds = [...new Set((data || []).map(p => p.user_id).filter(Boolean))];
          let userMap = new Map();
          
          if (userIds.length > 0) {
            const { data: usersData } = await supabase
              .from('users')
              .select('id, name')
              .in('id', userIds);
            
            if (usersData) {
              userMap = new Map(usersData.map(u => [u.id, u]));
            }
          }
          
          const profilesWithUsers = (data || []).map(profile => ({
            ...profile,
            user: userMap.get(profile.user_id) || { id: profile.user_id, name: '' }
          }));
          setProfiles(profilesWithUsers);
        } else {
          // For CA, CS, Incubation - load from users table (only those with names - completed registration)
          const roleFilter = role === 'Startup Facilitation Center' ? 'Startup Facilitation Center' : role;
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('*')
            .eq('role', roleFilter)
            .not('name', 'is', null)
            .neq('name', '')
            .order('name', { ascending: true });

          if (usersError) throw usersError;
          
          // Convert users to profile format
          const userProfiles = (usersData || []).map(user => ({
            id: user.id,
            user_id: user.id,
            name: user.name || 'Unknown',
            role: user.role,
            firm_name: user.firm_name,
            location: user.location,
            website: user.website,
            linkedin_link: user.linkedin_link,
            logo_url: user.logo_url,
            video_url: user.video_url,
            user: { name: user.name }
          }));
          setProfiles(userProfiles);
        }
      } catch (err: any) {
        console.error('Error loading profiles:', err);
        // Check if it's a 404 or table not found error
        const isNotFoundError = err.code === 'PGRST116' || 
                                 err.code === '42P01' || 
                                 err.status === 404 ||
                                 err.message?.includes('404') || 
                                 err.message?.includes('relation') || 
                                 err.message?.includes('does not exist') ||
                                 err.message?.includes('permission denied');
        
        if (isNotFoundError) {
          // Table doesn't exist, is empty, or permission denied - show empty state
          console.warn('Profile table not accessible, showing empty state');
          setProfiles([]);
          setError(null);
        } else {
          setError('Failed to load profiles. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfiles();
  }, [role]);

  const filteredProfiles = profiles.filter(profile => {
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase();
    const name = (profile.investor_name || profile.advisor_name || profile.mentor_name || profile.name || profile.user?.name || '').toLowerCase();
    const firm = (profile.firm_name || '').toLowerCase();
    return name.includes(search) || firm.includes(search);
  });

  const getRoleDisplayName = () => {
    const roleMap: { [key: string]: string } = {
      'Investor': 'Investors',
      'Investment Advisor': 'Investment Advisors',
      'Mentor': 'Mentors',
      'CA': 'Chartered Accountants',
      'CS': 'Company Secretaries',
      'Incubation': 'Incubation Centers'
    };
    return roleMap[role || ''] || role || 'Profiles';
  };

  const handleBack = () => {
    window.history.back();
  };

  const handleConnect = async (profile: any) => {
    if (!isAuthenticated || !currentUser) {
      // Save current URL to redirect back after login
      const currentUrl = window.location.href;
      sessionStorage.setItem('redirectAfterLogin', currentUrl);
      
      // Redirect to login page
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.delete('view');
      url.searchParams.delete('role');
      url.searchParams.set('page', 'login');
      window.location.href = url.toString();
      return;
    }

    try {
      const targetUserId = profile.user_id;
      const requesterId = currentUser.id;
      const requesterRole = currentUser.role || '';

      // Check if request already exists
      let existingCheck;
      if (role === 'Investor') {
        existingCheck = await investorConnectionRequestService.checkExistingRequest(targetUserId, requesterId);
      } else if (role === 'Investment Advisor') {
        existingCheck = await advisorConnectionRequestService.checkExistingRequest(targetUserId, requesterId);
      } else {
        // For other roles, use investor_connection_requests
        existingCheck = await investorConnectionRequestService.checkExistingRequest(targetUserId, requesterId);
      }

      if (existingCheck.exists) {
        if (existingCheck.status === 'accepted') {
          alert('You are already connected with this user!');
          return;
        } else if (existingCheck.status === 'pending') {
          alert('You already have a pending connection request. Please wait for their response.');
          return;
        }
      }

      // Create connection request
      if (role === 'Investor') {
        const profileUrl = window.location.origin + window.location.pathname + `?view=investor&userId=${requesterId}`;
        await investorConnectionRequestService.createRequest({
          investor_id: targetUserId,
          requester_id: requesterId,
          requester_type: requesterRole as any,
          advisor_profile_url: requesterRole === 'Investment Advisor' ? profileUrl : undefined
        });
      } else if (role === 'Investment Advisor') {
        const profileUrl = window.location.origin + window.location.pathname + `?view=advisor&userId=${requesterId}`;
        await advisorConnectionRequestService.createRequest({
          advisor_id: targetUserId,
          requester_id: requesterId,
          requester_type: requesterRole as any,
          collaborator_profile_url: profileUrl
        });
      } else {
        // For Mentor, CA, CS, Incubation - use investor_connection_requests
        const profileUrl = window.location.origin + window.location.pathname + `?view=user&userId=${requesterId}&role=${requesterRole}`;
        await investorConnectionRequestService.createRequest({
          investor_id: targetUserId,
          requester_id: requesterId,
          requester_type: requesterRole as any
        });
      }

      alert('Connection request sent successfully!');
    } catch (error: any) {
      console.error('Error in handleConnect:', error);
      if (error.message && error.message.includes('already connected')) {
        alert(error.message);
      } else {
        alert('Failed to send connection request. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <Card className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading profiles...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <Card className="p-8">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={handleBack}>Go Back</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Explore {getRoleDisplayName()}</h1>
          <p className="text-slate-600">Browse and connect with {getRoleDisplayName().toLowerCase()}</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${getRoleDisplayName().toLowerCase()} by name or firm...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-slate-600">
          {filteredProfiles.length} {filteredProfiles.length === 1 ? 'profile' : 'profiles'} found
        </div>

        {/* Profiles Grid */}
        {filteredProfiles.length === 0 ? (
          <Card className="text-center py-12">
            <Users className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No Profiles Found</h3>
            <p className="text-slate-500">
              {searchTerm ? 'No profiles match your search criteria.' : `No ${getRoleDisplayName().toLowerCase()} found.`}
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredProfiles.map((profile) => {
              // Get video/logo info
              const videoEmbedInfo = profile.video_url ? getVideoEmbedUrl(profile.video_url, false) : null;
              const embedUrl = videoEmbedInfo?.embedUrl || null;
              const videoSource = videoEmbedInfo?.source || null;
              
              // Get profile name based on role
              const profileName = profile.investor_name || profile.advisor_name || profile.mentor_name || profile.name || profile.user?.name || 'Unknown';
              
              // Get location
              const location = profile.global_hq || profile.location || '';
              
              // Get firm name
              const firmName = profile.firm_name || '';
              
              // Get sectors/expertise
              const sectors = profile.sectors || profile.expertise_areas || [];
              const sectorsDisplay = sectors.slice(0, 3).join(', ') + (sectors.length > 3 ? ` +${sectors.length - 3} more` : '');
              
              // Get investment details (for investors/advisors)
              const investmentRange = profile.ticket_size_min && profile.ticket_size_max 
                ? `${profile.ticket_size_min.toLocaleString()} - ${profile.ticket_size_max.toLocaleString()} ${profile.currency || 'USD'}`
                : profile.minimum_investment && profile.maximum_investment
                ? `${profile.minimum_investment.toLocaleString()} - ${profile.maximum_investment.toLocaleString()} ${profile.currency || 'USD'}`
                : null;
              
              const investmentStages = profile.investment_stages || [];
              const stagesDisplay = investmentStages.slice(0, 3).join(', ') + (investmentStages.length > 3 ? ` +${investmentStages.length - 3} more` : '');
              
              // Get geography
              const geography = profile.geography || [];
              const geographyDisplay = geography.slice(0, 3).join(', ') + (geography.length > 3 ? ` +${geography.length - 3} more` : '');
              
              // Get service types (for advisors)
              const serviceTypes = profile.service_types || [];
              const servicesDisplay = serviceTypes.slice(0, 3).join(', ') + (serviceTypes.length > 3 ? ` +${serviceTypes.length - 3} more` : '');
              
              // Get mentoring details (for mentors)
              const mentoringStages = profile.mentoring_stages || [];
              const mentoringStagesDisplay = mentoringStages.slice(0, 3).join(', ') + (mentoringStages.length > 3 ? ` +${mentoringStages.length - 3} more` : '');
              
              const yearsExperience = profile.years_of_experience;
              const companiesMentored = profile.companies_mentored;
              
              const handleShare = () => {
                const url = window.location.origin + window.location.pathname + `?view=${role === 'Investor' ? 'investor' : role === 'Investment Advisor' ? 'advisor' : 'user'}&${role === 'Investor' ? 'investorId' : role === 'Investment Advisor' ? 'advisorId' : 'userId'}=${profile.id || profile.user_id}`;
                navigator.clipboard.writeText(url).then(() => {
                  alert('Profile link copied to clipboard!');
                }).catch(() => {
                  alert('Failed to copy link. Please try again.');
                });
              };

              return (
                <Card key={profile.id || profile.user_id} className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Video/Logo Section */}
                    <div className="md:w-1/3">
                      {embedUrl ? (
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
                          {videoSource === 'direct' ? (
                            <video
                              src={embedUrl}
                              controls
                              muted
                              playsInline
                              className="absolute top-0 left-0 w-full h-full object-cover"
                            >
                              Your browser does not support the video tag.
                            </video>
                          ) : (
                            <iframe
                              src={embedUrl}
                              title={`Profile video for ${profileName}`}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="absolute top-0 left-0 w-full h-full"
                            />
                          )}
                        </div>
                      ) : profile.logo_url && profile.logo_url !== '#' ? (
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-white flex items-center justify-center">
                          <img
                            src={profile.logo_url}
                            alt={`${profileName} logo`}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-full aspect-video bg-slate-200 rounded-lg flex items-center justify-center">
                          {role === 'Investor' ? (
                            <DollarSign className="h-12 w-12 text-slate-400" />
                          ) : role === 'Investment Advisor' ? (
                            <Briefcase className="h-12 w-12 text-slate-400" />
                          ) : role === 'Mentor' ? (
                            <Users className="h-12 w-12 text-slate-400" />
                          ) : role === 'CA' ? (
                            <FileText className="h-12 w-12 text-slate-400" />
                          ) : role === 'CS' ? (
                            <Shield className="h-12 w-12 text-slate-400" />
                          ) : (
                            <Building2 className="h-12 w-12 text-slate-400" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="md:w-2/3 flex flex-col relative">
                      {/* Header Section */}
                      <div className="mb-3">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="text-xl font-bold text-slate-800 flex-1">{profileName}</h3>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleShare}
                            className="flex-shrink-0"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{role}</span>
                          {firmName && (
                            <span className="text-sm text-slate-600">{firmName}</span>
                          )}
                          {location && (
                            <span className="text-sm text-slate-600 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {location}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Profile Details */}
                      <div className="mb-4">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          {investmentRange && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">Investment Range:</span>
                              <span className="text-xs font-medium text-slate-600">{investmentRange}</span>
                            </div>
                          )}
                          {stagesDisplay && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">Stages:</span>
                              <span className="text-xs font-medium text-slate-600">{stagesDisplay}</span>
                            </div>
                          )}
                          {geographyDisplay && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">Geography:</span>
                              <span className="text-xs font-medium text-slate-600">{geographyDisplay}</span>
                            </div>
                          )}
                          {servicesDisplay && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">Services:</span>
                              <span className="text-xs font-medium text-slate-600">{servicesDisplay}</span>
                            </div>
                          )}
                          {sectorsDisplay && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">Sectors:</span>
                              <span className="text-xs font-medium text-slate-600">{sectorsDisplay}</span>
                            </div>
                          )}
                          {mentoringStagesDisplay && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">Mentoring Stages:</span>
                              <span className="text-xs font-medium text-slate-600">{mentoringStagesDisplay}</span>
                            </div>
                          )}
                          {yearsExperience && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">Experience:</span>
                              <span className="text-xs font-medium text-slate-600">{yearsExperience} years</span>
                            </div>
                          )}
                          {companiesMentored && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">Companies Mentored:</span>
                              <span className="text-xs font-medium text-slate-600">{companiesMentored}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Links & Documents Section */}
                      <div className="mb-4 pb-3 border-b border-slate-200">
                        <div className="text-xs font-medium text-slate-500 mb-2">Links & Contact</div>
                        <div className="flex flex-wrap gap-2">
                          {profile.website && profile.website !== '#' && (
                            <a
                              href={profile.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                            >
                              <Globe className="h-3.5 w-3.5" />
                              Website
                              <ExternalLink className="h-3 w-3 opacity-50" />
                            </a>
                          )}
                          {profile.linkedin_link && profile.linkedin_link !== '#' && (
                            <a
                              href={profile.linkedin_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                            >
                              <Linkedin className="h-3.5 w-3.5" />
                              LinkedIn
                              <ExternalLink className="h-3 w-3 opacity-50" />
                            </a>
                          )}
                          {(!profile.website || profile.website === '#') && 
                           (!profile.linkedin_link || profile.linkedin_link === '#') && (
                            <span className="text-xs text-slate-400 italic">No links available</span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 pt-3">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleConnect(profile)}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Connect
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExploreProfilesPage;


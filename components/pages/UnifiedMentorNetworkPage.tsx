import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Users, Menu, X } from 'lucide-react';
import Button from '../ui/Button';
import LogoTMS from '../public/logoTMS.svg';
import Mentor2Image from '../public/mentor2.svg';
import { supabase } from '../../lib/supabase';
import MentorGridCard from '../mentor/MentorGridCard';
import Card from '../ui/Card';
import Footer from '../Footer';

const UnifiedMentorNetworkPage: React.FC = () => {
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [exploreDropdownOpen, setExploreDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileExploreOpen, setMobileExploreOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const exploreDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [mentors, setMentors] = useState<any[]>([]);
  const [loadingMentors, setLoadingMentors] = useState(false);
  const [mentorSearchTerm, setMentorSearchTerm] = useState('');

  useEffect(() => {
    setCurrentPath(window.location.pathname);
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Handle click outside dropdowns to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setServicesDropdownOpen(false);
      }
      if (exploreDropdownRef.current && !exploreDropdownRef.current.contains(event.target as Node)) {
        setExploreDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) && !(event.target as HTMLElement).closest('button[aria-label="Toggle mobile menu"]')) {
        setMobileMenuOpen(false);
      }
    };

    if (servicesDropdownOpen || exploreDropdownOpen || mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [servicesDropdownOpen, exploreDropdownOpen, mobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Load mentors for Unified Mentor Network section
  useEffect(() => {
    const loadMentors = async () => {
      try {
        setLoadingMentors(true);
        // Try public table first, fallback to main table if needed
        let { data, error: mentorError } = await supabase
          .from('mentors_public_table')
          .select('*')
          .order('mentor_name', { ascending: true });
        
        // Fallback to main table if public table doesn't exist
        if (mentorError && (mentorError.message?.includes('does not exist') || mentorError.code === '42P01')) {
          console.warn('[UnifiedMentorNetworkPage] Public table not available, falling back to main table');
          const fallback = await supabase
            .from('mentor_profiles')
            .select('*')
            .order('mentor_name', { ascending: true });
          data = fallback.data;
          mentorError = fallback.error;
        }

        // Handle errors gracefully
        if (mentorError) {
          if (mentorError.code === 'PGRST116' || mentorError.message?.includes('404') || mentorError.message?.includes('relation') || mentorError.message?.includes('does not exist')) {
            console.warn('Mentor profiles table not found or empty:', mentorError);
            setMentors([]);
            setLoadingMentors(false);
            return;
          }
          throw mentorError;
        }
        
        const mentorsData = data || [];
        
        // Load metrics for each mentor
        const mentorsWithMetrics = await Promise.all(
          mentorsData.map(async (mentor: any) => {
            if (!mentor.user_id) return mentor;
            
            try {
              // Query active assignments
              const { data: activeAssignments, error: activeError } = await supabase
                .from('mentor_startup_assignments')
                .select(`
                  id,
                  startup_id,
                  status,
                  startups (
                    id,
                    user_id
                  )
                `)
                .eq('mentor_id', mentor.user_id)
                .eq('status', 'active');

              // Query completed assignments
              const { data: completedAssignments, error: completedError } = await supabase
                .from('mentor_startup_assignments')
                .select(`
                  id,
                  startup_id,
                  status,
                  startups (
                    id,
                    user_id
                  )
                `)
                .eq('mentor_id', mentor.user_id)
                .eq('status', 'completed');

              // Calculate startup experience years from founded startups
              let startupExperienceYears = 0;
              try {
                const { data: foundedStartups, error: foundedError } = await supabase
                  .from('mentor_founded_startups')
                  .select('notes')
                  .eq('mentor_id', mentor.user_id);
                
                if (foundedError) {
                  console.warn('Error loading founded startups for mentor:', mentor.user_id, foundedError);
                } else if (foundedStartups && foundedStartups.length > 0) {
                  const now = new Date();
                  const intervals: Array<{ start: Date; end: Date }> = [];
                  
                  foundedStartups.forEach((startup: any) => {
                    if (startup.notes) {
                      try {
                        const notesData = JSON.parse(startup.notes);
                        if (notesData.from_date) {
                          const startDate = new Date(notesData.from_date);
                          // Handle currently_in_position and null to_date
                          const endDate = notesData.currently_in_position === true || !notesData.to_date || notesData.to_date === "null" || notesData.to_date === null
                            ? now 
                            : new Date(notesData.to_date);
                          intervals.push({ start: startDate, end: endDate });
                        }
                      } catch (e) {
                        // Skip invalid notes
                        console.warn('Error parsing startup notes for mentor:', mentor.user_id, e);
                      }
                    }
                  });
                  
                  // Merge overlapping intervals and calculate total months
                  if (intervals.length > 0) {
                    intervals.sort((a, b) => a.start.getTime() - b.start.getTime());
                    const merged: Array<{ start: Date; end: Date }> = [];
                    let current = intervals[0];
                    
                    for (let i = 1; i < intervals.length; i++) {
                      if (intervals[i].start <= current.end) {
                        current.end = new Date(Math.max(current.end.getTime(), intervals[i].end.getTime()));
                      } else {
                        merged.push(current);
                        current = intervals[i];
                      }
                    }
                    merged.push(current);
                    
                    let totalMonths = 0;
                    merged.forEach(interval => {
                      const months = (interval.end.getFullYear() - interval.start.getFullYear()) * 12 +
                        (interval.end.getMonth() - interval.start.getMonth());
                      totalMonths += months;
                    });
                    
                    startupExperienceYears = Math.floor(totalMonths / 12);
                    console.log(`Calculated startup experience for mentor ${mentor.user_id}: ${startupExperienceYears} years from ${intervals.length} intervals`);
                  } else {
                    console.log(`No valid date intervals found for mentor ${mentor.user_id} startup experience`);
                  }
                } else {
                  console.log(`No founded startups found for mentor ${mentor.user_id}`);
                }
              } catch (e) {
                // If calculation fails, use 0
                console.warn('Could not calculate startup experience for mentor:', mentor.user_id, e);
              }

              // Professional experience years - calculate from professional experience table
              let professionalExperienceYears = mentor.years_of_experience || 0;
              try {
                const { data: professionalExpData } = await supabase
                  .from('mentor_professional_experience')
                  .select('*')
                  .eq('mentor_id', mentor.user_id);

                if (professionalExpData && professionalExpData.length > 0) {
                  const now = new Date();
                  const intervals: Array<{ start: Date; end: Date }> = [];
                  
                  professionalExpData.forEach((pe: any) => {
                    if (pe.from_date) {
                      const startDate = new Date(pe.from_date);
                      const endDate = pe.currently_working || !pe.to_date
                        ? now
                        : new Date(pe.to_date);
                      intervals.push({ start: startDate, end: endDate });
                    }
                  });
                  
                  // Merge overlapping intervals and calculate total months
                  if (intervals.length > 0) {
                    intervals.sort((a, b) => a.start.getTime() - b.start.getTime());
                    const merged: Array<{ start: Date; end: Date }> = [];
                    let current = intervals[0];
                    
                    for (let i = 1; i < intervals.length; i++) {
                      if (intervals[i].start <= current.end) {
                        current.end = new Date(Math.max(current.end.getTime(), intervals[i].end.getTime()));
                      } else {
                        merged.push(current);
                        current = intervals[i];
                      }
                    }
                    merged.push(current);
                    
                    let totalMonths = 0;
                    merged.forEach(interval => {
                      const months = (interval.end.getFullYear() - interval.start.getFullYear()) * 12 +
                        (interval.end.getMonth() - interval.start.getMonth());
                      totalMonths += months;
                    });
                    
                    professionalExperienceYears = Math.floor(totalMonths / 12);
                  }
                }
              } catch (e) {
                // If calculation fails, fallback to years_of_experience
                console.warn('Could not calculate professional experience for mentor:', mentor.user_id, e);
              }

              if (!activeError && !completedError) {
                // Calculate metrics
                const activeCount = activeAssignments?.length || 0;
                const completedCount = completedAssignments?.length || 0;
                
                // Calculate verified startups (only those with user_id - registered users on TMS)
                const verifiedActive = (activeAssignments || []).filter((a: any) => 
                  a.startup_id && a.startups && a.startups.user_id
                ).length;
                const verifiedCompleted = (completedAssignments || []).filter((a: any) => 
                  a.startup_id && a.startups && a.startups.user_id
                ).length;
                const verifiedCount = verifiedActive + verifiedCompleted;

                return {
                  ...mentor,
                  startupsMentoring: activeCount,
                  startupsMentoredPreviously: completedCount,
                  verifiedStartupsMentored: verifiedCount,
                  startupExperienceYears,
                  professionalExperienceYears,
                };
              } else {
                // Set defaults if query fails
                return {
                  ...mentor,
                  startupsMentoring: 0,
                  startupsMentoredPreviously: 0,
                  verifiedStartupsMentored: 0,
                  startupExperienceYears,
                  professionalExperienceYears,
                };
              }
            } catch (metricsError) {
              console.warn('Could not load metrics for mentor:', mentor.user_id, metricsError);
              return {
                ...mentor,
                startupsMentoring: 0,
                startupsMentoredPreviously: 0,
                verifiedStartupsMentored: 0,
                startupExperienceYears: 0,
                professionalExperienceYears: mentor.years_of_experience || 0,
              };
            }
          })
        );
        
        setMentors(mentorsWithMetrics);
      } catch (error) {
        console.error('Error loading mentors:', error);
        setMentors([]);
      } finally {
        setLoadingMentors(false);
      }
    };

    loadMentors();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img 
                  src={LogoTMS} 
                  alt="TrackMyStartup" 
                  className="h-7 w-7 sm:h-8 sm:w-8 scale-[5] sm:scale-[5] origin-left cursor-pointer hover:opacity-80 transition-opacity" 
                  onClick={() => window.location.href = '/'}
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-slate-700 hover:text-brand-primary transition-colors"
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>

              <nav className="hidden lg:flex items-center gap-6">
                <div 
                  ref={dropdownRef}
                  className="relative"
                  onMouseEnter={() => setServicesDropdownOpen(true)}
                  onMouseLeave={(e) => {
                    const relatedTarget = e.relatedTarget as Node;
                    if (!dropdownRef.current?.contains(relatedTarget)) {
                      setServicesDropdownOpen(false);
                    }
                  }}
                >
                  <button 
                    className="flex items-center gap-1 text-slate-700 hover:text-brand-primary transition-colors font-medium text-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setServicesDropdownOpen(!servicesDropdownOpen);
                    }}
                  >
                    Our Services
                    <ChevronDown className={`h-4 w-4 transition-transform ${servicesDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {servicesDropdownOpen && (
                    <div 
                      className="absolute top-full left-0 pt-2 w-56 z-[100]"
                      onMouseEnter={() => setServicesDropdownOpen(true)}
                    >
                      <div 
                        className="bg-white rounded-lg shadow-xl border border-slate-200 py-2 pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a href="/services/startups" className="block px-4 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-brand-primary transition-colors" onClick={() => setServicesDropdownOpen(false)}>For Startups</a>
                        <a href="/services/incubation-centers" className="block px-4 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-brand-primary transition-colors" onClick={() => setServicesDropdownOpen(false)}>For Incubation Centers</a>
                        <a href="/services/investors" className="block px-4 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-brand-primary transition-colors" onClick={() => setServicesDropdownOpen(false)}>For Investors</a>
                        <a href="/services/investment-advisors" className="block px-4 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-brand-primary transition-colors" onClick={() => setServicesDropdownOpen(false)}>For Investor Advisors</a>
                        <a href="/services/ca" className="block px-4 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-brand-primary transition-colors" onClick={() => setServicesDropdownOpen(false)}>For CA</a>
                        <a href="/services/cs" className="block px-4 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-brand-primary transition-colors" onClick={() => setServicesDropdownOpen(false)}>For CS</a>
                        <a href="/services/mentors" className="block px-4 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-brand-primary transition-colors" onClick={() => setServicesDropdownOpen(false)}>For Mentor</a>
                      </div>
                    </div>
                  )}
                </div>
                <a 
                  href="/?page=landing" 
                  className={`font-medium text-sm transition-colors duration-200 ${
                    (currentPath === '/' || currentPath === '') 
                      ? 'text-brand-primary font-semibold' 
                      : 'text-slate-700 hover:text-blue-400'
                  }`}
                >
                  Home
                </a>
                <a 
                  href="/unified-mentor-network" 
                  className={`font-medium text-sm transition-colors duration-200 ${
                    currentPath === '/unified-mentor-network' 
                      ? 'text-brand-primary font-semibold' 
                      : 'text-slate-700 hover:text-blue-400'
                  }`}
                >
                  Unified Mentor Network
                </a>
                <a 
                  href="/grant-opportunities" 
                  className={`font-medium text-sm transition-colors duration-200 ${
                    currentPath === '/grant-opportunities' 
                      ? 'text-brand-primary font-semibold' 
                      : 'text-slate-700 hover:text-blue-400'
                  }`}
                >
                  Grant Opportunities
                </a>
                <a 
                  href="/events" 
                  className={`font-medium text-sm transition-colors duration-200 ${
                    currentPath === '/events' 
                      ? 'text-brand-primary font-semibold' 
                      : 'text-slate-700 hover:text-blue-400'
                  }`}
                >
                  Events
                </a>
                {/* Explore Dropdown */}
                <div 
                  ref={exploreDropdownRef}
                  className="relative"
                  onMouseEnter={() => setExploreDropdownOpen(true)}
                  onMouseLeave={(e) => {
                    const relatedTarget = e.relatedTarget as Node;
                    if (!exploreDropdownRef.current?.contains(relatedTarget)) {
                      setExploreDropdownOpen(false);
                    }
                  }}
                >
                  <button 
                    className={`flex items-center gap-1 font-medium text-sm transition-colors duration-200 ${
                      currentPath === '/blogs' || currentPath === '/founder-notes'
                        ? 'text-brand-primary font-semibold' 
                        : 'text-slate-700 hover:text-blue-400'
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setExploreDropdownOpen(!exploreDropdownOpen);
                    }}
                  >
                    Explore
                    <ChevronDown className={`h-4 w-4 transition-transform ${exploreDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {exploreDropdownOpen && (
                    <div 
                      className="absolute top-full left-0 pt-2 w-56 z-[100]"
                      onMouseEnter={() => setExploreDropdownOpen(true)}
                    >
                      <div 
                        className="bg-white rounded-lg shadow-xl border border-slate-200 py-2 pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a 
                          href="/blogs" 
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-brand-primary transition-colors"
                          onClick={() => setExploreDropdownOpen(false)}
                        >
                          Blogs
                        </a>
                        <a 
                          href="#" 
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-brand-primary transition-colors"
                          onClick={() => setExploreDropdownOpen(false)}
                        >
                          Founder notes
                        </a>
                      </div>
                    </div>
                  )}
                </div>
                <a 
                  href="/about" 
                  className={`font-medium text-sm transition-colors duration-200 ${
                    currentPath === '/about' 
                      ? 'text-brand-primary font-semibold' 
                      : 'text-slate-700 hover:text-blue-400'
                  }`}
                >
                  About Us
                </a>
              </nav>

              <div className="flex items-center gap-2 sm:gap-4">
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/?page=login'} className="hidden sm:inline-flex">Login</Button>
                <Button variant="primary" size="sm" onClick={() => window.location.href = '/?page=register'} className="px-3 py-1.5">Get Started</Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            {/* Left Column - Content */}
            <div className="flex-1 w-full lg:w-auto text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 sm:mb-6 leading-tight" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Unified Mentor Network (UMN)
              </h1>
              <p className="text-base sm:text-lg text-slate-600 mb-6 sm:mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                A verified national network of experienced founders and operators enabling meaningful, domain-aligned mentorship for startups.
              </p>
              <p className="text-xs sm:text-sm text-slate-500 mb-6 sm:mb-8" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Because Experience Deserves Purpose.
              </p>
              <div className="flex justify-center lg:justify-start">
                <a 
                  href="/services/mentors" 
                  className="inline-flex items-center px-6 py-3 rounded-md font-semibold text-white hover:opacity-90 transition-opacity shadow-lg hover:shadow-xl"
                  style={{ backgroundColor: '#78abfb' }}
                >
                  Register as a Mentor
                </a>
              </div>
            </div>
            
            {/* Right Column - Image */}
            <div className="flex-1 w-full lg:w-auto flex items-center justify-center">
              <img 
                src={Mentor2Image} 
                alt="Unified Mentor Network" 
                className="w-full max-w-lg lg:max-w-xl h-auto rounded-lg object-contain"
                style={{ 
                  maxHeight: '500px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Unified Mentor Network Section */}
      <section className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="container mx-auto">
          <div className="max-w-7xl mx-auto">
            {/* Section Title */}
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                TMS Mentor Network
              </h2>
            </div>

            {/* Search Bar */}
            <div className="mb-8 max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search mentors by name, location, expertise, or sector..."
                  value={mentorSearchTerm}
                  onChange={(e) => setMentorSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                />
              </div>
            </div>

            {/* Mentors Grid */}
            {loadingMentors ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
                <p className="text-slate-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Loading mentors...</p>
              </div>
            ) : (
              <>
                {mentors.filter(mentor => {
                  if (!mentorSearchTerm.trim()) return true;
                  const search = mentorSearchTerm.toLowerCase();
                  return (
                    mentor.mentor_name?.toLowerCase().includes(search) ||
                    mentor.location?.toLowerCase().includes(search) ||
                    mentor.mentor_type?.toLowerCase().includes(search) ||
                    mentor.expertise_areas?.some((area: string) => area.toLowerCase().includes(search)) ||
                    mentor.sectors?.some((sector: string) => sector.toLowerCase().includes(search))
                  );
                }).length === 0 ? (
                  <Card className="text-center py-12">
                    <Users className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                      {mentorSearchTerm ? 'No mentors found' : 'No mentors available'}
                    </h3>
                    <p className="text-slate-500" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                      {mentorSearchTerm 
                        ? 'Try adjusting your search terms.' 
                        : 'Check back later for available mentors.'}
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mentors.filter(mentor => {
                      if (!mentorSearchTerm.trim()) return true;
                      const search = mentorSearchTerm.toLowerCase();
                      return (
                        mentor.mentor_name?.toLowerCase().includes(search) ||
                        mentor.location?.toLowerCase().includes(search) ||
                        mentor.mentor_type?.toLowerCase().includes(search) ||
                        mentor.expertise_areas?.some((area: string) => area.toLowerCase().includes(search)) ||
                        mentor.sectors?.some((sector: string) => sector.toLowerCase().includes(search))
                      );
                    }).map((mentor) => (
                      <MentorGridCard
                        key={mentor.id || mentor.user_id}
                        mentor={mentor}
                        onConnect={() => {
                          // Navigate to register if not authenticated
                          window.location.href = '/?page=register';
                        }}
                        connectLabel="Connect"
                        connectDisabled={false}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default UnifiedMentorNetworkPage;



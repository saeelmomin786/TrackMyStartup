import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Share2, Video, Menu, X, Eye } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import LogoTMS from '../public/logoTMS.svg';
import { supabase } from '../../lib/supabase';
import { adminProgramsService, AdminProgramPost } from '../../lib/adminProgramsService';
import { toDirectImageUrl } from '../../lib/imageUrl';
import Footer from '../Footer';
import Modal from '../ui/Modal';
import SEOHead from '../SEOHead';

interface OpportunityItem {
  id: string;
  programName: string;
  description: string;
  deadline: string;
  posterUrl?: string;
  videoUrl?: string;
  facilitatorName?: string;
}

const GrantOpportunitiesPage: React.FC = () => {
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [exploreDropdownOpen, setExploreDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileExploreOpen, setMobileExploreOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const exploreDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [adminPosts, setAdminPosts] = useState<AdminProgramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [selectedImageAlt, setSelectedImageAlt] = useState<string>('');

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

  // Load programs
  useEffect(() => {
    const loadPrograms = async () => {
      try {
        setLoading(true);
        
        // Load facilitator opportunities
        const { data: oppData, error: oppError } = await supabase
          .from('incubation_opportunities')
          .select('*')
          .order('created_at', { ascending: false });

        if (!oppError && Array.isArray(oppData)) {
          const mapped: OpportunityItem[] = oppData.map((row: any) => ({
            id: row.id,
            programName: row.program_name,
            description: row.description || '',
            deadline: row.deadline || '',
            posterUrl: row.poster_url || undefined,
            videoUrl: row.video_url || undefined,
            facilitatorName: 'Program Facilitator'
          }));
          setOpportunities(mapped);
        }

        // Load admin program posts
        try {
          const posts = await adminProgramsService.listActive();
          setAdminPosts(posts);
        } catch (e) {
          console.warn('Failed to load admin program posts', e);
          setAdminPosts([]);
        }
      } catch (error) {
        console.error('Error loading programs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPrograms();
  }, []);

  const getYoutubeEmbedUrl = (url?: string): string | null => {
    if (!url) return null;
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com')) {
        const vid = u.searchParams.get('v');
        return vid ? `https://www.youtube.com/embed/${vid}` : null;
      }
      if (u.hostname === 'youtu.be') {
        const id = u.pathname.replace('/', '');
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
    } catch {}
    return null;
  };

  const handleShareOpportunity = async (opp: OpportunityItem) => {
    try {
      const url = new URL(window.location.origin);
      url.searchParams.set('view', 'program');
      url.searchParams.set('opportunityId', opp.id);
      const shareUrl = url.toString();
      const text = `${opp.programName}\nDeadline: ${opp.deadline || '—'}`;
      if (navigator.share) {
        await navigator.share({ title: opp.programName, text, url: shareUrl });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(`${text}\n\n${shareUrl}`);
        alert('Shareable link copied to clipboard!');
      } else {
        const ta = document.createElement('textarea');
        ta.value = `${text}\n\n${shareUrl}`;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        alert('Shareable link copied to clipboard!');
      }
    } catch (e) {
      console.error('Share failed', e);
    }
  };

  const handleShareAdminProgram = async (program: AdminProgramPost) => {
    try {
      const url = new URL(window.location.origin);
      url.searchParams.set('view', 'admin-program');
      url.searchParams.set('programId', program.id);
      const shareUrl = url.toString();
      const text = `${program.programName}\nDeadline: ${program.deadline || '—'}`;
      if (navigator.share) {
        await navigator.share({ title: program.programName, text, url: shareUrl });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(`${text}\n\n${shareUrl}`);
        alert('Shareable link copied to clipboard!');
      } else {
        const ta = document.createElement('textarea');
        ta.value = `${text}\n\n${shareUrl}`;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        alert('Shareable link copied to clipboard!');
      }
    } catch (e) {
      console.error('Share failed', e);
    }
  };

  const openImageModal = (imageUrl: string, altText: string) => {
    setSelectedImageUrl(toDirectImageUrl(imageUrl) || imageUrl);
    setSelectedImageAlt(altText);
    setIsImageModalOpen(true);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const isPast = (dateStr: string) => new Date(dateStr) < new Date(todayStr);
  const isToday = (dateStr: string) => dateStr === todayStr;

  // Filter programs based on search term
  const filteredOpportunities = opportunities.filter(opp => {
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase();
    return (
      opp.programName?.toLowerCase().includes(search) ||
      opp.description?.toLowerCase().includes(search) ||
      opp.facilitatorName?.toLowerCase().includes(search)
    );
  });

  const filteredAdminPosts = adminPosts.filter(post => {
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase();
    return (
      post.programName?.toLowerCase().includes(search) ||
      post.description?.toLowerCase().includes(search) ||
      post.incubationCenter?.toLowerCase().includes(search)
    );
  });

  const siteUrl = 'https://trackmystartup.com';
  const canonicalUrl = `${siteUrl}/grant-opportunities`;

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title="Grant Opportunities - TrackMyStartup | Funding Programs for Startups"
        description="Discover grant opportunities, funding programs, and incubation opportunities for startups. Find grants, accelerators, and government funding programs."
        canonicalUrl={canonicalUrl}
        ogImage={`${siteUrl}/Track.png`}
        ogType="website"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Grant Opportunities',
          description: 'Grant opportunities, funding programs, and incubation opportunities for startups',
          url: canonicalUrl,
          publisher: {
            '@type': 'Organization',
            name: 'TrackMyStartup',
            url: siteUrl
          }
        }}
      />
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
                        <a href="/services/investment-advisors" className="block px-4 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-brand-primary transition-colors" onClick={() => setServicesDropdownOpen(false)}>For Investment Advisors</a>
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

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-slate-700 hover:text-brand-primary transition-colors"
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>

              <div className="flex items-center gap-2 sm:gap-4">
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/?page=login'} className="hidden sm:inline-flex">Login</Button>
                <Button variant="primary" size="sm" onClick={() => window.location.href = '/?page=register'} className="px-3 py-1.5">Get Started</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setMobileMenuOpen(false)}>
            <div 
              ref={mobileMenuRef}
              className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-50 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <img 
                    src={LogoTMS} 
                    alt="TrackMyStartup" 
                    className="h-8 w-8 scale-[5] origin-left" 
                  />
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-slate-700 hover:text-brand-primary transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <nav className="space-y-4">
                  {/* Our Services Mobile */}
                  <div>
                    <button
                      onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                      className="w-full flex items-center justify-between text-slate-700 hover:text-brand-primary transition-colors font-medium py-2"
                    >
                      Our Services
                      <ChevronDown className={`h-4 w-4 transition-transform ${mobileServicesOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {mobileServicesOpen && (
                      <div className="pl-4 mt-2 space-y-2">
                        <a href="/services/startups" className="block py-2 text-sm text-slate-600 hover:text-brand-primary" onClick={() => setMobileMenuOpen(false)}>For Startups</a>
                        <a href="/services/incubation-centers" className="block py-2 text-sm text-slate-600 hover:text-brand-primary" onClick={() => setMobileMenuOpen(false)}>For Incubation Centers</a>
                        <a href="/services/investors" className="block py-2 text-sm text-slate-600 hover:text-brand-primary" onClick={() => setMobileMenuOpen(false)}>For Investors</a>
                        <a href="/services/investment-advisors" className="block py-2 text-sm text-slate-600 hover:text-brand-primary" onClick={() => setMobileMenuOpen(false)}>For Investment Advisors</a>
                        <a href="/services/ca" className="block py-2 text-sm text-slate-600 hover:text-brand-primary" onClick={() => setMobileMenuOpen(false)}>For CA</a>
                        <a href="/services/cs" className="block py-2 text-sm text-slate-600 hover:text-brand-primary" onClick={() => setMobileMenuOpen(false)}>For CS</a>
                        <a href="/services/mentors" className="block py-2 text-sm text-slate-600 hover:text-brand-primary" onClick={() => setMobileMenuOpen(false)}>For Mentor</a>
                      </div>
                    )}
                  </div>

                  <a href="/unified-mentor-network" className="block text-slate-700 hover:text-brand-primary transition-colors font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Unified Mentor Network</a>
                  <a href="/grant-opportunities" className="block text-slate-700 hover:text-brand-primary transition-colors font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Grant Opportunities</a>
                  <a href="/events" className="block text-slate-700 hover:text-brand-primary transition-colors font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Events</a>

                  {/* Explore Mobile */}
                  <div>
                    <button
                      onClick={() => setMobileExploreOpen(!mobileExploreOpen)}
                      className="w-full flex items-center justify-between text-slate-700 hover:text-brand-primary transition-colors font-medium py-2"
                    >
                      Explore
                      <ChevronDown className={`h-4 w-4 transition-transform ${mobileExploreOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {mobileExploreOpen && (
                      <div className="pl-4 mt-2 space-y-2">
                        <a href="/blogs" className="block py-2 text-sm text-slate-600 hover:text-brand-primary" onClick={() => setMobileMenuOpen(false)}>Blogs</a>
                        <a href="#" className="block py-2 text-sm text-slate-600 hover:text-brand-primary" onClick={() => setMobileMenuOpen(false)}>Founder notes</a>
                      </div>
                    )}
                  </div>

                  <a href="/about" className="block text-slate-700 hover:text-brand-primary transition-colors font-medium py-2" onClick={() => setMobileMenuOpen(false)}>About Us</a>
                  <a href="/contact" className="block text-slate-700 hover:text-brand-primary transition-colors font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Contact Us</a>
                </nav>

                <div className="mt-6 space-y-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setMobileMenuOpen(false);
                      window.location.href = '/?page=login';
                    }}
                    className="w-full"
                  >
                    Login
                  </Button>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={() => {
                      setMobileMenuOpen(false);
                      window.location.href = '/?page=register';
                    }}
                    className="w-full"
                  >
                    Get Started
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Grant Opportunities Section */}
      <section className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="container mx-auto">
          <div className="max-w-7xl mx-auto">
            {/* Section Title */}
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Grant Opportunities
              </h1>
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Explore accelerator programs, grants, and incubation opportunities from our network of facilitation centers.
              </p>
            </div>

            {/* Search Bar */}
            <div className="mb-8 max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search programs by name, description, or facilitator..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                />
              </div>
            </div>

            {/* Programs Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
                <p className="text-slate-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Loading programs...</p>
              </div>
            ) : (
              <>
                {/* Facilitator Opportunities */}
                {filteredOpportunities.length > 0 && (
                  <div className="mb-12">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                      Programs from Facilitators
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredOpportunities.map(opp => {
                        const embedUrl = getYoutubeEmbedUrl(opp.videoUrl);
                        const canApply = !isPast(opp.deadline);
                        return (
                          <Card key={opp.id} className="flex flex-col !p-0 overflow-hidden">
                            {embedUrl ? (
                              <div className="relative w-full aspect-video bg-slate-800">
                                <iframe src={embedUrl} title={`Video for ${opp.programName}`} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="absolute top-0 left-0 w-full h-full"></iframe>
                              </div>
                            ) : opp.posterUrl ? (
                              <img 
                                src={toDirectImageUrl(opp.posterUrl) || opp.posterUrl} 
                                alt={`${opp.programName} poster`} 
                                className="w-full h-40 object-contain bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity" 
                                onClick={() => openImageModal(opp.posterUrl!, `${opp.programName} poster`)}
                              />
                            ) : (
                              <div className="w-full h-40 bg-slate-200 flex items-center justify-center text-slate-500">
                                <Video className="h-10 w-10" />
                              </div>
                            )}
                            <div className="p-4 flex flex-col flex-grow">
                              <div className="flex-grow">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-medium text-brand-primary">{opp.facilitatorName || 'Program Facilitator'}</p>
                                    <h3 className="text-lg font-semibold text-slate-800 mt-1">{opp.programName}</h3>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    title="Share program"
                                    onClick={() => handleShareOpportunity(opp)}
                                  >
                                    <Share2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <p className="text-sm text-slate-500 mt-2 mb-4">{opp.description.substring(0, 100)}...</p>
                              </div>
                              <div className="border-t pt-4 mt-4">
                                <div className="flex items-center justify-between mb-3">
                                  <p className="text-xs text-slate-500">Deadline: <span className="font-semibold">{opp.deadline}</span></p>
                                  {isToday(opp.deadline) && (
                                    <span className="ml-2 inline-block px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 text-[10px] font-medium whitespace-nowrap">Closing today</span>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    type="button" 
                                    variant="outline"
                                    className="flex-1" 
                                    onClick={() => {
                                      const url = new URL(window.location.origin);
                                      url.searchParams.set('view', 'program');
                                      url.searchParams.set('opportunityId', opp.id);
                                      window.location.href = url.toString();
                                    }}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </Button>
                                  {canApply ? (
                                    <Button 
                                      type="button" 
                                      className="flex-1" 
                                      onClick={() => {
                                        // Store the opportunity ID and redirect to register/login
                                        const url = new URL(window.location.origin);
                                        url.searchParams.set('page', 'register');
                                        url.searchParams.set('opportunityId', opp.id);
                                        url.searchParams.set('programName', opp.programName);
                                        window.location.href = url.toString();
                                      }}
                                    >
                                      Apply for Program
                                    </Button>
                                  ) : (
                                    <Button type="button" className="flex-1" variant="secondary" disabled>
                                      Application closed
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Admin Program Posts */}
                {filteredAdminPosts.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                      Other Programs
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredAdminPosts.map(p => (
                        <Card key={p.id} className="flex flex-col !p-0 overflow-hidden">
                          {p.posterUrl ? (
                            <img 
                              src={toDirectImageUrl(p.posterUrl) || p.posterUrl} 
                              alt={`${p.programName} poster`} 
                              className="w-full h-40 object-contain bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => openImageModal(p.posterUrl!, `${p.programName} poster`)}
                            />
                          ) : (
                            <div className="w-full h-40 bg-slate-200 flex items-center justify-center text-slate-500">
                              <Video className="h-10 w-10" />
                            </div>
                          )}
                          <div className="p-4 flex flex-col flex-grow">
                            <div className="flex-grow">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-medium text-brand-primary">{p.incubationCenter}</p>
                                  <h3 className="text-lg font-semibold text-slate-800 mt-1">{p.programName}</h3>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  title="Share program"
                                  onClick={() => handleShareAdminProgram(p)}
                                >
                                  <Share2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <p className="text-xs text-slate-500 mt-2 line-clamp-3">
                                {p.description || 'Admin curated program'}
                              </p>
                              {p.grantAmount && (
                                <p className="text-xs font-semibold text-slate-700 mt-2">
                                  Grant Amount: ₹{p.grantAmount.toLocaleString('en-IN')}
                                </p>
                              )}
                              <p className="text-xs text-slate-500 mt-2">Deadline: <span className="font-semibold">{p.deadline}</span></p>
                            </div>
                            <div className="border-t pt-4 mt-4">
                              <div className="flex gap-2">
                                <Button 
                                  type="button"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => {
                                    const url = new URL(window.location.origin);
                                    url.searchParams.set('view', 'admin-program');
                                    url.searchParams.set('programId', p.id);
                                    window.location.href = url.toString();
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </Button>
                                <a href={p.applicationLink} target="_blank" rel="noopener noreferrer" className="flex-1">
                                  <Button className="w-full">
                                    Apply
                                  </Button>
                                </a>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Results */}
                {filteredOpportunities.length === 0 && filteredAdminPosts.length === 0 && (
                  <Card className="text-center py-12">
                    <h3 className="text-xl font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                      {searchTerm ? 'No programs found' : 'No programs available'}
                    </h3>
                    <p className="text-slate-500" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                      {searchTerm 
                        ? 'Try adjusting your search terms.' 
                        : 'Check back later for new programs and offerings.'}
                    </p>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Image Modal */}
      <Modal isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} title={selectedImageAlt} size="4xl">
        <div className="flex justify-center items-center p-4">
          <img 
            src={selectedImageUrl} 
            alt={selectedImageAlt}
            className="max-w-full max-h-[80vh] object-contain"
          />
        </div>
      </Modal>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default GrantOpportunitiesPage;


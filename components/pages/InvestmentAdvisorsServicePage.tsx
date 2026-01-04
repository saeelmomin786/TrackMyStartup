import React, { useState, useEffect, useRef } from 'react';
import ServicePageLayout from './ServicePageLayout';
import { Briefcase, ChevronDown, LayoutDashboard, Search, Bookmark, Sparkles, Users, Award, Play, Eye, Share2, TrendingUp, DollarSign, UserCheck, Calculator, Clipboard, Building2, Check, Menu, X } from 'lucide-react';
import Button from '../ui/Button';
import LogoTMS from '../public/logoTMS.svg';
// Using import with space - if this causes build issues, rename file to remove space
import AdvisorIllustration from '../public/InvestmentAdvisor1.svg';
import Footer from '../Footer';

const InvestmentAdvisorsServicePage: React.FC = () => {
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [exploreDropdownOpen, setExploreDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileExploreOpen, setMobileExploreOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const exploreDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [timelineAnimated, setTimelineAnimated] = useState(false);
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // Google Drive video URL for the advisors walkthrough section
  const advisorsWalkthroughVideoUrl: string = 'https://drive.google.com/file/d/1RMrPMD7hbsv9IHwirWdnnorO8YrzUE80/preview';

  useEffect(() => {
    setCurrentPath(window.location.pathname);
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

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

  // Timeline scroll animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimelineAnimated(true);
          }
        });
      },
      { threshold: 0.2 }
    );

    if (timelineRef.current) {
      observer.observe(timelineRef.current);
    }

    return () => {
      if (timelineRef.current) {
        observer.unobserve(timelineRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img src={LogoTMS} alt="TrackMyStartup" className="h-7 w-7 sm:h-8 sm:w-8 scale-[5] sm:scale-[5] origin-left cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.location.href = '/'} />
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
                <div ref={dropdownRef} className="relative" onMouseEnter={() => setServicesDropdownOpen(true)} onMouseLeave={(e) => { const relatedTarget = e.relatedTarget as Node; if (!dropdownRef.current?.contains(relatedTarget)) { setServicesDropdownOpen(false); } }}>
                  <button className="flex items-center gap-1 text-slate-700 hover:text-brand-primary transition-colors font-medium text-sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setServicesDropdownOpen(!servicesDropdownOpen); }}>
                    Our Services
                    <ChevronDown className={`h-4 w-4 transition-transform ${servicesDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {servicesDropdownOpen && (
                    <div className="absolute top-full left-0 pt-2 w-56 z-[100]" onMouseEnter={() => setServicesDropdownOpen(true)}>
                      <div className="bg-white rounded-lg shadow-xl border border-slate-200 py-2 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
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
                  href="#" 
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

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto mb-16">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            <div className="flex-1 text-center lg:text-left">
              <h4 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-700 mb-3 leading-tight" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              Power Your Advisory Network with Track My Startup
              </h4>
              <p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Track My Startup enables investment advisors to manage deals, collaborate with investors and startups, track mandates, and streamline advisory workflows.
              </p>
              <div className="flex justify-center lg:justify-start">
                <a href="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-md font-semibold hover:opacity-90 transition-opacity shadow-lg hover:shadow-xl group" style={{ backgroundColor: '#325b79', color: '#ffffff' }}>
                  Get Started
                </a>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <img src={AdvisorIllustration} alt="Investment Advisor Illustration" className="w-full h-auto max-w-lg lg:max-w-full" style={{ maxHeight: '500px', objectFit: 'contain' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Everything an Investment Advisor Needs Section */}
      <div className="w-screen relative py-20 sm:py-24" style={{ left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw', backgroundColor: '#1E293B' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Everything an Investment Advisor Needs
              </h2>
              <p className="text-lg text-slate-300 max-w-2xl mx-auto" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                All advisory operations managed from one unified platform.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 lg:gap-12">
              {/* Item 1: Unified Advisor Dashboard */}
              <div className="flex flex-col items-center text-center group">
                <div className="mb-6 transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center border border-blue-100/50" style={{ backgroundColor: '#D1E7EA' }}>
                    <LayoutDashboard className="w-10 h-10 text-brand-primary transition-colors duration-300 group-hover:text-brand-secondary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Unified Advisor Dashboard
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-sm" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Get a real-time view of investor offers, co-investment opportunities, startup offers, and service requests in one place.
                </p>
              </div>

              {/* Item 2: Startup Discovery & Fundraising */}
              <div className="flex flex-col items-center text-center group">
                <div className="mb-6 transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center border border-blue-100/50" style={{ backgroundColor: '#D1E7EA' }}>
                    <Search className="w-10 h-10 text-brand-primary transition-colors duration-300 group-hover:text-brand-secondary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Startup Discovery & Fundraising
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-sm" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Browse startups actively raising funds and explore opportunities aligned with investor interests.
                </p>
              </div>

              {/* Item 3: Favorites & Due Diligence */}
              <div className="flex flex-col items-center text-center group">
                <div className="mb-6 transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center border border-blue-100/50" style={{ backgroundColor: '#D1E7EA' }}>
                    <Bookmark className="w-10 h-10 text-brand-primary transition-colors duration-300 group-hover:text-brand-secondary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Favorites & Due Diligence
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-sm" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Bookmark startups for quick access and manage due diligence requests efficiently.
                </p>
              </div>

              {/* Item 4: Smart Recommendations */}
              <div className="flex flex-col items-center text-center group">
                <div className="mb-6 transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center border border-blue-100/50" style={{ backgroundColor: '#D1E7EA' }}>
                    <Sparkles className="w-10 h-10 text-brand-primary transition-colors duration-300 group-hover:text-brand-secondary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Smart Recommendations
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-sm" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Recommend startups directly to your investor network and track engagement outcomes.
                </p>
              </div>

              {/* Item 5: Network Management */}
              <div className="flex flex-col items-center text-center group">
                <div className="mb-6 transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center border border-blue-100/50" style={{ backgroundColor: '#D1E7EA' }}>
                    <Users className="w-10 h-10 text-brand-primary transition-colors duration-300 group-hover:text-brand-secondary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Network Management
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-sm" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Manage startups, investors, and investments through a structured ecosystem view.
                </p>
              </div>

              {/* Item 6: Advisor Portfolio & Branding */}
              <div className="flex flex-col items-center text-center group">
                <div className="mb-6 transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center border border-blue-100/50" style={{ backgroundColor: '#D1E7EA' }}>
                    <Award className="w-10 h-10 text-brand-primary transition-colors duration-300 group-hover:text-brand-secondary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Advisor Portfolio & Branding
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-sm" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Showcase your advisory services, expertise, and brand across the Track My Startup platform.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Your Brand. Your Dashboard. Section */}
      <div className="w-screen relative py-20 sm:py-24" style={{ left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw', backgroundColor: '#F8FAFC' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
              {/* Left Column: Dashboard Mock Card */}
              <div className="flex-1 w-full lg:max-w-md">
                <div className="bg-white rounded-lg border border-slate-200 shadow-lg overflow-hidden">
                  {/* Dashboard Header Mock */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-white/20 flex items-center justify-center">
                        <Briefcase className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="text-white font-semibold text-lg" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                          Your Firm Name
                        </div>
                        <div className="text-blue-100 text-xs" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                          Investment Advisor Dashboard
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Dashboard Content Area */}
                  <div className="p-6">
                    <div className="space-y-3">
                      <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                      <div className="h-4 bg-slate-100 rounded w-full"></div>
                      <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="h-20 bg-slate-50 rounded border border-slate-200"></div>
                      <div className="h-20 bg-slate-50 rounded border border-slate-200"></div>
                    </div>
                  </div>
                  
                  {/* Caption */}
                  <div className="px-6 pb-4">
                    <p className="text-xs text-slate-500 text-center italic" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                      White-labeled advisor dashboard example
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Text Content */}
              <div className="flex-1 text-center lg:text-left">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', color: '#1E293B' }}>
                  Your Brand. Your Dashboard.
                </h2>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  White-label the entire Investment Advisor dashboard with your firm's logo, name, and identity — powered by Track My Startup.
                </p>
                
                {/* Value Points */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <Check className="w-5 h-5 text-brand-primary" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-800 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Firm-Branded Dashboard
                      </h3>
                      <p className="text-sm text-slate-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Replace platform branding with your firm identity.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <Check className="w-5 h-5 text-brand-primary" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-800 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Unified Network Experience
                      </h3>
                      <p className="text-sm text-slate-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Investors and startups interact inside your branded workspace.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <Check className="w-5 h-5 text-brand-primary" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-800 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Powered by Track My Startup
                      </h3>
                      <p className="text-sm text-slate-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Full access to mandates, fundraising, compliance, and collaboration tools.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <Check className="w-5 h-5 text-brand-primary" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-800 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        No Technical Setup Required
                      </h3>
                      <p className="text-sm text-slate-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Branding managed directly from your advisor account.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* See How Investment Advisors Use Track My Startup Section */}
      <div className="w-screen relative py-20 sm:py-24" style={{ left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw', backgroundColor: '#F8FAFC' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
              {/* Left Column: Text Content */}
              <div className="flex-1 text-center lg:text-left">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', color: '#1E293B' }}>
                  See How Investment Advisors Use Track My Startup
                </h2>
                <p className="text-lg text-slate-600 mb-4 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  A walkthrough of how advisors manage fundraising, mandates, networks, and collaborations from one dashboard.
                </p>
                <p className="text-base text-slate-500 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Streamline your advisory workflow and build stronger investor-startup connections.
                </p>
              </div>

              {/* Right Column: Video Container */}
              <div className="flex-1 w-full lg:max-w-2xl">
                {advisorsWalkthroughVideoUrl ? (
                  <div className="w-full rounded-lg border border-slate-200 overflow-hidden bg-white shadow-md cursor-pointer transition-transform duration-300 hover:scale-[1.02] hover:border-brand-primary/30">
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                      <div className="absolute top-0 left-0 w-full h-full">
                        <iframe
                          className="w-full h-full"
                          src={advisorsWalkthroughVideoUrl}
                          title="Track My Startup Investment Advisor Dashboard Walkthrough"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full rounded-lg border border-slate-200 overflow-hidden bg-white shadow-md">
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                      <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center p-8 text-center">
                        <div className="mb-4">
                          <div className="w-16 h-16 mx-auto rounded-full bg-slate-200 flex items-center justify-center">
                            <Play className="w-8 h-8 text-slate-500 ml-1" fill="currentColor" />
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                          Investment Advisor dashboard walkthrough coming soon
                        </h3>
                        <p className="text-sm text-slate-500 max-w-sm" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                          We're preparing a guided demo to showcase the advisor experience.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* A Clear Advisory Journey Timeline Section */}
      <div ref={timelineRef} className="w-screen relative py-24 sm:py-32" style={{ left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw', backgroundColor: '#E9EFF5' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-medium mb-16 sm:mb-20 text-center" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', color: '#1E293B' }}>
              A Clear Advisory Journey, From Discovery to Long-Term Impact
            </h2>

            {/* Timeline Container */}
            <div className="relative">
              {/* Timeline Line with Anchor Dots */}
              <div className="hidden md:block absolute top-20 left-0 right-0 h-1">
                {/* Base line */}
                <div className="absolute top-0 left-0 right-0 h-full bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100"></div>
                {/* Animated gradient line */}
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-brand-primary via-brand-primary to-brand-primary transition-all duration-1000 ease-out"
                  style={{ 
                    width: timelineAnimated ? '100%' : '0%',
                    transitionDelay: '200ms'
                  }}
                ></div>
                {/* Anchor dots */}
                <div className="absolute top-1/2 left-[16.66%] transform -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-brand-primary border-2 border-white shadow-md"></div>
                <div className="absolute top-1/2 left-[50%] transform -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-brand-primary border-2 border-white shadow-lg"></div>
                <div className="absolute top-1/2 left-[83.33%] transform -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-brand-primary border-2 border-white shadow-md"></div>
              </div>

              {/* Mobile Timeline Line */}
              <div className="md:hidden absolute left-8 top-0 bottom-0 w-0.5">
                <div className="absolute top-0 left-0 bottom-0 w-full bg-gradient-to-b from-blue-100 via-blue-200 to-blue-100"></div>
                <div 
                  className="absolute top-0 left-0 w-full bg-gradient-to-b from-brand-primary via-brand-primary to-brand-primary transition-all duration-1000 ease-out"
                  style={{ 
                    height: timelineAnimated ? '100%' : '0%',
                    transitionDelay: '200ms'
                  }}
                ></div>
              </div>

              {/* Timeline Stages */}
              <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 lg:gap-12">
                {/* Stage 01: Discover & Evaluate */}
                <div 
                  className="relative group"
                  onMouseEnter={() => setHoveredStage('discover')}
                  onMouseLeave={() => setHoveredStage(null)}
                >
                  <div className="flex flex-col items-center md:items-start">
                    {/* Icon Node - Standardized Size */}
                    <div 
                      className={`relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 flex items-center justify-center transition-all duration-300 ${
                        hoveredStage === 'discover' ? 'scale-110 shadow-lg shadow-brand-primary/20 border-brand-primary' : ''
                      }`}
                      style={{
                        transform: timelineAnimated ? 'translateY(0)' : 'translateY(20px)',
                        opacity: timelineAnimated ? 1 : 0,
                        transitionDelay: timelineAnimated ? '400ms' : '0ms'
                      }}
                    >
                      <Eye className="w-9 h-9 text-brand-primary" strokeWidth={1.5} />
                    </div>

                    {/* Connection Line */}
                    <div className="hidden md:block absolute top-32 left-1/2 w-px h-10 bg-gradient-to-b from-brand-primary/40 to-transparent transform -translate-x-1/2"></div>

                    {/* Content Block */}
                    <div 
                      className={`mt-6 md:mt-10 text-center md:text-left transition-all duration-500 ${
                        hoveredStage === 'discover' ? 'scale-105' : ''
                      }`}
                      style={{
                        transform: timelineAnimated ? 'translateY(0)' : 'translateY(20px)',
                        opacity: timelineAnimated ? 1 : 0,
                        transitionDelay: timelineAnimated ? '600ms' : '0ms'
                      }}
                    >
                      <h3 className="text-xl font-medium mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', color: '#1E293B' }}>
                        Stage 01 – Discover & Evaluate
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Browse startups, review fundraising opportunities, and assess investor interests.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stage 02: Advise & Connect - Visual Anchor */}
                <div 
                  className="relative group"
                  onMouseEnter={() => setHoveredStage('advise')}
                  onMouseLeave={() => setHoveredStage(null)}
                >
                  <div className="flex flex-col items-center md:items-start">
                    {/* Icon Node - Same Size but Stronger Accent */}
                    <div 
                      className={`relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 flex items-center justify-center transition-all duration-300 md:-mt-2 ${
                        hoveredStage === 'advise' ? 'scale-110 shadow-xl shadow-brand-primary/30 border-brand-primary' : 'shadow-md shadow-brand-primary/20'
                      }`}
                      style={{
                        transform: timelineAnimated ? 'translateY(0)' : 'translateY(20px)',
                        opacity: timelineAnimated ? 1 : 0,
                        transitionDelay: timelineAnimated ? '500ms' : '0ms'
                      }}
                    >
                      <Share2 className="w-9 h-9 text-brand-primary" strokeWidth={1.5} />
                    </div>

                    {/* Connection Line */}
                    <div className="hidden md:block absolute top-32 left-1/2 w-px h-10 bg-gradient-to-b from-brand-primary/60 to-transparent transform -translate-x-1/2"></div>

                    {/* Content Block */}
                    <div 
                      className={`mt-6 md:mt-10 text-center md:text-left transition-all duration-500 ${
                        hoveredStage === 'advise' ? 'scale-105' : ''
                      }`}
                      style={{
                        transform: timelineAnimated ? 'translateY(0)' : 'translateY(20px)',
                        opacity: timelineAnimated ? 1 : 0,
                        transitionDelay: timelineAnimated ? '700ms' : '0ms'
                      }}
                    >
                      <h3 className="text-xl font-medium mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', color: '#1E293B' }}>
                        Stage 02 – Advise & Connect
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Recommend startups, manage mandates, and collaborate with founders and investors.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stage 03: Build Reputation & Scale */}
                <div 
                  className="relative group"
                  onMouseEnter={() => setHoveredStage('scale')}
                  onMouseLeave={() => setHoveredStage(null)}
                >
                  <div className="flex flex-col items-center md:items-start">
                    {/* Icon Node - Standardized Size */}
                    <div 
                      className={`relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 flex items-center justify-center transition-all duration-300 ${
                        hoveredStage === 'scale' ? 'scale-110 shadow-lg shadow-brand-primary/20 border-brand-primary' : ''
                      }`}
                      style={{
                        transform: timelineAnimated ? 'translateY(0)' : 'translateY(20px)',
                        opacity: timelineAnimated ? 1 : 0,
                        transitionDelay: timelineAnimated ? '600ms' : '0ms'
                      }}
                    >
                      <TrendingUp className="w-9 h-9 text-brand-primary" strokeWidth={1.5} />
                    </div>

                    {/* Connection Line */}
                    <div className="hidden md:block absolute top-32 left-1/2 w-px h-10 bg-gradient-to-b from-brand-primary/40 to-transparent transform -translate-x-1/2"></div>

                    {/* Content Block */}
                    <div 
                      className={`mt-6 md:mt-10 text-center md:text-left transition-all duration-500 ${
                        hoveredStage === 'scale' ? 'scale-105' : ''
                      }`}
                      style={{
                        transform: timelineAnimated ? 'translateY(0)' : 'translateY(20px)',
                        opacity: timelineAnimated ? 1 : 0,
                        transitionDelay: timelineAnimated ? '800ms' : '0ms'
                      }}
                    >
                      <h3 className="text-xl font-medium mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', color: '#1E293B' }}>
                        Stage 03 – Build Reputation & Scale
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Grow your advisory portfolio, strengthen your network, and expand long-term impact.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Collaborate Across the Investment Ecosystem Section */}
        <div className="max-w-6xl mx-auto mb-20 sm:mb-24">
          <h2 className="text-3xl sm:text-4xl font-medium text-slate-800 mb-12 sm:mb-16 text-center" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
            <b>Collaborate Across the Investment Ecosystem</b>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 sm:gap-10 lg:gap-12">
            {/* Investors */}
            <div className="group flex flex-col items-center text-center cursor-pointer">
              <div className="mb-4 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-brand-primary/10">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 flex items-center justify-center transition-all duration-300 group-hover:border-brand-primary group-hover:scale-105">
                  <DollarSign className="w-9 h-9 text-brand-primary" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="text-base font-medium text-slate-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Investors
              </h3>
            </div>

            {/* Mentors */}
            <div className="group flex flex-col items-center text-center cursor-pointer">
              <div className="mb-4 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-brand-primary/10">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 flex items-center justify-center transition-all duration-300 group-hover:border-brand-primary group-hover:scale-105">
                  <UserCheck className="w-9 h-9 text-brand-primary" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="text-base font-medium text-slate-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Mentors
              </h3>
            </div>

            {/* Incubation & Facilitation Centers */}
            <div className="group flex flex-col items-center text-center cursor-pointer">
              <div className="mb-4 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-brand-primary/10">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 flex items-center justify-center transition-all duration-300 group-hover:border-brand-primary group-hover:scale-105">
                  <Building2 className="w-9 h-9 text-brand-primary" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="text-base font-medium text-slate-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Incubation & Facilitation Centers
              </h3>
            </div>

            {/* Chartered Accountants */}
            <div className="group flex flex-col items-center text-center cursor-pointer">
              <div className="mb-4 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-brand-primary/10">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 flex items-center justify-center transition-all duration-300 group-hover:border-brand-primary group-hover:scale-105">
                  <Calculator className="w-9 h-9 text-brand-primary" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="text-base font-medium text-slate-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Chartered Accountants
              </h3>
            </div>

            {/* Company Secretaries */}
            <div className="group flex flex-col items-center text-center cursor-pointer">
              <div className="mb-4 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-brand-primary/10">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 flex items-center justify-center transition-all duration-300 group-hover:border-brand-primary group-hover:scale-105">
                  <Clipboard className="w-9 h-9 text-brand-primary" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="text-base font-medium text-slate-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Company Secretaries
              </h3>
            </div>

            {/* Other Investment Advisors */}
            <div className="group flex flex-col items-center text-center cursor-pointer">
              <div className="mb-4 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-brand-primary/10">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 flex items-center justify-center transition-all duration-300 group-hover:border-brand-primary group-hover:scale-105">
                  <Briefcase className="w-9 h-9 text-brand-primary" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="text-base font-medium text-slate-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Other Investment Advisors
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default InvestmentAdvisorsServicePage;

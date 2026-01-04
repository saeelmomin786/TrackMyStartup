import React, { useState, useEffect, useRef } from 'react';
import ServicePageLayout from './ServicePageLayout';
import { Building, ChevronDown, ClipboardList, Activity, PieChart, Search, Users, Play, Rocket, DollarSign, Briefcase, UserCheck, Calculator, Shield, Menu, X } from 'lucide-react';
import Button from '../ui/Button';
import LogoTMS from '../public/logoTMS.svg';
import IncubationIllustration from '../public/Incubation Center.svg';
import Footer from '../Footer';

const IncubationCentersServicePage: React.FC = () => {
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
  
  // YouTube video URL for the incubation center walkthrough section
  const incubationCenterWalkthroughVideoUrl: string | null = null; // Set to video URL when available

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
        {/* Hero Section - Two Column Layout */}
        <div className="max-w-7xl mx-auto mb-16">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            {/* Left Column - Content */}
            <div className="flex-1 text-center lg:text-left">
              <h5 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-700 mb-3 leading-tight" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              Start Managing Incubation Programs Smarter with Track My Startup
              </h5>
              <p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Track My Startup enables incubation and facilitation centers to manage startups, track compliance, monitor progress, and coordinate mentors and investors from a single platform.
              </p>
              <div className="flex justify-center lg:justify-start">
                <a
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-md font-semibold hover:opacity-90 transition-opacity shadow-lg hover:shadow-xl group"
                  style={{ backgroundColor: '#633ab4', color: '#ffffff' }}
                >
                  Get Started
                </a>
              </div>
            </div>

            {/* Right Column - Illustration */}
            <div className="flex-1 flex items-center justify-center">
              <img
                src={IncubationIllustration}
                alt="Incubation Center Illustration"
                className="w-full h-auto max-w-lg lg:max-w-full"
                style={{ maxHeight: '500px', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>

        {/* Everything an Incubation Center Needs Section */}
      </div>

      <div className="w-screen relative py-20 sm:py-24" style={{ left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw', backgroundColor: '#1E293B' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Everything an Incubation Center Needs
              </h2>
              <p className="text-lg text-white max-w-2xl mx-auto" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Manage startups, programs, investments, and ecosystem collaboration from one unified platform.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 lg:gap-12">
              {/* Item 1: Startup Portfolio Management */}
              <div className="flex flex-col items-center text-center group">
                <div className="mb-6 transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center border border-blue-100/50" style={{ backgroundColor: '#D1E7EA' }}>
                    <Building className="w-10 h-10 text-brand-primary transition-colors duration-300 group-hover:text-brand-secondary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Startup Portfolio Management
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-sm" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Track all incubated startups, monitor their progress, and manage engagement from a single dashboard.
                </p>
              </div>

              {/* Item 2: Intake & Application Management */}
              <div className="flex flex-col items-center text-center group">
                <div className="mb-6 transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center border border-blue-100/50" style={{ backgroundColor: '#D1E7EA' }}>
                    <ClipboardList className="w-10 h-10 text-brand-primary transition-colors duration-300 group-hover:text-brand-secondary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Intake & Application Management
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-sm" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Post programs and opportunities, receive startup applications, and manage intake workflows efficiently.
                </p>
              </div>

              {/* Item 3: Startup Progress Tracking */}
              <div className="flex flex-col items-center text-center group">
                <div className="mb-6 transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center border border-blue-100/50" style={{ backgroundColor: '#D1E7EA' }}>
                    <Activity className="w-10 h-10 text-brand-primary transition-colors duration-300 group-hover:text-brand-secondary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Startup Progress Tracking
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-sm" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Monitor startup milestones, compliance status, and performance across cohorts and programs.
                </p>
              </div>

              {/* Item 4: Investment & Equity Visibility */}
              <div className="flex flex-col items-center text-center group">
                <div className="mb-6 transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center border border-blue-100/50" style={{ backgroundColor: '#D1E7EA' }}>
                    <PieChart className="w-10 h-10 text-brand-primary transition-colors duration-300 group-hover:text-brand-secondary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Investment & Equity Visibility
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-sm" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Track investments, equity holdings, and portfolio distribution across incubated startups.
                </p>
              </div>

              {/* Item 5: Pitch Discovery & Opportunities */}
              <div className="flex flex-col items-center text-center group">
                <div className="mb-6 transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center border border-blue-100/50" style={{ backgroundColor: '#D1E7EA' }}>
                    <Search className="w-10 h-10 text-brand-primary transition-colors duration-300 group-hover:text-brand-secondary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Pitch Discovery & Opportunities
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-sm" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Discover new startup pitches and identify high-potential founders for incubation programs.
                </p>
              </div>

              {/* Item 6: Ecosystem Coordination */}
              <div className="flex flex-col items-center text-center group">
                <div className="mb-6 transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center border border-blue-100/50" style={{ backgroundColor: '#D1E7EA' }}>
                    <Users className="w-10 h-10 text-brand-primary transition-colors duration-300 group-hover:text-brand-secondary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Ecosystem Coordination
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-sm" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Coordinate mentors, investors, advisors, and service providers around your startup portfolio.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* See How Incubation Centers Use Track My Startup Section */}
      <div className="w-screen relative py-20 sm:py-24" style={{ left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw', backgroundColor: '#F8FAFC' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
              {/* Left Column: Text Content */}
              <div className="flex-1 text-center lg:text-left">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', color: '#1E293B' }}>
                  See How Incubation Centers Use Track My Startup
                </h2>
                <p className="text-lg text-slate-600 mb-4 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  A walkthrough of how incubation centers manage startups, applications, investments, and ecosystem collaboration from one dashboard.
                </p>
              </div>

              {/* Right Column: Video Container */}
              <div className="flex-1 w-full lg:max-w-2xl">
                {incubationCenterWalkthroughVideoUrl ? (
                  <div className="w-full rounded-lg border border-slate-200 overflow-hidden bg-white cursor-pointer transition-transform duration-300 hover:scale-[1.02] hover:border-brand-primary/30">
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                      <div className="absolute top-0 left-0 w-full h-full">
                        <iframe
                          className="w-full h-full"
                          src={incubationCenterWalkthroughVideoUrl}
                          title="Track My Startup Incubation Center Dashboard Walkthrough"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full rounded-lg border border-slate-200 overflow-hidden bg-white">
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                      <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center p-8 text-center">
                        <div className="mb-4">
                          <div className="w-16 h-16 mx-auto rounded-full bg-slate-200 flex items-center justify-center">
                            <Play className="w-8 h-8 text-slate-500 ml-1" fill="currentColor" />
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                          Incubation Center dashboard walkthrough coming soon
                        </h3>
                        <p className="text-sm text-slate-500 max-w-sm" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                          We're preparing a guided demo to showcase the incubation center experience.
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

      {/* A Clear Incubation Journey Timeline Section */}
      <div ref={timelineRef} className="w-screen relative py-24 sm:py-32" style={{ left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw', backgroundColor: '#E2E8F0' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-medium text-slate-800 mb-16 sm:mb-20 text-center" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              A Clear Incubation Journey, From Intake to Portfolio Growth
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
                {/* Stage 01: Intake & Onboard */}
                <div 
                  className="relative group"
                  onMouseEnter={() => setHoveredStage('intake')}
                  onMouseLeave={() => setHoveredStage(null)}
                >
                  <div className="flex flex-col items-center md:items-start">
                    {/* Icon Node - Standardized Size */}
                    <div 
                      className={`relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 flex items-center justify-center transition-all duration-300 ${
                        hoveredStage === 'intake' ? 'scale-110 shadow-lg shadow-brand-primary/20 border-brand-primary' : ''
                      }`}
                      style={{
                        transform: timelineAnimated ? 'translateY(0)' : 'translateY(20px)',
                        opacity: timelineAnimated ? 1 : 0,
                        transitionDelay: timelineAnimated ? '400ms' : '0ms'
                      }}
                    >
                      <ClipboardList className="w-9 h-9 text-brand-primary" strokeWidth={1.5} />
                    </div>

                    {/* Connection Line */}
                    <div className="hidden md:block absolute top-32 left-1/2 w-px h-10 bg-gradient-to-b from-brand-primary/40 to-transparent transform -translate-x-1/2"></div>

                    {/* Content Block */}
                    <div 
                      className={`mt-6 md:mt-10 text-center md:text-left transition-all duration-500 ${
                        hoveredStage === 'intake' ? 'scale-105' : ''
                      }`}
                      style={{
                        transform: timelineAnimated ? 'translateY(0)' : 'translateY(20px)',
                        opacity: timelineAnimated ? 1 : 0,
                        transitionDelay: timelineAnimated ? '600ms' : '0ms'
                      }}
                    >
                      <h3 className="text-xl font-medium text-slate-800 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Stage 01 – Intake & Onboard
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Publish programs, receive startup applications, evaluate founders, and onboard selected startups.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stage 02: Support & Track - Visual Anchor */}
                <div 
                  className="relative group"
                  onMouseEnter={() => setHoveredStage('support')}
                  onMouseLeave={() => setHoveredStage(null)}
                >
                  <div className="flex flex-col items-center md:items-start">
                    {/* Icon Node - Same Size but Stronger Accent */}
                    <div 
                      className={`relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 flex items-center justify-center transition-all duration-300 md:-mt-2 ${
                        hoveredStage === 'support' ? 'scale-110 shadow-xl shadow-brand-primary/30 border-brand-primary' : 'shadow-md shadow-brand-primary/20'
                      }`}
                      style={{
                        transform: timelineAnimated ? 'translateY(0)' : 'translateY(20px)',
                        opacity: timelineAnimated ? 1 : 0,
                        transitionDelay: timelineAnimated ? '500ms' : '0ms'
                      }}
                    >
                      <Activity className="w-9 h-9 text-brand-primary" strokeWidth={1.5} />
                    </div>

                    {/* Connection Line */}
                    <div className="hidden md:block absolute top-32 left-1/2 w-px h-10 bg-gradient-to-b from-brand-primary/60 to-transparent transform -translate-x-1/2"></div>

                    {/* Content Block */}
                    <div 
                      className={`mt-6 md:mt-10 text-center md:text-left transition-all duration-500 ${
                        hoveredStage === 'support' ? 'scale-105' : ''
                      }`}
                      style={{
                        transform: timelineAnimated ? 'translateY(0)' : 'translateY(20px)',
                        opacity: timelineAnimated ? 1 : 0,
                        transitionDelay: timelineAnimated ? '700ms' : '0ms'
                      }}
                    >
                      <h3 className="text-xl font-medium text-slate-800 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Stage 02 – Support & Track
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Monitor startup progress, connect mentors and investors, and track compliance and milestones.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stage 03: Invest & Scale */}
                <div 
                  className="relative group"
                  onMouseEnter={() => setHoveredStage('invest')}
                  onMouseLeave={() => setHoveredStage(null)}
                >
                  <div className="flex flex-col items-center md:items-start">
                    {/* Icon Node - Standardized Size */}
                    <div 
                      className={`relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 flex items-center justify-center transition-all duration-300 ${
                        hoveredStage === 'invest' ? 'scale-110 shadow-lg shadow-brand-primary/20 border-brand-primary' : ''
                      }`}
                      style={{
                        transform: timelineAnimated ? 'translateY(0)' : 'translateY(20px)',
                        opacity: timelineAnimated ? 1 : 0,
                        transitionDelay: timelineAnimated ? '600ms' : '0ms'
                      }}
                    >
                      <Rocket className="w-9 h-9 text-brand-primary" strokeWidth={1.5} />
                    </div>

                    {/* Connection Line */}
                    <div className="hidden md:block absolute top-32 left-1/2 w-px h-10 bg-gradient-to-b from-brand-primary/40 to-transparent transform -translate-x-1/2"></div>

                    {/* Content Block */}
                    <div 
                      className={`mt-6 md:mt-10 text-center md:text-left transition-all duration-500 ${
                        hoveredStage === 'invest' ? 'scale-105' : ''
                      }`}
                      style={{
                        transform: timelineAnimated ? 'translateY(0)' : 'translateY(20px)',
                        opacity: timelineAnimated ? 1 : 0,
                        transitionDelay: timelineAnimated ? '800ms' : '0ms'
                      }}
                    >
                      <h3 className="text-xl font-medium text-slate-800 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Stage 03 – Invest & Scale
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Track investments, equity, and portfolio performance while supporting long-term startup growth.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collaborate Across the Startup Ecosystem Section */}
      <div className="w-screen relative py-20 sm:py-24" style={{ left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw', backgroundColor: '#F8FAFC' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-medium text-slate-800 mb-12 sm:mb-16 text-center" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              <b>Collaborate Across the Startup Ecosystem</b>
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-8 sm:gap-10 lg:gap-12">
              {/* Startups */}
              <div className="group flex flex-col items-center text-center cursor-pointer">
                <div className="mb-4 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-brand-primary/10">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 flex items-center justify-center transition-all duration-300 group-hover:border-brand-primary group-hover:scale-105">
                    <Rocket className="w-9 h-9 text-brand-primary" strokeWidth={1.5} />
                  </div>
                </div>
                <h3 className="text-base font-medium text-slate-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Startups
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

              {/* Investment Advisors */}
              <div className="group flex flex-col items-center text-center cursor-pointer">
                <div className="mb-4 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-brand-primary/10">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 flex items-center justify-center transition-all duration-300 group-hover:border-brand-primary group-hover:scale-105">
                    <Briefcase className="w-9 h-9 text-brand-primary" strokeWidth={1.5} />
                  </div>
                </div>
                <h3 className="text-base font-medium text-slate-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Investment Advisors
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
                    <Shield className="w-9 h-9 text-brand-primary" strokeWidth={1.5} />
                  </div>
                </div>
                <h3 className="text-base font-medium text-slate-700" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Company Secretaries
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Rest of the page content using ServicePageLayout */}
        
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default IncubationCentersServicePage;

import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, ChevronDown, Rocket, TrendingUp, Users, Briefcase, FileText, Shield, Building, Sparkles, KeyRound, GitBranch, ShieldCheck, Users2, Activity, MessageCircle, Search, Menu, X } from 'lucide-react';
import Button from './ui/Button';
import LogoTMS from './public/logoTMS.svg';
import Partner1 from './public/Partner1.svg';
import Partner2 from './public/Partner2.svg';
import Partner3 from './public/Partner3.svg';
import Partner4 from './public/Partner4.svg';
import Partner5 from './public/Partner5.svg';
import Partner6 from './public/Partner6.svg';
import SEOHead from './SEOHead';

// Service route mapping
const getServiceRoute = (roleName: string): string => {
  const routeMap: Record<string, string> = {
    'Startups': '/services/startups',
    'Incubation Centers': '/services/incubation-centers',
    'Facilitation Centers': '/services/incubation-centers',
    'Investors': '/services/investors',
    'Investment Advisors': '/services/investment-advisors',
    'CA': '/services/ca',
    'CS': '/services/cs',
    'Mentors': '/services/mentors',
  };
  return routeMap[roleName] || '#';
};

interface LandingPageProps {
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToLogin, onNavigateToRegister }) => {
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [exploreDropdownOpen, setExploreDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileExploreOpen, setMobileExploreOpen] = useState(false);
  const [ecosystemAnimated, setEcosystemAnimated] = useState(false);
  const ecosystemSectionRef = useRef<HTMLElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const exploreDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [currentPath, setCurrentPath] = useState<string>('');

  useEffect(() => {
    setCurrentPath(window.location.pathname);
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  useEffect(() => {
    if (ecosystemAnimated) return; // Already triggered, no need to observe

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Trigger animation when section is 50% visible (40-60% range)
          const intersectionRatio = entry.intersectionRatio;
          if (intersectionRatio >= 0.5 && !ecosystemAnimated) {
            setEcosystemAnimated(true);
            // Unobserve after triggering to prevent re-triggering
            if (ecosystemSectionRef.current) {
              observer.unobserve(ecosystemSectionRef.current);
            }
          }
        });
      },
      {
        threshold: [0.4, 0.5, 0.6],
        rootMargin: '0px',
      }
    );

    if (ecosystemSectionRef.current) {
      observer.observe(ecosystemSectionRef.current);
    }

    return () => {
      if (ecosystemSectionRef.current) {
        observer.unobserve(ecosystemSectionRef.current);
      }
    };
  }, [ecosystemAnimated]);

  // Handle click outside dropdowns to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setServicesDropdownOpen(false);
      }
      if (exploreDropdownRef.current && !exploreDropdownRef.current.contains(event.target as Node)) {
        setExploreDropdownOpen(false);
      }
    };

    if (servicesDropdownOpen || exploreDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [servicesDropdownOpen, exploreDropdownOpen]);

  const siteUrl = 'https://trackmystartup.com';
  const canonicalUrl = `${siteUrl}${window.location.pathname}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title="TrackMyStartup - Comprehensive Startup Tracking Platform for Investors, Founders & Professionals"
        description="Track your startup's growth journey with TrackMyStartup. Monitor compliance, track investments, manage your startup ecosystem. Connect startups, investors, mentors, and advisors in one unified platform."
        canonicalUrl={canonicalUrl}
        ogImage={`${siteUrl}/Track.png`}
        ogType="website"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'TrackMyStartup',
          description: 'Comprehensive startup tracking platform for investors, founders, and professionals',
          url: siteUrl,
          logo: `${siteUrl}/Track.png`,
          sameAs: [
            'https://www.linkedin.com/company/trackmystartup',
            'https://chat.whatsapp.com/CB32H4laIQ31DuuaF5kRWC'
          ],
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'Customer Service',
            url: `${siteUrl}/contact`
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

              {/* Navigation Tabs */}
              <nav className="hidden lg:flex items-center gap-6">
                {/* Our Services Dropdown */}
                <div 
                  ref={dropdownRef}
                  className="relative"
                  onMouseEnter={() => setServicesDropdownOpen(true)}
                  onMouseLeave={(e) => {
                    // Only close if mouse is truly leaving the dropdown area
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
                  
                  {/* Dropdown Menu - Bridge the gap with padding-top to prevent mouse leave */}
                  {servicesDropdownOpen && (
                    <div 
                      className="absolute top-full left-0 pt-2 w-56 z-[100]"
                      onMouseEnter={() => setServicesDropdownOpen(true)}
                    >
                      <div 
                        className="bg-white rounded-lg shadow-xl border border-slate-200 py-2 pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a 
                          href="/services/startups" 
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-brand-primary transition-colors"
                          onClick={() => setServicesDropdownOpen(false)}
                        >
                          For Startups
                        </a>
                        <a 
                          href="/services/incubation-centers" 
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-brand-primary transition-colors"
                          onClick={() => setServicesDropdownOpen(false)}
                        >
                          For Incubation Centers
                        </a>
                        <a 
                          href="/services/investors" 
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-brand-primary transition-colors"
                          onClick={() => setServicesDropdownOpen(false)}
                        >
                          For Investors
                        </a>
                        <a 
                          href="/services/investment-advisors" 
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-brand-primary transition-colors"
                          onClick={() => setServicesDropdownOpen(false)}
                        >
                          For Investor Advisors
                        </a>
                        <a 
                          href="/services/ca" 
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-brand-primary transition-colors"
                          onClick={() => setServicesDropdownOpen(false)}
                        >
                          For CA
                        </a>
                        <a 
                          href="/services/cs" 
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-brand-primary transition-colors"
                          onClick={() => setServicesDropdownOpen(false)}
                        >
                          For CS
                        </a>
                        <a 
                          href="/services/mentors" 
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-brand-primary transition-colors"
                          onClick={() => setServicesDropdownOpen(false)}
                        >
                          For Mentor
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Other Navigation Links */}
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
                <a 
                  href="/contact" 
                  className={`font-medium text-sm transition-colors duration-200 ${
                    currentPath === '/contact' 
                      ? 'text-brand-primary font-semibold' 
                      : 'text-slate-700 hover:text-blue-400'
                  }`}
                >
                  Contact Us
                </a>
              </nav>

              <div className="flex items-center gap-2 sm:gap-4">
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={onNavigateToRegister}
                  className="px-3 py-1.5"
                >
                  Get Started
                </Button>
                {/* WhatsApp Community Link */}
                <div className="relative group">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors duration-200 cursor-pointer">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  {/* Hover Button */}
                  <div className="absolute right-0 top-full mt-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 z-50">
                    <a
                      href="https://chat.whatsapp.com/CB32H4laIQ31DuuaF5kRWC"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-semibold transition-colors shadow-lg whitespace-nowrap"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Join WhatsApp Community for TrackMyStartup
                    </a>
                  </div>
                </div>
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
                    variant="primary" 
                    size="sm" 
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigateToRegister();
                    }}
                    className="w-full"
                  >
                    Get Started
                  </Button>
                  <a
                    href="https://chat.whatsapp.com/CB32H4laIQ31DuuaF5kRWC"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-green-500 hover:bg-green-600 text-white rounded-md font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Join WhatsApp Community
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section with Video Background */}
      <section className="relative w-full h-[550px] overflow-hidden">
        {/* Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute top-0 left-0 w-full h-full object-cover z-0"
        >
          <source src="/hero_video2.mp4" type="video/mp4" />
          {/* Add fallback sources if needed */}
          {/* <source src="/your-hero-video.webm" type="video/webm" /> */}
          Your browser does not support the video tag.
        </video>
        
        {/* Overlay for better text readability */}
        <div className="absolute top-0 left-0 w-full h-full bg-black/70 z-10"></div>
        
        {/* Text Content */}
        <div className="relative z-20 h-full flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto text-center">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 drop-shadow-lg">
                Track Your Startup's
                <span className="text-brand-primary block">Growth Journey</span>
              </h1>
              <p className="text-base sm:text-xl text-white mb-6 sm:mb-8 max-w-2xl mx-auto drop-shadow-md">
                Comprehensive startup tracking platform for investors, founders, and professionals. 
                Monitor compliance, track investments, and manage your startup ecosystem all in one place.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Button 
                  variant="outline" 
                  size="md" 
                  onClick={onNavigateToLogin}
                  className="w-full sm:w-auto bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Login
                </Button>
                <Button 
                  variant="primary" 
                  size="md" 
                  onClick={onNavigateToRegister}
                  className="group w-full sm:w-auto"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-slate-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-3 sm:mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              Everything You Need to Track
            </h2>
            <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              From compliance monitoring to investment tracking, we've got you covered
            </p>
          </div>
          
          {/* Unified 3x2 Grid Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 lg:gap-8">
            {[
              {
                icon: Sparkles,
                title: 'One Unified Startup Ecosystem',
                description:
                  'One platform connecting startups, investors, mentors, and advisors in a seamless network.',
              },
              {
                icon: KeyRound,
                title: 'Role-Based Smart Access',
                description:
                  'Single login with role-specific access and views tailored to your needs.',
              },
              {
                icon: GitBranch,
                title: 'Structured Fundraising & Deals',
                description:
                  'Track investments, offers, and co-investments clearly with organized deal flow management.',
              },
              {
                icon: ShieldCheck,
                title: 'Built-In Compliance & Governance',
                description:
                  'Stay compliant with tasks, documents, and approvals all managed in one place.',
              },
              {
                icon: Users2,
                title: 'Centralized Collaboration Hub',
                description:
                  'All requests, discussions, and mentoring in one place for seamless collaboration.',
              },
              {
                icon: Activity,
                title: 'Real-Time Visibility & Insights',
                description:
                  'Live dashboards showing progress and activity with comprehensive analytics.',
              },
            ].map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={index}
                  className="group relative flex flex-col rounded-2xl bg-slate-50/70 hover:bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 p-5 sm:p-6 lg:p-7"
                >
                  {/* Icon + Accent */}
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600 shadow-inner">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="h-8 w-px bg-gradient-to-b from-blue-200 to-transparent" />
                  </div>

                  {/* Heading */}
                  <h3
                    className="text-base sm:text-lg lg:text-xl font-semibold text-slate-900 mb-3"
                    style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', letterSpacing: '-0.01em' }}
                  >
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p
                    className="text-sm sm:text-base text-slate-600 leading-relaxed"
                    style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                  >
                    {feature.description}
                  </p>

                  {/* Subtle hover border accent */}
                  <div className="pointer-events-none absolute inset-0 rounded-2xl border border-transparent group-hover:border-blue-200/80 transition-colors duration-300" />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Ecosystem Section */}
      <section 
        ref={ecosystemSectionRef}
        className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-700 min-h-[600px] lg:min-h-[700px] flex items-center"
      >
        <div className="container mx-auto w-full">
          {/* Mobile Layout - Always Stacked */}
          <div className="lg:hidden">
            {/* Heading and Subheading */}
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                One Unified Ecosystem
              </h2>
              <p className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-xl mx-auto" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Connecting startups, investors, mentors, and advisors in a seamless network
              </p>
            </div>

            {/* Diagram */}
            <div className="mb-10">
              <div className="max-w-2xl mx-auto">
                {/* Central Card */}
                <div className="mb-8 flex justify-center">
                  <div className="w-32 h-32 rounded-full bg-white shadow-xl border-4 border-blue-200 flex flex-col items-center justify-center">
                    <div className="text-slate-900 text-center px-4">
                      <div className="font-bold text-base mb-1">Track My Startup</div>
                      <div className="text-xs opacity-70">Unified Ecosystem</div>
                    </div>
                  </div>
                </div>

                {/* Role Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { icon: Rocket, name: 'Startups' },
                    { icon: TrendingUp, name: 'Investors' },
                    { icon: Users, name: 'Mentors' },
                    { icon: Briefcase, name: 'Investment Advisors' },
                    { icon: FileText, name: 'CA' },
                    { icon: Shield, name: 'CS' },
                    { icon: Building, name: 'Facilitation Centers' },
                  ].map((role, index) => {
                    const IconComponent = role.icon;
                    const serviceRoute = getServiceRoute(role.name);
                    return (
                      <div
                        key={index}
                        className="group"
                      >
                        <div 
                          className="w-full aspect-square rounded-full bg-white border-2 border-blue-200 shadow-lg flex flex-col items-center justify-center hover:scale-105 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 cursor-pointer p-4"
                          onClick={() => {
                            window.location.href = serviceRoute;
                          }}
                        >
                          <IconComponent className="h-6 w-6 sm:h-8 sm:w-8 text-blue-700 mb-2 group-hover:text-blue-800 group-hover:scale-110 transition-all duration-300" />
                          <span className="text-xs font-semibold text-slate-800 text-center leading-tight">{role.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Content Panel */}
            <div className="text-center">
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                One Platform. Every Stakeholder. Fully Connected.
              </h3>
              <p className="text-base sm:text-lg text-slate-200 leading-relaxed mb-6 max-w-xl mx-auto" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Track My Startup brings together startups, investors, mentors, advisors, and compliance professionals into a single, structured ecosystem designed to simplify collaboration and accelerate growth.
              </p>
              <ul className="text-left max-w-xl mx-auto space-y-3 text-slate-200">
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 mt-1">•</span>
                  <span className="text-sm sm:text-base">Seamless collaboration between all ecosystem stakeholders</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 mt-1">•</span>
                  <span className="text-sm sm:text-base">Unified access with role-based permissions and views</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 mt-1">•</span>
                  <span className="text-sm sm:text-base">Structured deal flow and investment tracking</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 mt-1">•</span>
                  <span className="text-sm sm:text-base">Built-in compliance and governance management</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 mt-1">•</span>
                  <span className="text-sm sm:text-base">Centralized communication and mentoring hub</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 mt-1">•</span>
                  <span className="text-sm sm:text-base">Real-time visibility and comprehensive analytics</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Desktop Layout - Animated Split */}
          <div className="hidden lg:block relative w-full" style={{ minHeight: '600px' }}>
            {/* Initial Centered State */}
            <div 
              className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000 ease-in-out ${
                ecosystemAnimated 
                  ? 'opacity-0 translate-y-[-20px] pointer-events-none' 
                  : 'opacity-100 translate-y-0'
              }`}
            >
              {/* Heading and Subheading */}
              <div className="text-center mb-12">
                <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  One Unified Ecosystem
                </h2>
                <p className="text-lg lg:text-xl text-slate-200 leading-relaxed max-w-2xl mx-auto" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Connecting startups, investors, mentors, and advisors in a seamless network
                </p>
              </div>

              {/* Centered Diagram */}
              <div className="relative w-full max-w-2xl mx-auto" style={{ 
                width: 'min(90vw, 500px)', 
                maxWidth: '500px',
                aspectRatio: '1',
                position: 'relative'
              }}>
                {/* Orbit Ring */}
                <div className="absolute rounded-full border-2 border-blue-400/40 animate-pulse" style={{ 
                  width: '80%', 
                  height: '80%', 
                  top: '10%', 
                  left: '10%'
                }}></div>
                
                {/* Connector Lines Container */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                  {[...Array(7)].map((_, i) => {
                    const angle = (i * (360 / 7) - 90) * (Math.PI / 180);
                    const radius = 38; // percentage from center
                    const x1 = 50 + radius * Math.cos(angle);
                    const y1 = 50 + radius * Math.sin(angle);
                    return (
                      <line
                        key={i}
                        x1="50%"
                        y1="50%"
                        x2={`${x1}%`}
                        y2={`${y1}%`}
                        stroke="rgba(59, 130, 246, 0.2)"
                        strokeWidth="1"
                        strokeDasharray="4,4"
                      />
                    );
                  })}
                </svg>

                {/* Central Card */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                  <div className="w-32 h-32 rounded-full bg-white shadow-2xl border-4 border-blue-200 flex flex-col items-center justify-center group hover:scale-110 transition-all duration-300 hover:shadow-blue-500/40">
                    <div className="text-slate-900 text-center px-3">
                      <div className="font-bold text-base mb-1">Track My Startup</div>
                      <div className="text-xs opacity-70">Unified Startup Ecosystem</div>
                    </div>
                  </div>
                </div>

                  {/* Role Cards */}
                  {[
                    { icon: Rocket, name: 'Startups', angle: 0 },
                    { icon: TrendingUp, name: 'Investors', angle: 360 / 7 },
                    { icon: Users, name: 'Mentors', angle: (360 / 7) * 2 },
                    { icon: Briefcase, name: 'Investment Advisors', angle: (360 / 7) * 3 },
                    { icon: FileText, name: 'CA', angle: (360 / 7) * 4 },
                    { icon: Shield, name: 'CS', angle: (360 / 7) * 5 },
                    { icon: Building, name: 'Facilitation Centers', angle: (360 / 7) * 6 },
                  ].map((role, index) => {
                    const angleRad = (role.angle - 90) * (Math.PI / 180);
                    const radius = 38; // percentage from center
                    const x = 50 + radius * Math.cos(angleRad);
                    const y = 50 + radius * Math.sin(angleRad);
                    const IconComponent = role.icon;
                    const serviceRoute = getServiceRoute(role.name);

                    return (
                      <div
                        key={index}
                        className="absolute z-10 group"
                        style={{
                          top: `${y}%`,
                          left: `${x}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        <div 
                          className="w-28 h-28 rounded-full bg-white border-2 border-blue-200 shadow-lg flex flex-col items-center justify-center hover:scale-110 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 cursor-pointer"
                          onClick={() => {
                            window.location.href = serviceRoute;
                          }}
                        >
                          <IconComponent className="h-7 w-7 text-blue-700 mb-1.5 group-hover:text-blue-800 group-hover:scale-110 transition-all duration-300" />
                          <span className="text-xs font-semibold text-slate-800 text-center px-2 leading-tight">{role.name}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Split State - Diagram on Left */}
            <div 
              className={`absolute inset-0 flex flex-row items-center gap-12 xl:gap-16 transition-all duration-1000 ease-in-out ${
                ecosystemAnimated 
                  ? 'opacity-100 translate-x-0' 
                  : 'opacity-0 translate-x-[20px] pointer-events-none'
              }`}
            >
              {/* Left Column: Ecosystem Diagram */}
              <div className="flex-shrink-0 w-full lg:w-1/2 flex justify-center">
                <div className="relative mx-auto" style={{ 
                  width: 'min(90vw, 550px)', 
                  maxWidth: '550px',
                  aspectRatio: '1',
                  position: 'relative'
                }}>
                  <div className="absolute inset-0 w-full h-full">
                    {/* Orbit Ring */}
                    <div className="absolute rounded-full border-2 border-blue-400/40 animate-pulse" style={{ 
                      width: '80%', 
                      height: '80%', 
                      top: '10%', 
                      left: '10%',
                      aspectRatio: '1'
                    }}></div>
                  
                  {/* Connector Lines Container */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                    {[...Array(7)].map((_, i) => {
                      const angle = (i * (360 / 7) - 90) * (Math.PI / 180);
                      const radius = 38; // percentage from center
                      const x1 = 50 + radius * Math.cos(angle);
                      const y1 = 50 + radius * Math.sin(angle);
                      return (
                        <line
                          key={i}
                          x1="50%"
                          y1="50%"
                          x2={`${x1}%`}
                          y2={`${y1}%`}
                          stroke="rgba(59, 130, 246, 0.2)"
                          strokeWidth="1"
                          strokeDasharray="4,4"
                        />
                      );
                    })}
                  </svg>

                  {/* Central Card */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full bg-white shadow-2xl border-4 border-blue-200 flex flex-col items-center justify-center group hover:scale-110 transition-all duration-300 hover:shadow-blue-500/40" style={{ aspectRatio: '1' }}>
                      <div className="text-slate-900 text-center px-3">
                        <div className="font-bold text-base mb-1">Track My Startup</div>
                        <div className="text-xs opacity-70">Unified Startup Ecosystem</div>
                      </div>
                    </div>
                  </div>

                  {/* Role Cards */}
                  {[
                    { icon: Rocket, name: 'Startups', angle: 0 },
                    { icon: TrendingUp, name: 'Investors', angle: 360 / 7 },
                    { icon: Users, name: 'Mentors', angle: (360 / 7) * 2 },
                    { icon: Briefcase, name: 'Investment Advisors', angle: (360 / 7) * 3 },
                    { icon: FileText, name: 'CA', angle: (360 / 7) * 4 },
                    { icon: Shield, name: 'CS', angle: (360 / 7) * 5 },
                    { icon: Building, name: 'Facilitation Centers', angle: (360 / 7) * 6 },
                  ].map((role, index) => {
                    const angleRad = (role.angle - 90) * (Math.PI / 180);
                    const radius = 38; // percentage from center
                    const x = 50 + radius * Math.cos(angleRad);
                    const y = 50 + radius * Math.sin(angleRad);
                    const IconComponent = role.icon;
                    const serviceRoute = getServiceRoute(role.name);

                    return (
                      <div
                        key={index}
                        className="absolute z-10 group"
                        style={{
                          top: `${y}%`,
                          left: `${x}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        <div 
                          className="w-16 h-16 sm:w-20 sm:h-20 lg:w-28 lg:h-28 rounded-full bg-white border-2 border-blue-200 shadow-lg flex flex-col items-center justify-center hover:scale-110 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 cursor-pointer"
                          style={{ aspectRatio: '1' }}
                          onClick={() => {
                            window.location.href = serviceRoute;
                          }}
                        >
                          <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 lg:h-7 lg:w-7 text-blue-700 mb-0.5 sm:mb-1 lg:mb-1.5 group-hover:text-blue-800 group-hover:scale-110 transition-all duration-300" />
                          <span className="text-[9px] sm:text-[10px] lg:text-xs font-semibold text-slate-800 text-center px-1 sm:px-2 leading-tight">{role.name}</span>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              </div>

              {/* Right Column: Content Panel */}
              <div 
                className={`flex-1 w-full lg:w-1/2 flex flex-col justify-center transition-all duration-1000 ease-in-out ${
                  ecosystemAnimated 
                    ? 'opacity-100 translate-x-0' 
                    : 'opacity-0 translate-x-[40px]'
                }`}
              >
                <h3 className="text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6 leading-tight" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  One Platform. Every Stakeholder. Fully Connected.
                </h3>
                <p className="text-base sm:text-lg lg:text-xl text-slate-200 leading-relaxed mb-6 max-w-xl" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Track My Startup brings together startups, investors, mentors, advisors, and compliance professionals into a single, structured ecosystem designed to simplify collaboration and accelerate growth.
                </p>
                <ul className="space-y-3 text-slate-200">
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 mt-1">•</span>
                    <span className="text-sm sm:text-base">Seamless collaboration between all ecosystem stakeholders</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 mt-1">•</span>
                    <span className="text-sm sm:text-base">Unified access with role-based permissions and views</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 mt-1">•</span>
                    <span className="text-sm sm:text-base">Structured deal flow and investment tracking</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 mt-1">•</span>
                    <span className="text-sm sm:text-base">Built-in compliance and governance management</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 mt-1">•</span>
                    <span className="text-sm sm:text-base">Centralized communication and mentoring hub</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 mt-1">•</span>
                    <span className="text-sm sm:text-base">Real-time visibility and comprehensive analytics</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Partners Section */}
      <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-blue-50/30">
        <div className="container mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-3 sm:mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              Our Partners
            </h2>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              Trusted by ecosystem partners supporting startup growth
            </p>
          </div>

          {/* Partners Grid - Minimal Logo Display */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-8 sm:gap-10 lg:gap-12 max-w-7xl mx-auto items-center justify-items-center">
            {[
              { name: 'Partner 1', logo: Partner1 },
              { name: 'Partner 2', logo: Partner2 },
              { name: 'Partner 3', logo: Partner3 },
              { name: 'Partner 4', logo: Partner4 },
              { name: 'Partner 5', logo: Partner5 },
              { name: 'Partner 6', logo: Partner6 },
            ].map((partner, index) => (
              <div
                key={index}
                className="flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32"
              >
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="w-full h-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-slate-100">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-3 sm:mb-4">
              Ready to Transform Your Startup Tracking?
            </h2>
            <p className="text-base sm:text-xl text-slate-600 mb-6 sm:mb-8">
              Join thousands of investors and founders who trust TrackMyStartup to manage their startup ecosystem.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button 
                variant="primary" 
                size="md" 
                onClick={onNavigateToRegister}
                className="group w-full sm:w-auto"
              >
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline" 
                size="md" 
                onClick={onNavigateToLogin}
                className="w-full sm:w-auto"
              >
                Already have an account? Sign In
              </Button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;



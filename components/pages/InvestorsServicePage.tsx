import React, { useState, useEffect, useRef } from 'react';
import ServicePageLayout from './ServicePageLayout';
import { TrendingUp, ChevronDown, BarChart3, Search, Settings, Handshake, PieChart, CheckCircle, Play, Eye, Users, Rocket, Shield, ShieldCheck, FileCheck, Menu, X } from 'lucide-react';
import Button from '../ui/Button';
import LogoTMS from '../public/logoTMS.svg';
import InvestorIllustration from '../public/Investor1.svg';
import Footer from '../Footer';

const InvestorsServicePage: React.FC = () => {
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
  
  // YouTube video URL for the investor walkthrough section
  const investorWalkthroughVideoUrl: string | null = null; // Set to video URL when available

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
                  href="#" 
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

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto mb-16">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            <div className="flex-1 text-center lg:text-left">
              <h5 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-700 mb-3 leading-tight" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Smarter Startup Investing with Complete Visibility
              </h5>
              <p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Track My Startup helps investors discover startups, track investments, monitor portfolio performance, and collaborate with founders in a structured environment.
              </p>
              <div className="flex justify-center lg:justify-start">
                <a href="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-md font-semibold hover:opacity-90 transition-opacity shadow-lg hover:shadow-xl group" style={{ backgroundColor: '#5965b9', color: '#ffffff' }}>
                  Get Started
                </a>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <img src={InvestorIllustration} alt="Investor Illustration" className="w-full h-auto max-w-lg lg:max-w-full" style={{ maxHeight: '500px', objectFit: 'contain' }} />
            </div>
          </div>
        </div>

        {/* Everything an Investor Needs Section */}
      </div>

      <div className="w-screen relative py-20 sm:py-24" style={{ left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw', backgroundColor: '#1E293B' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Everything an Investor Needs
              </h2>
              <p className="text-lg text-white max-w-2xl mx-auto" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                All investment activities managed from one unified platform.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 lg:gap-12">
              {/* Item 1: Investor Dashboard Overview */}
              <div className="flex flex-col items-center text-center group">
                <div className="mb-6 transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center border border-blue-100/50" style={{ backgroundColor: '#D1E7EA' }}>
                    <BarChart3 className="w-10 h-10 text-brand-primary transition-colors duration-300 group-hover:text-brand-secondary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Investor Dashboard Overview
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-sm" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Get a real-time snapshot of total funding, portfolio value, compliance rate, and active startups.
                </p>
              </div>

              {/* Item 2: Discover Fundraising Startups */}
              <div className="flex flex-col items-center text-center group">
                <div className="mb-6 transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center border border-blue-100/50" style={{ backgroundColor: '#D1E7EA' }}>
                    <Search className="w-10 h-10 text-brand-primary transition-colors duration-300 group-hover:text-brand-secondary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Discover Fundraising Startups
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-sm" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Explore startups actively raising funds, review pitch details, and evaluate opportunities aligned with your interests.
                </p>
              </div>

              {/* Item 3: Mandates & Investment Preferences */}
              <div className="flex flex-col items-center text-center group">
                <div className="mb-6 transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center border border-blue-100/50" style={{ backgroundColor: '#D1E7EA' }}>
                    <Settings className="w-10 h-10 text-brand-primary transition-colors duration-300 group-hover:text-brand-secondary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Mandates & Investment Preferences
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-sm" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Define investment mandates by stage, sector, geography, ticket size, and equity expectations.
                </p>
              </div>

              {/* Item 4: Offers & Co-Investments */}
              <div className="flex flex-col items-center text-center group">
                <div className="mb-6 transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center border border-blue-100/50" style={{ backgroundColor: '#D1E7EA' }}>
                    <Handshake className="w-10 h-10 text-brand-primary transition-colors duration-300 group-hover:text-brand-secondary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Offers & Co-Investments
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-sm" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Make investment offers, participate in co-investments, and track deal progress transparently.
                </p>
              </div>

              {/* Item 5: Portfolio Tracking */}
              <div className="flex flex-col items-center text-center group">
                <div className="mb-6 transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center border border-blue-100/50" style={{ backgroundColor: '#D1E7EA' }}>
                    <PieChart className="w-10 h-10 text-brand-primary transition-colors duration-300 group-hover:text-brand-secondary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Portfolio Tracking
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-sm" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Monitor invested startups, equity distribution, performance insights, and sector-wise exposure.
                </p>
              </div>

              {/* Item 6: Requests & Approvals */}
              <div className="flex flex-col items-center text-center group">
                <div className="mb-6 transition-transform duration-300 ease-out group-hover:-translate-y-1.5">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center border border-blue-100/50" style={{ backgroundColor: '#D1E7EA' }}>
                    <CheckCircle className="w-10 h-10 text-brand-primary transition-colors duration-300 group-hover:text-brand-secondary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Requests & Approvals
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-sm" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Review and approve startup investment requests directly from your dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* See How Investors Use Track My Startup Section */}
      <div className="w-screen relative py-20 sm:py-24" style={{ left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw', backgroundColor: '#F8FAFC' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
              {/* Left Column: Text Content */}
              <div className="flex-1 text-center lg:text-left">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', color: '#1E293B' }}>
                  See How Investors Use Track My Startup
                </h2>
                <p className="text-lg text-slate-600 mb-4 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  A walkthrough of how investors discover startups, manage mandates, track portfolios, and collaborate — all from one dashboard.
                </p>
              </div>

              {/* Right Column: Video Container */}
              <div className="flex-1 w-full lg:max-w-2xl">
                {investorWalkthroughVideoUrl ? (
                  <div className="w-full rounded-lg border border-slate-200 overflow-hidden bg-white cursor-pointer transition-transform duration-300 hover:scale-[1.02] hover:border-brand-primary/30">
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                      <div className="absolute top-0 left-0 w-full h-full">
                        <iframe
                          className="w-full h-full"
                          src={investorWalkthroughVideoUrl}
                          title="Track My Startup Investor Dashboard Walkthrough"
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
                          Investor dashboard walkthrough coming soon
                        </h3>
                        <p className="text-sm text-slate-500 max-w-sm" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                          We're preparing a guided demo to showcase the investor experience.
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

      {/* A Clear Investment Journey Timeline Section */}
      <div ref={timelineRef} className="w-screen relative py-24 sm:py-32" style={{ left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw', backgroundColor: '#E2E8F0' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-medium text-slate-800 mb-16 sm:mb-20 text-center" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              A Clear Investment Journey, From Discovery to Portfolio Growth
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
                      <h3 className="text-xl font-medium text-slate-800 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Stage 01 – Discover & Evaluate
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Browse startups, review pitches, check compliance, and shortlist opportunities.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stage 02: Invest & Collaborate - Visual Anchor */}
                <div 
                  className="relative group"
                  onMouseEnter={() => setHoveredStage('invest')}
                  onMouseLeave={() => setHoveredStage(null)}
                >
                  <div className="flex flex-col items-center md:items-start">
                    {/* Icon Node - Same Size but Stronger Accent */}
                    <div 
                      className={`relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 flex items-center justify-center transition-all duration-300 md:-mt-2 ${
                        hoveredStage === 'invest' ? 'scale-110 shadow-xl shadow-brand-primary/30 border-brand-primary' : 'shadow-md shadow-brand-primary/20'
                      }`}
                      style={{
                        transform: timelineAnimated ? 'translateY(0)' : 'translateY(20px)',
                        opacity: timelineAnimated ? 1 : 0,
                        transitionDelay: timelineAnimated ? '500ms' : '0ms'
                      }}
                    >
                      <Handshake className="w-9 h-9 text-brand-primary" strokeWidth={1.5} />
                    </div>

                    {/* Connection Line */}
                    <div className="hidden md:block absolute top-32 left-1/2 w-px h-10 bg-gradient-to-b from-brand-primary/60 to-transparent transform -translate-x-1/2"></div>

                    {/* Content Block */}
                    <div 
                      className={`mt-6 md:mt-10 text-center md:text-left transition-all duration-500 ${
                        hoveredStage === 'invest' ? 'scale-105' : ''
                      }`}
                      style={{
                        transform: timelineAnimated ? 'translateY(0)' : 'translateY(20px)',
                        opacity: timelineAnimated ? 1 : 0,
                        transitionDelay: timelineAnimated ? '700ms' : '0ms'
                      }}
                    >
                      <h3 className="text-xl font-medium text-slate-800 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Stage 02 – Invest & Collaborate
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Make offers, join co-investments, and collaborate with advisors, mentors, and founders.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stage 03: Track & Grow */}
                <div 
                  className="relative group"
                  onMouseEnter={() => setHoveredStage('track')}
                  onMouseLeave={() => setHoveredStage(null)}
                >
                  <div className="flex flex-col items-center md:items-start">
                    {/* Icon Node - Standardized Size */}
                    <div 
                      className={`relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 flex items-center justify-center transition-all duration-300 ${
                        hoveredStage === 'track' ? 'scale-110 shadow-lg shadow-brand-primary/20 border-brand-primary' : ''
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
                        hoveredStage === 'track' ? 'scale-105' : ''
                      }`}
                      style={{
                        transform: timelineAnimated ? 'translateY(0)' : 'translateY(20px)',
                        opacity: timelineAnimated ? 1 : 0,
                        transitionDelay: timelineAnimated ? '800ms' : '0ms'
                      }}
                    >
                      <h3 className="text-xl font-medium text-slate-800 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Stage 03 – Track & Grow
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Monitor portfolio, track compliance health, and support long-term value creation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transparent & Secure Collaboration Section */}
      <div className="w-screen relative py-20 sm:py-24" style={{ left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw', backgroundColor: '#F8FAFC' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Transparent & Secure Collaboration
              </h2>
              <p className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Track My Startup ensures secure, permission-based access to startup data, compliance records, and investment documents — keeping investors informed and protected at every step.
              </p>
            </div>

            {/* Icon Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {/* Card 1: Permission-Based Access */}
              <div className="flex flex-col items-center text-center p-6 rounded-lg border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300">
                <div className="mb-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1E7EA' }}>
                    <Shield className="w-6 h-6 text-brand-primary" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Permission-Based Access
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Control who can view financials, compliance data, and documents
                </p>
              </div>

              {/* Card 2: Data Security & Privacy */}
              <div className="flex flex-col items-center text-center p-6 rounded-lg border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300">
                <div className="mb-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1E7EA' }}>
                    <ShieldCheck className="w-6 h-6 text-brand-primary" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Data Security & Privacy
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Sensitive startup and investment information stays protected
                </p>
              </div>

              {/* Card 3: Audit-Ready Transparency */}
              <div className="flex flex-col items-center text-center p-6 rounded-lg border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300">
                <div className="mb-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1E7EA' }}>
                    <FileCheck className="w-6 h-6 text-brand-primary" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Audit-Ready Transparency
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Every action and document is traceable and reviewable
                </p>
              </div>

              {/* Card 4: Trusted Collaboration */}
              <div className="flex flex-col items-center text-center p-6 rounded-lg border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300">
                <div className="mb-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1E7EA' }}>
                    <Users className="w-6 h-6 text-brand-primary" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Trusted Collaboration
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Investors, advisors, and founders work with shared clarity
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default InvestorsServicePage;

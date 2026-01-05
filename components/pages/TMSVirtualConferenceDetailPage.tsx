import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Calendar, Users, Video, FileText, Image as ImageIcon, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import LogoTMS from '../public/logoTMS.svg';
import Partner1 from '../public/Partner1.svg';
import Partner2 from '../public/Partner2.svg';
import Partner3 from '../public/Partner3.svg';
import Partner4 from '../public/Partner4.svg';
import TMSC1 from '../public/TMSC1.svg';
import TMSC2 from '../public/TMSC2.svg';
import TMSC3 from '../public/TMSC3.svg';
// Conference carousel images - update extensions if needed (.svg, .png, .jpg, etc.)
import c1 from '../public/c1.svg';
import c2 from '../public/c2.svg';
import c3 from '../public/c3.svg';
import c4 from '../public/c4.svg';
import c5 from '../public/c5.svg';
import c6 from '../public/c6.svg';
import Footer from '../Footer';
import SEOHead from '../SEOHead';

const TMSVirtualConferenceDetailPage: React.FC = () => {
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [exploreDropdownOpen, setExploreDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileExploreOpen, setMobileExploreOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const exploreDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Scroll animation states
  const [activeDay, setActiveDay] = useState(0);
  const overviewRef = useRef<HTMLDivElement>(null);
  const day1Ref = useRef<HTMLDivElement>(null);
  const day2Ref = useRef<HTMLDivElement>(null);
  const day3Ref = useRef<HTMLDivElement>(null);
  const daysContainerRef = useRef<HTMLDivElement>(null);

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
    };

    if (servicesDropdownOpen || exploreDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [servicesDropdownOpen, exploreDropdownOpen]);

  // Conference highlights images
  const conferenceImages = [
    c1,
    c2,
    c3,
    c4,
    c5,
    c6
  ];

  // Auto-scroll functionality
  useEffect(() => {
    const startAutoScroll = () => {
      autoScrollIntervalRef.current = setInterval(() => {
        setCurrentImageIndex((prevIndex) => (prevIndex + 1) % conferenceImages.length);
      }, 4000); // Change image every 4 seconds
    };

    startAutoScroll();

    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, [conferenceImages.length]);

  // Pause auto-scroll on hover
  const handleMouseEnter = () => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
    }
  };

  const handleMouseLeave = () => {
    autoScrollIntervalRef.current = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % conferenceImages.length);
    }, 4000);
  };

  const goToPrevious = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex === 0 ? conferenceImages.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentImageIndex((prevIndex) => 
      (prevIndex + 1) % conferenceImages.length
    );
  };

  const goToImage = (index: number) => {
    setCurrentImageIndex(index);
  };

  // Intersection Observer for scroll animations and progress indicator
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          // Also animate child elements
          const children = entry.target.querySelectorAll('.opacity-0');
          children.forEach((child, index) => {
            setTimeout(() => {
              child.classList.add('animate-in');
            }, index * 100);
          });
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all animatable elements
    const elements = [
      overviewRef.current,
      day1Ref.current,
      day2Ref.current,
      day3Ref.current
    ].filter(Boolean);

    elements.forEach((el) => {
      if (el) {
        // Check if already in viewport
        const rect = el.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        if (isVisible) {
          el.classList.add('animate-in');
          const children = el.querySelectorAll('.opacity-0');
          children.forEach((child, index) => {
            setTimeout(() => {
              child.classList.add('animate-in');
            }, index * 100);
          });
        }
        observer.observe(el);
      }
    });

    return () => {
      elements.forEach((el) => {
        if (el) observer.unobserve(el);
      });
    };
  }, []);

  // Progress indicator scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (!day1Ref.current || !day2Ref.current || !day3Ref.current) return;

      const scrollPosition = window.scrollY + window.innerHeight / 2;
      const day1Top = day1Ref.current.offsetTop;
      const day2Top = day2Ref.current.offsetTop;
      const day3Top = day3Ref.current.offsetTop;

      if (scrollPosition < day2Top) {
        setActiveDay(0);
      } else if (scrollPosition < day3Top) {
        setActiveDay(1);
      } else {
        setActiveDay(2);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sample data - can be moved to a service/database later
  const speakers = [
    { name: 'Speaker Name 1', designation: 'Founder & CEO', affiliation: 'Tech Startup Inc.' },
    { name: 'Speaker Name 2', designation: 'Investment Partner', affiliation: 'VC Fund' },
    { name: 'Speaker Name 3', designation: 'Mentor', affiliation: 'Ecosystem Organization' },
  ];

  const sessions = [
    'Fundraising Strategies for Early-Stage Startups',
    'Building a Strong Mentor Network',
    'Compliance and Legal Essentials',
    'Scaling Your Startup: Growth Strategies',
    'Investor Relations and Pitch Best Practices'
  ];

  const siteUrl = 'https://trackmystartup.com';
  const canonicalUrl = `${siteUrl}/events/tms-virtual-conference`;

  return (
    <>
      <SEOHead
        title="TMS Virtual Conference Details - TrackMyStartup | Event Information"
        description="Detailed information about the TrackMyStartup Virtual Conference. Learn about speakers, sessions, networking opportunities, and how to participate."
        canonicalUrl={canonicalUrl}
        ogImage={`${siteUrl}/Track.png`}
        ogType="website"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: 'TMS Virtual Conference',
          description: 'Virtual conference connecting startups, investors, mentors, and advisors',
          url: canonicalUrl,
          organizer: {
            '@type': 'Organization',
            name: 'TrackMyStartup',
            url: siteUrl
          },
          eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
          eventStatus: 'https://schema.org/EventScheduled'
        }}
      />
      <style>{`
        @keyframes fadeUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-in {
          opacity: 1 !important;
          transform: translateX(0) translateY(0) scale(1) !important;
        }
        /* Ensure content is visible after animation */
        .opacity-0.animate-in {
          opacity: 1 !important;
        }
      `}</style>
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

      {/* Page Header (Documentation Hero) */}
      <section className="bg-white py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', color: '#1e3a8a' }}>
              TMS Virtual Conference 2025
            </h1>
            <p className="text-xl sm:text-2xl text-slate-600 mb-6" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              A flagship virtual conference by Track My Startup
            </p>
          </div>
        </div>
      </section>

      {/* Conference Highlights Carousel */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="container mx-auto max-w-7xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-8 text-center" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
            Conference Highlights
          </h2>
          
          <div 
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Carousel Container */}
            <div 
              ref={carouselRef}
              className="relative overflow-hidden rounded-2xl shadow-xl"
            >
              {/* Images Container */}
              <div 
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
              >
                {conferenceImages.map((image, index) => (
                  <div
                    key={index}
                    className="min-w-full flex-shrink-0"
                  >
                    <img
                      src={image}
                      alt={`Conference highlight ${index + 1}`}
                      className="w-full h-[400px] sm:h-[500px] lg:h-[600px] object-cover"
                    />
                  </div>
                ))}
              </div>

              {/* Navigation Arrows */}
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 z-10"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6 text-slate-700" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 z-10"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6 text-slate-700" />
              </button>
            </div>

            {/* Dots Indicator */}
            <div className="flex justify-center gap-2 mt-6">
              {conferenceImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToImage(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    index === currentImageIndex
                      ? 'bg-blue-600 w-8'
                      : 'bg-slate-300 hover:bg-slate-400'
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 sm:gap-12">
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', color: '#1e3a8a' }}>
                1265+
              </div>
              <div className="text-base sm:text-lg text-slate-700 font-medium" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Registrations
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', color: '#1e3a8a' }}>
                15+
              </div>
              <div className="text-base sm:text-lg text-slate-700 font-medium" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Speakers
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', color: '#1e3a8a' }}>
                3 Days
              </div>
              <div className="text-base sm:text-lg text-slate-700 font-medium" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Conference
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', color: '#1e3a8a' }}>
                Multiple
              </div>
              <div className="text-base sm:text-lg text-slate-700 font-medium" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Startup Pitch Sessions
              </div>
            </div>
            <div className="text-center col-span-2 md:col-span-1">
              <div className="text-3xl sm:text-4xl font-bold mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', color: '#1e3a8a' }}>
                National & Global
              </div>
              <div className="text-base sm:text-lg text-slate-700 font-medium" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                Participation
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Overview Section */}
      <section 
        ref={overviewRef}
        className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8"
        style={{ backgroundColor: '#1e3a8a' }}
      >
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 text-center" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
            Overview
          </h2>
          <div className="text-center space-y-4 text-slate-200 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
            <p className="text-lg">
              The TMS Virtual Conference 2025 brought together the entire startup ecosystem in a comprehensive virtual gathering.
            </p>
            <p className="text-lg">
              This flagship event connected founders, mentors, investors, and ecosystem partners to foster knowledge sharing, strategic insights, and meaningful connections.
            </p>
            <p className="text-lg">
              Over three days, participants engaged in deep discussions, learned from industry leaders, and built lasting relationships within the Track My Startup community.
            </p>
          </div>
        </div>
      </section>

      {/* Day-wise Conference Flow */}
      <section 
        ref={daysContainerRef}
        className="relative py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-slate-50"
      >
        {/* Progress Indicator */}
        <div className="hidden lg:block absolute left-8 top-0 bottom-0 z-10">
          <div className="sticky top-1/2 -translate-y-1/2">
          <div className="flex flex-col items-center gap-2">
            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
              activeDay >= 0 ? 'bg-blue-600 scale-125' : 'bg-slate-300'
            }`}></div>
            <div className={`w-0.5 h-16 transition-all duration-300 ${
              activeDay >= 1 ? 'bg-blue-600' : 'bg-slate-300'
            }`}></div>
            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
              activeDay >= 1 ? 'bg-blue-600 scale-125' : 'bg-slate-300'
            }`}></div>
            <div className={`w-0.5 h-16 transition-all duration-300 ${
              activeDay >= 2 ? 'bg-blue-600' : 'bg-slate-300'
            }`}></div>
            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
              activeDay >= 2 ? 'bg-blue-600 scale-125' : 'bg-slate-300'
            }`}></div>
          </div>
          </div>
        </div>

        <div className="container mx-auto max-w-7xl">
          {/* Day 1 */}
          <div 
            ref={day1Ref}
            className="mb-24 sm:mb-32"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="space-y-4">
                <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Day 1 · 20 November 2025
                </div>
                <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Incubation Sustainability & CSR Engagement
                </h3>
                <div className="space-y-3 text-base sm:text-lg text-slate-700 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  <p>
                    Day 1 focused on strengthening incubation centers through financially sustainable models and meaningful CSR collaborations.
                  </p>
                  <p>
                    Discussions highlighted self-reliance strategies, CSR expectations, compliance requirements, and effective incubator–corporate partnerships.
                  </p>
                  <p>
                    The day concluded with startup pitching sessions, enabling founders to present their ideas and receive early feedback.
                  </p>
                </div>
              </div>
              <div>
                <div className="w-full rounded-2xl shadow-lg overflow-hidden flex items-center justify-center bg-slate-50 p-4">
                  <img 
                    src={TMSC1} 
                    alt="Day 1 - Incubation Sustainability & CSR Engagement"
                    className="w-full h-auto max-h-[500px] object-contain"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Day 2 */}
          <div 
            ref={day2Ref}
            className="mb-24 sm:mb-32"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="lg:order-2">
                <div className="w-full rounded-2xl shadow-lg overflow-hidden flex items-center justify-center bg-slate-50 p-4">
                  <img 
                    src={TMSC2} 
                    alt="Day 2 - Angel Investing & Capital Raising Strategies"
                    className="w-full h-auto max-h-[500px] object-contain"
                  />
                </div>
              </div>
              <div className="lg:order-1 space-y-4">
                <div className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Day 2 · 21 November 2025
                </div>
                <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Angel Investing & Capital Raising Strategies
                </h3>
                <div className="space-y-3 text-base sm:text-lg text-slate-700 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  <p>
                    Day 2 shifted focus to the investment ecosystem and early-stage funding dynamics.
                  </p>
                </div>
                <ul className="space-y-2.5 text-base sm:text-lg text-slate-700 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  <li className="flex items-start gap-3">
                    <span className="text-indigo-600 mt-1.5 font-bold">•</span>
                    <span>Building high-quality deal flow for angel investors</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-indigo-600 mt-1.5 font-bold">•</span>
                    <span>Practical approaches to due diligence and valuation</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-indigo-600 mt-1.5 font-bold">•</span>
                    <span>Positioning startups for effective capital raising in 2025</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-indigo-600 mt-1.5 font-bold">•</span>
                    <span>Creating co-investment and global participation opportunities</span>
                  </li>
                </ul>
                <p className="text-base sm:text-lg text-slate-700 leading-relaxed mt-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  The day ended with startup pitch sessions connecting founders directly with investors and ecosystem experts.
                </p>
              </div>
            </div>
          </div>

          {/* Day 3 */}
          <div 
            ref={day3Ref}
            className="mb-24 sm:mb-32"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="space-y-4">
                <div className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Day 3 · 22 November 2025
                </div>
                <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Investor Expectations & Ecosystem Support Beyond Funding
                </h3>
                <div className="space-y-3 text-base sm:text-lg text-slate-700 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  <p>
                    Day 3 addressed critical investor concerns around incubated startups, governance readiness, and long-term viability.
                  </p>
                  <p>
                    Sessions emphasized supporting founders beyond fundraising through market access, operational readiness, leadership development, and scaling support.
                  </p>
                  <p>
                    The conference concluded with extended startup pitching sessions and expert interactions.
                  </p>
                </div>
              </div>
              <div>
                <div className="w-full rounded-2xl shadow-lg overflow-hidden flex items-center justify-center bg-slate-50 p-4">
                  <img 
                    src={TMSC3} 
                    alt="Day 3 - Investor Expectations & Ecosystem Support Beyond Funding"
                    className="w-full h-auto max-h-[500px] object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Conference Recordings */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="container mx-auto max-w-7xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 text-center" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
            Conference Recordings
          </h2>
          <p className="text-lg text-slate-600 text-center mb-12 max-w-2xl mx-auto" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
            Watch recorded sessions from the TMS Virtual Conference 2025. Access keynotes, panel discussions, and startup pitch sessions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {/* YouTube videos */}
            {[
              { title: 'Day 1: Incubation Sustainability & CSR Engagement', videoId: 'IgHh5VKywmI' },
              { title: 'Day 2: Angel Investing & Capital Raising Strategies', videoId: 'jpEaJs3qPwM' },
              { title: 'Day 2(part 2): Keynote Session: Building Sustainable Startups', videoId: '0vt1nimjMGU' },
              { title: 'Day 3:Investor Expectations & Beyond Funding', videoId: 'qYW8Gh2JtMY' }
            ].map((recording, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 bg-white"
              >
                <div className="aspect-video bg-slate-900 relative overflow-hidden">
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${recording.videoId}`}
                    title={recording.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    {recording.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ecosystem & Hosting Partners */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="container mx-auto max-w-7xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-12 text-center" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
            Ecosystem & Hosting Partners
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 items-center justify-items-center">
            {[
              { name: 'Track My Startup', logo: LogoTMS },
              { name: 'RTIH Visakhapatnam', logo: Partner1 },
              { name: 'Antrapreneur – The Business Incubator', logo: Partner2 },
              { name: 'AIC-JKLU Foundation', logo: Partner3 }
            ].map((partner, index) => (
              <div
                key={index}
                className="w-full flex items-center justify-center hover:scale-105 transition-all duration-300 opacity-0 translate-y-4"
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  animation: 'fadeUp 0.6s ease-out forwards'
                }}
              >
                {partner.logo ? (
                  <img 
                    src={partner.logo} 
                    alt={partner.name}
                    className="h-20 sm:h-28 md:h-32 lg:h-36 w-auto object-contain"
                  />
                ) : (
                  <span className="text-xs sm:text-sm text-slate-500 text-center font-medium">{partner.name}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      

      
      {/* Footer */}
      <Footer />
      </div>
    </>
  );
};

export default TMSVirtualConferenceDetailPage;



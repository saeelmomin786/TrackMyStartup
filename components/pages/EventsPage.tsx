import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Calendar, ExternalLink, Menu, X } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import LogoTMS from '../public/logoTMS.svg';
import Footer from '../Footer';

const EventsPage: React.FC = () => {
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [exploreDropdownOpen, setExploreDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileExploreOpen, setMobileExploreOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const exploreDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [showAllPromoted, setShowAllPromoted] = useState(false);
  const [showAllGeneral, setShowAllGeneral] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'promoted' | 'general'>('promoted');

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

  // Promoted Events Data
  const promotedEvents = [
    {
      id: 'tms-virtual-conference',
      name: 'TMS Virtual Conference',
      description: 'A flagship virtual conference by Track My Startup bringing together founders, mentors, investors, and ecosystem leaders.',
      bannerImage: null, // Can add image URL later
      type: 'Promoted by Track My Startup',
      status: 'completed'
    },
    {
      id: 'unified-mentor-network',
      name: 'Unified Mentor Network',
      description: 'Join the Unified Mentor Network - a comprehensive platform connecting startups with experienced mentors. Launching January 2026.',
      bannerImage: null, // Can add image URL later
      type: 'Promoted by Track My Startup',
      status: 'upcoming',
      launchDate: 'January 2026'
    }
  ];

  // General Events Data (placeholder - can be expanded later)
  const generalEvents: Array<{
    id: string;
    name: string;
    description: string;
    date?: string;
    externalLink?: string;
  }> = [
    // Add general events here in the future
  ];

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

      {/* Intro Section */}
      <section className="py-8 sm:py-10 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              Events & Conferences
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-6" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              Explore Track My Startup hosted events and important ecosystem gatherings.
            </p>
            {/* Filter Buttons */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setActiveFilter('promoted')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === 'promoted'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                Promoted Events
              </button>
              <button
                onClick={() => setActiveFilter('general')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === 'general'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
                style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
              >
                General Events
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="container mx-auto max-w-7xl">
          {/* Part 1: Promoted Events Section */}
          {activeFilter === 'promoted' && (
            <div className="mb-16">
              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Promoted Events
                </h2>
                <p className="text-slate-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Events hosted or promoted by Track My Startup
                </p>
              </div>
              {promotedEvents.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(showAllPromoted ? promotedEvents : promotedEvents.slice(0, 6)).map((event) => (
                  <Card key={event.id} className="!p-0 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 border-2 border-blue-200">
                    {event.bannerImage ? (
                      <img 
                        src={event.bannerImage} 
                        alt={event.name}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <span className="text-white text-lg font-semibold">{event.name}</span>
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          {event.type}
                        </span>
                        {event.status === 'upcoming' && (
                          <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                            Upcoming
                          </span>
                        )}
                        {event.status === 'completed' && (
                          <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                            Completed
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        {event.name}
                      </h3>
                      <p className="text-sm text-slate-600 mb-2 line-clamp-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        {event.description}
                      </p>
                      {event.launchDate && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                          <Calendar className="h-3 w-3" />
                          <span style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                            Launching: {event.launchDate}
                          </span>
                        </div>
                      )}
                      <Button 
                        variant="primary" 
                        onClick={() => {
                          if (event.id === 'unified-mentor-network') {
                            window.location.href = '/unified-mentor-network';
                          } else {
                            window.location.href = `/events/${event.id}`;
                          }
                        }}
                        className="w-full"
                      >
                        {event.status === 'upcoming' ? 'Learn More' : 'View Event'}
                      </Button>
                    </div>
                  </Card>
                  ))}
                </div>
                {promotedEvents.length > 6 && (
                  <div className="text-center mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setShowAllPromoted(!showAllPromoted)}
                      className="px-8"
                    >
                      {showAllPromoted ? 'Show Less' : `Show More (${promotedEvents.length - 6} more)`}
                    </Button>
                  </div>
                )}
              </>
              ) : (
                <Card className="text-center py-12">
                  <p className="text-slate-500" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    No promoted events available at the moment.
                  </p>
                </Card>
              )}
            </div>
          )}

          {/* Part 2: General Events Section */}
          {activeFilter === 'general' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  General Events
                </h2>
                <p className="text-slate-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Ecosystem events, partner events, and announcements
                </p>
              </div>
              {generalEvents.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(showAllGeneral ? generalEvents : generalEvents.slice(0, 6)).map((event) => (
                  <Card key={event.id} className="hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        {event.name}
                      </h3>
                    </div>
                    {event.date && (
                      <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                        <Calendar className="h-4 w-4" />
                        <span style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>{event.date}</span>
                      </div>
                    )}
                    <p className="text-sm text-slate-600 mb-4 line-clamp-3" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                      {event.description}
                    </p>
                    {event.externalLink ? (
                      <a 
                        href={event.externalLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        View Details
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    )}
                  </Card>
                  ))}
                </div>
                {generalEvents.length > 6 && (
                  <div className="text-center mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setShowAllGeneral(!showAllGeneral)}
                      className="px-8"
                    >
                      {showAllGeneral ? 'Show Less' : `Show More (${generalEvents.length - 6} more)`}
                    </Button>
                  </div>
                )}
              </>
              ) : (
                <Card className="text-center py-12">
                  <p className="text-slate-500" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    No general events available at the moment. Check back soon for ecosystem events and announcements.
                  </p>
                </Card>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default EventsPage;


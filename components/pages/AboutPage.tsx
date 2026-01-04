import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Linkedin, CheckCircle, Users, Target, Lightbulb, Handshake, Menu, X } from 'lucide-react';
import Button from '../ui/Button';
import LogoTMS from '../public/logoTMS.svg';
import Footer from '../Footer';

const AboutPage: React.FC = () => {
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [exploreDropdownOpen, setExploreDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileExploreOpen, setMobileExploreOpen] = useState(false);
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

  // Core Values
  const coreValues = [
    {
      title: 'Transparency',
      description: 'Building trust through open communication and clear processes'
    },
    {
      title: 'Innovation',
      description: 'Leveraging research and technology to solve real-world challenges'
    },
    {
      title: 'Collaboration',
      description: 'Fostering partnerships across academia, industry, and startups'
    },
    {
      title: 'Empowerment',
      description: 'Enabling founders and stakeholders to make informed decisions'
    }
  ];

  // Journey Timeline
  const journeyMilestones = [
    {
      year: '2025',
      title: 'The Idea Spark',
      description: 'Track My Startup began with simple conversations around real challenges faced by startups and ecosystem stakeholders.'
    },
    {
      year: '2025',
      title: 'Planning & Direction',
      description: 'Within a month, the idea evolved into a clear roadmap with defined roles and a unified ecosystem vision.'
    },
    {
      year: '2025',
      title: 'Platform Development',
      description: 'In the next three months, the Track My Startup platform was designed and built with a focus on compliance and collaboration.'
    },
    {
      year: 'November 2025',
      title: 'TMS Virtual Conference',
      description: 'Hosted the TMS Virtual Conference, bringing together incubators, investors, and founders for learning and pitching.'
    },
    {
      year: 'November 2025',
      title: 'Platform Launch',
      description: 'Track My Startup officially launched, opening access to startups, incubators, investors, and advisors.'
    },
    {
      year: 'December 2025',
      title: 'India & Global Expansion',
      description: 'Expanded focus to both Indian and global markets, welcoming broader ecosystem participation.'
    },
    {
      year: 'Ongoing',
      title: 'The Journey Continues',
      description: 'This is just the beginning, with many milestones yet to be achieved.'
    }
  ];

  // What We Do
  const services = [
    {
      title: 'Compliance Monitoring',
      description: 'Automated tracking and alerts for regulatory compliance'
    },
    {
      title: 'Investment Tracking',
      description: 'Comprehensive tools for managing investments and fundraising'
    },
    {
      title: 'Startup Health Assessment',
      description: 'Data-driven insights into startup performance and growth metrics'
    },
    {
      title: 'Mentorship Programs',
      description: 'Connecting startups with experienced mentors and advisors'
    },
    {
      title: 'Research Collaboration',
      description: 'Facilitating partnerships between academic institutions and startups'
    },
    {
      title: 'Professional Training',
      description: 'Educational programs for founders and ecosystem partners'
    }
  ];

  // Team Members (placeholder structure - update with actual team data)
  const teamMembers = [
    {
      name: 'Dr. Saeel Ismail Momin',
      role: 'Founder & CEO',
      photo: null, // Add photo URL when available
      linkedin: null // Add LinkedIn URL when available
    }
    // Add more team members here
  ];

  // Partners (placeholder structure - update with actual partner logos)
  const partners = [
    // Add partner logo URLs here
    // Example: { name: 'Partner Name', logo: '/path/to/logo.png' }
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

      {/* Section 1: Hero / Brand Story */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              About Track My Startup
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              Track My Startup is a comprehensive platform designed to support early-stage startups and mentor first-time founders. We bridge the gap between academia and industry through startup facilitation, research collaboration, student entrepreneurship, and professional training programs.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Our Mission & Values */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#0f172a' }}>
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 text-center" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              Our Mission
            </h2>
            <p className="text-lg text-slate-200 leading-relaxed max-w-4xl mx-auto text-center" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              We are dedicated to empowering the startup ecosystem by providing robust tools for compliance monitoring, investment tracking, and startup health assessment. Track My Startup enables investors, incubators, startups, mentors, and ecosystem partners to collaborate transparently and operate efficiently within a unified platform.
            </p>
          </div>

          {/* Core Values Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {coreValues.map((value, index) => (
              <div key={index} className="text-center">
                <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  {value.title}
                </h3>
                <p className="text-sm text-slate-300" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Our Journey */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="container mx-auto max-w-7xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-12 text-center" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
            Our Journey
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Timeline - Left Side with Zigzag Pattern */}
            <div className="relative">
              {/* Centered Timeline line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-300 transform -translate-x-1/2 hidden lg:block"></div>
              
              <div className="space-y-8 sm:space-y-12">
                {journeyMilestones.map((milestone, index) => (
                  <div key={index} className="relative flex items-start lg:items-center">
                    {/* Timeline dot - centered */}
                    <div className="absolute left-4 lg:left-1/2 w-8 h-8 bg-blue-600 rounded-full border-4 border-white shadow-md transform lg:-translate-x-1/2 z-10"></div>
                    
                    {/* Content - alternating left and right */}
                    <div className={`ml-12 lg:ml-0 lg:w-1/2 ${index % 2 === 0 ? 'lg:pr-8 lg:text-right' : 'lg:ml-auto lg:pl-8 lg:text-left'}`}>
                      <div className={`${index % 2 === 0 ? 'lg:text-right' : ''}`}>
                        <div className="text-sm font-semibold text-blue-600 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                          {milestone.year}
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                          {milestone.title}
                        </h3>
                        <p className="text-slate-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                          {milestone.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Video - Right Side */}
            <div className="flex items-start justify-center lg:justify-start lg:pl-8">
              <div className="w-full max-w-md">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-auto rounded-lg"
                  style={{ objectFit: 'contain', maxHeight: '500px' }}
                >
                  <source src="/about-hero.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: What We Do */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-12 text-center" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
            What We Do
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {services.map((service, index) => (
              <div key={index} className="text-center sm:text-left">
                <h3 className="text-lg font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  {service.title}
                </h3>
                <p className="text-sm text-slate-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

     

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default AboutPage;

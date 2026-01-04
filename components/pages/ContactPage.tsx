import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Mail, Phone, MapPin, Send, Clock, Menu, X } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import LogoTMS from '../public/logoTMS.svg';
import Footer from '../Footer';

const ContactPage: React.FC = () => {
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [exploreDropdownOpen, setExploreDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileExploreOpen, setMobileExploreOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const exploreDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here
    alert('Thank you for your message! We will get back to you soon.');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  const emailContacts = [
    {
      title: 'General Support',
      email: 'support@trackmystartup.com',
      color: 'blue'
    },
    {
      title: 'Startup Support',
      email: 'startup@trackmystartup.com',
      color: 'indigo'
    },
    {
      title: 'Investor Relations',
      email: 'investor@trackmystartup.com',
      color: 'purple'
    },
    {
      title: 'Technical Support',
      email: 'sarvesh.gadkari@trackmystartup.com',
      color: 'green'
    },
    {
      title: 'Incubation Centers',
      email: 'incubation_center@trackmystartup.com',
      color: 'orange'
    },
    {
      title: 'Investment Advisors',
      email: 'investment_advisor@trackmystartup.com',
      color: 'pink'
    }
  ];

  const otherContacts = [
    {
      icon: Phone,
      title: 'Phone',
      value: '+91 91461 69956',
      link: 'tel:+919146169956',
      color: 'green'
    },
    {
      icon: MapPin,
      title: 'Address',
      value: 'E&P Community Farms, 1956/2 Wada Road, Rajgurunagar 410505, India',
      link: null,
      color: 'orange'
    }
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

      {/* Hero Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
            Contact Us
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
            We'd love to hear from you. Get in touch with our team or send us a message and we'll respond as soon as possible.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Methods - Left Side */}
            <div className="lg:col-span-1 space-y-6">
              {/* Email Support - All Emails in One Section */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Email Support
                  </h2>
                </div>
                <div className="space-y-3">
                  {emailContacts.map((contact, index) => {
                    const colorClasses = {
                      blue: 'bg-blue-50 border-blue-200',
                      indigo: 'bg-indigo-50 border-indigo-200',
                      purple: 'bg-purple-50 border-purple-200',
                      green: 'bg-green-50 border-green-200',
                      orange: 'bg-orange-50 border-orange-200',
                      pink: 'bg-pink-50 border-pink-200'
                    };
                    
                    return (
                      <div key={index} className={`p-3 rounded-lg border ${colorClasses[contact.color as keyof typeof colorClasses]}`}>
                        <p className="text-sm font-medium text-slate-900 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                          {contact.title}
                        </p>
                        <a 
                          href={`mailto:${contact.email}`}
                          className="text-sm text-blue-600 hover:text-blue-700 transition-colors break-words"
                          style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                        >
                          {contact.email}
                        </a>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Other Contact Methods */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-6" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  Other Contacts
                </h2>
                <div className="space-y-4">
                  {otherContacts.map((method, index) => {
                    const IconComponent = method.icon;
                    const colorClasses = {
                      green: 'bg-green-100 text-green-600',
                      orange: 'bg-orange-100 text-orange-600'
                    };
                    
                    return (
                      <div key={index} className="flex items-start gap-4">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[method.color as keyof typeof colorClasses]}`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-600 mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                            {method.title}
                          </p>
                          {method.link ? (
                            <a 
                              href={method.link} 
                              className="text-slate-900 font-medium hover:text-blue-600 transition-colors break-words"
                              style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                            >
                              {method.value}
                            </a>
                          ) : (
                            <p className="text-slate-900 font-medium break-words" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                              {method.value}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Business Hours */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Business Hours
                  </h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Monday - Friday</span>
                    <span className="text-slate-900 font-medium" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>8:00 AM - 6:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Saturday</span>
                    <span className="text-slate-900 font-medium" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>9:00 AM - 4:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Sunday</span>
                    <span className="text-slate-900 font-medium" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Closed</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Contact Form - Right Side */}
            <div className="lg:col-span-2">
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 sm:p-10 shadow-2xl">
                {/* Decorative gradient overlay */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                      <Send className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Send us a Message
                      </h2>
                      <p className="text-slate-300 text-sm" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        We'll respond within 24 hours
                      </p>
                    </div>
                  </div>
                  <p className="text-slate-300 mb-8 text-base" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                    Fill out the form below and we'll get back to you as soon as possible.
                  </p>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="name" className="block text-sm font-semibold text-slate-200 mb-2.5" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                          Name <span className="text-blue-400">*</span>
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all backdrop-blur-sm"
                          placeholder="Your name"
                          style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                        />
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-slate-200 mb-2.5" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                          Email <span className="text-blue-400">*</span>
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all backdrop-blur-sm"
                          placeholder="your.email@example.com"
                          style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-sm font-semibold text-slate-200 mb-2.5" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Subject <span className="text-blue-400">*</span>
                      </label>
                      <input
                        type="text"
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all backdrop-blur-sm"
                        placeholder="What is this regarding?"
                        style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                      />
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-semibold text-slate-200 mb-2.5" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                        Message <span className="text-blue-400">*</span>
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        rows={6}
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none backdrop-blur-sm"
                        placeholder="Tell us more about your inquiry..."
                        style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
                      />
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full sm:w-auto px-10 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 transform hover:scale-105"
                      >
                        <Send className="h-5 w-5 mr-2" />
                        Send Message
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ContactPage;

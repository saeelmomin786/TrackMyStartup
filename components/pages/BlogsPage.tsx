import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Mail, Menu, X } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import LogoTMS from '../public/logoTMS.svg';
import Footer from '../Footer';
import { blogsService, BlogPost } from '../../lib/blogsService';
import { toDirectImageUrl } from '../../lib/imageUrl';
import SEOHead from '../SEOHead';


const BlogsPage: React.FC = () => {
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [exploreDropdownOpen, setExploreDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileExploreOpen, setMobileExploreOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const exploreDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [featuredBlogs, setFeaturedBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(9);
  const [email, setEmail] = useState('');

  const estimateReadMinutes = (content: string) => {
    const plainText = content.replace(/<[^>]+>/g, ' ');
    const words = plainText.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(3, Math.ceil(words / 220));
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

  const categories = [
    'All',
    'Startups',
    'Fundraising & Investors',
    'Mentorship',
    'Compliance & Legal',
    'Growth & Scaling',
    'Ecosystem & Policy',
    'Events & Announcements'
  ];

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

  // Load blogs from database
  useEffect(() => {
    const loadBlogs = async () => {
      try {
        setLoading(true);
        const allBlogs = await blogsService.listAll();
        
        // Set featured blogs (first 3)
        setFeaturedBlogs(allBlogs.slice(0, 3));
        
        // Set all blogs (excluding featured ones to avoid duplicates)
        setBlogs(allBlogs);
      } catch (error) {
        console.error('Error loading blogs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBlogs();
  }, []);

  const filteredBlogs = selectedCategory === 'All' 
    ? blogs 
    : blogs.filter(blog => blog.category === selectedCategory);

  // Exclude featured blogs from the regular listing to avoid duplicates
  const featuredBlogIds = new Set(featuredBlogs.map(blog => blog.id));
  const blogsWithoutFeatured = filteredBlogs.filter(blog => !featuredBlogIds.has(blog.id));
  const displayedBlogs = blogsWithoutFeatured.slice(0, displayCount);
  const hasMore = blogsWithoutFeatured.length > displayCount;

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + 9);
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement newsletter subscription
    alert('Thank you for subscribing!');
    setEmail('');
  };

  const siteUrl = 'https://trackmystartup.com';
  const canonicalUrl = `${siteUrl}/blogs`;

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title="Blog - TrackMyStartup | Startup Insights, Fundraising Tips & Ecosystem News"
        description="Read the latest insights on startups, fundraising, mentorship, compliance, and ecosystem development. Expert articles, guides, and news from TrackMyStartup."
        canonicalUrl={canonicalUrl}
        ogImage={`${siteUrl}/Track.png`}
        ogType="website"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: 'TrackMyStartup Blog',
          description: 'Startup insights, fundraising tips, and ecosystem news',
          url: canonicalUrl,
          publisher: {
            '@type': 'Organization',
            name: 'TrackMyStartup',
            logo: {
              '@type': 'ImageObject',
              url: `${siteUrl}/Track.png`
            }
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
      <section className="relative overflow-hidden px-4 sm:px-6 lg:px-8 py-14 sm:py-20 bg-slate-950 text-white">
        <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_15%_25%,rgba(96,165,250,0.45),transparent_40%),radial-gradient(circle_at_85%_0%,rgba(14,165,233,0.35),transparent_40%)]" />
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(120deg,transparent_0%,transparent_48%,white_49%,transparent_50%,transparent_100%)]" />
        <div className="relative container mx-auto max-w-6xl">
          <div className="max-w-4xl blog-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-400/10 px-4 py-1 text-xs sm:text-sm uppercase tracking-[0.18em] text-cyan-100 mb-6 blog-eyebrow">
              TrackMyStartup Journal
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl leading-tight mb-6 blog-headline">
              Clear, Practical Stories for Founders Building in the Real World
            </h1>
            <p className="text-base sm:text-xl text-slate-200 leading-relaxed max-w-3xl blog-body-copy">
              Discover deep startup narratives, funding playbooks, and ecosystem intelligence designed to be read, remembered, and applied.
            </p>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-5 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center gap-2 justify-center">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-slate-900 text-cyan-100 shadow-md ring-2 ring-cyan-300/40'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:-translate-y-0.5'
                }`}
                style={{ fontFamily: 'Source Sans 3, Inter, system-ui, sans-serif' }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-10 sm:py-12 px-4 sm:px-6 lg:px-8 bg-slate-100/60">
        <div className="container mx-auto max-w-7xl">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
              <p className="text-slate-600" style={{ fontFamily: 'Source Sans 3, Inter, system-ui, sans-serif' }}>Loading blogs...</p>
            </div>
          ) : (
            <>
              {/* Featured Blogs Section */}
              {featuredBlogs.length > 0 && (
                <div className="mb-14">
                  <h2 className="text-3xl sm:text-4xl text-slate-900 mb-6 blog-headline">
                    Featured Stories
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {featuredBlogs[0] && (
                      <a
                        href={`/blogs/${featuredBlogs[0].slug}`}
                        className="group lg:col-span-7 rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-xl transition-all duration-300"
                      >
                        <div className="relative h-[260px] sm:h-[340px]">
                          {featuredBlogs[0].coverImage ? (
                            <img
                              src={toDirectImageUrl(featuredBlogs[0].coverImage)}
                              alt={featuredBlogs[0].title}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="h-full w-full bg-slate-200" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/40 to-transparent" />
                          <div className="absolute bottom-0 p-6 sm:p-7 text-white">
                            <p className="text-xs uppercase tracking-[0.14em] text-cyan-100 mb-3 blog-eyebrow">
                              {featuredBlogs[0].category}
                            </p>
                            <h3 className="text-2xl sm:text-3xl leading-tight mb-3 blog-headline">
                              {featuredBlogs[0].title}
                            </h3>
                            <p className="text-slate-100/90 line-clamp-2 blog-body-copy">
                              {featuredBlogs[0].subtitle}
                            </p>
                          </div>
                        </div>
                      </a>
                    )}

                    <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                      {featuredBlogs.slice(1, 3).map((blog) => (
                        <a
                          key={blog.id}
                          href={`/blogs/${blog.slug}`}
                          className="group rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-xl transition-all duration-300"
                        >
                          {blog.coverImage ? (
                            <img
                              src={toDirectImageUrl(blog.coverImage)}
                              alt={blog.title}
                              className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-48 bg-slate-200" />
                          )}
                          <div className="p-5">
                            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2 blog-eyebrow">
                              {blog.category}
                            </p>
                            <h3 className="text-xl leading-snug text-slate-900 mb-3 line-clamp-2 blog-headline">
                              {blog.title}
                            </h3>
                            <div className="flex items-center justify-between text-sm text-slate-500 blog-body-copy">
                              <span>{formatDate(blog.publishDate)}</span>
                              <span>{estimateReadMinutes(blog.content)} min read</span>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Blog Listing Grid */}
              {blogsWithoutFeatured.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {displayedBlogs.map((blog) => (
                      <Card key={blog.id} className="!p-0 overflow-hidden border border-slate-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 bg-white">
                        {blog.coverImage ? (
                          <img 
                            src={toDirectImageUrl(blog.coverImage)} 
                            alt={blog.title}
                            className="w-full h-52 object-cover"
                          />
                        ) : (
                          <div className="w-full h-52 bg-slate-200 flex items-center justify-center">
                            <span className="text-slate-400 text-sm">No image</span>
                          </div>
                        )}
                        <div className="p-5">
                          <span className="inline-block px-2 py-1 bg-cyan-100 text-cyan-900 text-[11px] uppercase tracking-[0.12em] rounded-full mb-3 blog-eyebrow">
                            {blog.category}
                          </span>
                          <h3 className="text-xl text-slate-900 mb-3 line-clamp-2 blog-headline">
                            {blog.title}
                          </h3>
                          <p className="text-slate-600 mb-4 line-clamp-3 leading-relaxed blog-body-copy">
                            {blog.subtitle}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 blog-body-copy">
                              {formatDate(blog.publishDate)}
                            </span>
                            <a
                              href={`/blogs/${blog.slug}`}
                              className="text-cyan-700 hover:text-cyan-900 font-medium text-sm blog-body-copy"
                            >
                              {estimateReadMinutes(blog.content)} min read
                            </a>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Newsletter CTA */}
                  {displayCount >= 9 && (
                    <div className="mb-12">
                      <Card className="bg-gradient-to-r from-cyan-50 to-sky-100 border-cyan-200">
                        <div className="text-center py-8 px-4">
                          <h3 className="text-2xl text-slate-900 mb-2 blog-headline">
                            Stay Updated with Startup Insights
                          </h3>
                          <p className="text-slate-600 mb-6 max-w-2xl mx-auto blog-body-copy">
                            Get the latest blogs, mentor insights, and ecosystem updates directly in your inbox.
                          </p>
                          <form onSubmit={handleSubscribe} className="max-w-md mx-auto flex gap-2">
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="Enter your email"
                              required
                              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              style={{ fontFamily: 'Source Sans 3, Inter, system-ui, sans-serif' }}
                            />
                            <Button type="submit" variant="primary">
                              <Mail className="h-4 w-4 mr-2" />
                              Subscribe
                            </Button>
                          </form>
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* Load More Button */}
                  {hasMore && (
                    <div className="text-center">
                      <Button 
                        variant="outline" 
                        onClick={handleLoadMore}
                        className="px-8 py-2"
                      >
                        Load More
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                // Only show "no blogs" message when there are truly no blogs (including featured)
                blogs.length === 0 ? (
                  <Card className="text-center py-12">
                    <h3 className="text-xl text-slate-800 mb-2 blog-headline">
                      {selectedCategory === 'All' ? 'No blogs available' : `No blogs in ${selectedCategory}`}
                    </h3>
                    <p className="text-slate-500 blog-body-copy">
                      Check back later for new content.
                    </p>
                  </Card>
                ) : null
              )}
            </>
          )}
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&family=Source+Sans+3:wght@400;500;600;700&display=swap');

        .blog-headline {
          font-family: 'Merriweather', Georgia, serif;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .blog-body-copy {
          font-family: 'Source Sans 3', Inter, system-ui, sans-serif;
        }

        .blog-eyebrow {
          font-family: 'Source Sans 3', Inter, system-ui, sans-serif;
          font-weight: 600;
        }

        .blog-fade-up {
          animation: blogFadeUp 650ms ease-out both;
        }

        @keyframes blogFadeUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default BlogsPage;


import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Clock, ArrowLeft } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import LogoTMS from '../public/logoTMS.svg';
import Footer from '../Footer';
import { blogsService, BlogPost } from '../../lib/blogsService';
import { toDirectImageUrl } from '../../lib/imageUrl';

const BlogDetailPage: React.FC = () => {
  const path = window.location.pathname;
  const slug = path.replace('/blogs/', '');
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [exploreDropdownOpen, setExploreDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const exploreDropdownRef = useRef<HTMLDivElement>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCurrentPath(window.location.pathname);
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  useEffect(() => {
    const loadBlog = async () => {
      if (!slug || slug === '') {
        setLoading(false);
        window.location.href = '/blogs';
        return;
      }

      try {
        setLoading(true);
        const blogData = await blogsService.getBySlug(slug);
        if (!blogData) {
          // Blog not found, redirect to blogs page
          window.location.href = '/blogs';
          return;
        }
        setBlog(blogData);
      } catch (error) {
        console.error('Error loading blog:', error);
        window.location.href = '/blogs';
      } finally {
        setLoading(false);
      }
    };

    loadBlog();
  }, [slug]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-slate-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Loading blog...</p>
        </div>
      </div>
    );
  }

  if (!blog) {
    return null; // Will redirect
  }

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
              </nav>

              <div className="flex items-center gap-2 sm:gap-4">
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/?page=login'} className="hidden sm:inline-flex">Login</Button>
                <Button variant="primary" size="sm" onClick={() => window.location.href = '/?page=register'} className="px-3 py-1.5">Get Started</Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Blog Content */}
      <section className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="container mx-auto max-w-4xl">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/blogs'}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Blogs
          </Button>

          <Card className="!p-0 overflow-hidden">
            {/* Cover Image */}
            {blog.coverImage && (
              <div className="w-full h-64 sm:h-96 bg-slate-200">
                <img 
                  src={toDirectImageUrl(blog.coverImage)} 
                  alt={blog.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-6 sm:p-8">
              {/* Category and Date */}
              <div className="flex items-center gap-4 mb-4">
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                  {blog.category}
                </span>
                <span className="text-sm text-slate-500" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                  {new Date(blog.publishDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                {blog.title}
              </h1>

              {/* Subtitle */}
              <p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
                {blog.subtitle}
              </p>

              {/* Content */}
              <div 
                className="blog-content"
                style={{ 
                  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                  lineHeight: '1.75',
                  fontSize: '1.125rem',
                  color: '#475569'
                }}
                dangerouslySetInnerHTML={{ 
                  __html: (() => {
                    // First, check if content already contains HTML tags
                    const hasHTML = /<[a-z][\s\S]*>/i.test(blog.content);
                    
                    if (hasHTML) {
                      // If HTML is present, return as-is (user wrote HTML)
                      return blog.content;
                    } else {
                      // If plain text, format it properly
                      // Split by double line breaks for paragraphs
                      const paragraphs = blog.content.split(/\n\s*\n/);
                      return paragraphs.map(para => {
                        const trimmed = para.trim();
                        if (!trimmed) return '';
                        // Replace single line breaks with <br /> within paragraphs
                        const formatted = trimmed.replace(/\n/g, '<br />');
                        return `<p>${formatted}</p>`;
                      }).join('');
                    }
                  })()
                }}
              />
              <style>{`
                .blog-content p {
                  margin-bottom: 1.5rem;
                  line-height: 1.75;
                }
                .blog-content p:last-child {
                  margin-bottom: 0;
                }
                .blog-content br {
                  line-height: 1.75;
                }
                .blog-content h1, .blog-content h2, .blog-content h3, .blog-content h4, .blog-content h5, .blog-content h6 {
                  font-weight: 700;
                  margin-top: 2rem;
                  margin-bottom: 1rem;
                  color: #0f172a;
                }
                .blog-content h1 { font-size: 2.25rem; }
                .blog-content h2 { font-size: 1.875rem; }
                .blog-content h3 { font-size: 1.5rem; }
                .blog-content ul, .blog-content ol {
                  margin: 1.5rem 0;
                  padding-left: 2rem;
                }
                .blog-content li {
                  margin-bottom: 0.5rem;
                }
                .blog-content a {
                  color: #2563eb;
                  text-decoration: underline;
                }
                .blog-content a:hover {
                  color: #1d4ed8;
                }
                .blog-content img {
                  max-width: 100%;
                  height: auto;
                  margin: 1.5rem 0;
                  border-radius: 0.5rem;
                }
              `}</style>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default BlogDetailPage;


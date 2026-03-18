import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ArrowLeft } from 'lucide-react';
import Button from '../ui/Button';
import LogoTMS from '../public/logoTMS.svg';
import Footer from '../Footer';
import { blogsService, BlogPost } from '../../lib/blogsService';
import { toDirectImageUrl } from '../../lib/imageUrl';
import SEOHead from '../SEOHead';

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

  const estimateReadMinutes = (content: string) => {
    const plainText = content.replace(/<[^>]+>/g, ' ');
    const words = plainText.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(3, Math.ceil(words / 220));
  };

  const formatContent = (content: string) => {
    const hasHTML = /<[a-z][\s\S]*>/i.test(content);
    if (hasHTML) {
      return content;
    }

    return content
      .split(/\n\s*\n/)
      .map((para) => {
        const trimmed = para.trim();
        if (!trimmed) return '';
        return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`;
      })
      .join('');
  };

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

  const siteUrl = 'https://trackmystartup.com';
  const canonicalUrl = `${siteUrl}/blogs/${blog.slug}`;
  const blogImage = blog.coverImage ? toDirectImageUrl(blog.coverImage) : `${siteUrl}/Track.png`;
  const publishDate = blog.publishDate ? new Date(blog.publishDate).toISOString() : new Date().toISOString();
  const modifiedDate = blog.createdAt ? new Date(blog.createdAt).toISOString() : publishDate;

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title={`${blog.title} | TrackMyStartup Blog`}
        description={blog.subtitle || blog.content?.substring(0, 160) || 'Read the latest insights on startups, fundraising, mentorship, and ecosystem development.'}
        canonicalUrl={canonicalUrl}
        ogImage={blogImage}
        ogType="article"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: blog.title,
          description: blog.subtitle || blog.content?.substring(0, 200),
          image: blogImage,
          datePublished: publishDate,
          dateModified: modifiedDate,
          author: {
            '@type': 'Organization',
            name: 'TrackMyStartup',
            url: siteUrl
          },
          publisher: {
            '@type': 'Organization',
            name: 'TrackMyStartup',
            logo: {
              '@type': 'ImageObject',
              url: `${siteUrl}/Track.png`
            }
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': canonicalUrl
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

      {/* Blog Hero */}
      <section className="relative min-h-[56vh] flex items-end overflow-hidden bg-slate-950">
        {blog.coverImage ? (
          <img
            src={toDirectImageUrl(blog.coverImage)}
            alt={blog.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-slate-900/30" />
        <div className="relative w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="container mx-auto max-w-5xl">
            <Button
              variant="outline"
              onClick={() => window.location.href = '/blogs'}
              className="mb-8 border-white/50 text-white hover:bg-white hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blogs
            </Button>

            <div className="max-w-4xl article-fade-up text-white">
              <p className="inline-flex rounded-full border border-cyan-300/40 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-cyan-100 mb-5 article-eyebrow">
                {blog.category}
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl leading-tight mb-5 article-headline">
                {blog.title}
              </h1>
              <p className="text-lg sm:text-2xl text-slate-100/95 leading-relaxed mb-8 article-body">
                {blog.subtitle}
              </p>
              <div className="flex flex-wrap gap-2 text-sm text-slate-200 article-body">
                <span className="opacity-80">Published:</span>
                <span>
                  {new Date(blog.publishDate || blog.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Content */}
      <section className="bg-[#f6f8fb] px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="container mx-auto max-w-5xl">
          <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white px-6 sm:px-10 py-8 sm:py-10 shadow-sm">
            <div
              className="nasa-article"
              dangerouslySetInnerHTML={{ __html: formatContent(blog.content) }}
            />
          </article>
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&family=Source+Sans+3:wght@400;500;600;700&display=swap');

        .article-headline {
          font-family: 'Merriweather', Georgia, serif;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .article-body {
          font-family: 'Source Sans 3', Inter, system-ui, sans-serif;
        }

        .article-eyebrow {
          font-family: 'Source Sans 3', Inter, system-ui, sans-serif;
          font-weight: 600;
        }

        .article-fade-up {
          animation: articleFadeUp 700ms ease-out both;
        }

        .nasa-article {
          color: #334155;
          font-family: 'Source Sans 3', Inter, system-ui, sans-serif;
          font-size: 1.2rem;
          line-height: 1.9;
        }

        .nasa-article p {
          margin: 0 0 1.8rem;
        }

        .nasa-article p:first-child::first-letter {
          font-family: 'Merriweather', Georgia, serif;
          float: left;
          font-size: 3.4rem;
          line-height: 0.85;
          margin: 0.15rem 0.5rem 0 0;
          font-weight: 700;
          color: #0f172a;
        }

        .nasa-article h1,
        .nasa-article h2,
        .nasa-article h3,
        .nasa-article h4,
        .nasa-article h5,
        .nasa-article h6 {
          margin: 2.3rem 0 1rem;
          font-family: 'Merriweather', Georgia, serif;
          color: #0f172a;
          line-height: 1.3;
        }

        .nasa-article h1 { font-size: 2.2rem; }
        .nasa-article h2 { font-size: 1.9rem; }
        .nasa-article h3 { font-size: 1.55rem; }

        .nasa-article ul,
        .nasa-article ol {
          margin: 1.5rem 0;
          padding-left: 1.5rem;
        }

        .nasa-article li {
          margin-bottom: 0.65rem;
        }

        .nasa-article a {
          color: #0e7490;
          text-decoration: underline;
          text-decoration-thickness: 2px;
          text-underline-offset: 2px;
        }

        .nasa-article a:hover {
          color: #155e75;
        }

        .nasa-article img {
          margin: 2rem 0;
          max-width: 100%;
          border-radius: 0.9rem;
          box-shadow: 0 10px 40px rgba(15, 23, 42, 0.18);
        }

        .nasa-article blockquote {
          margin: 2rem 0;
          border-left: 4px solid #0e7490;
          background: #f0f9ff;
          color: #0f172a;
          padding: 1rem 1.2rem;
          font-style: italic;
        }

        @keyframes articleFadeUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 640px) {
          .nasa-article {
            font-size: 1.08rem;
            line-height: 1.85;
          }

          .nasa-article p:first-child::first-letter {
            font-size: 2.7rem;
            margin-right: 0.35rem;
          }
        }
      `}</style>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default BlogDetailPage;


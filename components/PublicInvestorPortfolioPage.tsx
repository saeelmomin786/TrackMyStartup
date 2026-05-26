import React, { useEffect, useMemo, useState } from 'react';
import { Search, Users, ArrowLeft, Building2, Menu, X, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { authService } from '../lib/auth';
import Card from './ui/Card';
import Button from './ui/Button';
import SEOHead from './SEOHead';
import LogoTMS from './public/logoTMS.svg';
import InvestorCard from './investor/InvestorCard';
import { messageService } from '../lib/messageService';

const PublicInvestorPortfolioPage: React.FC = () => {
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [exploreDropdownOpen, setExploreDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileExploreOpen, setMobileExploreOpen] = useState(false);
  const [dropdownRef, setDropdownRef] = useState<HTMLDivElement | null>(null);
  const [exploreDropdownRef, setExploreDropdownRef] = useState<HTMLDivElement | null>(null);
  const [mobileMenuRef, setMobileMenuRef] = useState<HTMLDivElement | null>(null);
  const [currentPath, setCurrentPath] = useState('');
  const [investors, setInvestors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    setCurrentPath(window.location.pathname);
    const handleLocationChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef && !dropdownRef.contains(target)) {
        setServicesDropdownOpen(false);
      }
      if (exploreDropdownRef && !exploreDropdownRef.contains(target)) {
        setExploreDropdownOpen(false);
      }
      if (mobileMenuRef && !mobileMenuRef.contains(target) && !(event.target as HTMLElement).closest('button[aria-label="Toggle mobile menu"]')) {
        setMobileMenuOpen(false);
      }
    };

    if (servicesDropdownOpen || exploreDropdownOpen || mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [servicesDropdownOpen, exploreDropdownOpen, mobileMenuOpen, dropdownRef, exploreDropdownRef, mobileMenuRef]);

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

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const authenticated = await authService.isAuthenticated();
        setIsAuthenticated(authenticated);
        if (authenticated) {
          setCurrentUser(await authService.getCurrentUser());
        }
      } catch (err) {
        console.error('Error checking auth state:', err);
        setIsAuthenticated(false);
      }
    };

    loadAuth();
  }, []);

  useEffect(() => {
    const loadInvestors = async () => {
      try {
        setLoading(true);
        setError(null);

        // The main table is the most reliable source; the public mirror is only a fallback.
        let { data, error: investorError } = await supabase
          .from('investor_profiles')
          .select('*')
          .order('investor_name', { ascending: true });

        if (investorError && (investorError.message?.includes('does not exist') || investorError.code === '42P01')) {
          console.warn('[PublicInvestorPortfolioPage] Main table not available, falling back to public table');
          const fallback = await supabase
            .from('investors_public_table')
            .select('*')
            .order('investor_name', { ascending: true });
          data = fallback.data;
          investorError = fallback.error;
        }

        if (investorError) {
          if (investorError.code === 'PGRST116' || investorError.message?.includes('404') || investorError.message?.includes('relation') || investorError.message?.includes('does not exist')) {
            setInvestors([]);
            setLoading(false);
            return;
          }
          throw investorError;
        }

        const userIds = [...new Set((data || []).map((profile: any) => profile.user_id).filter(Boolean))];
        let userMap = new Map<string, any>();

        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, name, email')
            .in('id', userIds);

          if (usersData) {
            userMap = new Map(usersData.map((user: any) => [user.id, user]));
          }
        }

        const profilesWithUsers = (data || []).map((profile: any) => ({
          ...profile,
          user: userMap.get(profile.user_id) || { id: profile.user_id, name: '' }
        }));

        setInvestors(profilesWithUsers);
      } catch (err: any) {
        console.error('Error loading investor portfolio:', err);
        const isNotFoundError = err.code === 'PGRST116' ||
          err.code === '42P01' ||
          err.status === 404 ||
          err.message?.includes('404') ||
          err.message?.includes('relation') ||
          err.message?.includes('does not exist') ||
          err.message?.includes('permission denied');

        if (isNotFoundError) {
          setInvestors([]);
          setError(null);
        } else {
          setError('Failed to load public investors. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadInvestors();
  }, []);

  const filteredInvestors = useMemo(() => {
    if (!searchTerm.trim()) return investors;
    const search = searchTerm.toLowerCase();
    return investors.filter((investor) => {
      const name = (investor.investor_name || investor.user?.name || '').toLowerCase();
      const firm = (investor.firm_name || investor.firm_type || '').toLowerCase();
      const location = (investor.global_hq || investor.location || '').toLowerCase();
      const domain = Array.isArray(investor.domain) ? investor.domain.join(', ').toLowerCase() : '';
      return name.includes(search) || firm.includes(search) || location.includes(search) || domain.includes(search);
    });
  }, [investors, searchTerm]);

  const handleBack = () => {
    window.location.href = '/';
  };

  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  const handleApply = (investor: any) => {
    const targetUrl = new URL(window.location.origin);
    targetUrl.searchParams.set('page', 'startup-health');
    targetUrl.searchParams.set('tab', 'fundraising');
    targetUrl.searchParams.set('subTab', 'application');
    targetUrl.searchParams.set('applyInvestorUserId', investor.user_id);

    if (!isAuthenticated) {
      sessionStorage.setItem('redirectAfterLogin', targetUrl.toString());

      const loginUrl = new URL(window.location.origin);
      loginUrl.searchParams.set('page', 'login');
      window.location.href = loginUrl.toString();
      return;
    }

    if (currentUser?.role !== 'Startup') {
      messageService.error('Access Restricted', 'Only startups can apply to investors. Please log in with a Startup account.', 3000);
      return;
    }

    sessionStorage.setItem('redirectAfterLogin', targetUrl.toString());
    window.location.href = targetUrl.toString();
  };

  const siteUrl = 'https://trackmystartup.com';
  const canonicalUrl = `${siteUrl}${window.location.pathname}`;

  const roleTitle = 'Public Investor Portfolio';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <SEOHead
          title="Public Investor Portfolio - TrackMyStartup"
          description="Browse public investor cards on TrackMyStartup."
          canonicalUrl={canonicalUrl}
          ogType="website"
        />
        <div className="min-h-screen flex items-center justify-center">
          <Card className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading public investors...</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <SEOHead
          title="Public Investor Portfolio - TrackMyStartup"
          description="Browse public investor cards on TrackMyStartup."
          canonicalUrl={canonicalUrl}
          ogType="website"
        />
        <div className="min-h-screen flex items-center justify-center">
          <Card className="p-8">
            <div className="text-center">
              <Building2 className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={handleBack}>Go Back</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title="Public Investor Portfolio - TrackMyStartup"
        description="Browse public investor cards on TrackMyStartup."
        canonicalUrl={canonicalUrl}
        ogType="website"
      />
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <img
                src={LogoTMS}
                alt="TrackMyStartup"
                className="h-7 w-7 sm:h-8 sm:w-8 scale-[5] sm:scale-[5] origin-left cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigateTo('/')}
              />
            </div>

            <div className="flex items-center gap-6">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-slate-700 hover:text-brand-primary transition-colors"
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>

              <nav className="hidden lg:flex items-center gap-6">
                <div
                  ref={setDropdownRef}
                  className="relative"
                  onMouseEnter={() => setServicesDropdownOpen(true)}
                  onMouseLeave={(e) => {
                    const relatedTarget = e.relatedTarget as Node;
                    if (!dropdownRef?.contains(relatedTarget)) {
                      setServicesDropdownOpen(false);
                    }
                  }}
                >
                  <button className="flex items-center gap-1 text-slate-700 hover:text-brand-primary transition-colors font-medium text-sm" onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setServicesDropdownOpen(!servicesDropdownOpen);
                  }}>
                    Our Services
                    <ChevronDown className={`h-4 w-4 transition-transform ${servicesDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                <a href="/unified-mentor-network" className={`font-medium text-sm transition-colors duration-200 ${currentPath === '/unified-mentor-network' ? 'text-brand-primary font-semibold' : 'text-slate-700 hover:text-blue-400'}`}>
                  Unified Mentor Network
                </a>
                <a href="/grant-opportunities" className={`font-medium text-sm transition-colors duration-200 ${currentPath === '/grant-opportunities' ? 'text-brand-primary font-semibold' : 'text-slate-700 hover:text-blue-400'}`}>
                  Grant Opportunities
                </a>
                <a href="/investor-portfolio" className={`font-medium text-sm transition-colors duration-200 ${currentPath === '/investor-portfolio' ? 'text-brand-primary font-semibold' : 'text-slate-700 hover:text-blue-400'}`}>
                  Investor Portfolio
                </a>
                <a href="/events" className={`font-medium text-sm transition-colors duration-200 ${currentPath === '/events' ? 'text-brand-primary font-semibold' : 'text-slate-700 hover:text-blue-400'}`}>
                  Events
                </a>
                <a href="/about" className={`font-medium text-sm transition-colors duration-200 ${currentPath === '/about' ? 'text-brand-primary font-semibold' : 'text-slate-700 hover:text-blue-400'}`}>
                  About Us
                </a>
                <a href="/contact" className={`font-medium text-sm transition-colors duration-200 ${currentPath === '/contact' ? 'text-brand-primary font-semibold' : 'text-slate-700 hover:text-blue-400'}`}>
                  Contact Us
                </a>
              </nav>

              <div className="flex items-center gap-2 sm:gap-4">
                <Button variant="primary" size="sm" onClick={() => navigateTo(isAuthenticated ? '/?page=login' : '/?page=login')} className="px-3 py-1.5">
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setMobileMenuOpen(false)}>
            <div
              ref={setMobileMenuRef}
              className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-50 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <img src={LogoTMS} alt="TrackMyStartup" className="h-8 w-8 scale-[5] origin-left" />
                  <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-700 hover:text-brand-primary transition-colors">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <nav className="space-y-4">
                  <a href="/unified-mentor-network" className="block text-slate-700 hover:text-brand-primary transition-colors font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Unified Mentor Network</a>
                  <a href="/grant-opportunities" className="block text-slate-700 hover:text-brand-primary transition-colors font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Grant Opportunities</a>
                  <a href="/investor-portfolio" className="block text-slate-700 hover:text-brand-primary transition-colors font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Investor Portfolio</a>
                  <a href="/events" className="block text-slate-700 hover:text-brand-primary transition-colors font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Events</a>
                  <a href="/about" className="block text-slate-700 hover:text-brand-primary transition-colors font-medium py-2" onClick={() => setMobileMenuOpen(false)}>About Us</a>
                  <a href="/contact" className="block text-slate-700 hover:text-brand-primary transition-colors font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Contact Us</a>
                </nav>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Button variant="outline" onClick={handleBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{roleTitle}</h1>
          <p className="text-slate-600">Browse public investor cards and connect with the right backers.</p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search investors by name, firm, location, or domain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="mb-4 text-sm text-slate-600">
          {filteredInvestors.length} {filteredInvestors.length === 1 ? 'investor' : 'investors'} found
        </div>

        {filteredInvestors.length === 0 ? (
          <Card className="text-center py-12">
            <Users className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No Investors Found</h3>
            <p className="text-slate-500">
              {searchTerm ? 'No investors match your search criteria.' : 'No public investors found.'}
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredInvestors.map((investor) => (
              <InvestorCard
                key={investor.id || investor.user_id}
                investor={investor}
                isPublicPage={true}
                isAuthenticated={isAuthenticated}
                currentUser={currentUser}
                totalStartupsInvested={investor.number_of_startups_invested || 0}
                onApproach={() => handleApply(investor)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicInvestorPortfolioPage;

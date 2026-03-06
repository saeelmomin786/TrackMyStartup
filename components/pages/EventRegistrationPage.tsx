import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, Mail, Menu, MessageCircle, X } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import LogoTMS from '../public/logoTMS.svg';
import { supabase } from '../../lib/supabase';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

type EventRow = {
  id: string;
  title: string;
  slug: string;
  banner_image_url: string | null;
  whatsapp_group_link: string | null;
  short_description: string | null;
  start_at: string;
  timezone: string;
  is_paid: boolean;
  amount: number;
  currency: string;
  is_published: boolean;
  is_active: boolean;
};

type QuestionRow = {
  id: string;
  question_text: string;
  question_type: string;
  is_required: boolean;
  options_json: string[] | null;
  sort_order: number;
};

type AnswerValue = string | string[];

const EventRegistrationPage: React.FC = () => {
  const db = supabase as any;
  const [eventData, setEventData] = useState<EventRow | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [paymentDone, setPaymentDone] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [designation, setDesignation] = useState('');
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [exploreDropdownOpen, setExploreDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileExploreOpen, setMobileExploreOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const exploreDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const eventSlug = useMemo(() => {
    const parts = window.location.pathname.split('/').filter(Boolean);
    // /events/:slug/register
    if (parts.length >= 3 && parts[0] === 'events' && parts[2] === 'register') {
      return parts[1];
    }
    return '';
  }, []);

  const loadRazorpayScript = async (): Promise<boolean> => {
    if (window.Razorpay) return true;

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const fetchEvent = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!eventSlug) {
        setError('Invalid event registration URL');
        return;
      }

      const { data: eventRow, error: eventError } = await db
        .from('events')
        .select('id, title, slug, banner_image_url, whatsapp_group_link, short_description, start_at, timezone, is_paid, amount, currency, is_published, is_active')
        .eq('slug', eventSlug)
        .eq('is_published', true)
        .eq('is_active', true)
        .single();

      if (eventError || !eventRow) {
        setError('Event not found or not available for public registration.');
        return;
      }

      setEventData(eventRow as EventRow);

      const { data: questionRows, error: questionsError } = await db
        .from('event_form_questions')
        .select('id, question_text, question_type, is_required, options_json, sort_order')
        .eq('event_id', eventRow.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (questionsError) {
        setError('Failed to load registration form fields.');
        return;
      }

      setQuestions((questionRows || []) as QuestionRow[]);
    } catch (err) {
      console.error('Failed to load event registration page', err);
      setError('Failed to load event registration page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [eventSlug]);

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
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('button[aria-label="Toggle mobile menu"]')
      ) {
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

  const validateDynamicAnswers = (): string | null => {
    for (const q of questions) {
      if (!q.is_required) continue;
      const value = answers[q.id];
      if (Array.isArray(value) && value.length === 0) {
        return `Please answer: ${q.question_text}`;
      }
      if (!Array.isArray(value) && (!value || !String(value).trim())) {
        return `Please answer: ${q.question_text}`;
      }
    }
    return null;
  };

  const startPaymentFlow = async (currentRegistrationId: string) => {
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      throw new Error('Could not load Razorpay checkout script.');
    }

    const orderResp = await fetch('/api/events/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationId: currentRegistrationId }),
    });

    const orderJson = await orderResp.json();
    if (!orderResp.ok) {
      throw new Error(orderJson?.error || 'Failed to create payment order.');
    }

    const options = {
      key: orderJson.keyId,
      order_id: orderJson.order.id,
      name: eventData?.title || 'Track My Startup Event',
      description: 'Event registration payment',
      amount: orderJson.order.amount,
      currency: orderJson.order.currency,
      prefill: {
        name: fullName,
        email,
        contact: phone,
      },
      handler: async (response: any) => {
        const verifyResp = await fetch('/api/events/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            registrationId: currentRegistrationId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }),
        });

        const verifyJson = await verifyResp.json();
        if (!verifyResp.ok) {
          throw new Error(verifyJson?.error || 'Payment verification failed');
        }

        setPaymentDone(true);
        setMessage('Registration confirmed and payment received. Receipt and event details will be sent to your email.');
      },
      modal: {
        ondismiss: () => {
          setMessage('Payment window closed. You can retry payment from this page.');
        },
      },
      theme: { color: '#2563eb' },
    };

    const checkout = new window.Razorpay(options);
    checkout.open();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const requiredValidationError = validateDynamicAnswers();
    if (requiredValidationError) {
      setError(requiredValidationError);
      return;
    }

    setSubmitting(true);

    try {
      const payloadAnswers = questions
        .map((q) => {
          const value = answers[q.id];
          if (value === undefined || value === null || value === '') return null;
          if (Array.isArray(value)) {
            return {
              questionId: q.id,
              answerJson: value,
            };
          }
          return {
            questionId: q.id,
            answerText: String(value),
          };
        })
        .filter(Boolean);

      const initResp = await fetch('/api/events/register-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventSlug,
          fullName,
          email,
          phone,
          companyName,
          designation,
          answers: payloadAnswers,
        }),
      });

      const initJson = await initResp.json();
      if (!initResp.ok) {
        throw new Error(initJson?.error || 'Failed to create registration.');
      }

      setRegistrationId(initJson.registrationId);

      if (initJson.paymentRequired) {
        await startPaymentFlow(initJson.registrationId);
      } else {
        setPaymentDone(true);
        setMessage('Registration completed successfully. Confirmation email will be sent shortly.');
      }
    } catch (err: any) {
      console.error('Event registration failed', err);
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const renderQuestionInput = (q: QuestionRow) => {
    const value = answers[q.id];

    if (q.question_type === 'long_text') {
      return (
        <textarea
          className="w-full px-3 py-2 border border-slate-300 rounded-md"
          rows={3}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
          required={q.is_required}
        />
      );
    }

    if (q.question_type === 'dropdown') {
      return (
        <select
          className="w-full px-3 py-2 border border-slate-300 rounded-md"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
          required={q.is_required}
        >
          <option value="">Select an option</option>
          {(q.options_json || []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (q.question_type === 'radio') {
      return (
        <div className="space-y-2">
          {(q.options_json || []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name={`q-${q.id}`}
                checked={value === opt}
                onChange={() => handleAnswerChange(q.id, opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }

    if (q.question_type === 'checkbox') {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2">
          {(q.options_json || []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={(e) => {
                  if (e.target.checked) {
                    handleAnswerChange(q.id, [...selected, opt]);
                  } else {
                    handleAnswerChange(
                      q.id,
                      selected.filter((v) => v !== opt)
                    );
                  }
                }}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }

    let inputType = 'text';
    if (q.question_type === 'email') inputType = 'email';
    if (q.question_type === 'phone') inputType = 'tel';
    if (q.question_type === 'number') inputType = 'number';
    if (q.question_type === 'date') inputType = 'date';

    return (
      <input
        type={inputType}
        className="w-full px-3 py-2 border border-slate-300 rounded-md"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
        required={q.is_required}
      />
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img
                  src={LogoTMS}
                  alt="TrackMyStartup"
                  className="h-7 w-7 sm:h-8 sm:w-8 scale-[5] sm:scale-[5] origin-left cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => (window.location.href = '/')}
                />
              </div>
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
                    <div className="absolute top-full left-0 pt-2 w-56 z-[100]" onMouseEnter={() => setServicesDropdownOpen(true)}>
                      <div className="bg-white rounded-lg shadow-xl border border-slate-200 py-2 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
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

                <a href="/?page=landing" className={`font-medium text-sm transition-colors duration-200 ${(currentPath === '/' || currentPath === '') ? 'text-brand-primary font-semibold' : 'text-slate-700 hover:text-blue-400'}`}>
                  Home
                </a>
                <a href="/unified-mentor-network" className={`font-medium text-sm transition-colors duration-200 ${currentPath === '/unified-mentor-network' ? 'text-brand-primary font-semibold' : 'text-slate-700 hover:text-blue-400'}`}>
                  Unified Mentor Network
                </a>
                <a href="/grant-opportunities" className={`font-medium text-sm transition-colors duration-200 ${currentPath === '/grant-opportunities' ? 'text-brand-primary font-semibold' : 'text-slate-700 hover:text-blue-400'}`}>
                  Grant Opportunities
                </a>
                <a href="/events" className={`font-medium text-sm transition-colors duration-200 ${currentPath.startsWith('/events') ? 'text-brand-primary font-semibold' : 'text-slate-700 hover:text-blue-400'}`}>
                  Events
                </a>

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
                    className={`flex items-center gap-1 font-medium text-sm transition-colors duration-200 ${(currentPath === '/blogs' || currentPath === '/founder-notes') ? 'text-brand-primary font-semibold' : 'text-slate-700 hover:text-blue-400'}`}
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
                    <div className="absolute top-full left-0 pt-2 w-56 z-[100]" onMouseEnter={() => setExploreDropdownOpen(true)}>
                      <div className="bg-white rounded-lg shadow-xl border border-slate-200 py-2 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                        <a href="/blogs" className="block px-4 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-brand-primary transition-colors" onClick={() => setExploreDropdownOpen(false)}>Blogs</a>
                        <a href="#" className="block px-4 py-2 text-sm text-slate-700 hover:bg-primary-50 hover:text-brand-primary transition-colors" onClick={() => setExploreDropdownOpen(false)}>Founder notes</a>
                      </div>
                    </div>
                  )}
                </div>

                <a href="/about" className={`font-medium text-sm transition-colors duration-200 ${currentPath === '/about' ? 'text-brand-primary font-semibold' : 'text-slate-700 hover:text-blue-400'}`}>
                  About Us
                </a>
                <a href="/contact" className={`font-medium text-sm transition-colors duration-200 ${currentPath === '/contact' ? 'text-brand-primary font-semibold' : 'text-slate-700 hover:text-blue-400'}`}>
                  Contact Us
                </a>
              </nav>

              <div className="hidden lg:flex items-center gap-2 sm:gap-4">
                <Button variant="outline" size="sm" onClick={() => (window.location.href = '/?page=login')}>
                  Login
                </Button>
                <Button variant="primary" size="sm" onClick={() => (window.location.href = '/?page=register')} className="px-3 py-1.5">
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setMobileMenuOpen(false)}>
            <div ref={mobileMenuRef} className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-50 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <img src={LogoTMS} alt="TrackMyStartup" className="h-8 w-8 scale-[5] origin-left" />
                  <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-700 hover:text-brand-primary transition-colors">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <nav className="space-y-4">
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

      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        {loading ? (
          <Card><p className="text-slate-500">Loading registration form...</p></Card>
        ) : error && !eventData ? (
          <Card>
            <h1 className="text-xl font-semibold text-slate-800 mb-2">Registration Unavailable</h1>
            <p className="text-slate-600">{error}</p>
          </Card>
        ) : eventData ? (
          <Card>
            {eventData.banner_image_url && !paymentDone && (
              <div className="mb-4">
                <img
                  src={eventData.banner_image_url}
                  alt={`${eventData.title} poster`}
                  className="w-full rounded-lg border border-slate-200 object-cover max-h-96"
                />
              </div>
            )}
            {!paymentDone && (
              <>
                <h1 className="text-2xl font-bold text-slate-900 text-center">{eventData.title}</h1>
                {eventData.short_description && <p className="text-slate-700 mt-2">{eventData.short_description}</p>}
                <p className="text-sm text-slate-500 mt-2">
                  Starts on {new Date(eventData.start_at).toLocaleString('en-IN')} ({eventData.timezone || 'UTC'})
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  Fee: {eventData.is_paid ? `${eventData.currency} ${eventData.amount}` : 'Free'}
                </p>
              </>
            )}

            {message && paymentDone && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 mt-0.5" />
                  <div>
                    <h2 className="text-lg font-semibold text-emerald-900">Registration Successful</h2>
                    <p className="text-emerald-800 mt-1">
                      Registration confirmed and payment received. Receipt and event details will be sent to your email.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {eventData.whatsapp_group_link && (
                    <a
                      href={eventData.whatsapp_group_link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-white border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Join WhatsApp Group
                    </a>
                  )}

                  <a
                    href="mailto:support@trackmystartup.com"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    support@trackmystartup.com
                  </a>
                </div>

                <p className="text-xs text-slate-600 mt-3">
                  If you did not receive email or need help, please reach out to us at support@trackmystartup.com.
                </p>
              </div>
            )}

            {message && !paymentDone && (
              <div className="mt-4 rounded-md bg-green-50 border border-green-200 p-3 text-green-800 text-sm">
                {message}
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3 text-red-700 text-sm">{error}</div>
            )}

            {!paymentDone && (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <Input label="Full Name *" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                <Input label="Email *" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Input label="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                <Input label="Designation" value={designation} onChange={(e) => setDesignation(e.target.value)} />

                {questions.length > 0 && (
                  <div className="pt-2 space-y-4">
                    {questions.map((q) => (
                      <div key={q.id}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {q.question_text} {q.is_required && <span className="text-red-600">*</span>}
                        </label>
                        {renderQuestionInput(q)}
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-3 flex flex-col gap-2">
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting
                      ? 'Submitting...'
                      : eventData.is_paid
                      ? 'Next'
                      : 'Complete Registration'}
                  </Button>
                  {registrationId && <span className="text-xs text-slate-500">Registration ID: {registrationId}</span>}
                </div>
              </form>
            )}
          </Card>
        ) : null}
      </main>
    </div>
  );
};

export default EventRegistrationPage;

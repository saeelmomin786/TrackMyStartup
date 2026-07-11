import React, { useEffect, useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import { ArrowLeft, Share2, Calendar, User, Video, Download, FileText, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { messageService } from '../lib/messageService';
import Modal from './ui/Modal';
import { toDirectImageUrl } from '../lib/imageUrl';
import { getQueryParam, setQueryParam } from '../lib/urlState';
import { questionBankService, OpportunityQuestion, isOtherValue, encodeOtherAnswer, parseOtherText, OTHER_OPTION } from '../lib/questionBankService';

interface OpportunityItem {
    id: string;
    programName: string;
    description: string;
    deadline: string;
    posterUrl?: string;
    videoUrl?: string;
    facilitatorName?: string;
}

const PublicProgramView: React.FC = () => {
    const [opportunity, setOpportunity] = useState<OpportunityItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
    const [selectedImageAlt, setSelectedImageAlt] = useState<string>('');
    const [viewMode, setViewMode] = useState<'details' | 'apply' | 'submitted'>('details');
    const [opportunityQuestions, setOpportunityQuestions] = useState<OpportunityQuestion[]>([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [questionAnswers, setQuestionAnswers] = useState<Map<string, string>>(new Map());
    const [guestEmail, setGuestEmail] = useState('');
    const [guestStartupName, setGuestStartupName] = useState('');
    const [pitchDeckUrl, setPitchDeckUrl] = useState('');
    const [pitchVideoUrl, setPitchVideoUrl] = useState('');
    const [isSubmittingGuestApp, setIsSubmittingGuestApp] = useState(false);

    const opportunityId = getQueryParam('opportunityId');

    useEffect(() => {
        if (!opportunityId) {
            window.location.href = '/';
            return;
        }

        const loadOpportunity = async () => {
            try {
                console.log('🔍 Loading opportunity with ID:', opportunityId);
                const { data, error } = await supabase
                    .from('incubation_opportunities')
                    .select('*')
                    .eq('id', opportunityId)
                    .single();

                console.log('🔍 Supabase response:', { data, error });

                if (error) {
                    console.error('Error loading opportunity:', error);
                    messageService.error('Program Not Found', 'This program may have been removed or is no longer available.');
                    window.location.href = '/';
                    return;
                }

                if (data) {
                    // Sanitize description: remove WhatsApp chat links and any preceding label
                    let desc: string = data.description || '';
                    try {
                        // Remove patterns like "WhatsApp group: https://chat.whatsapp.com/..." or raw chat links
                        desc = desc.replace(/(?:WhatsApp\s*group[:\-\s]*\s*)?https?:\/\/(?:www\.)?chat\.whatsapp\.com\/\S+/gi, '');
                        // Collapse multiple blank lines and trim
                        desc = desc.replace(/\n{2,}/g, '\n\n').trim();
                    } catch (e) {
                        console.warn('Failed to sanitize program description', e);
                    }

                    setOpportunity({
                        id: data.id,
                        programName: data.program_name,
                        description: desc,
                        deadline: data.deadline || '',
                        posterUrl: data.poster_url || undefined,
                        videoUrl: data.video_url || undefined,
                        facilitatorName: 'Program Facilitator'
                    });

                    // Deep-linked here from a button that already means "apply"
                    // (e.g. GrantOpportunitiesPage) — skip straight to the form.
                    if (getQueryParam('autoApply') === 'true') {
                        handleApplyClick();
                    }
                }
            } catch (err) {
                console.error('Error loading opportunity:', err);
                messageService.error('Error', 'Failed to load program details.');
                window.location.href = '/';
            } finally {
                setLoading(false);
            }
        };

        loadOpportunity();
    }, [opportunityId]);

    const getYoutubeEmbedUrl = (url?: string): string | null => {
        if (!url) return null;
        try {
            const u = new URL(url);
            if (u.hostname.includes('youtube.com')) {
                const vid = u.searchParams.get('v');
                return vid ? `https://www.youtube.com/embed/${vid}` : null;
            }
            if (u.hostname === 'youtu.be') {
                const id = u.pathname.replace('/', '');
                return id ? `https://www.youtube.com/embed/${id}` : null;
            }
        } catch {}
        return null;
    };

    const openImageModal = (imageUrl: string, altText: string) => {
        setSelectedImageUrl(toDirectImageUrl(imageUrl) || imageUrl);
        setSelectedImageAlt(altText);
        setIsImageModalOpen(true);
    };

    const handleShare = async () => {
        if (!opportunity) return;
        
        try {
            const url = new URL(window.location.href);
            const shareUrl = url.toString();
            const text = `${opportunity.programName}\nDeadline: ${opportunity.deadline || '—'}`;
            
            if (navigator.share) {
                await navigator.share({ title: opportunity.programName, text, url: shareUrl });
            } else if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(`${text}\n\n${shareUrl}`);
                messageService.success('Copied', 'Shareable link copied to clipboard', 2000);
            } else {
                const ta = document.createElement('textarea');
                ta.value = `${text}\n\n${shareUrl}`;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                messageService.success('Copied', 'Shareable link copied to clipboard', 2000);
            }
        } catch (e) {
            messageService.error('Share Failed', 'Unable to share link.');
        }
    };

    const handleApplyClick = async () => {
        setViewMode('apply');
        setLoadingQuestions(true);
        try {
            const questions = await questionBankService.getOpportunityQuestions(opportunityId);
            setOpportunityQuestions(questions);
        } catch (err) {
            console.error('Error loading application questions:', err);
            messageService.error('Error', 'Failed to load application questions.');
        } finally {
            setLoadingQuestions(false);
        }
    };

    const submitGuestApplication = async () => {
        if (!opportunityId) return;

        const requiredQuestions = opportunityQuestions.filter(q => q.isRequired);
        const missingRequired = requiredQuestions.filter(q => {
            const answer = questionAnswers.get(q.questionId);
            return !answer || answer.trim() === '';
        });
        if (missingRequired.length > 0) {
            messageService.warning('Missing Required Fields', 'Please fill in all required fields before submitting.');
            return;
        }
        if (!guestEmail.trim() || !guestEmail.includes('@')) {
            messageService.warning('Email Required', 'Please enter a valid email address.');
            return;
        }
        if (!pitchDeckUrl.trim()) {
            messageService.warning('Pitch Deck Required', 'Please provide a link to your pitch deck.');
            return;
        }

        setIsSubmittingGuestApp(true);
        try {
            const answersObj: Record<string, string> = {};
            questionAnswers.forEach((value, key) => { answersObj[key] = value; });

            const { error } = await supabase
                .from('guest_opportunity_applications')
                .insert({
                    opportunity_id: opportunityId,
                    email: guestEmail.trim().toLowerCase(),
                    startup_name: guestStartupName.trim() || null,
                    answers: answersObj,
                    pitch_deck_url: pitchDeckUrl.trim() || null,
                    pitch_video_url: pitchVideoUrl.trim() || null,
                });

            if (error) {
                if (error.code === '23505') {
                    messageService.warning('Already Applied', "You've already submitted an application with this email for this program.");
                } else {
                    throw error;
                }
                return;
            }

            // Best-effort confirmation email — never block showing the
            // "submitted" screen if this fails.
            try {
                await fetch('/api/invite', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'guest-application-confirmation',
                        email: guestEmail.trim().toLowerCase(),
                        startupName: guestStartupName.trim() || undefined,
                        programName: opportunity?.programName,
                        opportunityId,
                        redirectUrl: window.location.origin,
                    }),
                });
            } catch (emailErr) {
                console.warn('Guest application confirmation email failed (non-fatal):', emailErr);
            }

            setViewMode('submitted');
        } catch (err: any) {
            console.error('Error submitting guest application:', err);
            messageService.error('Submission Failed', err?.message || 'Failed to submit your application. Please try again.');
        } finally {
            setIsSubmittingGuestApp(false);
        }
    };

    const handleLogin = () => {
        // Redirect to login with opportunityId so user is taken to apply form after login
        const url = new URL(window.location.origin);
        url.searchParams.set('page', 'login');
        url.searchParams.set('opportunityId', opportunityId);
        window.location.href = url.toString();
    };

    const handleRegister = () => {
        // Redirect to register with opportunityId so user is taken to apply form after registration
        const url = new URL(window.location.origin);
        url.searchParams.set('page', 'register');
        url.searchParams.set('opportunityId', opportunityId);
        window.location.href = url.toString();
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const isPast = (dateStr: string) => new Date(dateStr) < new Date(todayStr);
    const isToday = (dateStr: string) => dateStr === todayStr;

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading program...</p>
                </div>
            </div>
        );
    }

    if (!opportunity) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-900 mb-4">Program Not Found</h1>
                    <p className="text-slate-600 mb-6">This program may have been removed or is no longer available.</p>
                    <Button onClick={() => { window.location.href = '/'; }}>Go Home</Button>
                </div>
            </div>
        );
    }

    if (viewMode === 'submitted') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
                <Card className="max-w-md w-full text-center">
                    <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h1>
                    <p className="text-slate-600 mb-6">
                        Your application to <span className="font-semibold">{opportunity.programName}</span> has been received.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                        <p className="text-sm text-blue-800">
                            Want to track your application, get updates, and manage your startup profile? Registering is optional but recommended — and if you register with the same email you just used, your answers will already be filled in.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button onClick={handleRegister} className="w-full">Register to Track My Application</Button>
                        <Button onClick={() => { window.location.href = '/'; }} variant="outline" className="w-full">Done, Maybe Later</Button>
                    </div>
                </Card>
            </div>
        );
    }

    if (viewMode === 'apply') {
        return (
            <div className="min-h-screen bg-slate-50">
                <div className="max-w-3xl mx-auto px-4 py-8">
                    <Button onClick={() => setViewMode('details')} variant="outline" className="mb-6">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <Card>
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-slate-900">Apply to {opportunity.programName}</h1>
                            <p className="text-sm text-slate-500 mt-1">
                                No account needed to apply. Already registered? <button onClick={handleLogin} className="text-brand-primary underline">Log in instead</button>.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input
                                    label="Your Email"
                                    type="email"
                                    required
                                    value={guestEmail}
                                    onChange={(e) => setGuestEmail(e.target.value)}
                                    placeholder="you@startup.com"
                                />
                                <Input
                                    label="Startup Name (optional)"
                                    type="text"
                                    value={guestStartupName}
                                    onChange={(e) => setGuestStartupName(e.target.value)}
                                />
                            </div>

                            {loadingQuestions ? (
                                <p className="text-sm text-slate-500 text-center py-4">Loading questions...</p>
                            ) : opportunityQuestions.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">This opportunity has no application questions.</p>
                            ) : (
                                <div className="border-t pt-4 space-y-4">
                                    <h4 className="text-md font-semibold text-slate-700">Application Questions</h4>
                                    {opportunityQuestions.map((oq) => {
                                        const question = oq.question;
                                        if (!question) return null;
                                        const answer = questionAnswers.get(oq.questionId) || '';

                                        const setAnswer = (value: string) => {
                                            const newMap = new Map(questionAnswers);
                                            newMap.set(oq.questionId, value);
                                            setQuestionAnswers(newMap);
                                        };

                                        return (
                                            <div key={oq.questionId} className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700">
                                                    {question.questionText}
                                                    {oq.isRequired && <span className="text-red-500 ml-1">*</span>}
                                                </label>
                                                {question.questionType === 'textarea' ? (
                                                    <textarea
                                                        value={answer}
                                                        onChange={(e) => setAnswer(e.target.value)}
                                                        className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary sm:text-sm"
                                                        rows={4}
                                                        required={oq.isRequired}
                                                    />
                                                ) : (question.questionType === 'select' || question.questionType === 'multiselect') && (!oq.selectionType || oq.selectionType === 'single') ? (
                                                    (() => {
                                                        const displayValue = isOtherValue(answer) ? OTHER_OPTION : answer;
                                                        const otherText = isOtherValue(answer) ? parseOtherText(answer) : '';
                                                        return (
                                                            <>
                                                                <select
                                                                    value={displayValue}
                                                                    onChange={(e) => setAnswer(e.target.value === OTHER_OPTION ? encodeOtherAnswer('') : e.target.value)}
                                                                    className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary sm:text-sm"
                                                                    required={oq.isRequired}
                                                                >
                                                                    <option value="">Select an option</option>
                                                                    {question.options?.map((option, idx) => (
                                                                        <option key={idx} value={option}>{option}</option>
                                                                    ))}
                                                                </select>
                                                                {displayValue === OTHER_OPTION && (
                                                                    <Input type="text" placeholder="Please specify" value={otherText} onChange={(e) => setAnswer(encodeOtherAnswer(e.target.value))} className="mt-2" />
                                                                )}
                                                            </>
                                                        );
                                                    })()
                                                ) : (question.questionType === 'select' || question.questionType === 'multiselect') && oq.selectionType === 'multiple' ? (
                                                    (() => {
                                                        const selectedOptions = answer ? answer.split(',').filter(v => v.trim()) : [];
                                                        const otherSegment = selectedOptions.find(isOtherValue);
                                                        const isOtherChecked = !!otherSegment;
                                                        const otherText = otherSegment ? parseOtherText(otherSegment) : '';
                                                        return (
                                                            <div className="space-y-2">
                                                                {question.options?.map((option, idx) => {
                                                                    if (option === OTHER_OPTION) {
                                                                        return (
                                                                            <div key={idx} className="space-y-2">
                                                                                <label className="flex items-center gap-2">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={isOtherChecked}
                                                                                        onChange={(e) => {
                                                                                            const withoutOther = selectedOptions.filter(v => !isOtherValue(v));
                                                                                            setAnswer(e.target.checked
                                                                                                ? [...withoutOther, encodeOtherAnswer('')].join(',')
                                                                                                : withoutOther.join(','));
                                                                                        }}
                                                                                        className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-slate-300 rounded"
                                                                                    />
                                                                                    <span className="text-sm text-slate-700">Other</span>
                                                                                </label>
                                                                                {isOtherChecked && (
                                                                                    <Input type="text" placeholder="Please specify" value={otherText} onChange={(e) => {
                                                                                        const withoutOther = selectedOptions.filter(v => !isOtherValue(v));
                                                                                        setAnswer([...withoutOther, encodeOtherAnswer(e.target.value)].join(','));
                                                                                    }} className="ml-6" />
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    }
                                                                    const isChecked = selectedOptions.includes(option);
                                                                    return (
                                                                        <label key={idx} className="flex items-center gap-2">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                onChange={(e) => {
                                                                                    let selected = [...selectedOptions];
                                                                                    if (e.target.checked) {
                                                                                        if (!selected.includes(option)) selected.push(option);
                                                                                    } else {
                                                                                        selected = selected.filter(v => v !== option);
                                                                                    }
                                                                                    setAnswer(selected.join(','));
                                                                                }}
                                                                                className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-slate-300 rounded"
                                                                            />
                                                                            <span className="text-sm text-slate-700">{option}</span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    })()
                                                ) : question.questionType === 'number' ? (
                                                    <Input type="number" value={answer} onChange={(e) => setAnswer(e.target.value)} required={oq.isRequired} />
                                                ) : question.questionType === 'date' ? (
                                                    <Input type="date" value={answer} onChange={(e) => setAnswer(e.target.value)} required={oq.isRequired} />
                                                ) : (
                                                    <Input type="text" value={answer} onChange={(e) => setAnswer(e.target.value)} required={oq.isRequired} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="border-t pt-4 space-y-4">
                                <Input
                                    label="Pitch Deck Link"
                                    type="url"
                                    required
                                    value={pitchDeckUrl}
                                    onChange={(e) => setPitchDeckUrl(e.target.value)}
                                    placeholder="https://drive.google.com/... or any shareable link"
                                />
                                <Input
                                    label="Pitch Video (optional)"
                                    type="url"
                                    value={pitchVideoUrl}
                                    onChange={(e) => setPitchVideoUrl(e.target.value)}
                                    placeholder="https://youtube.com/... or https://vimeo.com/..."
                                />
                            </div>

                            <Button onClick={submitGuestApplication} disabled={isSubmittingGuestApp} className="w-full">
                                {isSubmittingGuestApp ? 'Submitting...' : 'Submit Application'}
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex items-center gap-4 mb-6">
                    <Button onClick={() => { window.location.href = '/'; }} variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Home
                    </Button>
                    <Button onClick={handleShare} variant="outline">
                        <Share2 className="h-4 w-4 mr-2" />
                        Share Program
                    </Button>
                </div>

                <Card className="!p-0 overflow-hidden">
                    {(() => {
                        const embed = getYoutubeEmbedUrl(opportunity.videoUrl || undefined);
                        if (embed) return (
                            <div className="relative w-full aspect-video bg-slate-800">
                                <iframe 
                                    src={embed} 
                                    title={`Video for ${opportunity.programName}`} 
                                    frameBorder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowFullScreen 
                                    className="absolute top-0 left-0 w-full h-full"
                                />
                            </div>
                        );
                        if (opportunity.posterUrl) return (
                            <img 
                                src={toDirectImageUrl(opportunity.posterUrl) || opportunity.posterUrl} 
                                alt={`${opportunity.programName} poster`} 
                                className="w-full h-64 object-contain bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity" 
                                onClick={() => openImageModal(opportunity.posterUrl!, `${opportunity.programName} poster`)}
                            />
                        );
                        return null;
                    })()}
                    
                    <div className="p-6 md:p-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-4">
                                <p className="text-sm font-semibold text-brand-primary">{opportunity.facilitatorName || 'Program Facilitator'}</p>
                                <h1 className="text-3xl font-bold text-slate-800">{opportunity.programName}</h1>
                                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{opportunity.description}</p>
                            </div>
                            
                            <div className="space-y-4">
                                <Card className="bg-slate-50/70 !shadow-none border">
                                    <h3 className="text-lg font-semibold text-slate-700 mb-3">About {opportunity.facilitatorName || 'Program Facilitator'}</h3>
                                    <p className="text-sm text-slate-600 mb-4">Programs from our facilitator network.</p>
                                </Card>
                                
                                <div className="border-t pt-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Calendar className="h-4 w-4 text-slate-500" />
                                        <p className="text-sm text-slate-500">
                                            Application Deadline: <span className="font-semibold text-slate-700">{opportunity.deadline}</span>
                                        </p>
                                    </div>
                                    
                                    {isToday(opportunity.deadline) && (
                                        <div className="mb-4 inline-block px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-medium">
                                            Applications closing today
                                        </div>
                                    )}
                                    
                                    {!isPast(opportunity.deadline) ? (
                                        <Button 
                                            onClick={handleApplyClick}
                                            className="w-full"
                                        >
                                            Apply for Program
                                        </Button>
                                    ) : (
                                        <Button className="w-full" variant="secondary" disabled>
                                            Application closed
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Image Modal */}
            <Modal isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} title={selectedImageAlt}>
                <div className="text-center">
                    <img 
                        src={selectedImageUrl} 
                        alt={selectedImageAlt} 
                        className="max-w-full max-h-96 mx-auto rounded-lg"
                    />
                </div>
            </Modal>
        </div>
    );
};

export default PublicProgramView;

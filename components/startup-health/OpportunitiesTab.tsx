import React, { useEffect, useMemo, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import CloudDriveInput from '../ui/CloudDriveInput';
import { Zap, Check, Video, MessageCircle, CreditCard, Download, FileText, Share2, Eye, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { messageService } from '../../lib/messageService';
import Modal from '../ui/Modal';
import { getQueryParam, setQueryParam } from '../../lib/urlState';
import { adminProgramsService, AdminProgramPost } from '../../lib/adminProgramsService';
import { toDirectImageUrl } from '../../lib/imageUrl';
import ReferenceApplicationDraft from '../ReferenceApplicationDraft';
import DraftAnswersView from '../DraftAnswersView';
import { questionBankService, OpportunityQuestion, StartupAnswer } from '../../lib/questionBankService';
import { storageService } from '../../lib/storage';
import FeatureGuard from '../FeatureGuard';
import UpgradePrompt from '../UpgradePrompt';
import { featureAccessService } from '../../lib/featureAccessService';
import SubscriptionPlansPage from '../SubscriptionPlansPage';

interface StartupRef {
    id: number;
    name: string;
}

interface OpportunityItem {
    id: string;
    programName: string;
    description: string;
    deadline: string;
    posterUrl?: string;
    videoUrl?: string;
    facilitatorName?: string;
}

interface ApplicationItem {
    id: string;
    startupId: number;
    opportunityId: string;
    status: 'pending' | 'accepted' | 'rejected';
    pitchDeckUrl?: string;
    pitchVideoUrl?: string;
}

interface OpportunitiesTabProps {
    startup: StartupRef;
    crmRef?: React.RefObject<{ 
      addProgramToCRM: (programData: { programName: string; programType?: 'Grant' | 'Incubation' | 'Acceleration' | 'Mentorship' | 'Bootcamp'; description?: string; programUrl?: string; facilitatorName?: string }) => void;
    }>;
    onProgramAddedToCRM?: () => void;
    authUserId?: string; // Optional: auth_user_id for feature checks
}

 const SECTOR_OPTIONS = [
    'Agriculture',
    'AI',
    'Climate',
    'Consumer Goods',
    'Defence',
    'E-commerce',
    'Education',
    'EV',
    'Finance',
    'Food & Beverage',
    'Healthcare',
    'Manufacturing',
    'Media & Entertainment',
    'Others',
    'PaaS',
    'Renewable Energy',
    'Retail',
    'SaaS',
    'Social Impact',
    'Space',
    'Transportation and Logistics',
    'Waste Management',
    'Web 3.0'
];
 
 const STAGE_OPTIONS = [
     'Ideation',
     'Proof of Concept',
     'Minimum viable product',
     'Product market fit',
     'Scaling'
 ];

const OpportunitiesTab: React.FC<OpportunitiesTabProps> = ({ startup, crmRef, onProgramAddedToCRM, authUserId: propAuthUserId }) => {
    const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
    const [applications, setApplications] = useState<ApplicationItem[]>([]);
    const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityItem | null>(null);
    const [adminPosts, setAdminPosts] = useState<AdminProgramPost[]>([]);
    const [authUserId, setAuthUserId] = useState<string>(propAuthUserId || '');
    
    // Get auth_user_id if not provided as prop
    useEffect(() => {
        if (!propAuthUserId) {
            const getAuthUserId = async () => {
                try {
                    const { data: { user: authUser } } = await supabase.auth.getUser();
                    if (authUser?.id) {
                        setAuthUserId(authUser.id);
                    }
                } catch (error) {
                    console.error('Error getting auth user ID:', error);
                }
            };
            getAuthUserId();
        }
    }, [propAuthUserId]);
    
    // Per-application apply modal state
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [applyingOppId, setApplyingOppId] = useState<string | null>(null);
    const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);
    // Track which opp was auto-opened in sessionStorage to prevent re-opening across re-renders
    const getAutoOpenedOppId = () => sessionStorage.getItem('autoOpenedGrantOppId');
    const setAutoOpenedOppIdInStorage = (id: string | null) => {
        if (id) {
            sessionStorage.setItem('autoOpenedGrantOppId', id);
        } else {
            sessionStorage.removeItem('autoOpenedGrantOppId');
        }
    };

    // Handlers to upload pitch deck and pitch video files (or accept cloud links)
    const handlePitchDeckFileSelect = async (file: File) => {
        setPitchDeckUploadError(null);
        setIsUploadingPitchDeck(true);
        try {
            const res = await storageService.uploadPitchDeck(file, String(startup.id));
            if (res.success && res.url) {
                setPitchDeckUrl(res.url);
                messageService.success('Uploaded', 'Pitch deck uploaded successfully', 2000);
            } else {
                const err = res.error || 'Upload failed';
                setPitchDeckUploadError(err);
                messageService.error('Upload Failed', err);
            }
        } catch (err: any) {
            console.error('Pitch deck upload error:', err);
            setPitchDeckUploadError(err?.message || 'Upload failed');
            messageService.error('Upload Failed', err?.message || 'Failed to upload pitch deck');
        } finally {
            setIsUploadingPitchDeck(false);
        }
    };

    // Pitch video is URL-only; no file upload handler required
    // Image modal state
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
    const [selectedImageAlt, setSelectedImageAlt] = useState<string>('');
    // Reference Application Draft modal state
    const [isReferenceDraftModalOpen, setIsReferenceDraftModalOpen] = useState(false);
    // Draft Answers modal state
    const [isDraftAnswersModalOpen, setIsDraftAnswersModalOpen] = useState(false);
    // Application questions state
    const [opportunityQuestions, setOpportunityQuestions] = useState<OpportunityQuestion[]>([]);
    const [questionAnswers, setQuestionAnswers] = useState<Map<string, string>>(new Map());
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [portfolioUrl, setPortfolioUrl] = useState('');
    const [startupWebsiteUrl, setStartupWebsiteUrl] = useState<string | null>(null);
    const [pitchDeckUrl, setPitchDeckUrl] = useState<string>('');
    const [pitchVideoUrl, setPitchVideoUrl] = useState<string>('');
    const [isUploadingPitchDeck, setIsUploadingPitchDeck] = useState(false);
    const [pitchDeckUploadError, setPitchDeckUploadError] = useState<string | null>(null);
    

    useEffect(() => {
        let mounted = true;
        (async () => {
            // Load opportunities posted by facilitators
            const { data, error } = await supabase
                .from('incubation_opportunities')
                .select('*')
                .order('created_at', { ascending: false });
            if (!mounted) return;
            if (!error && Array.isArray(data)) {
                const mapped: OpportunityItem[] = data.map((row: any) => ({
                    id: row.id,
                    programName: row.program_name,
                    description: row.description || '',
                    deadline: row.deadline || '',
                    posterUrl: row.poster_url || undefined,
                    videoUrl: row.video_url || undefined,
                    facilitatorName: 'Program Facilitator'
                }));
                setOpportunities(mapped);
            }

            // Load applications for this startup
            const { data: apps } = await supabase
                .from('opportunity_applications')
                .select('*')
                .eq('startup_id', startup.id);
            if (Array.isArray(apps)) {
                setApplications(apps.map((a: any) => ({ 
                    id: a.id, 
                    startupId: a.startup_id, 
                    opportunityId: a.opportunity_id, 
                    status: (a.status || 'pending') as any,
                    pitchDeckUrl: a.pitch_deck_url || undefined,
                    pitchVideoUrl: a.pitch_video_url || undefined
                })));
            }

            // One-time pitch materials removed; per-application upload handled in modal
            try {
                const posts = await adminProgramsService.listActive();
                if (mounted) setAdminPosts(posts);
            } catch (e) {
                console.warn('Failed to load admin program posts', e);
                if (mounted) setAdminPosts([]);
            }
        })();
        return () => { 
            mounted = false;
            // Cleanup when component unmounts or startup changes
            // Close any open forms and reset state
            setIsApplyModalOpen(false);
            setApplyingOppId(null);
        };
    }, [startup.id]);

    const appliedIds = useMemo(() => new Set(applications.map(a => a.opportunityId)), [applications]);

    const todayStr = new Date().toISOString().split('T')[0];
    const isPast = (dateStr: string) => new Date(dateStr) < new Date(todayStr);
    const isToday = (dateStr: string) => dateStr === todayStr;

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

    // One-time pitch materials functions removed

    const openApplyModal = async (opportunityId: string) => {
        if (appliedIds.has(opportunityId)) return;
        setApplyingOppId(opportunityId);
        setQuestionAnswers(new Map());
        setPortfolioUrl('');
        setIsApplyModalOpen(true);
        
        // Generate public fundraising card URL (if startup has active fundraising)
        try {
            const { data: fundraisingData } = await supabase
                .from('fundraising_details')
                .select('active')
                .eq('startup_id', startup.id)
                .eq('active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            
            if (fundraisingData?.active) {
                // Generate public fundraising card URL
                const { createSlug, createProfileUrl } = await import('../../lib/slugUtils');
                const startupName = startup.name || 'Startup';
                const slug = createSlug(startupName);
                const baseUrl = window.location.origin;
                const fundraisingCardUrl = createProfileUrl(baseUrl, 'startup', slug, String(startup.id));
                
                setStartupWebsiteUrl(fundraisingCardUrl);
                setPortfolioUrl(fundraisingCardUrl);
            } else {
                setStartupWebsiteUrl(null);
                setPortfolioUrl('');
            }
        } catch (error) {
            console.error('Failed to generate fundraising card URL:', error);
            setStartupWebsiteUrl(null);
            setPortfolioUrl('');
        }
        
        // Load questions for this opportunity
        try {
            setLoadingQuestions(true);
            const questions = await questionBankService.getOpportunityQuestions(opportunityId);
            setOpportunityQuestions(questions);
            
            // Auto-fill answers from saved answers (draft) - Only for Basic/Premium users
            let canUseDrafts = false;
            if (authUserId) {
                try {
                    canUseDrafts = await featureAccessService.canAccessFeature(authUserId, 'grants_draft');
                } catch (error) {
                    console.error('Error checking draft access:', error);
                }
            }
            
            if (canUseDrafts && questions.length > 0) {
                const answersMap = new Map<string, string>();
                for (const q of questions) {
                    if (q.questionId) {
                        try {
                            const savedAnswer = await questionBankService.getStartupAnswer(startup.id, q.questionId);
                            if (savedAnswer) {
                                answersMap.set(q.questionId, savedAnswer.answerText);
                            }
                        } catch (error) {
                            // Answer doesn't exist, skip
                        }
                    }
                }
                
                    // If portfolio URL is available and there's a matching question, auto-fill it
                    if (portfolioUrl && portfolioUrl.trim()) {
                        const portfolioQuestion = questions.find(q => 
                            q.question?.questionText.toLowerCase().includes('portfolio') ||
                            q.question?.questionText.toLowerCase().includes('website') ||
                            q.question?.questionText.toLowerCase().includes('url') ||
                            q.question?.questionText.toLowerCase().includes('link')
                        );
                        
                        if (portfolioQuestion && !answersMap.has(portfolioQuestion.questionId)) {
                            answersMap.set(portfolioQuestion.questionId, portfolioUrl);
                        }
                    }
                    
                    setQuestionAnswers(answersMap);
                }
        } catch (error: any) {
            console.error('Failed to load questions:', error);
            // Don't show error, just continue without questions
        } finally {
            setLoadingQuestions(false);
        }
    };

    // Sync selected opportunity with URL (?opportunityId=...)
    useEffect(() => {
        const fromQuery = getQueryParam('opportunityId');
        if (fromQuery && opportunities.length > 0 && !selectedOpportunity) {
            const match = opportunities.find(o => o.id === fromQuery);
            if (match) {
                setSelectedOpportunity(match);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opportunities]);

    // Auto-open application form if user just logged in to apply for a program
    useEffect(() => {
        if (opportunities.length === 0) return;
        
        // Check if this opportunity was already auto-opened
        const alreadyAutoOpened = getAutoOpenedOppId();
        if (alreadyAutoOpened) {
            console.log('🎯 Opportunity already auto-opened, skipping:', alreadyAutoOpened);
            return; // Skip if already opened
        }
        
        // Check sessionStorage first (for post-login redirect)
        let opportunityIdToOpen = sessionStorage.getItem('applyToOpportunityId');
        
        // If not in sessionStorage, check URL parameter
        if (!opportunityIdToOpen) {
            opportunityIdToOpen = getQueryParam('opportunityId');
        }
        
        if (opportunityIdToOpen && !isApplyModalOpen) {
            const targetOpportunity = opportunities.find(o => o.id === opportunityIdToOpen);
            if (targetOpportunity && !appliedIds.has(opportunityIdToOpen)) {
                console.log('🎯 Auto-opening application form for opportunity:', opportunityIdToOpen);
                // Auto-open the application form
                openApplyModal(opportunityIdToOpen);
                // Mark this opportunity as auto-opened to prevent re-triggering
                setAutoOpenedOppIdInStorage(opportunityIdToOpen);
                // Clear the session storage item so it doesn't open again
                sessionStorage.removeItem('applyToOpportunityId');
                // Remove opportunityId, programName, and tab from URL to prevent re-opening when modal closes
                const url = new URL(window.location.href);
                url.searchParams.delete('opportunityId');
                url.searchParams.delete('programName');
                url.searchParams.delete('tab');
                window.history.replaceState({}, document.title, url.toString());
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opportunities, isApplyModalOpen, appliedIds]);

    useEffect(() => {
        // Only set the query param if selectedOpportunity has a value
        // Don't clear it if selectedOpportunity is empty - let the initial URL param persist
        if (selectedOpportunity?.id) {
            setQueryParam('opportunityId', selectedOpportunity.id, true);
        }
    }, [selectedOpportunity]);

    const handleShareOpportunity = async (opp: OpportunityItem) => {
        try {
            const url = new URL(window.location.origin);
            url.searchParams.set('view', 'program');
            url.searchParams.set('opportunityId', opp.id);
            const shareUrl = url.toString();
            const text = `${opp.programName}\nDeadline: ${opp.deadline || '—'}`;
            if (navigator.share) {
                await navigator.share({ title: opp.programName, text, url: shareUrl });
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

    const handleShareAdminProgram = async (program: AdminProgramPost) => {
        try {
            const url = new URL(window.location.origin);
            url.searchParams.set('view', 'admin-program');
            url.searchParams.set('programId', program.id);
            const shareUrl = url.toString();
            const text = `${program.programName}\nDeadline: ${program.deadline || '—'}`;
            if (navigator.share) {
                await navigator.share({ title: program.programName, text, url: shareUrl });
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

    const handlePaymentSuccess = () => {
        // Refresh applications to show updated payment status
        window.location.reload();
    };

    const openImageModal = (imageUrl: string, altText: string) => {
        setSelectedImageUrl(toDirectImageUrl(imageUrl) || imageUrl);
        setSelectedImageAlt(altText);
        setIsImageModalOpen(true);
    };


    const submitApplication = async () => {
        if (!applyingOppId) return;

        // Validate required questions
        const requiredQuestions = opportunityQuestions.filter(q => q.isRequired);
        const missingRequired = requiredQuestions.filter(q => {
            const answer = questionAnswers.get(q.questionId);
            return !answer || answer.trim() === '';
        });

        if (missingRequired.length > 0) {
            messageService.warning(
                'Required Questions',
                `Please answer all required questions (${missingRequired.length} missing).`
            );
            return;
        }

        // Check if there are any questions at all
        if (opportunityQuestions.length === 0) {
            messageService.warning(
                'No Questions',
                'This opportunity has no application questions. Please contact the facilitator.'
            );
            return;
        }

        setIsSubmittingApplication(true);
        try {
            // Create application record (minimal - questions will be saved separately)
            const { data, error } = await supabase
                .from('opportunity_applications')
                .insert({
                    startup_id: startup.id,
                    opportunity_id: applyingOppId,
                    status: 'pending',
                    pitch_deck_url: pitchDeckUrl || null,
                    pitch_video_url: pitchVideoUrl || null
                })
                .select()
                .single();
            if (error) throw error;

            // Save all question responses
            if (opportunityQuestions.length > 0 && questionAnswers.size > 0) {
                const responses = opportunityQuestions
                    .filter(q => questionAnswers.has(q.questionId))
                    .map(q => ({
                        questionId: q.questionId,
                        answerText: questionAnswers.get(q.questionId) || ''
                    }))
                    .filter(r => r.answerText.trim() !== '');
                
                if (responses.length > 0) {
                    // Save to application responses (for this specific application)
                    await questionBankService.saveApplicationResponses(data.id, responses);
                    
                    // Also save to startup_application_answers (draft) for future use
                    // This updates the draft with new questions/answers
                    await Promise.allSettled(
                        responses.map(response => 
                            questionBankService.saveStartupAnswer(startup.id, response.questionId, response.answerText)
                        )
                    );
                }
            }

            // Save portfolio URL as a draft answer if it was provided
            // This will be available for future applications
            if (portfolioUrl.trim()) {
                // Try to find a portfolio/website question in the opportunity
                const portfolioQuestion = opportunityQuestions.find(q => 
                    q.question?.questionText.toLowerCase().includes('portfolio') ||
                    q.question?.questionText.toLowerCase().includes('website') ||
                    q.question?.questionText.toLowerCase().includes('url') ||
                    q.question?.questionText.toLowerCase().includes('link')
                );
                
                if (portfolioQuestion && !questionAnswers.has(portfolioQuestion.questionId)) {
                    // If there's a portfolio question and user hasn't answered it, save the portfolio URL
                    await questionBankService.saveStartupAnswer(startup.id, portfolioQuestion.questionId, portfolioUrl.trim());
                    
                    // Also add it to application responses
                    await questionBankService.saveApplicationResponses(data.id, [{
                        questionId: portfolioQuestion.questionId,
                        answerText: portfolioUrl.trim()
                    }]);
                }
            }

            setApplications(prev => [...prev, {
                id: data.id,
                startupId: startup.id,
                opportunityId: applyingOppId,
                status: 'pending',
                pitchDeckUrl: data.pitch_deck_url || pitchDeckUrl || undefined,
                pitchVideoUrl: data.pitch_video_url || pitchVideoUrl || undefined
            }]);

            setIsApplyModalOpen(false);
            setApplyingOppId(null);
            setOpportunityQuestions([]);
            setQuestionAnswers(new Map());
            setPortfolioUrl('');
            setStartupWebsiteUrl(null);
            setPitchDeckUrl('');
            setPitchVideoUrl('');
            setPitchDeckUploadError(null);

            const successMessage = document.createElement('div');
            successMessage.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            successMessage.innerHTML = `
                <div class="bg-white rounded-lg p-6 max-w-sm mx-4 text-center">
                    <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">Application Submitted!</h3>
                    <p class="text-gray-600 mb-4">Your application has been sent to the facilitator.</p>
                    <button onclick="this.parentElement.parentElement.remove()" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                        Continue
                    </button>
                </div>
            `;
            document.body.appendChild(successMessage);
        } catch (e:any) {
            console.error('Failed to submit application:', e);
            messageService.error(
              'Submission Failed',
              'Failed to submit application. ' + (e.message || '')
            );
        } finally {
            setIsSubmittingApplication(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Programs</h2>
                    <p className="text-slate-600">Explore accelerator programs and other programs posted by our network of facilitation centers.</p>
                </div>
                {/* Draft buttons - shown but disabled for free users */}
                <div className="flex gap-2 flex-wrap">
                    <DraftButton 
                        feature="grants_draft"
                        userId={authUserId}
                        onClick={() => setIsDraftAnswersModalOpen(true)}
                        label="Draft"
                        icon={<FileText className="h-4 w-4 mr-2" />}
                    />
                    <DraftButton 
                        feature="grants_draft"
                        userId={authUserId}
                        onClick={() => setIsReferenceDraftModalOpen(true)}
                        label="Reference Application Draft"
                        icon={<FileText className="h-4 w-4 mr-2" />}
                    />
                </div>
            </div>

            {/* One-time Pitch Materials Section removed - per-application modal handles uploads */}

            {selectedOpportunity ? (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Button onClick={() => setSelectedOpportunity(null)} variant="secondary">Back</Button>
                        <Button onClick={() => handleShareOpportunity(selectedOpportunity)} variant="outline" title="Share program">
                            <Share2 className="h-4 w-4" />
                        </Button>
                    </div>
                    <Card className="!p-0 overflow-hidden">
                        {(() => {
                            const embed = getYoutubeEmbedUrl(selectedOpportunity.videoUrl || undefined);
                            if (embed) return (
                                <div className="relative w-full aspect-video bg-slate-800">
                                    <iframe src={embed} title={`Video for ${selectedOpportunity.programName}`} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="absolute top-0 left-0 w-full h-full"></iframe>
                                </div>
                            );
                            if (selectedOpportunity.posterUrl) return (
                                <img 
                                    src={toDirectImageUrl(selectedOpportunity.posterUrl) || selectedOpportunity.posterUrl} 
                                    alt={`${selectedOpportunity.programName} poster`} 
                                    className="w-full h-64 object-contain bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity" 
                                    onClick={() => openImageModal(selectedOpportunity.posterUrl!, `${selectedOpportunity.programName} poster`)}
                                />
                            );
                            return null;
                        })()}
                        <div className="p-6 md:p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-4">
                                    <p className="text-sm font-semibold text-brand-primary">{selectedOpportunity.facilitatorName || 'Program Facilitator'}</p>
                                    <h2 className="text-3xl font-bold text-slate-800">{selectedOpportunity.programName}</h2>
                                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedOpportunity.description}</p>
                                </div>
                                <div className="space-y-4">
                                    <Card className="bg-slate-50/70 !shadow-none border">
                                        <h3 className="text-lg font-semibold text-slate-700 mb-3">About {selectedOpportunity.facilitatorName || 'Program Facilitator'}</h3>
                                        <p className="text-sm text-slate-600 mb-4">Programs from our facilitator network.</p>
                                    </Card>
                                    <div className="border-t pt-4">
                                        <p className="text-sm text-slate-500">Application Deadline: <span className="font-semibold text-slate-700">{selectedOpportunity.deadline}</span></p>
                                        {isToday(selectedOpportunity.deadline) && (
                                            <div className="mt-2 inline-block px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-medium">
                                                Applications closing today
                                            </div>
                                        )}
                                        {!appliedIds.has(selectedOpportunity.id) ? (
                                            !isPast(selectedOpportunity.deadline) ? (
                                                <Button 
                                                    type="button" 
                                                    className="w-full mt-3" 
                                                    onClick={() => openApplyModal(selectedOpportunity.id)}
                                                >
                                                    <Zap className="h-4 w-4 mr-2" /> Apply for Program
                                                </Button>
                                            ) : (
                                                <Button type="button" className="w-full mt-3" variant="secondary" disabled>
                                                    Application closed
                                                </Button>
                                            )
                                        ) : (
                                            <Button type="button" className="w-full mt-3" variant="secondary" disabled>
                                                <Check className="h-4 w-4 mr-2" /> You have applied for this program
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            ) : opportunities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {opportunities.map(opp => {
                        const embedUrl = getYoutubeEmbedUrl(opp.videoUrl);
                        const hasApplied = appliedIds.has(opp.id);
                        const canApply = !isPast(opp.deadline);
                        return (
                            <Card key={opp.id} className="flex flex-col !p-0 overflow-hidden">
                                {embedUrl ? (
                                    <div className="relative w-full aspect-video bg-slate-800">
                                        <iframe src={embedUrl} title={`Video for ${opp.programName}`} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="absolute top-0 left-0 w-full h-full"></iframe>
                                    </div>
                                ) : opp.posterUrl ? (
                                    <img 
                                        src={toDirectImageUrl(opp.posterUrl) || opp.posterUrl} 
                                        alt={`${opp.programName} poster`} 
                                        className="w-full h-40 object-contain bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity" 
                                        onClick={() => openImageModal(opp.posterUrl!, `${opp.programName} poster`)}
                                    />
                                ) : (
                                    <div className="w-full h-40 bg-slate-200 flex items-center justify-center text-slate-500">
                                        <Video className="h-10 w-10" />
                                    </div>
                                )}
                                <div className="p-4 flex flex-col flex-grow">
                                    <div className="flex-grow">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="text-sm font-medium text-brand-primary">{opp.facilitatorName || 'Program Facilitator'}</p>
                                                <h3 className="text-lg font-semibold text-slate-800 mt-1 cursor-pointer hover:text-brand-primary transition-colors" onClick={() => setSelectedOpportunity(opp)}>
                                                    {opp.programName}
                                                </h3>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                title="Share program"
                                                onClick={() => handleShareOpportunity(opp)}
                                            >
                                                <Share2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <p className="text-sm text-slate-500 mt-2 mb-4">{opp.description.substring(0, 100)}...</p>
                                    </div>
                                    <div className="border-t pt-4 mt-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-slate-500">Deadline: <span className="font-semibold">{opp.deadline}</span></p>
                                            {isToday(opp.deadline) && (
                                                <span className="ml-2 inline-block px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 text-[10px] font-medium whitespace-nowrap">Applications closing today</span>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-2 mt-3">
                                            <div className="flex gap-2">
                                                <Button 
                                                    type="button" 
                                                    variant="outline"
                                                    className="flex-1" 
                                                    onClick={() => {
                                                        const url = new URL(window.location.origin);
                                                        url.searchParams.set('view', 'program');
                                                        url.searchParams.set('opportunityId', opp.id);
                                                        window.location.href = url.toString();
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View
                                                </Button>
                                                {crmRef && (
                                                    <CrmButton
                                                        feature="grants_add_to_crm"
                                                        userId={authUserId}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (crmRef.current) {
                                                                // Determine program type from facilitator name or default to Grant
                                                                let programType: 'Grant' | 'Incubation' | 'Acceleration' | 'Mentorship' | 'Bootcamp' = 'Grant';
                                                                const facilitatorLower = (opp.facilitatorName || '').toLowerCase();
                                                                if (facilitatorLower.includes('incubation') || facilitatorLower.includes('incubator')) {
                                                                    programType = 'Incubation';
                                                                } else if (facilitatorLower.includes('accelerat')) {
                                                                    programType = 'Acceleration';
                                                                } else if (facilitatorLower.includes('mentor')) {
                                                                    programType = 'Mentorship';
                                                                } else if (facilitatorLower.includes('bootcamp')) {
                                                                    programType = 'Bootcamp';
                                                                }
                                                                
                                                                // Construct view URL for the opportunity
                                                                const viewUrl = new URL(window.location.origin);
                                                                viewUrl.searchParams.set('view', 'program');
                                                                viewUrl.searchParams.set('opportunityId', opp.id);
                                                                
                                                                crmRef.current.addProgramToCRM({
                                                                    programName: opp.programName,
                                                                    programType: programType,
                                                                    description: opp.description,
                                                                    facilitatorName: opp.facilitatorName,
                                                                    programUrl: viewUrl.toString(),
                                                                });
                                                                if (onProgramAddedToCRM) {
                                                                    onProgramAddedToCRM();
                                                                }
                                                            } else {
                                                                messageService.warning('CRM Not Ready', 'Please wait a moment and try again.', 2000);
                                                            }
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            {!hasApplied ? (
                                                canApply ? (
                                                    <Button 
                                                        type="button" 
                                                        className="w-full" 
                                                        onClick={() => openApplyModal(opp.id)}
                                                    >
                                                        <Zap className="h-4 w-4 mr-2" /> Apply
                                                    </Button>
                                                ) : (
                                                    <Button type="button" className="w-full" variant="secondary" disabled>
                                                        Closed
                                                    </Button>
                                                )
                                            ) : (
                                                <Button type="button" className="w-full" variant="secondary" disabled>
                                                    <Check className="h-4 w-4 mr-2" /> Applied
                                                </Button>
                                            )}
                                        </div>
                                        {/* per-application materials are collected in modal; no prerequisite */}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card className="text-center py-12">
                    <h3 className="text-xl font-semibold">No Opportunities Available</h3>
                    <p className="text-slate-500 mt-2">Please check back later for new programs and offerings.</p>
                </Card>
            )}

            {/* Other Program subsection (Admin posted programs as cards) */}
            <div className="space-y-3 sm:space-y-4">
                <h3 className="text-lg font-semibold text-slate-700">Other Program</h3>
                {adminPosts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {adminPosts.map(p => (
                            <Card key={p.id} className="flex flex-col !p-0 overflow-hidden">
                                {p.posterUrl ? (
                                    <img 
                                        src={toDirectImageUrl(p.posterUrl) || p.posterUrl} 
                                        alt={`${p.programName} poster`} 
                                        className="w-full h-40 object-contain bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => openImageModal(p.posterUrl!, `${p.programName} poster`)}
                                    />
                                ) : (
                                    <div className="w-full h-40 bg-slate-200 flex items-center justify-center text-slate-500">
                                        <Video className="h-10 w-10" />
                                    </div>
                                )}
                                <div className="p-4 flex flex-col flex-grow">
                                    <div className="flex-grow">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="text-sm font-medium text-brand-primary">{p.incubationCenter}</p>
                                                <h3 className="text-lg font-semibold text-slate-800 mt-1">{p.programName}</h3>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                title="Share program"
                                                onClick={() => handleShareAdminProgram(p)}
                                            >
                                                <Share2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2 line-clamp-3">
                                            {p.description || 'Admin curated program'}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-2">Deadline: <span className="font-semibold">{p.deadline}</span></p>
                                    </div>
                                    <div className="border-t pt-4 mt-4">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex gap-2">
                                                <Button 
                                                    type="button"
                                                    variant="outline"
                                                    className="flex-1"
                                                    onClick={() => {
                                                        const url = new URL(window.location.origin);
                                                        url.searchParams.set('view', 'admin-program');
                                                        url.searchParams.set('programId', p.id);
                                                        window.location.href = url.toString();
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View
                                                </Button>
                                                {crmRef && (
                                                    <CrmButton
                                                        feature="grants_add_to_crm"
                                                        userId={authUserId}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (crmRef.current) {
                                                                // Determine program type from incubation center name or default to Grant
                                                                let programType: 'Grant' | 'Incubation' | 'Acceleration' | 'Mentorship' | 'Bootcamp' = 'Grant';
                                                                const centerLower = (p.incubationCenter || '').toLowerCase();
                                                                if (centerLower.includes('incubation') || centerLower.includes('incubator')) {
                                                                    programType = 'Incubation';
                                                                } else if (centerLower.includes('accelerat')) {
                                                                    programType = 'Acceleration';
                                                                } else if (centerLower.includes('mentor')) {
                                                                    programType = 'Mentorship';
                                                                } else if (centerLower.includes('bootcamp')) {
                                                                    programType = 'Bootcamp';
                                                                }
                                                            
                                                                crmRef.current.addProgramToCRM({
                                                                    programName: p.programName,
                                                                    programType: programType,
                                                                    description: p.description,
                                                                    facilitatorName: p.incubationCenter,
                                                                    programUrl: p.applicationLink, // Use application link as program URL
                                                                });
                                                                if (onProgramAddedToCRM) {
                                                                    onProgramAddedToCRM();
                                                                }
                                                            } else {
                                                                messageService.warning('CRM Not Ready', 'Please wait a moment and try again.', 2000);
                                                            }
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            <a href={p.applicationLink} target="_blank" rel="noopener noreferrer" className="w-full">
                                                <Button className="w-full">
                                                    <Zap className="h-4 w-4 mr-2" />
                                                    Apply
                                                </Button>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="text-center py-10">
                        <p className="text-slate-500">No programs posted by admin yet.</p>
                    </Card>
                )}
            </div>
            
            
            {/* Apply Modal */}
            <Modal isOpen={isApplyModalOpen} onClose={() => { 
                if (!isSubmittingApplication) { 
                    setIsApplyModalOpen(false); 
                    setApplyingOppId(null); 
                    setPortfolioUrl(''); 
                    setStartupWebsiteUrl(null);
                    
                    // Clean up URL completely - return to normal state
                    const url = new URL(window.location.href);
                    url.searchParams.delete('opportunityId');
                    url.searchParams.delete('programName');
                    url.searchParams.delete('tab');
                    window.history.replaceState({}, document.title, url.toString());
                } 
            }} title="Submit Application">
                <div className="space-y-4">
                    {/* Application Questions - Only questions from the opportunity */}
                    {loadingQuestions ? (
                        <div className="border-b pb-4">
                            <p className="text-sm text-slate-500 text-center font-bold">Loading questions...</p>
                        </div>
                    ) : opportunityQuestions.length === 0 ? (
                        <div className="border-b pb-4">
                            <p className="text-sm text-slate-500 text-center">This opportunity has no application questions.</p>
                        </div>
                    ) : (
                        <div className="border-b pb-4 space-y-4">
                            <h4 className="text-md font-semibold text-slate-700">Application Questions</h4>
                            <p className="text-xs text-slate-500">
                                Your saved answers have been auto-filled. You can edit them before submitting.
                            </p>
                            {opportunityQuestions.map((oq) => {
                                const question = oq.question;
                                if (!question) return null;
                                
                                const answer = questionAnswers.get(oq.questionId) || '';
                                
                                return (
                                    <div key={oq.questionId} className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-700">
                                            {question.questionText}
                                            {oq.isRequired && <span className="text-red-500 ml-1">*</span>}
                                        </label>
                                        {question.questionType === 'textarea' ? (
                                            <textarea
                                                value={answer}
                                                onChange={(e) => {
                                                    const newMap = new Map(questionAnswers);
                                                    newMap.set(oq.questionId, e.target.value);
                                                    setQuestionAnswers(newMap);
                                                }}
                                                className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                                                rows={4}
                                                required={oq.isRequired}
                                            />
                                        ) : (question.questionType === 'select' || question.questionType === 'multiselect') && (!oq.selectionType || oq.selectionType === 'single') ? (
                                            <select
                                                value={answer}
                                                onChange={(e) => {
                                                    const newMap = new Map(questionAnswers);
                                                    newMap.set(oq.questionId, e.target.value);
                                                    setQuestionAnswers(newMap);
                                                }}
                                                className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                                                required={oq.isRequired}
                                            >
                                                <option value="">Select an option</option>
                                                {question.options?.map((option, idx) => (
                                                    <option key={idx} value={option}>{option}</option>
                                                ))}
                                            </select>
                                        ) : (question.questionType === 'select' || question.questionType === 'multiselect') && oq.selectionType === 'multiple' ? (
                                            <div className="space-y-2">
                                                {question.options?.map((option, idx) => {
                                                    const selectedOptions = answer ? answer.split(',').filter(v => v.trim()) : [];
                                                    const isChecked = selectedOptions.includes(option);
                                                    return (
                                                        <label key={idx} className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={(e) => {
                                                                    const newMap = new Map(questionAnswers);
                                                                    let selected = answer ? answer.split(',').filter(v => v.trim()) : [];
                                                                    if (e.target.checked) {
                                                                        if (!selected.includes(option)) {
                                                                            selected.push(option);
                                                                        }
                                                                    } else {
                                                                        selected = selected.filter(v => v !== option);
                                                                    }
                                                                    newMap.set(oq.questionId, selected.join(','));
                                                                    setQuestionAnswers(newMap);
                                                                }}
                                                                className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-slate-300 rounded"
                                                            />
                                                            <span className="text-sm text-slate-700">{option}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        ) : question.questionType === 'number' ? (
                                            <Input
                                                type="number"
                                                value={answer}
                                                onChange={(e) => {
                                                    const newMap = new Map(questionAnswers);
                                                    newMap.set(oq.questionId, e.target.value);
                                                    setQuestionAnswers(newMap);
                                                }}
                                                required={oq.isRequired}
                                            />
                                        ) : question.questionType === 'date' ? (
                                            <Input
                                                type="date"
                                                value={answer}
                                                onChange={(e) => {
                                                    const newMap = new Map(questionAnswers);
                                                    newMap.set(oq.questionId, e.target.value);
                                                    setQuestionAnswers(newMap);
                                                }}
                                                required={oq.isRequired}
                                            />
                                        ) : (
                                            <Input
                                                type="text"
                                                value={answer}
                                                onChange={(e) => {
                                                    const newMap = new Map(questionAnswers);
                                                    newMap.set(oq.questionId, e.target.value);
                                                    setQuestionAnswers(newMap);
                                                }}
                                                required={oq.isRequired}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    
                    {/* Pitch Deck and Pitch Video inputs */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Pitch Deck (link or upload) <span className="text-red-500 ml-1">*</span></label>
                        <CloudDriveInput
                            label=""
                            value={pitchDeckUrl}
                            onChange={(url) => setPitchDeckUrl(url)}
                            onFileSelect={handlePitchDeckFileSelect}
                            placeholder="https://drive.google.com/... or upload a PDF/PPT"
                            accept=".pdf,.ppt,.pptx,.doc,.docx"
                            documentType="pitch deck"
                            className="w-full"
                        />
                        {isUploadingPitchDeck && <p className="text-xs text-slate-500 mt-1">Uploading pitch deck...</p>}
                        {pitchDeckUploadError && <p className="text-xs text-red-600 mt-1">{pitchDeckUploadError}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Pitch Video (video URL) <span className="text-slate-500 text-xs">(optional)</span></label>
                        <Input
                            type="url"
                            placeholder="https://youtube.com/... or https://vimeo.com/..."
                            value={pitchVideoUrl}
                            onChange={(e) => setPitchVideoUrl(e.target.value)}
                            className="w-full"
                        />
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="secondary" type="button" onClick={() => { 
                            if (!isSubmittingApplication) { 
                                setIsApplyModalOpen(false); 
                                setApplyingOppId(null);
                                // Clean up URL when closing modal
                                const url = new URL(window.location.href);
                                url.searchParams.delete('opportunityId');
                                url.searchParams.delete('programName');
                                url.searchParams.delete('tab');
                                window.history.replaceState({}, document.title, url.toString());
                            } 
                        }} disabled={isSubmittingApplication}>Cancel</Button>
                         <Button 
                            type="button" 
                            onClick={submitApplication} 
                            disabled={
                                isSubmittingApplication || 
                                opportunityQuestions.length === 0 ||
                                (opportunityQuestions.some(q => q.isRequired && (!questionAnswers.get(q.questionId) || questionAnswers.get(q.questionId)?.trim() === '')))
                                || isUploadingPitchDeck
                                || !pitchDeckUrl
                            }
                        >
                            {isSubmittingApplication ? 'Submitting...' : 'Submit Application'}
                        </Button>
                    </div>
                </div>
            </Modal>
            {/* Image Modal */}
            <Modal isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} title={selectedImageAlt} size="4xl">
                <div className="flex justify-center items-center p-4">
                    <img 
                        src={selectedImageUrl} 
                        alt={selectedImageAlt}
                        className="max-w-full max-h-[80vh] object-contain"
                    />
                </div>
            </Modal>
            
            {/* Reference Application Draft Modal - Only show if user has access */}
            {isReferenceDraftModalOpen && (
                <DraftModalGuard
                    feature="grants_draft"
                    userId={authUserId}
                    onClose={() => setIsReferenceDraftModalOpen(false)}
                >
                    <ReferenceApplicationDraft
                        isOpen={isReferenceDraftModalOpen}
                        onClose={() => setIsReferenceDraftModalOpen(false)}
                        startupId={startup.id}
                    />
                </DraftModalGuard>
            )}
            
            {/* Draft Answers Modal - Only show if user has access */}
            {isDraftAnswersModalOpen && (
                <DraftModalGuard
                    feature="grants_draft"
                    userId={authUserId}
                    onClose={() => setIsDraftAnswersModalOpen(false)}
                >
                    <DraftAnswersView
                        isOpen={isDraftAnswersModalOpen}
                        onClose={() => setIsDraftAnswersModalOpen(false)}
                        startupId={startup.id}
                    />
                </DraftModalGuard>
            )}
            
        </div>
    );
};

// Draft Button Component - Disabled for free users with message
function DraftButton({ 
    feature, 
    userId, 
    onClick, 
    label, 
    icon 
}: { 
    feature: string; 
    userId: string; 
    onClick: () => void; 
    label: string; 
    icon: React.ReactNode;
}) {
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const [planTier, setPlanTier] = useState<'free' | 'basic' | 'premium'>('free');
    const [showPlans, setShowPlans] = useState(false);

    useEffect(() => {
        const checkAccess = async () => {
            if (!userId) {
                setHasAccess(false);
                return;
            }
            try {
                const tier = await featureAccessService.getUserPlanTier(userId);
                setPlanTier(tier);
                const access = await featureAccessService.canAccessFeature(userId, feature);
                setHasAccess(access);
            } catch (error) {
                console.error('Error checking feature access:', error);
                setHasAccess(false);
            }
        };
        checkAccess();
    }, [userId, feature]);

    const handleClick = () => {
        if (hasAccess) {
            onClick();
        } else {
            // Open subscription plans modal when clicked without access
            setShowPlans(true);
        }
    };

    if (hasAccess === null) {
        return (
            <Button type="button" variant="outline" size="sm" disabled>
                {icon}
                {label}
            </Button>
        );
    }

    return (
        <>
            <div className="relative group">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClick}
                    className={!hasAccess ? 'opacity-60' : ''}
                    title={!hasAccess ? 'Premium Feature - Click to upgrade' : ''}
                >
                    {icon}
                    {label}
                </Button>
                {!hasAccess && (
                    <div className="absolute left-0 top-full mt-1 z-10 hidden group-hover:block">
                        <div className="bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                            Premium Feature - Click to upgrade
                            <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-800 transform rotate-45"></div>
                        </div>
                    </div>
                )}
            </div>
            {showPlans && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-2 sm:p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                            <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                                Choose a Plan to Unlock Premium Features
                            </h2>
                            <button
                                onClick={() => setShowPlans(false)}
                                className="text-slate-500 hover:text-slate-700 text-sm"
                            >
                                Close
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <SubscriptionPlansPage
                                userId={userId}
                                onBack={() => setShowPlans(false)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// CRM Button Component - Disabled for free users with message
function CrmButton({ 
    feature, 
    userId, 
    onClick 
}: { 
    feature: string; 
    userId: string; 
    onClick: (e: React.MouseEvent) => void;
}) {
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const [planTier, setPlanTier] = useState<'free' | 'basic' | 'premium'>('free');
    const [showPlans, setShowPlans] = useState(false);

    useEffect(() => {
        const checkAccess = async () => {
            if (!userId) {
                setHasAccess(false);
                return;
            }
            try {
                const tier = await featureAccessService.getUserPlanTier(userId);
                setPlanTier(tier);
                const access = await featureAccessService.canAccessFeature(userId, feature);
                setHasAccess(access);
            } catch (error) {
                console.error('Error checking feature access:', error);
                setHasAccess(false);
            }
        };
        checkAccess();
    }, [userId, feature]);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasAccess) {
            onClick(e);
        } else {
            // Open subscription plans modal when clicked without access
            setShowPlans(true);
        }
    };

    if (hasAccess === null) {
        return (
            <Button
                type="button"
                variant="outline"
                className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                disabled
            >
                <Plus className="h-4 w-4 mr-2" />
                Add to CRM
            </Button>
        );
    }

    return (
        <>
            <div className="relative group flex-1">
                <Button
                    type="button"
                    variant="outline"
                    className={`flex-1 ${hasAccess ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200' : 'opacity-60 bg-gray-50 text-gray-500 border-gray-200'}`}
                    onClick={handleClick}
                    title={!hasAccess ? 'Premium Feature - Click to upgrade' : 'Add to CRM'}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to CRM
                </Button>
                {!hasAccess && (
                    <div className="absolute left-0 top-full mt-1 z-10 hidden group-hover:block">
                        <div className="bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                            Premium Feature - Click to upgrade
                            <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-800 transform rotate-45"></div>
                        </div>
                    </div>
                )}
            </div>
            {showPlans && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-2 sm:p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                            <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                                Choose a Plan to Unlock Premium Features
                            </h2>
                            <button
                                onClick={() => setShowPlans(false)}
                                className="text-slate-500 hover:text-slate-700 text-sm"
                            >
                                Close
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <SubscriptionPlansPage
                                userId={userId}
                                onBack={() => setShowPlans(false)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Draft Modal Guard - Prevents modal from opening if no access
function DraftModalGuard({ 
    feature, 
    userId, 
    onClose, 
    children 
}: { 
    feature: string; 
    userId: string; 
    onClose: () => void; 
    children: React.ReactNode;
}) {
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const [planTier, setPlanTier] = useState<'free' | 'basic' | 'premium'>('free');
    const [showPlans, setShowPlans] = useState(false);

    useEffect(() => {
        const checkAccess = async () => {
            if (!userId) {
                setHasAccess(false);
                return;
            }
            try {
                const tier = await featureAccessService.getUserPlanTier(userId);
                setPlanTier(tier);
                const access = await featureAccessService.canAccessFeature(userId, feature);
                setHasAccess(access);
                if (!access) {
                    // Close modal and show subscription plans
                    onClose();
                    setShowPlans(true);
                }
            } catch (error) {
                console.error('Error checking feature access:', error);
                setHasAccess(false);
                onClose();
                setShowPlans(true);
            }
        };
        checkAccess();
    }, [userId, feature, onClose]);

    if (hasAccess === null) {
        return null; // Loading
    }

    if (!hasAccess) {
        // Show subscription plans modal instead of just closing
        return showPlans ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-2 sm:p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                        <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                            Choose a Plan to Unlock Premium Features
                        </h2>
                        <button
                            onClick={() => setShowPlans(false)}
                            className="text-slate-500 hover:text-slate-700 text-sm"
                        >
                            Close
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <SubscriptionPlansPage
                            userId={userId}
                            onBack={() => setShowPlans(false)}
                        />
                    </div>
                </div>
            </div>
        ) : null;
    }

    return <>{children}</>;
}

export default OpportunitiesTab;








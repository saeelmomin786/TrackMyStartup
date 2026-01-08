import React, { useEffect, useMemo, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import CloudDriveInput from '../ui/CloudDriveInput';
import { Zap, Check, Video, MessageCircle, CreditCard, Download, FileText, Share2, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { messageService } from '../../lib/messageService';
import Modal from '../ui/Modal';
import { getQueryParam, setQueryParam } from '../../lib/urlState';
import { adminProgramsService, AdminProgramPost } from '../../lib/adminProgramsService';
import { toDirectImageUrl } from '../../lib/imageUrl';
import ReferenceApplicationDraft from '../ReferenceApplicationDraft';
import { questionBankService, OpportunityQuestion, StartupAnswer } from '../../lib/questionBankService';

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

const OpportunitiesTab: React.FC<OpportunitiesTabProps> = ({ startup }) => {
    const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
    const [applications, setApplications] = useState<ApplicationItem[]>([]);
    const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityItem | null>(null);
    const [adminPosts, setAdminPosts] = useState<AdminProgramPost[]>([]);
    // Per-application apply modal state
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [applyingOppId, setApplyingOppId] = useState<string | null>(null);
    const [applyPitchVideoUrl, setApplyPitchVideoUrl] = useState('');
    const [applyPitchDeckFile, setApplyPitchDeckFile] = useState<File | null>(null);
    const [applySector, setApplySector] = useState('');
     const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);
     const [applyStage, setApplyStage] = useState('');
    // Image modal state
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
    const [selectedImageAlt, setSelectedImageAlt] = useState<string>('');
    // Reference Application Draft modal state
    const [isReferenceDraftModalOpen, setIsReferenceDraftModalOpen] = useState(false);
    // Application questions state
    const [opportunityQuestions, setOpportunityQuestions] = useState<OpportunityQuestion[]>([]);
    const [questionAnswers, setQuestionAnswers] = useState<Map<string, string>>(new Map());
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    

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
        return () => { mounted = false; };
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
        setApplyPitchDeckFile(null);
        setApplyPitchVideoUrl('');
        setApplySector('');
        setApplyStage('');
        setQuestionAnswers(new Map());
        setIsApplyModalOpen(true);
        
        // Load questions for this opportunity
        try {
            setLoadingQuestions(true);
            const questions = await questionBankService.getOpportunityQuestions(opportunityId);
            setOpportunityQuestions(questions);
            
            // Auto-fill answers from saved answers
            if (questions.length > 0) {
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

    useEffect(() => {
        const id = selectedOpportunity?.id || '';
        setQueryParam('opportunityId', id, true);
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

    const handleApplyDeckChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type !== 'application/pdf') {
                messageService.warning(
                  'Invalid File Type',
                  'Please upload a PDF file for the pitch deck.'
                );
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                messageService.warning(
                  'File Too Large',
                  'File size must be less than 10MB.'
                );
                return;
            }
            setApplyPitchDeckFile(file);
        }
    };

    const submitApplication = async () => {
        if (!applyingOppId) return;
        if (!applyPitchDeckFile && !applyPitchVideoUrl.trim()) {
            messageService.warning(
              'Content Required',
              'Please provide either a pitch deck file or a pitch video URL.'
            );
            return;
        }
         if (!applySector.trim()) {
             messageService.warning(
               'Domain Required',
               'Please select a domain for your startup.'
             );
             return;
         }
         if (!applyStage.trim()) {
             messageService.warning(
              'Stage Required',
              'Please select your startup stage.'
            );
            return;
        }

        setIsSubmittingApplication(true);
        try {
            let pitchDeckUrl: string | null = null;
            const pitchVideo = applyPitchVideoUrl.trim() || null;

            if (applyPitchDeckFile) {
                const safeName = applyPitchDeckFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const fileName = `pitch-decks/${startup.id}/${applyingOppId}/${Date.now()}-${safeName}`;
                const { error: uploadError } = await supabase.storage
                    .from('startup-documents')
                    .upload(fileName, applyPitchDeckFile);
                if (uploadError) throw uploadError;
                const { data: urlData } = supabase.storage
                    .from('startup-documents')
                    .getPublicUrl(fileName);
                pitchDeckUrl = urlData.publicUrl;
            }

            const { data, error } = await supabase
                .from('opportunity_applications')
                .insert({
                    startup_id: startup.id,
                    opportunity_id: applyingOppId,
                    status: 'pending',
                    pitch_deck_url: pitchDeckUrl,
                     pitch_video_url: pitchVideo,
                    domain: applySector.trim(),
                    stage: applyStage.trim()
                })
                .select()
                .single();
            if (error) throw error;

            // Save question responses if there are questions
            if (opportunityQuestions.length > 0 && questionAnswers.size > 0) {
                const responses = opportunityQuestions
                    .filter(q => questionAnswers.has(q.questionId))
                    .map(q => ({
                        questionId: q.questionId,
                        answerText: questionAnswers.get(q.questionId) || ''
                    }))
                    .filter(r => r.answerText.trim() !== '');
                
                if (responses.length > 0) {
                    await questionBankService.saveApplicationResponses(data.id, responses);
                }
            }

            setApplications(prev => [...prev, {
                id: data.id,
                startupId: startup.id,
                opportunityId: applyingOppId,
                status: 'pending',
                pitchDeckUrl: pitchDeckUrl || undefined,
                pitchVideoUrl: pitchVideo || undefined
            }]);

            setIsApplyModalOpen(false);
            setApplyingOppId(null);
            setOpportunityQuestions([]);
            setQuestionAnswers(new Map());

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
            <h2 className="text-2xl font-bold text-slate-800">Programs</h2>
            <p className="text-slate-600">Explore accelerator programs and other programs posted by our network of facilitation centers.</p>
            

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
                                        <div className="flex gap-2 mt-3">
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
                                            {!hasApplied ? (
                                                canApply ? (
                                                    <Button 
                                                        type="button" 
                                                        className="flex-1" 
                                                        onClick={() => openApplyModal(opp.id)}
                                                    >
                                                        <Zap className="h-4 w-4 mr-2" /> Apply
                                                    </Button>
                                                ) : (
                                                    <Button type="button" className="flex-1" variant="secondary" disabled>
                                                        Closed
                                                    </Button>
                                                )
                                            ) : (
                                                <Button type="button" className="flex-1" variant="secondary" disabled>
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
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-700">Other Program</h3>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsReferenceDraftModalOpen(true)}
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        Reference Application Draft
                    </Button>
                </div>
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
                                            <a href={p.applicationLink} target="_blank" rel="noopener noreferrer" className="flex-1">
                                                <Button className="w-full">
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
            <Modal isOpen={isApplyModalOpen} onClose={() => { if (!isSubmittingApplication) { setIsApplyModalOpen(false); setApplyingOppId(null);} }} title="Submit Application">
                <div className="space-y-4">
                     <div>
                         <label className="block text-sm font-medium text-slate-700 mb-2">Startup Domain *</label>
                        <select
                            value={applySector}
                            onChange={(e) => setApplySector(e.target.value)}
                            className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                            required
                        >
                            <option value="">Select your startup domain</option>
                            {SECTOR_OPTIONS.map(sector => (
                                <option key={sector} value={sector}>{sector}</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">Required field</p>
                    </div>
                     <div>
                         <label className="block text-sm font-medium text-slate-700 mb-2">Startup Stage *</label>
                         <select
                             value={applyStage}
                             onChange={(e) => setApplyStage(e.target.value)}
                             className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                             required
                         >
                             <option value="">Select your startup stage</option>
                             {STAGE_OPTIONS.map(stage => (
                                 <option key={stage} value={stage}>{stage}</option>
                             ))}
                         </select>
                         <p className="text-xs text-slate-500 mt-1">Required field</p>
                     </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Pitch Deck (PDF)</label>
                        <CloudDriveInput
                            value=""
                            onChange={(url) => {
                                const hiddenInput = document.getElementById('apply-deck-url') as HTMLInputElement;
                                if (hiddenInput) hiddenInput.value = url;
                            }}
                            onFileSelect={(file) => handleApplyDeckChange({ target: { files: [file] } } as any)}
                            placeholder="Paste your cloud drive link here..."
                            label=""
                            accept=".pdf"
                            maxSize={10}
                            documentType="pitch deck"
                            showPrivacyMessage={false}
                        />
                        <input type="hidden" id="apply-deck-url" name="apply-deck-url" />
                        <p className="text-xs text-slate-500 mt-1">Max 10MB</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Pitch Video URL</label>
                        <Input
                            type="url"
                            placeholder="https://youtube.com/watch?v=..."
                            value={applyPitchVideoUrl}
                            onChange={(e) => setApplyPitchVideoUrl(e.target.value)}
                            className="w-full"
                        />
                        <p className="text-xs text-slate-500 mt-1">Provide either a deck or a video URL (or both).</p>
                    </div>
                    
                    {/* Application Questions */}
                    {loadingQuestions ? (
                        <div className="border-t pt-4">
                            <p className="text-sm text-slate-500 text-center">Loading questions...</p>
                        </div>
                    ) : opportunityQuestions.length > 0 && (
                        <div className="border-t pt-4 space-y-4">
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
                                        ) : question.questionType === 'select' ? (
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
                                        ) : question.questionType === 'multiselect' ? (
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
                    
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="secondary" type="button" onClick={() => { if (!isSubmittingApplication) { setIsApplyModalOpen(false); setApplyingOppId(null);} }} disabled={isSubmittingApplication}>Cancel</Button>
                         <Button type="button" onClick={submitApplication} disabled={isSubmittingApplication || (!applyPitchDeckFile && !applyPitchVideoUrl.trim()) || !applySector.trim() || !applyStage.trim()}>
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
            
            {/* Reference Application Draft Modal */}
            <ReferenceApplicationDraft
                isOpen={isReferenceDraftModalOpen}
                onClose={() => setIsReferenceDraftModalOpen(false)}
                startupId={startup.id}
            />
            
        </div>
    );
};

export default OpportunitiesTab;








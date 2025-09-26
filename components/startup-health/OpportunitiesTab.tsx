import React, { useEffect, useMemo, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Zap, Check, Video } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Modal from '../ui/Modal';

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

const OpportunitiesTab: React.FC<OpportunitiesTabProps> = ({ startup }) => {
    const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
    const [applications, setApplications] = useState<ApplicationItem[]>([]);
    const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityItem | null>(null);
    // Per-application apply modal state
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [applyingOppId, setApplyingOppId] = useState<string | null>(null);
    const [applyPitchVideoUrl, setApplyPitchVideoUrl] = useState('');
    const [applyPitchDeckFile, setApplyPitchDeckFile] = useState<File | null>(null);
    const [applySector, setApplySector] = useState('');
    const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);
    // Image modal state
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
    const [selectedImageAlt, setSelectedImageAlt] = useState<string>('');

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
        })();
        return () => { mounted = false; };
    }, [startup.id]);

    const appliedIds = useMemo(() => new Set(applications.map(a => a.opportunityId)), [applications]);

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

    const openApplyModal = (opportunityId: string) => {
        if (appliedIds.has(opportunityId)) return;
        setApplyingOppId(opportunityId);
        setApplyPitchDeckFile(null);
        setApplyPitchVideoUrl('');
        setApplySector('');
        setIsApplyModalOpen(true);
    };

    const openImageModal = (imageUrl: string, altText: string) => {
        setSelectedImageUrl(imageUrl);
        setSelectedImageAlt(altText);
        setIsImageModalOpen(true);
    };

    const handleApplyDeckChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type !== 'application/pdf') {
                alert('Please upload a PDF file for the pitch deck.');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                alert('File size must be less than 10MB.');
                return;
            }
            setApplyPitchDeckFile(file);
        }
    };

    const submitApplication = async () => {
        if (!applyingOppId) return;
        if (!applyPitchDeckFile && !applyPitchVideoUrl.trim()) {
            alert('Please provide either a pitch deck file or a pitch video URL.');
            return;
        }
        if (!applySector.trim()) {
            alert('Please select a sector for your startup.');
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
                    sector: applySector.trim()
                })
                .select()
                .single();
            if (error) throw error;

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
            alert('Failed to submit application. ' + (e.message || ''));
        } finally {
            setIsSubmittingApplication(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Growth Opportunities</h2>
            <p className="text-slate-600">Explore accelerator programs and other opportunities posted by our network of facilitation centers.</p>

            {/* One-time Pitch Materials Section removed - per-application modal handles uploads */}

            {selectedOpportunity ? (
                <div>
                    <Button onClick={() => setSelectedOpportunity(null)} variant="secondary" className="mb-4">Back</Button>
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
                                    src={selectedOpportunity.posterUrl} 
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
                                        <p className="text-sm text-slate-600 mb-4">Opportunities from our facilitator network.</p>
                                    </Card>
                                    <div className="border-t pt-4">
                                        <p className="text-sm text-slate-500">Application Deadline: <span className="font-semibold text-slate-700">{selectedOpportunity.deadline}</span></p>
                                        {!appliedIds.has(selectedOpportunity.id) ? (
                                            <Button 
                                                type="button" 
                                                className="w-full mt-3" 
                                                onClick={() => openApplyModal(selectedOpportunity.id)}
                                                disabled={false}
                                            >
                                                <Zap className="h-4 w-4 mr-2" /> Apply for Program
                                            </Button>
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
                        const canApply = true;
                        return (
                            <Card key={opp.id} className="flex flex-col !p-0 overflow-hidden">
                                {embedUrl ? (
                                    <div className="relative w-full aspect-video bg-slate-800">
                                        <iframe src={embedUrl} title={`Video for ${opp.programName}`} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="absolute top-0 left-0 w-full h-full"></iframe>
                                    </div>
                                ) : opp.posterUrl ? (
                                    <img 
                                        src={opp.posterUrl} 
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
                                        <p className="text-sm font-medium text-brand-primary">{opp.facilitatorName || 'Program Facilitator'}</p>
                                        <h3 className="text-lg font-semibold text-slate-800 mt-1 cursor-pointer hover:text-brand-primary transition-colors" onClick={() => setSelectedOpportunity(opp)}>
                                            {opp.programName}
                                        </h3>
                                        <p className="text-sm text-slate-500 mt-2 mb-4">{opp.description.substring(0, 100)}...</p>
                                    </div>
                                    <div className="border-t pt-4 mt-4">
                                        <p className="text-xs text-slate-500">Deadline: <span className="font-semibold">{opp.deadline}</span></p>
                                        {!hasApplied ? (
                                            <Button 
                                                type="button" 
                                                className="w-full mt-3" 
                                                onClick={() => openApplyModal(opp.id)}
                                                disabled={!canApply}
                                            >
                                                <Zap className="h-4 w-4 mr-2" /> Apply for Program
                                            </Button>
                                        ) : (
                                            <Button type="button" className="w-full mt-3" variant="secondary" disabled>
                                                <Check className="h-4 w-4 mr-2" /> You have applied for this program
                                            </Button>
                                        )}
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
            {/* Apply Modal */}
            <Modal isOpen={isApplyModalOpen} onClose={() => { if (!isSubmittingApplication) { setIsApplyModalOpen(false); setApplyingOppId(null);} }} title="Submit Application">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Startup Sector *</label>
                        <select
                            value={applySector}
                            onChange={(e) => setApplySector(e.target.value)}
                            className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                            required
                        >
                            <option value="">Select your startup sector</option>
                            {SECTOR_OPTIONS.map(sector => (
                                <option key={sector} value={sector}>{sector}</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">Required field</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Pitch Deck (PDF)</label>
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleApplyDeckChange}
                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                        />
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
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="secondary" type="button" onClick={() => { if (!isSubmittingApplication) { setIsApplyModalOpen(false); setApplyingOppId(null);} }} disabled={isSubmittingApplication}>Cancel</Button>
                        <Button type="button" onClick={submitApplication} disabled={isSubmittingApplication || (!applyPitchDeckFile && !applyPitchVideoUrl.trim()) || !applySector.trim()}>
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
        </div>
    );
};

export default OpportunitiesTab;



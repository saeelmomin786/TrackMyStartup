import React, { useEffect, useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { ArrowLeft, Share2, Calendar, User, Video, Download, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { messageService } from '../lib/messageService';
import Modal from './ui/Modal';
import { toDirectImageUrl } from '../lib/imageUrl';
import { getQueryParam, setQueryParam } from '../lib/urlState';

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
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);

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
                    setOpportunity({
                        id: data.id,
                        programName: data.program_name,
                        description: data.description || '',
                        deadline: data.deadline || '',
                        posterUrl: data.poster_url || undefined,
                        videoUrl: data.video_url || undefined,
                        facilitatorName: 'Program Facilitator'
                    });
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

    const handleApplyClick = () => {
        setShowLoginPrompt(true);
    };

    const handleLogin = () => {
        // Preserve the program URL for return after login
        const currentUrl = window.location.href;
        const url = new URL(window.location.origin);
        url.searchParams.set('page', 'login');
        url.searchParams.set('returnUrl', currentUrl);
        window.location.href = url.toString();
    };

    const handleRegister = () => {
        // Preserve the program URL for return after register
        const currentUrl = window.location.href;
        const url = new URL(window.location.origin);
        url.searchParams.set('page', 'register');
        url.searchParams.set('returnUrl', currentUrl);
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

            {/* Login Prompt Modal */}
            <Modal isOpen={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} title="Login Required">
                <div className="text-center space-y-4">
                    <p className="text-slate-600">To apply for this program, you need to be logged in.</p>
                    <div className="flex gap-3 justify-center">
                        <Button onClick={handleLogin} variant="outline">
                            Login
                        </Button>
                        <Button onClick={handleRegister}>
                            Register
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default PublicProgramView;

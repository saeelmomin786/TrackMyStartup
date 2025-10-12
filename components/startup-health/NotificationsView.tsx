import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Bell, MessageCircle, FileText, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Modal from '../ui/Modal';
import StartupMessagingModal from './StartupMessagingModal';
import StartupContractModal from './StartupContractModal';

interface ApplicationItem {
    id: string;
    startupId: number;
    opportunityId: string;
    status: 'pending' | 'accepted' | 'rejected';
    pitchDeckUrl?: string;
    pitchVideoUrl?: string;
    created_at?: string;
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

interface NotificationsViewProps {
    startupId: number;
    onClose: () => void;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ startupId, onClose }) => {
    const [applications, setApplications] = useState<ApplicationItem[]>([]);
    const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [startupUserId, setStartupUserId] = useState<string | null>(null);
    
    // Modal states
    const [isMessagingModalOpen, setIsMessagingModalOpen] = useState(false);
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [selectedApplicationForMessaging, setSelectedApplicationForMessaging] = useState<ApplicationItem | null>(null);
    const [selectedApplicationForContract, setSelectedApplicationForContract] = useState<ApplicationItem | null>(null);
    

    useEffect(() => {
        loadStartupUserId();
    }, [startupId]);

    useEffect(() => {
        if (startupUserId) {
            loadData();
            
            // Set up real-time subscription for new messages and updates
            const subscription = supabase
                .channel('startup_notifications')
                .on('postgres_changes', 
                    { 
                        event: 'INSERT', 
                        schema: 'public', 
                        table: 'incubation_messages',
                        filter: `receiver_id=eq.${startupUserId}`
                    },
                    () => {
                        loadUnreadCount();
                    }
                )
                .on('postgres_changes', 
                    { 
                        event: 'UPDATE', 
                        schema: 'public', 
                        table: 'incubation_messages',
                        filter: `receiver_id=eq.${startupUserId}`
                    },
                    () => {
                        loadUnreadCount(); // Reload count when messages are marked as read
                    }
                )
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [startupUserId]);

    const loadStartupUserId = async () => {
        try {
            const { data: userData, error: userError } = await supabase
                .from('startups')
                .select('user_id')
                .eq('id', startupId)
                .single();
            
            if (!userError && userData) {
                setStartupUserId(userData.user_id);
            }
        } catch (error) {
            console.error('Error loading startup user ID:', error);
        }
    };

    const loadData = async () => {
        try {
            // Load applications for this startup
            const { data: apps } = await supabase
                .from('opportunity_applications')
                .select('*')
                .eq('startup_id', startupId);
            
            if (Array.isArray(apps)) {
                setApplications(apps.map((a: any) => ({ 
                    id: a.id, 
                    startupId: a.startup_id, 
                    opportunityId: a.opportunity_id, 
                    status: (a.status || 'pending') as any,
                    pitchDeckUrl: a.pitch_deck_url || undefined,
                    pitchVideoUrl: a.pitch_video_url || undefined,
                    created_at: a.created_at
                })));
            }

            // Load opportunities
            const { data: opps } = await supabase
                .from('incubation_opportunities')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (Array.isArray(opps)) {
                setOpportunities(opps.map((row: any) => ({
                    id: row.id,
                    programName: row.program_name,
                    description: row.description || '',
                    deadline: row.deadline || '',
                    posterUrl: row.poster_url || undefined,
                    videoUrl: row.video_url || undefined,
                    facilitatorName: 'Program Facilitator'
                })));
            }

            await loadUnreadCount();
        } catch (error) {
            console.error('Error loading notifications data:', error);
        }
    };

    const loadUnreadCount = async () => {
        if (!startupUserId) return;
        
        try {
            // Get applications for this startup
            const { data: applications, error: appsError } = await supabase
                .from('opportunity_applications')
                .select('id')
                .eq('startup_id', startupId);

            if (appsError) throw appsError;

            let totalUnread = 0;

            // Count unread messages for each application
            for (const app of applications || []) {
                const { data: messages, error: msgError } = await supabase
                    .from('incubation_messages')
                    .select('id')
                    .eq('application_id', app.id)
                    .eq('receiver_id', startupUserId)
                    .eq('is_read', false);

                if (!msgError && messages) {
                    totalUnread += messages.length;
                }
            }

            setUnreadCount(totalUnread);
        } catch (error) {
            console.error('Error loading unread count:', error);
        }
    };

    // Handler functions for application actions
    const handleOpenMessaging = (application: ApplicationItem) => {
        setSelectedApplicationForMessaging(application);
        setIsMessagingModalOpen(true);
    };

    const handleCloseMessaging = () => {
        setIsMessagingModalOpen(false);
        setSelectedApplicationForMessaging(null);
        // Refresh unread count when messaging modal is closed
        loadUnreadCount();
    };

    const handleOpenContract = (application: ApplicationItem) => {
        setSelectedApplicationForContract(application);
        setIsContractModalOpen(true);
    };

    const handleCloseContract = () => {
        setIsContractModalOpen(false);
        setSelectedApplicationForContract(null);
    };

    

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bell className="w-6 h-6 text-blue-600" />
                    <h2 className="text-2xl font-bold text-slate-800">Notifications</h2>
                    {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </div>
                <Button onClick={onClose} variant="outline" size="sm">
                    <X className="w-4 h-4 mr-2" />
                    Close
                </Button>
            </div>
            
            <p className="text-slate-600">Stay updated with your program applications and messages.</p>

            {/* Applications with Notifications */}
            {applications.length > 0 ? (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900">Your Applications</h3>
                    {applications.map((application) => {
                        const opportunity = opportunities.find(opp => opp.id === application.opportunityId);
                        if (!opportunity) return null;
                        
                        return (
                            <Card key={application.id} className="p-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-slate-900">{opportunity.programName}</h4>
                                        <p className="text-sm text-slate-600 mt-1">{opportunity.description}</p>
                                        <div className="flex items-center space-x-4 mt-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                application.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                                application.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {application.status}
                                            </span>
                                            <span className="text-sm text-slate-500">
                                                Applied: {new Date(application.created_at || '').toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex space-x-2 ml-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleOpenMessaging(application)}
                                            className="flex items-center relative"
                                        >
                                            <MessageCircle className="w-4 h-4 mr-1" />
                                            Message
                                        </Button>
                                        
                                        {/* Contracts button removed as requested */}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card className="text-center py-12">
                    <Bell className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Notifications</h3>
                    <p className="text-slate-500">You don't have any program applications yet. Apply to programs to see notifications here.</p>
                </Card>
            )}
            
            {/* Startup Messaging Modal */}
            {selectedApplicationForMessaging && (
                <StartupMessagingModal
                    isOpen={isMessagingModalOpen}
                    onClose={handleCloseMessaging}
                    applicationId={selectedApplicationForMessaging.id}
                    facilitatorName="Program Facilitator"
                    startupName="Your Startup"
                />
            )}
            
            {/* Startup Contract Modal */}
            {selectedApplicationForContract && (
                <StartupContractModal
                    isOpen={isContractModalOpen}
                    onClose={handleCloseContract}
                    applicationId={selectedApplicationForContract.id}
                    facilitatorName="Program Facilitator"
                    startupName="Your Startup"
                />
            )}
            
            
        </div>
    );
};

export default NotificationsView;


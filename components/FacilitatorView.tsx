import React, { useEffect, useMemo, useState } from 'react';
import { Startup, NewInvestment, StartupAdditionRequest, ComplianceStatus } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Input from './ui/Input';
import { LayoutGrid, PlusCircle, FileText, Video, Gift, Film, Edit, Users, Eye, CheckCircle, Check, Search, Share2, Trash2 } from 'lucide-react';
import PortfolioDistributionChart from './charts/PortfolioDistributionChart';
import Badge from './ui/Badge';
import { investorService, ActiveFundraisingStartup } from '../lib/investorService';
import { supabase } from '../lib/supabase';
import { FacilitatorAccessService } from '../lib/facilitatorAccessService';
import { recognitionService } from '../lib/recognitionService';
import { facilitatorStartupService, StartupDashboardData } from '../lib/facilitatorStartupService';
import { facilitatorCodeService } from '../lib/facilitatorCodeService';
import { FacilitatorCodeDisplay } from './FacilitatorCodeDisplay';
import ProfilePage from './ProfilePage';

interface FacilitatorViewProps {
  startups: Startup[];
  newInvestments: NewInvestment[];
  startupAdditionRequests: StartupAdditionRequest[];
  onViewStartup: (startup: Startup) => void;
  onAcceptRequest: (requestId: number) => void;
  currentUser?: any;
  onProfileUpdate?: (updatedUser: any) => void;
  onLogout?: () => void;
}

type FacilitatorTab = 'dashboard' | 'discover';

// Local opportunity type for facilitator postings
type IncubationOpportunity = {
  id: string;
  programName: string;
  description: string;
  deadline: string; // YYYY-MM-DD
  posterUrl?: string;
  videoUrl?: string;
  facilitatorId: string;
  createdAt?: string;
};

type ReceivedApplication = {
  id: string;
  startupId: number;
  startupName: string;
  opportunityId: string;
  status: 'pending' | 'accepted' | 'rejected';
  pitchDeckUrl?: string;
  pitchVideoUrl?: string;
  diligenceStatus: 'none' | 'requested' | 'approved';
  agreementUrl?: string;
  createdAt?: string;
};

const initialNewOppState = {
  programName: '',
  description: '',
  deadline: '',
  posterUrl: '',
  videoUrl: '',
  facilitatorDescription: '',
  facilitatorWebsite: '',
};

const SummaryCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <Card className="flex-1">
      <div className="flex items-center justify-between">
        <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
      <div className="p-3 bg-brand-light rounded-full">
        {icon}
        </div>
      </div>
  </Card>
);

const FacilitatorView: React.FC<FacilitatorViewProps> = ({ 
  startups, 
  newInvestments, 
  startupAdditionRequests, 
  onViewStartup, 
  onAcceptRequest,
  currentUser,
  onProfileUpdate,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<FacilitatorTab>('dashboard');
  const [showProfilePage, setShowProfilePage] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isDiligenceModalOpen, setIsDiligenceModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ReceivedApplication | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newOpportunity, setNewOpportunity] = useState(initialNewOppState);
  const [posterPreview, setPosterPreview] = useState<string>('');
  const [agreementFile, setAgreementFile] = useState<File | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [processingRecognitionId, setProcessingRecognitionId] = useState<string | null>(null);
  const [activeFundraisingStartups, setActiveFundraisingStartups] = useState<ActiveFundraisingStartup[]>([]);
  const [isLoadingPitches, setIsLoadingPitches] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<number | null>(null);
  const [facilitatorId, setFacilitatorId] = useState<string | null>(null);
  const [myPostedOpportunities, setMyPostedOpportunities] = useState<IncubationOpportunity[]>([]);
  const [myReceivedApplications, setMyReceivedApplications] = useState<ReceivedApplication[]>([]);
  const [recognitionRecords, setRecognitionRecords] = useState<any[]>([]);
  const [isLoadingRecognition, setIsLoadingRecognition] = useState(false);
  const [portfolioStartups, setPortfolioStartups] = useState<StartupDashboardData[]>([]);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(value);

  const handleShare = async (startup: ActiveFundraisingStartup) => {
    console.log('Share button clicked for startup:', startup.name);
    console.log('Startup object:', startup);
    const videoUrl = startup.pitchVideoUrl || 'Video not available';
    // Calculate valuation from investment value and equity allocation
    const valuation = startup.equityAllocation > 0 ? (startup.investmentValue / (startup.equityAllocation / 100)) : 0;
    const details = `Startup: ${startup.name || 'N/A'}\nSector: ${startup.sector || 'N/A'}\nAsk: $${(startup.investmentValue || 0).toLocaleString()} for ${startup.equityAllocation || 0}% equity\nValuation: $${valuation.toLocaleString()}\n\nPitch Video: ${videoUrl}`;
    console.log('Share details:', details);
        try {
            if (navigator.share) {
                console.log('Using native share API');
                const shareData = {
                    title: startup.name || 'Startup Pitch',
                    text: details,
                    url: videoUrl !== 'Video not available' ? videoUrl : undefined
                };
                await navigator.share(shareData);
            } else if (navigator.clipboard && navigator.clipboard.writeText) {
        console.log('Using clipboard API');
        await navigator.clipboard.writeText(details);
        alert('Startup details copied to clipboard');
      } else {
        console.log('Using fallback copy method');
        // Fallback: hidden textarea copy
        const textarea = document.createElement('textarea');
        textarea.value = details;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Startup details copied to clipboard');
      }
    } catch (err) {
      console.error('Share failed', err);
      alert('Unable to share. Try copying manually.');
    }
  };

  const myPortfolio = useMemo(() => portfolioStartups, [portfolioStartups]);
  const myApplications = useMemo(() => startupAdditionRequests, [startupAdditionRequests]);

  // Load facilitator's portfolio of approved startups
  const loadPortfolio = async (facilitatorId: string) => {
    try {
      setIsLoadingPortfolio(true);
      const portfolio = await facilitatorStartupService.getFacilitatorPortfolio(facilitatorId);
      setPortfolioStartups(portfolio);
    } catch (err) {
      console.error('Error loading portfolio:', err);
      setPortfolioStartups([]);
    } finally {
      setIsLoadingPortfolio(false);
    }
  };

  // Load recognition requests for this facilitator
  const loadRecognitionRecords = async (facilitatorId: string) => {
    try {
      setIsLoadingRecognition(true);
      
      console.log('🔍 Loading recognition requests for facilitator ID:', facilitatorId);
      
      // Get facilitator code first, create one if it doesn't exist
      const { data: facilitatorData, error: facilitatorError } = await supabase
        .from('users')
        .select('facilitator_code')
        .eq('id', facilitatorId)
        .single();

      if (facilitatorError) {
        console.error('❌ Error getting facilitator code:', facilitatorError);
        return;
      }

      let facilitatorCode = facilitatorData?.facilitator_code;
      
      // If no facilitator code exists, create one
      if (!facilitatorCode) {
        console.log('📝 No facilitator code found, creating one...');
        facilitatorCode = await facilitatorCodeService.createOrUpdateFacilitatorCode(facilitatorId);
        if (!facilitatorCode) {
          console.error('❌ Failed to create facilitator code');
          return;
        }
      }

      console.log('📋 Facilitator code:', facilitatorCode);
      
      if (!facilitatorCode) {
        console.error('❌ No facilitator code available, cannot load recognition records');
        setRecognitionRecords([]);
        return;
      }
      
      console.log('🔍 Querying recognition_records with facilitator code:', facilitatorCode);
      
      // First, let's check if there are any recognition records at all
      const { data: allRecords, error: allRecordsError } = await supabase
        .from('recognition_records')
        .select('*')
        .limit(5);
      
      console.log('🔍 All recognition records in database:', allRecords);
      console.log('🔍 All records error:', allRecordsError);
      
      // Query the original recognition_records table with proper startup data
      const { data, error } = await supabase
        .from('recognition_records')
        .select(`
          *,
          startups (
            id, 
            name, 
            sector, 
            total_funding,
            total_revenue,
            registration_date
          )
        `)
        .eq('facilitator_code', facilitatorCode)
        .order('date_added', { ascending: false });
      
      console.log('📊 Raw query result:', { data, error });
      
      if (error) {
        console.error('❌ Error loading recognition requests:', error);
        console.log('🔄 Trying fallback query without foreign key join...');
        
        // Fallback: Query without foreign key join but with startup data
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('recognition_records')
          .select(`
            *,
            startups (
              id, 
              name, 
              sector, 
              total_funding,
              total_revenue,
              registration_date
            )
          `)
          .eq('facilitator_code', facilitatorCode)
          .order('date_added', { ascending: false });
        
        if (fallbackError) {
          console.error('❌ Fallback query also failed:', fallbackError);
          setRecognitionRecords([]);
          return;
        }
        
        console.log('✅ Fallback query successful:', fallbackData);
        
        // Map the fallback data
        const mappedRecords = (fallbackData || []).map(record => ({
          id: record.id.toString(),
          startupId: record.startup_id,
          programName: record.program_name,
          facilitatorName: record.facilitator_name,
          facilitatorCode: record.facilitator_code,
          incubationType: record.incubation_type,
          feeType: record.fee_type,
          feeAmount: record.fee_amount,
          equityAllocated: record.equity_allocated,
          preMoneyValuation: record.pre_money_valuation,
          signedAgreementUrl: record.signed_agreement_url,
          status: record.status || 'pending',
          dateAdded: record.date_added,
          startup: record.startups // Include startup data
        }));
        
        console.log('✅ Loaded recognition requests (fallback):', mappedRecords);
        console.log('🔍 Startup data in fallback records:', mappedRecords.map(r => ({ 
          id: r.id, 
          startupName: r.startup?.name, 
          startupData: r.startup 
        })));
        setRecognitionRecords(mappedRecords);
        return;
      }
      
      // Map database data to RecognitionRecord interface
      const mappedRecords = (data || []).map(record => ({
        id: record.id.toString(),
        startupId: record.startup_id,
        programName: record.program_name,
        facilitatorName: record.facilitator_name,
        facilitatorCode: record.facilitator_code,
        incubationType: record.incubation_type,
        feeType: record.fee_type,
        feeAmount: record.fee_amount,
        equityAllocated: record.equity_allocated,
        preMoneyValuation: record.pre_money_valuation,
        signedAgreementUrl: record.signed_agreement_url,
        status: record.status || 'pending',
        dateAdded: record.date_added,
        // Include startup data for display
        startup: record.startups
      }));
      
      console.log('✅ Loaded recognition requests:', mappedRecords);
      console.log('🔍 Startup data in records:', mappedRecords.map(r => ({ 
        id: r.id, 
        startupName: r.startup?.name, 
        startupData: r.startup 
      })));
      setRecognitionRecords(mappedRecords);
    } catch (err) {
      console.error('Error loading recognition requests:', err);
    } finally {
      setIsLoadingRecognition(false);
    }
  };



  // Load current facilitator and their opportunities
  useEffect(() => {
    let mounted = true;
    let loadingTimeout: NodeJS.Timeout;
    
    const loadFacilitatorData = async () => {
      try {
      const { data: { user } } = await supabase.auth.getUser();
        if (!mounted || !user?.id) return;
        
        setFacilitatorId(user.id);
        console.log('🔍 Facilitator ID set:', user.id);
        
        // Set loading timeout to prevent infinite loading
        loadingTimeout = setTimeout(() => {
          if (mounted) {
            console.warn('⚠️ Data loading timeout - some data may not have loaded');
          }
        }, 30000); // 30 second timeout
        
        // Load all data in parallel with proper error handling
        const [opportunitiesResult, recognitionResult, portfolioResult] = await Promise.allSettled([
          // Load opportunities
          supabase
          .from('incubation_opportunities')
          .select('*')
          .eq('facilitator_id', user.id)
            .order('created_at', { ascending: false }),
          
          // Load recognition records
          loadRecognitionRecords(user.id),
          
          // Load portfolio
          loadPortfolio(user.id)
        ]);
        
        if (!mounted) return;
        
        // Handle opportunities loading
        if (opportunitiesResult.status === 'fulfilled' && !opportunitiesResult.value.error) {
          const data = opportunitiesResult.value.data;
          if (Array.isArray(data)) {
          const mapped: IncubationOpportunity[] = data.map((row: any) => ({
            id: row.id,
            programName: row.program_name,
            description: row.description,
            deadline: row.deadline,
            posterUrl: row.poster_url || undefined,
            videoUrl: row.video_url || undefined,
            facilitatorId: row.facilitator_id,
            createdAt: row.created_at
          }));
          setMyPostedOpportunities(mapped);

            // Load applications for opportunities
          if (mapped.length > 0) {
            const oppIds = mapped.map(o => o.id);
            console.log('🔍 Loading applications for opportunities:', oppIds);
              
              try {
            const { data: apps, error: appsError } = await supabase
              .from('opportunity_applications')
              .select('id, opportunity_id, status, startup_id, pitch_deck_url, pitch_video_url, diligence_status, agreement_url, created_at, startups!inner(id,name)')
              .in('opportunity_id', oppIds)
              .order('created_at', { ascending: false });
            
            if (appsError) {
                  console.error('❌ Error loading opportunity applications:', appsError);
                  console.log('🔄 Trying fallback query without inner join...');
                  
                  // Try without the inner join
                  const { data: fallbackApps, error: fallbackAppsError } = await supabase
                    .from('opportunity_applications')
                    .select('id, opportunity_id, status, startup_id, pitch_deck_url, pitch_video_url, diligence_status, agreement_url, created_at')
                    .in('opportunity_id', oppIds)
                    .order('created_at', { ascending: false });
                  
                  if (fallbackAppsError) {
                    console.error('❌ Fallback query also failed:', fallbackAppsError);
                    setMyReceivedApplications([]);
                  } else {
                    console.log('✅ Fallback applications query successful');
                    // Map without startup data
                    const fallbackAppsMapped: ReceivedApplication[] = (fallbackApps || []).map((a: any) => ({
                      id: a.id,
                      startupId: a.startup_id,
                      startupName: 'Unknown Startup', // Fallback name
                      opportunityId: a.opportunity_id,
                      status: a.status,
                      diligenceStatus: a.diligence_status,
                      agreementUrl: a.agreement_url,
                      pitchDeckUrl: a.pitch_deck_url,
                      pitchVideoUrl: a.pitch_video_url,
                      createdAt: a.created_at
                    }));
                    setMyReceivedApplications(fallbackAppsMapped);
                  }
            } else {
              console.log('📋 Raw applications data:', apps);
              const appsMapped: ReceivedApplication[] = (apps || []).map((a: any) => ({
                id: a.id,
                startupId: a.startup_id,
                startupName: a.startups?.name || `Startup #${a.startup_id}`,
                opportunityId: a.opportunity_id,
                status: a.status || 'pending',
                pitchDeckUrl: a.pitch_deck_url || undefined,
                pitchVideoUrl: a.pitch_video_url || undefined,
                diligenceStatus: a.diligence_status || 'none',
                agreementUrl: a.agreement_url || undefined,
                createdAt: a.created_at
              }));
              console.log('🎯 Mapped applications:', appsMapped);
              if (mounted) setMyReceivedApplications(appsMapped);
                }
              } catch (appsErr) {
                console.error('Error loading applications:', appsErr);
                setMyReceivedApplications([]);
            }
          } else {
            setMyReceivedApplications([]);
          }
          }
        } else {
          console.error('Error loading opportunities:', opportunitiesResult.status === 'rejected' ? opportunitiesResult.reason : opportunitiesResult.value.error);
        }
        
        // Handle recognition and portfolio results
        if (recognitionResult.status === 'rejected') {
          console.error('Error loading recognition records:', recognitionResult.reason);
        }
        
        if (portfolioResult.status === 'rejected') {
          console.error('Error loading portfolio:', portfolioResult.reason);
        }
        
      } catch (error) {
        console.error('Error in loadFacilitatorData:', error);
      } finally {
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
        }
      }
    };
    
    loadFacilitatorData();
    
    return () => { 
      mounted = false;
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'discover') return;
    let mounted = true;
    setIsLoadingPitches(true);
    investorService.getActiveFundraisingStartups()
      .then(list => { if (mounted) setActiveFundraisingStartups(list); })
      .finally(() => { if (mounted) setIsLoadingPitches(false); });
    return () => { mounted = false; };
  }, [activeTab]);



  // Derived: sort applications - pending first, then by newest createdAt; others by newest createdAt
  const sortedReceivedApplications = useMemo(() => {
    const toTime = (s?: string) => (s ? new Date(s).getTime() : 0);
    const pending = myReceivedApplications.filter(a => a.status === 'pending').sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt));
    const others = myReceivedApplications.filter(a => a.status !== 'pending').sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt));
    return [...pending, ...others];
  }, [myReceivedApplications]);

  // Realtime: update received applications list when new rows are inserted
  useEffect(() => {
    if (!facilitatorId || myPostedOpportunities.length === 0) return;
    
    const oppIds = myPostedOpportunities.map(o => o.id);
    let channel: any = null;
    
    try {
      channel = supabase
      .channel('opportunity_applications_changes')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'opportunity_applications' 
        }, async (payload) => {
        try {
          const row: any = payload.new;
          if (!oppIds.includes(row.opportunity_id)) return;
            
            const { data: startup, error: startupError } = await supabase
            .from('startups')
            .select('id,name')
            .eq('id', row.startup_id)
            .single();
            
            if (startupError) {
              console.error('Error fetching startup for new application:', startupError);
              return;
            }
            
          setMyReceivedApplications(prev => [
            {
              id: row.id,
              startupId: row.startup_id,
              startupName: startup?.name || `Startup #${row.startup_id}`,
              opportunityId: row.opportunity_id,
              status: row.status || 'pending',
              pitchDeckUrl: row.pitch_deck_url || undefined,
              pitchVideoUrl: row.pitch_video_url || undefined,
              diligenceStatus: row.diligence_status || 'none',
              agreementUrl: row.agreement_url || undefined,
              createdAt: row.created_at
            },
            ...prev
          ]);
          
          // Show notification to facilitator
          console.log(`✅ New application received from ${startup?.name || 'Startup'} for opportunity ${row.opportunity_id}`);
          console.log('📝 Application details:', row);
        } catch (e) {
            console.error('Error processing new application:', e);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Subscribed to opportunity applications changes');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Error subscribing to opportunity applications changes');
          }
        });
    } catch (error) {
      console.error('Error setting up opportunity applications subscription:', error);
    }
    
    return () => { 
      if (channel) {
        console.log('🔌 Unsubscribing from opportunity applications changes');
        channel.unsubscribe();
      }
    };
  }, [facilitatorId, myPostedOpportunities]);

  // Realtime: update diligence status when startup approves
  useEffect(() => {
    if (!facilitatorId || myPostedOpportunities.length === 0) return;
    
    const oppIds = myPostedOpportunities.map(o => o.id);
    let channel: any = null;
    
    try {
      channel = supabase
      .channel('diligence_status_changes')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'opportunity_applications',
        filter: `opportunity_id=in.(${oppIds.join(',')})`
      }, async (payload) => {
        try {
          const row: any = payload.new;
          if (!oppIds.includes(row.opportunity_id)) return;
          
          // Update the application in the local state
          setMyReceivedApplications(prev => prev.map(app => 
            app.id === row.id 
              ? { 
                  ...app, 
                  diligenceStatus: row.diligence_status || 'none'
                }
              : app
          ));
          
          // Show notification if diligence was approved
          if (row.diligence_status === 'approved') {
              const { data: startup, error: startupError } = await supabase
              .from('startups')
              .select('name')
              .eq('id', row.startup_id)
              .single();
              
              if (startupError) {
                console.error('Error fetching startup for diligence approval:', startupError);
                return;
              }
              
            console.log(`✅ Due diligence approved by ${startup?.name || 'Startup'} for opportunity ${row.opportunity_id}`);
            
            // Show success popup
            const successMessage = document.createElement('div');
            successMessage.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            successMessage.innerHTML = `
              <div class="bg-white rounded-lg p-6 max-w-sm mx-4 text-center">
                <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
            </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Due Diligence Approved!</h3>
                <p class="text-gray-600 mb-4">${startup?.name || 'Startup'} has approved your due diligence request.</p>
                <button onclick="this.parentElement.parentElement.remove()" class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
                  Continue
                </button>
          </div>
            `;
            document.body.appendChild(successMessage);
          }
        } catch (e) {
          console.error('Error handling diligence status update:', e);
        }
      })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Subscribed to diligence status changes');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Error subscribing to diligence status changes');
          }
        });
    } catch (error) {
      console.error('Error setting up diligence status subscription:', error);
    }
    
    return () => { 
      if (channel) {
        console.log('🔌 Unsubscribing from diligence status changes');
        channel.unsubscribe();
      }
    };
  }, [facilitatorId, myPostedOpportunities]);

  const handleOpenPostModal = () => {
    setEditingIndex(null);
    setNewOpportunity(initialNewOppState);
    setPosterPreview('');
    setIsPostModalOpen(true);
  };

  const handleEditClick = (index: number) => {
    setEditingIndex(index);
    const opp = myPostedOpportunities[index];
    setNewOpportunity({
      programName: opp?.programName || '',
      description: opp?.description || '',
      deadline: opp?.deadline || '',
      posterUrl: opp?.posterUrl || '',
      videoUrl: opp?.videoUrl || '',
      facilitatorDescription: '',
      facilitatorWebsite: '',
    });
    setPosterPreview('');
    setIsPostModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewOpportunity(prev => ({ ...prev, [name]: value }));
  };

  const handleAcceptApplication = (application: ReceivedApplication) => {
    setSelectedApplication(application);
    setIsAcceptModalOpen(true);
  };

  const handleRejectApplication = async (application: ReceivedApplication) => {
    if (!confirm(`Are you sure you want to reject the application from ${application.startupName}?`)) {
      return;
    }

    try {
      setIsProcessingAction(true);
      
      const { error } = await supabase
        .from('opportunity_applications')
        .update({ status: 'rejected' })
        .eq('id', application.id);

      if (error) {
        console.error('Error rejecting application:', error);
        alert('Failed to reject application. Please try again.');
        return;
      }

      // Update local state
      setMyReceivedApplications(prev => 
        prev.map(app => 
          app.id === application.id 
            ? { ...app, status: 'rejected' as const }
            : app
        )
      );

      alert('Application rejected successfully.');
    } catch (error) {
      console.error('Error rejecting application:', error);
      alert('Failed to reject application. Please try again.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteStartupFromPortfolio = async (startupId: number) => {
    if (!confirm('Are you sure you want to remove this startup from your portfolio?')) {
      return;
    }

    try {
      setIsProcessingAction(true);
      
      // Remove from facilitator_portfolio table
      const { error } = await supabase
        .from('facilitator_portfolio')
        .delete()
        .eq('startup_id', startupId)
        .eq('facilitator_id', facilitatorId);

      if (error) {
        console.error('Error removing startup from portfolio:', error);
        alert('Failed to remove startup from portfolio. Please try again.');
        return;
      }

      // Update local state
      setPortfolioStartups(prev => prev.filter(startup => startup.id !== startupId));

      alert('Startup removed from portfolio successfully.');
    } catch (error) {
      console.error('Error removing startup from portfolio:', error);
      alert('Failed to remove startup from portfolio. Please try again.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteRecognitionRecord = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this recognition record?')) {
      return;
    }

    try {
      setIsProcessingAction(true);
      
      // Delete from recognition_records table
      const { error } = await supabase
        .from('recognition_records')
        .delete()
        .eq('id', parseInt(recordId));

      if (error) {
        console.error('Error deleting recognition record:', error);
        alert('Failed to delete recognition record. Please try again.');
        return;
      }

      // Update local state
      setRecognitionRecords(prev => prev.filter(record => record.id !== recordId));

      alert('Recognition record deleted successfully.');
    } catch (error) {
      console.error('Error deleting recognition record:', error);
      alert('Failed to delete recognition record. Please try again.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleAgreementFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file for the agreement.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert('File size must be less than 10MB.');
        return;
      }
      setAgreementFile(file);
    }
  };

  const handleAcceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplication || !agreementFile) {
      alert('Please upload an agreement PDF.');
      return;
    }

    setIsProcessingAction(true);
    try {
      // Upload agreement file
      const fileName = `agreements/${selectedApplication.id}/${Date.now()}-${agreementFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('startup-documents')
        .upload(fileName, agreementFile);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Failed to upload agreement: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('startup-documents')
        .getPublicUrl(fileName);

      // Update application status and add agreement URL
      const { error: updateError } = await supabase
        .from('opportunity_applications')
        .update({
          status: 'accepted',
          agreement_url: urlData.publicUrl,
          diligence_status: 'none'
        })
        .eq('id', selectedApplication.id);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw new Error(`Failed to update application: ${updateError.message}`);
      }

      // Update local state
      setMyReceivedApplications(prev => prev.map(app => 
        app.id === selectedApplication.id 
          ? { ...app, status: 'accepted', agreementUrl: urlData.publicUrl, diligenceStatus: 'none' }
          : app
      ));

      setIsAcceptModalOpen(false);
      setSelectedApplication(null);
      setAgreementFile(null);

      // Show success popup
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      successMessage.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-sm mx-4 text-center">
          <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Application Accepted!</h3>
          <p class="text-gray-600 mb-4">Agreement uploaded successfully. You can now request due diligence.</p>
          <button onclick="this.parentElement.parentElement.remove()" class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
            Continue
          </button>
          </div>
      `;
      document.body.appendChild(successMessage);
    } catch (e) {
      console.error('Failed to accept application:', e);
      alert('Failed to accept application. Please try again.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRequestDiligence = async (application: ReceivedApplication) => {
    if (application.diligenceStatus === 'requested') return;
    
    setIsProcessingAction(true);
    try {
      // Use the new RPC function
      const { data, error } = await supabase
        .rpc('request_diligence', { p_application_id: application.id });

      if (error) throw error;

      // Update local state
      setMyReceivedApplications(prev => prev.map(app => 
        app.id === application.id 
          ? { ...app, diligenceStatus: 'requested' }
          : app
      ));

      // Show success popup
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      successMessage.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-sm mx-4 text-center">
          <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Due Diligence Requested!</h3>
          <p class="text-gray-600 mb-4">The startup has been notified to complete due diligence.</p>
          <button onclick="this.parentElement.parentElement.remove()" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
            Continue
          </button>
          </div>
      `;
      document.body.appendChild(successMessage);
    } catch (e) {
      console.error('Failed to request diligence:', e);
      alert('Failed to request diligence. Please try again.');
    } finally {
      setIsProcessingAction(false);
    }
  };



  const handleApproveRecognition = async (recordId: string) => {
    if (!facilitatorId) {
      alert('Facilitator ID not found. Please refresh the page.');
      return;
    }

    try {
      setProcessingRecognitionId(recordId);
      
              // Find the record to get startup ID
        const record = recognitionRecords.find(r => r.id === recordId);
        if (!record) {
          alert('Record not found. Please try again.');
          return;
        }
        
                console.log('🔍 Record found:', record);
        console.log('🔍 Startup ID type:', typeof record.startupId, 'Value:', record.startupId);
        
        // Validate data types
        if (typeof record.startupId !== 'number') {
          console.error('❌ Invalid startup ID type:', typeof record.startupId, record.startupId);
          alert('Invalid startup data. Please try again.');
          return;
        }
        
      // Convert string ID to number for database operations
      const dbId = parseInt(recordId);
      if (isNaN(dbId)) {
        console.error('❌ Invalid record ID format:', recordId);
        alert('Invalid record ID. Please try again.');
        return;
      }

      // Validate all required data exists
      const validationChecks = await Promise.allSettled([
        // Check recognition record exists
        supabase
            .from('recognition_records')
            .select('id')
            .eq('id', dbId)
          .single(),
        
        // Check startup exists
        supabase
            .from('startups')
            .select('id')
            .eq('id', record.startupId)
          .single(),
        
        // Check user is facilitator
        supabase
          .from('users')
          .select('id, role')
          .eq('id', facilitatorId)
          .single()
      ]);

      // Check validation results
      const [recordCheck, startupCheck, userCheck] = validationChecks;
      
      if (recordCheck.status === 'rejected' || !recordCheck.value.data) {
        console.error('❌ Recognition record not found in database:', recordCheck.status === 'rejected' ? recordCheck.reason : 'No data');
        alert('Recognition record not found. Please try again.');
            return;
          }
          
      if (startupCheck.status === 'rejected' || !startupCheck.value.data) {
        console.error('❌ Startup not found in database:', startupCheck.status === 'rejected' ? startupCheck.reason : 'No data');
        alert('Startup not found. Please try again.');
          return;
        }
        
      if (userCheck.status === 'rejected' || !userCheck.value.data) {
        console.error('❌ User not found in database:', userCheck.status === 'rejected' ? userCheck.reason : 'No data');
            alert('User not found. Please try again.');
            return;
          }
          
      if (userCheck.value.data.role !== 'Startup Facilitation Center') {
        console.error('❌ User is not a facilitator:', userCheck.value.data.role);
            alert('User is not authorized as a facilitator. Please try again.');
            return;
          }
          
      console.log('✅ All validation checks passed');
        
        // Update the recognition request status in the database
        const { error: updateError } = await supabase
          .from('recognition_records')
          .update({ 
            status: 'approved'
          })
          .eq('id', dbId);
        
        if (updateError) {
          console.error('Error updating recognition request status:', updateError);
          alert('Failed to approve recognition. Please try again.');
          return;
        }
        
        // Add startup to facilitator's portfolio
        console.log('🔍 Adding startup to portfolio:', {
          facilitatorId: facilitatorId,
          startupId: record.startupId,
        recognitionRecordId: dbId
        });
        
        const portfolioEntry = await facilitatorStartupService.addStartupToPortfolio(
        facilitatorId,
          record.startupId,
        dbId
        );
        
        if (portfolioEntry) {
          // Update the recognition record status locally
          setRecognitionRecords(prev => {
            const updated = prev.map(r => 
              r.id === recordId 
                ? { ...r, status: 'approved' }
                : r
            );
            console.log('🔄 Updated recognition records:', updated);
            return updated;
          });
          
          // Reload the portfolio to show the new startup
            await loadPortfolio(facilitatorId);
          
          // Show success message
          const successMessage = document.createElement('div');
          successMessage.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
          successMessage.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-sm mx-4 text-center">
              <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">Recognition Approved!</h3>
              <p class="text-gray-600 mb-4">Startup has been added to your portfolio.</p>
              <button onclick="this.parentElement.parentElement.remove()" class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
                Continue
              </button>
            </div>
          `;
          document.body.appendChild(successMessage);
        } else {
          alert('Failed to add startup to portfolio. Please try again.');
        }
    } catch (err) {
      console.error('Error approving recognition:', err);
      alert('Failed to approve recognition. Please try again.');
    } finally {
      setProcessingRecognitionId(null);
    }
  };



  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (JPEG, PNG, GIF, WebP, SVG).');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB.');
        return;
      }
      
      const previewUrl = URL.createObjectURL(file);
      setPosterPreview(previewUrl);
      setNewOpportunity(prev => ({ ...prev, posterUrl: previewUrl }));
    }
  };

  const handleSubmitOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilitatorId) {
      alert('Unable to find facilitator account. Please re-login.');
      return;
    }

    try {
      let posterUrlToSave = newOpportunity.posterUrl;
      
      // If posterUrl is a blob URL (from file upload), upload it to storage
      if (posterUrlToSave && posterUrlToSave.startsWith('blob:')) {
        // Get the file from the input
        const fileInput = document.querySelector('input[name="posterUrl"]') as HTMLInputElement;
        if (fileInput && fileInput.files && fileInput.files[0]) {
          const file = fileInput.files[0];
          const fileName = `posters/${facilitatorId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          
          console.log('Uploading poster image:', fileName);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('opportunity-posters')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            throw new Error(`Failed to upload poster image: ${uploadError.message}`);
          }

          const { data: urlData } = supabase.storage
            .from('opportunity-posters')
            .getPublicUrl(fileName);
          
          posterUrlToSave = urlData.publicUrl;
          console.log('Poster uploaded successfully:', posterUrlToSave);
        }
      }

      const payload = {
        program_name: newOpportunity.programName,
        description: newOpportunity.description,
        deadline: newOpportunity.deadline,
        poster_url: posterUrlToSave || null,
        video_url: newOpportunity.videoUrl || null,
        facilitator_id: facilitatorId
      };

      if (editingIndex !== null) {
        const target = myPostedOpportunities[editingIndex];
        const { data, error } = await supabase
          .from('incubation_opportunities')
          .update(payload)
          .eq('id', target.id)
          .select()
          .single();
        if (error) throw error;
        const updated: IncubationOpportunity = {
          id: data.id,
          programName: data.program_name,
          description: data.description,
          deadline: data.deadline,
          posterUrl: data.poster_url || undefined,
          videoUrl: data.video_url || undefined,
          facilitatorId: data.facilitator_id,
          createdAt: data.created_at
        };
        setMyPostedOpportunities(prev => prev.map((op, i) => i === editingIndex ? updated : op));
      } else {
        const { data, error } = await supabase
          .from('incubation_opportunities')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        const inserted: IncubationOpportunity = {
          id: data.id,
          programName: data.program_name,
          description: data.description,
          deadline: data.deadline,
          posterUrl: data.poster_url || undefined,
          videoUrl: data.video_url || undefined,
          facilitatorId: data.facilitator_id,
          createdAt: data.created_at
        };
        setMyPostedOpportunities(prev => [inserted, ...prev]);
      }

      setIsPostModalOpen(false);
      setPosterPreview('');
      setNewOpportunity(initialNewOppState);
    } catch (err) {
      console.error('Failed to save opportunity:', err);
      alert('Failed to save opportunity. Please try again.');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
  return (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <SummaryCard title="My Startups" value={myPortfolio.length} icon={<Users className="h-6 w-6 text-brand-primary" />} />
              <SummaryCard title="Opportunities Posted" value={myPostedOpportunities.length} icon={<Gift className="h-6 w-6 text-brand-primary" />} />
              <SummaryCard title="Applications Received" value={myReceivedApplications.length} icon={<FileText className="h-6 w-6 text-brand-primary" />} />
      </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <Card>
                  <h3 className="text-lg font-semibold mb-4 text-slate-700">Received Applications</h3>
                  <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                                                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Startup</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Opportunity</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Pitch Materials</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {sortedReceivedApplications.map(app => (
                          <tr key={app.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{app.startupName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{myPostedOpportunities.find(o => o.id === app.opportunityId)?.programName || '—'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex justify-center items-center gap-3">
                                {app.pitchDeckUrl ? (
                                  <a href={app.pitchDeckUrl} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-brand-primary transition-colors" title="View Pitch Deck">
                                    <FileText className="h-5 w-5" />
                                  </a>
                                ) : (
                                  <span className="text-slate-300 cursor-not-allowed" title="No Pitch Deck">
                                    <FileText className="h-5 w-5" />
                                  </span>
                                )}
                                {app.pitchVideoUrl ? (
                                  <a href={app.pitchVideoUrl} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-brand-primary transition-colors" title="View Pitch Video">
                                    <Video className="h-5 w-5" />
                                  </a>
                                ) : (
                                  <span className="text-slate-300 cursor-not-allowed" title="No Pitch Video">
                                    <Video className="h-5 w-5" />
                                  </span>
                                )}
        </div>

                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                              <div className="flex flex-col gap-2 items-center">
                                {/* Status Actions */}
                              {app.status === 'pending' && (
                                  <>
                                <Button 
                                  size="sm" 
                                  onClick={() => handleAcceptApplication(app)}
                                  disabled={isProcessingAction}
                                      className="w-full"
                                >
                                  Approve Application
                                </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleRejectApplication(app)}
                                      disabled={isProcessingAction}
                                      className="w-full text-red-600 border-red-600 hover:bg-red-50"
                                    >
                                      Reject Application
                                    </Button>
                                  </>
                              )}
                              {app.status === 'accepted' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  disabled
                                    className="w-full"
                                >
                                  Approved
                                </Button>
                              )}
                                {app.status === 'rejected' && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    disabled
                                    className="w-full text-red-600 border-red-600"
                                  >
                                    Rejected
                                  </Button>
                                )}
                                
                                {/* Diligence Actions */}
                              {(app.diligenceStatus === 'none' || app.diligenceStatus == null) && app.status === 'pending' && (
                                <Button
                                  size="sm"
                                    variant="outline"
                                  onClick={() => handleRequestDiligence(app)}
                                  disabled={isProcessingAction}
                                    className="w-full"
                                >
                                  Request Diligence
                                </Button>
                              )}
                              {(app.diligenceStatus === 'none' || app.diligenceStatus == null) && app.status === 'accepted' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled
                                  title="Disabled after application approval"
                                    className="w-full"
                                >
                                  Unavailable after approval
                                </Button>
                              )}
                              {app.diligenceStatus === 'requested' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled
                                    className="w-full"
                                >
                                    Diligence Requested
                                </Button>
                              )}
                              {app.diligenceStatus === 'approved' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                    onClick={() => {
                                      // Create a startup object from application data for onViewStartup
                                      const startupObj: Startup = {
                                        id: app.startupId,
                                        name: app.startupName,
                                        sector: 'Unknown', // Not available in application data
                                        investmentType: 'equity' as any, // Default value
                                        investmentValue: 0,
                                        equityAllocation: 0,
                                        currentValuation: 0,
                                        totalFunding: 0,
                                        totalRevenue: 0,
                                        registrationDate: new Date().toISOString().split('T')[0],
                                        currency: 'USD',
                                        complianceStatus: ComplianceStatus.Pending,
                                        founders: [] // Not available in application data
                                      };
                                      onViewStartup(startupObj);
                                    }}
                                    className="w-full"
                                >
                                  View Diligence
                                </Button>
                              )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {myReceivedApplications.length === 0 && (
                          <tr><td colSpan={4} className="text-center py-8 text-slate-500">No applications received yet.</td></tr>
                        )}
                      </tbody>
                    </table>
        </div>
      </Card>

                {/* Recognition and Incubation Section */}
                <Card>
                  <h3 className="text-lg font-semibold mb-4 text-slate-700">Recognition & Incubation Requests</h3>
                  <div className="overflow-x-auto">
                    {isLoadingRecognition ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-slate-500">Loading recognition requests...</p>
                      </div>
                    ) : recognitionRecords.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <p>No recognition requests received yet.</p>
                        <p className="text-sm mt-1">Startups will appear here when they submit recognition forms.</p>
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Program</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Documents</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {recognitionRecords.map((record) => (
                            <tr key={record.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900">{record.startup?.name || 'Unknown Startup'}</div>
                                <div className="text-xs text-slate-500">{record.startup?.sector || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{record.programName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{record.incubationType}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                {record.signedAgreementUrl ? (
                                  <a 
                                    href={record.signedAgreementUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline"
                                  >
                                    View Agreement
                                  </a>
                                ) : (
                                  <span className="text-slate-400">No document</span>
                                )}
                              </td>

                                                                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center gap-2 justify-end">
                                {record.status === 'pending' && (
                                    <Button 
                                        size="sm" 
                                        onClick={() => handleApproveRecognition(record.id)}
                                        disabled={processingRecognitionId === record.id}
                                    >
                                        <Check className="mr-2 h-4 w-4" />
                                        {processingRecognitionId === record.id ? 'Processing...' : 'Accept'}
                                    </Button>
                                )}
                                {record.status === 'approved' && (
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        disabled
                                        className="bg-green-50 text-green-700 border-green-200"
                                    >
                                        <Check className="mr-2 h-4 w-4" />
                                        Approved
                                    </Button>
                                )}
                                {processingRecognitionId === record.id && record.status !== 'approved' && (
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        disabled
                                        className="bg-blue-50 text-blue-700 border-blue-200"
                                    >
                                        <Check className="mr-2 h-4 w-4" />
                                        Processing...
                                    </Button>
                                )}
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleDeleteRecognitionRecord(record.id)}
                                    className="text-red-600 border-red-600 hover:bg-red-50"
                                    title="Delete recognition record"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                            </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </Card>

                <Card>
                  <h3 className="text-lg font-semibold mb-4 text-slate-700">My Startups</h3>
                  <div className="overflow-x-auto">
                    {isLoadingPortfolio ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-slate-500">Loading portfolio...</p>
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                                                      <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup Name</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Compliance Status</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {myPortfolio.map(startup => (
                            <tr key={startup.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900">{startup.name}</div>
                                <div className="text-xs text-slate-500">{startup.sector}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500"><Badge status={startup.complianceStatus} /></td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center gap-2 justify-end">
                                                              <Button 
                                size="sm" 
                                variant="outline" 
                                    onClick={() => {
                                      // Convert portfolio startup data to Startup object for onViewStartup
                                      const startupObj: Startup = {
                                        id: startup.id,
                                        name: startup.name,
                                        sector: startup.sector,
                                        investmentType: 'equity' as any, // Default value
                                        investmentValue: startup.totalFunding || 0,
                                        equityAllocation: 0, // Not available in portfolio data
                                        currentValuation: startup.totalFunding || 0,
                                        totalFunding: startup.totalFunding || 0,
                                        totalRevenue: startup.totalRevenue || 0,
                                        registrationDate: startup.registrationDate || new Date().toISOString().split('T')[0],
                                        currency: startup.currency || 'USD',
                                        complianceStatus: startup.complianceStatus || ComplianceStatus.Pending,
                                        founders: [] // Not available in portfolio data
                                      };
                                      onViewStartup(startupObj);
                                    }}
                                title="View complete startup dashboard for tracking"
                              >
                                <Eye className="mr-2 h-4 w-4" /> 
                                Track Startup
                              </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleDeleteStartupFromPortfolio(startup.id)}
                                    className="text-red-600 border-red-600 hover:bg-red-50"
                                    title="Remove startup from portfolio"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                                                      {myPortfolio.length === 0 && (
                              <tr><td colSpan={3} className="text-center py-8 text-slate-500">No startups in your portfolio yet.</td></tr>
                            )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </Card>
      </div>

              <div className="space-y-8">
                <PortfolioDistributionChart data={myPortfolio} />
                <Card>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-slate-700">My Opportunities</h3>
                    <Button size="sm" onClick={handleOpenPostModal}><PlusCircle className="h-4 w-4 mr-1" /> Post</Button>
                  </div>
                  <div className="overflow-x-auto max-h-96">
                    <ul className="divide-y divide-slate-200">
                      {myPostedOpportunities.map((opp, idx) => (
                        <li key={opp.id} className="py-3 flex justify-between items-center">
                  <div>
                            <p className="font-semibold text-slate-800">{opp.programName}</p>
                            <p className="text-xs text-slate-500">Deadline: {opp.deadline || '—'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEditClick(idx)} title="Edit"><Edit className="h-4 w-4"/></Button>
                            <Button size="sm" variant="outline" onClick={async () => {
                              if (!confirm('Delete this opportunity?')) return;
                              const target = myPostedOpportunities[idx];
                              const { error } = await supabase
                                .from('incubation_opportunities')
                                .delete()
                                .eq('id', target.id);
                              if (!error) setMyPostedOpportunities(prev => prev.filter((_, i) => i !== idx));
                            }} title="Delete">✕</Button>
            </div>
                        </li>
          ))}
                      {myPostedOpportunities.length === 0 && (
                        <li className="text-center py-6 text-slate-500">No opportunities posted.</li>
                      )}
                    </ul>
        </div>
      </Card>
                    </div>
                  </div>
                </div>
        );
      case 'discover':
        // Filter startups based on search term
        const filteredStartups = searchTerm.trim() 
          ? activeFundraisingStartups.filter(startup => 
              startup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              startup.sector.toLowerCase().includes(searchTerm.toLowerCase())
            )
          : activeFundraisingStartups;

        return (
          <div className="animate-fade-in max-w-3xl mx-auto w-full">
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search startups by name or sector..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                />
              </div>
            </div>

            {isLoadingPitches ? (
              <Card className="text-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Loading Pitches...</p>
              </Card>
            ) : filteredStartups.length === 0 ? (
              <Card className="p-8 text-center">
                <Film className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600">
                  {searchTerm.trim() ? 'No startups found matching your search.' : 'No active fundraising pitches.'}
                </p>
              </Card>
            ) : (
              <div className="space-y-6">
                {filteredStartups.map(inv => {
                  const embedUrl = investorService.getYoutubeEmbedUrl(inv.pitchVideoUrl);
                  return (
                    <Card key={inv.id} className="!p-0 overflow-hidden shadow-lg">
                      <div className="relative w-full aspect-[16/9] bg-slate-900">
                        {embedUrl ? (
                          playingVideoId === inv.id ? (
                            <iframe 
                              src={embedUrl}
                              title={`Pitch video for ${inv.name}`}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="absolute top-0 left-0 w-full h-full"
                            />
                          ) : (
                            <div 
                              className="relative w-full h-full group cursor-pointer"
                              onClick={() => setPlayingVideoId(inv.id)}
                            >
                              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-200">
                                  <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                  </svg>
                                </div>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                            <div className="text-center text-slate-400">
                              <Video className="h-16 w-16 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">Video not available</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-slate-800">{inv.name}</h3>
                            {inv.complianceStatus === ComplianceStatus.Compliant && (
                              <div className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-full text-xs font-medium">
                                <CheckCircle className="h-3 w-3" />
                                Startup Nation Verified
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShare(inv)}
                            className="flex items-center gap-2"
                          >
                            <Share2 className="h-4 w-4" />
                            Share
                          </Button>
                        </div>
                        <p className="text-sm text-slate-500 font-medium">{inv.sector}</p>
                        <div className="mt-3 text-sm">
                          Ask: ${inv.investmentValue.toLocaleString()} for <span className="font-semibold text-blue-600">{inv.equityAllocation}%</span> equity
                        </div>
                        <div className="mt-3 text-sm text-slate-500">
                          {inv.pitchDeckUrl ? (
                            <a href={inv.pitchDeckUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-blue-600"><FileText className="h-4 w-4"/> View Deck</a>
                          ) : (
                            <span className="inline-flex items-center gap-2 text-slate-400"><FileText className="h-4 w-4"/> Deck not available</span>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // If profile page is open, show it instead of main content
  if (showProfilePage) {
    return (
      <ProfilePage
        currentUser={currentUser}
        onBack={() => setShowProfilePage(false)}
        onProfileUpdate={onProfileUpdate}
        onLogout={onLogout}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with facilitator code display */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Facilitation Center Dashboard</h1>
          <p className="text-slate-600">Manage your startup portfolio and opportunities</p>
        </div>
        <div className="flex items-center gap-4">
          <FacilitatorCodeDisplay currentUser={currentUser} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowProfilePage(true)}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Profile
          </Button>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button onClick={() => setActiveTab('dashboard')} className={`${activeTab === 'dashboard' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}>
            <LayoutGrid className="h-5 w-5" />Dashboard
          </button>
          <button onClick={() => setActiveTab('discover')} className={`${activeTab === 'discover' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}>
            <Film className="h-5 w-5" />Discover Pitches
          </button>
        </nav>
      </div>

      <div className="animate-fade-in">{renderTabContent()}</div>

      <Modal isOpen={isPostModalOpen} onClose={() => setIsPostModalOpen(false)} title={editingIndex !== null ? 'Edit Opportunity' : 'Post New Opportunity'} size="2xl">
        <form onSubmit={handleSubmitOpportunity}>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
            <Input label="Program Name" id="programName" name="programName" value={newOpportunity.programName} onChange={handleInputChange} required />
                  <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">Program Description</label>
              <textarea id="description" name="description" value={newOpportunity.description} onChange={handleInputChange} required rows={3} className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                    </div>
            <Input label="Application Deadline" id="deadline" name="deadline" type="date" value={newOpportunity.deadline} onChange={handleInputChange} required />
            <div className="border-t pt-4 mt-2 space-y-4">
              <Input label="Poster/Banner Image" id="posterUrl" name="posterUrl" type="file" accept="image/*" onChange={handlePosterChange} />
              {posterPreview && <img src={posterPreview} alt="Poster preview" className="mt-2 rounded-lg max-h-40 w-auto" />}
              <p className="text-center text-sm text-slate-500">OR</p>
              <Input label="YouTube Video Link" id="videoUrl" name="videoUrl" type="url" placeholder="https://www.youtube.com/watch?v=..." value={newOpportunity.videoUrl} onChange={handleInputChange} />
                </div>
                
            <div className="border-t pt-4 mt-2 space-y-4">
              <h4 className="text-md font-semibold text-slate-700">About Your Organization</h4>
              <div>
                <label htmlFor="facilitatorDescription" className="block text-sm font-medium text-slate-700 mb-1">Organization Description</label>
                <textarea id="facilitatorDescription" name="facilitatorDescription" value={newOpportunity.facilitatorDescription} onChange={handleInputChange} required rows={3} className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
              </div>
              <Input label="Organization Website" id="facilitatorWebsite" name="facilitatorWebsite" type="url" placeholder="https://..." value={newOpportunity.facilitatorWebsite} onChange={handleInputChange} />
                </div>
              </div>
          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button type="button" variant="secondary" onClick={() => setIsPostModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingIndex !== null ? 'Save Changes' : 'Post Opportunity'}</Button>
          </div>
        </form>
      </Modal>

      {/* Accept Application Modal */}
      <Modal isOpen={isAcceptModalOpen} onClose={() => setIsAcceptModalOpen(false)} title={`Accept Application: ${selectedApplication?.startupName}`}>
        <form onSubmit={handleAcceptSubmit} className="space-y-4">
          <p className="text-sm text-slate-600">
            To accept this application, please upload the agreement PDF for <span className="font-semibold">{selectedApplication?.startupName}</span>.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Agreement PDF
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={handleAgreementFileChange}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              required
            />
            <p className="text-xs text-slate-500 mt-1">Max 10MB</p>
            {agreementFile && (
              <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
                <Check className="h-4 w-4" />
                <span>{agreementFile.name}</span>
        </div>
      )}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setIsAcceptModalOpen(false)}
              disabled={isProcessingAction}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={!agreementFile || isProcessingAction}
            >
              {isProcessingAction ? 'Processing...' : 'Accept & Upload Agreement'}
            </Button>
          </div>
        </form>
      </Modal>

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default FacilitatorView;

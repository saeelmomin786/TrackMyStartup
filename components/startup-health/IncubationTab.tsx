import React, { useState, useEffect, useRef } from 'react';
import { Startup } from '../../types';
import { IncubationType, FeeType } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import CloudDriveInput from '../ui/CloudDriveInput';
import { FileText, MessageCircle, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { questionBankService, OpportunityQuestion } from '../../lib/questionBankService';
import { messageService } from '../../lib/messageService';
import { capTableService } from '../../lib/capTableService';
import { facilitatorMentorService } from '../../lib/facilitatorMentorService';
import { facilitatorNetworkService, type StartupNetworkLink } from '../../lib/facilitatorNetworkService';
import Modal from '../ui/Modal';
import { Form2SubmissionModal } from '../Form2SubmissionModal';
import StartupMessagingModal from './StartupMessagingModal';
import OpportunitiesTab from './OpportunitiesTab';
import FundraisingCRM from './FundraisingCRM';
import ConnectMentorRequestModal from '../mentor/ConnectMentorRequestModal';

interface IncubationTabProps {
  startup: Startup;
  isViewOnly?: boolean;
  currentUser?: any;
  onTrialButtonClick?: () => void;
  onMentorRequestSent?: () => void;
}

const IncubationTab: React.FC<IncubationTabProps> = ({ startup, isViewOnly = false, currentUser, onTrialButtonClick, onMentorRequestSent }) => {
  const [activeSubTab, setActiveSubTab] = useState<'programs' | 'grantPrograms' | 'myCenters'>('programs');
  const [incubationPrograms, setIncubationPrograms] = useState<any[]>([]);
  const [form2Requests, setForm2Requests] = useState<any[]>([]);
  const [incubationFilter, setIncubationFilter] = useState<'all' | 'pending' | 'accepted' | 'form2_pending'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [authUserId, setAuthUserId] = useState<string>('');

  const crmRef = useRef<{
    addInvestorToCRM: (investorData: { name: string; email?: string; website?: string; linkedin?: string }) => void;
    addProgramToCRM: (programData: { programName: string; programType?: 'Grant' | 'Incubation' | 'Acceleration' | 'Mentorship' | 'Bootcamp'; description?: string; programUrl?: string; facilitatorName?: string }) => void;
  } | null>(null);
  
  // Form 2 Submission Modal states
  const [isForm2ModalOpen, setIsForm2ModalOpen] = useState(false);
  const [selectedForm2Data, setSelectedForm2Data] = useState<{
    applicationId: string;
    opportunityId: string;
    opportunityName: string;
  } | null>(null);
  
  // Messaging modal states
  const [isMessagingModalOpen, setIsMessagingModalOpen] = useState(false);
  const [selectedOfferForMessaging, setSelectedOfferForMessaging] = useState<any>(null);
  
  // Contract viewing modal states
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isRecognitionModalOpen, setIsRecognitionModalOpen] = useState(false);
  const [recognitionFormState, setRecognitionFormState] = useState<{[key:string]: any}>({});
  
  // Program Tracking Questions Modal states
  const [isTrackingQuestionsModalOpen, setIsTrackingQuestionsModalOpen] = useState(false);
  const [selectedProgramForTracking, setSelectedProgramForTracking] = useState<{
    facilitatorId: string;
    programName: string;
    facilitatorName: string;
  } | null>(null);
  const [trackingQuestions, setTrackingQuestions] = useState<OpportunityQuestion[]>([]);
  const [trackingResponses, setTrackingResponses] = useState<Map<string, string>>(new Map());
  const [isLoadingTrackingQuestions, setIsLoadingTrackingQuestions] = useState(false);
  const [isSavingTrackingResponses, setIsSavingTrackingResponses] = useState(false);
  
  // My Incubation Center states
  const [acceptedCenters, setAcceptedCenters] = useState<any[]>([]);
  const [selectedCenterForDetail, setSelectedCenterForDetail] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailModalMentors, setDetailModalMentors] = useState<any[]>([]);
  const [isLoadingDetailModal, setIsLoadingDetailModal] = useState(false);
  const [detailTrackingQuestions, setDetailTrackingQuestions] = useState<OpportunityQuestion[]>([]);
  const [detailTrackingResponses, setDetailTrackingResponses] = useState<Map<string, string>>(new Map());
  const [detailUnreadCount, setDetailUnreadCount] = useState<number>(0);
  const [startupFacilitatorNetwork, setStartupFacilitatorNetwork] = useState<StartupNetworkLink[]>([]);
  
    // Mentor connection states for Assigned Mentors
    const [connectModalOpen, setConnectModalOpen] = useState(false);
    const [selectedMentor, setSelectedMentor] = useState<any>(null);
  
  // Recognition/Agreement upload states
  const [selectedOfferForContract, setSelectedOfferForContract] = useState<any>(null);
  const [recFeeType, setRecFeeType] = useState<FeeType>(FeeType.Free);
  const [recShares, setRecShares] = useState<string>('');
  const [recPricePerShare, setRecPricePerShare] = useState<string>('');
  const [recAmount, setRecAmount] = useState<string>('');
  const [recEquity, setRecEquity] = useState<string>('');
  const [recPostMoney, setRecPostMoney] = useState<string>('');
  const [recAgreementFile, setRecAgreementFile] = useState<File | null>(null);
  const [totalSharesForCalc, setTotalSharesForCalc] = useState<number>(0);

  // Load incubation programs on mount
  useEffect(() => {
    loadIncubationPrograms();
  }, [startup.id]);

  useEffect(() => {
    const loadAuthUserId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          setAuthUserId(user.id);
        }
      } catch (error) {
        console.error('Error getting auth user ID:', error);
      }
    };
    loadAuthUserId();
  }, []);

  // Load cap table total shares when recognition modal opens
  useEffect(() => {
    if (isRecognitionModalOpen && startup?.id) {
      const loadCapTableData = async () => {
        try {
          const totalShares = await capTableService.getTotalShares(startup.id);
          setTotalSharesForCalc(totalShares || 0);
        } catch (error) {
          console.error('Error loading cap table:', error);
          setTotalSharesForCalc(0);
        }
      };
      loadCapTableData();
    }
  }, [isRecognitionModalOpen, startup?.id]);

  // Auto-calculate equity, amount, and post-money valuation
  useEffect(() => {
    const sharesNum = Number(recShares) || 0;
    const ppsNum = Number(recPricePerShare) || 0;
    const amount = sharesNum * ppsNum;
    setRecAmount(amount ? String(amount) : '');
    if (totalSharesForCalc > 0 && sharesNum > 0) {
      const equityPct = (sharesNum / totalSharesForCalc) * 100;
      setRecEquity(equityPct.toFixed(4));
      const postMoney = equityPct > 0 ? amount / (equityPct / 100) : 0;
      setRecPostMoney(postMoney ? String(postMoney) : '');
    }
  }, [recShares, recPricePerShare, totalSharesForCalc]);

  const refreshFacilitatorNetworkLinks = async () => {
    try {
      const links = await facilitatorNetworkService.listLinksForStartup(Number(startup.id));
      setStartupFacilitatorNetwork(links);
    } catch (e) {
      console.warn('IncubationTab: facilitator network links', e);
      setStartupFacilitatorNetwork([]);
    }
  };

  const loadIncubationPrograms = async () => {
    try {
      setIsLoading(true);
      
      // Step 1: Fetch all opportunity applications
      const { data: allApplications, error: appError } = await supabase
        .from('opportunity_applications')
        .select('*, diligence_status, diligence_urls, created_at')
        .eq('startup_id', startup.id);

      if (appError) throw appError;
      if (!allApplications || allApplications.length === 0) {
        setIncubationPrograms([]);
        setForm2Requests([]);
        setAcceptedCenters([]);
        await refreshFacilitatorNetworkLinks();
        return;
      }

      // Step 2: Filter out diligence applications and get incubation ones
      const diligenceApplications = allApplications.filter((app: any) => {
        const status = typeof app?.diligence_status === 'string' 
          ? app.diligence_status.toLowerCase() 
          : null;
        return status === 'requested' || status === 'approved';
      });
      
      const diligenceAppIds = new Set(diligenceApplications.map(app => app.id));
      const incubationApplications = allApplications.filter(app => {
        const isNotWithdrawn = app.status !== 'withdrawn';
        const isNotInDiligence = !diligenceAppIds.has(app.id);
        return isNotWithdrawn && isNotInDiligence;
      });

      // Step 3: Fetch opportunity details for enrichment
      const opportunityIds = incubationApplications
        .map(app => app.opportunity_id)
        .filter(Boolean);
      
      let opportunityMap: { [key: string]: any } = {};
      let facilitatorProfiles: { [key: string]: any } = {};

      if (opportunityIds.length > 0) {
        const { data: opportunities } = await supabase
          .from('incubation_opportunities')
          .select(`id, program_name, facilitator_id, facilitator_code`)
          .in('id', opportunityIds);

        if (opportunities) {
          opportunities.forEach(opp => {
            opportunityMap[opp.id] = opp;
          });

          // Step 4: Fetch facilitator profiles
          const facilitatorIds = opportunities
            .map(opp => opp.facilitator_id)
            .filter(Boolean);

          if (facilitatorIds.length > 0) {
            const { data: profiles } = await supabase
              .from('user_profiles')
              .select('id, auth_user_id, center_name, facilitator_code, firm_name')
              .in('auth_user_id', facilitatorIds);

            if (profiles) {
              profiles.forEach(profile => {
                facilitatorProfiles[profile.auth_user_id] = profile;
              });
            }
          }
        }
      }

      // Step 5: Map applications to program format
      const mappedPrograms = incubationApplications.map((app: any) => {
        const opportunity = opportunityMap[app.opportunity_id];
        const facilitatorProfile = opportunity 
          ? facilitatorProfiles[opportunity.facilitator_id]
          : null;

        const facilitatorName = facilitatorProfile?.center_name || 
                               facilitatorProfile?.firm_name ||
                               opportunity?.facilitator_code ||
                               'Unknown Facilitator';

        // Use facilitator_code from opportunity first, then fall back to user_profiles
        const facilitatorCodeValue = opportunity?.facilitator_code || facilitatorProfile?.facilitator_code;

        return {
          id: app.id,
          applicationId: app.id,
          opportunityId: app.opportunity_id,
          programName: opportunity?.program_name || 'Unknown Program',
          facilitatorName,
          facilitatorId: opportunity?.facilitator_id,
          facilitatorCode: facilitatorCodeValue,
          status: app.status,
          form2: {
            requested: app.form2_requested || false,
            status: app.form2_status || 'not_requested'
          },
          isShortlisted: app.is_shortlisted,
          contractUrl: app.contract_url,
          agreementUrl: app.agreement_url,
          createdAt: app.created_at
        };
      });

      setIncubationPrograms(
        mappedPrograms.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
      
      // Filter and set accepted centers
      const accepted = mappedPrograms.filter(prog => prog.status === 'accepted');
      setAcceptedCenters(accepted);

      await refreshFacilitatorNetworkLinks();
      
      // Calculate form2 requests
      const form2RequestsCount = mappedPrograms.filter(
        prog => prog.form2.requested && prog.form2.status === 'pending'
      ).length;
      setForm2Requests(new Array(form2RequestsCount));
    } catch (error) {
      console.error('Error loading incubation programs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadAgreement = async (url: string) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = url.split('/').pop() || 'agreement';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading agreement:', error);
    }
  };

  const handleOpenTrackingQuestions = async (
    facilitatorId: string,
    programName: string,
    facilitatorName: string
  ) => {
    setIsLoadingTrackingQuestions(true);
    try {
      // Load program tracking questions with correct service method
      const questions = await questionBankService.getProgramTrackingQuestions(facilitatorId, programName);
      setTrackingQuestions(questions);

      // Load existing responses for this program
      const existingResponses = await questionBankService.getProgramTrackingResponses(startup.id, facilitatorId, programName);
      const responsesMap = new Map<string, string>();
      existingResponses.forEach(resp => {
        responsesMap.set(resp.questionId, resp.answerText);
      });
      setTrackingResponses(responsesMap);

      setSelectedProgramForTracking({
        facilitatorId,
        programName,
        facilitatorName
      });
      setIsTrackingQuestionsModalOpen(true);
    } catch (error) {
      console.error('Error loading tracking questions:', error);
      messageService.error('Error', 'Failed to load tracking questions. Please try again.');
    } finally {
      setIsLoadingTrackingQuestions(false);
    }
  };

  const handleSaveTrackingResponses = async () => {
    if (!selectedProgramForTracking) return;

    setIsSavingTrackingResponses(true);
    try {
      // Save each response using the service method
      for (const [questionId, answerText] of trackingResponses.entries()) {
        await questionBankService.saveProgramTrackingResponse(
          startup.id,
          selectedProgramForTracking.facilitatorId,
          selectedProgramForTracking.programName,
          questionId,
          answerText
        );
      }

      messageService.success(
        'Responses Saved',
        'Tracking responses saved successfully.',
        2000
      );
      setIsTrackingQuestionsModalOpen(false);
      setTrackingResponses(new Map());
      setSelectedProgramForTracking(null);
      loadIncubationPrograms();
    } catch (error) {
      console.error('Error saving tracking responses:', error);
      messageService.error('Error', 'Failed to save tracking responses. Please try again.');
    } finally {
      setIsSavingTrackingResponses(false);
    }
  };

  const handleOpenCenterDetail = async (center: any) => {
    setSelectedCenterForDetail(center);
    setIsDetailModalOpen(true);
    setIsLoadingDetailModal(true);

      try {
      // Fetch mentor assignments for this specific incubation center.
      // We intentionally scope by facilitatorCode so one startup with multiple centers
      // does not leak mentor assignments across cards.
      console.log('🔍 [IncubationTab] Opening center detail:', { 
        facilitatorCode: center.facilitatorCode, 
        facilitatorId: center.facilitatorId,
        programName: center.programName,
        startupId: startup.id 
      });
      
      // DEBUG: Check what's in the database
      await facilitatorMentorService.debugCheckAllAssignments();
      await facilitatorMentorService.debugCheckStartupAssignments(startup.id);
      
      if (center.facilitatorCode) {
        let assignments = await facilitatorMentorService.getAssignmentsForFacilitator(center.facilitatorCode);
        console.log('📋 [IncubationTab] Assignments fetched for facilitator code:', { 
          facilitatorCode: center.facilitatorCode, 
          allAssignments: assignments?.length || 0, 
          assignments 
        });
        
        const filtered = (assignments || []).filter((a: any) => String(a.startup_id) === String(startup.id));
        console.log('✅ [IncubationTab] Final filtered assignments for this startup:', { 
          startupId: startup.id, 
          filtered: filtered?.length || 0, 
          mentors: filtered 
        });
        setDetailModalMentors(filtered || []);
      } else {
        console.warn('⚠️ [IncubationTab] No facilitatorCode in center object:', center);
        setDetailModalMentors([]);
      }

      // Fetch full application details for agreements, diligence, etc.
      if (center.applicationId) {
        try {
          const { data: appData } = await supabase
            .from('opportunity_applications')
            .select('*')
            .eq('id', center.applicationId)
            .maybeSingle();
          if (appData) {
            setSelectedCenterForDetail(prev => ({ ...prev, application: appData }));
          }
        } catch (e) {
          console.warn('Error loading application details for center detail:', e);
        }
      }

      // Load tracking questions and existing responses for inline display
      if (center.facilitatorId && center.programName) {
        try {
          const questions = await questionBankService.getProgramTrackingQuestions(center.facilitatorId, center.programName);
          setDetailTrackingQuestions(questions || []);

          const existingResponses = await questionBankService.getProgramTrackingResponses(startup.id, center.facilitatorId, center.programName);
          const responsesMap = new Map<string, string>();
          (existingResponses || []).forEach((r: any) => {
            responsesMap.set(r.questionId || r.question_id || r.id, r.answerText || r.answer_text || '');
          });
          setDetailTrackingResponses(responsesMap);
        } catch (err) {
          console.error('Error loading tracking questions/responses for detail:', err);
          setDetailTrackingQuestions([]);
          setDetailTrackingResponses(new Map());
        }
      }
      // Fetch unread messages count for this application's messages (for this startup user)
      try {
        if (center.applicationId && authUserId) {
          const { data: unreadData, error: unreadError, count } = await supabase
            .from('incubation_messages')
            .select('id', { count: 'exact', head: false })
            .eq('application_id', center.applicationId)
            .eq('receiver_id', authUserId)
            .eq('is_read', false);
          if (!unreadError) {
            setDetailUnreadCount((unreadData || []).length || 0);
          } else {
            console.warn('Error fetching unread messages count:', unreadError);
            setDetailUnreadCount(0);
          }
        }
      } catch (e) {
        console.warn('Error fetching unread count:', e);
        setDetailUnreadCount(0);
      }
    } catch (error) {
      console.error('Error loading mentor assignments:', error);
      setDetailModalMentors([]);
    } finally {
      setIsLoadingDetailModal(false);
    }
  };

  // Auto-calc like Cap Table: amount, equity, post-money
  useEffect(() => {
    const sharesNum = Number(recShares) || 0;
    const ppsNum = Number(recPricePerShare) || 0;
    const amount = sharesNum * ppsNum;
    setRecAmount(amount ? String(amount) : '');
    if (totalSharesForCalc > 0 && sharesNum > 0) {
      const equityPct = (sharesNum / totalSharesForCalc) * 100;
      setRecEquity(equityPct.toFixed(4));
      const postMoney = equityPct > 0 ? amount / (equityPct / 100) : 0;
      setRecPostMoney(postMoney ? String(postMoney) : '');
    } else {
      setRecEquity('');
      setRecPostMoney('');
    }
  }, [recShares, recPricePerShare, totalSharesForCalc]);

  const handleSubmitRecognition = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const form = new FormData(e.currentTarget);
      const programName = String(form.get('rec-program-name') || 'Incubation Program');
      const facilitatorName = String(form.get('rec-facilitator-name') || '');
      const facilitatorCode = String(form.get('rec-facilitator-code') || '');
      const incubationType = String(form.get('rec-incubation-type') || 'Incubation Center');
      const feeType = (form.get('rec-fee-type') as FeeType) || recFeeType;
      const feeAmount = Number(form.get('rec-fee-amount') || 0);
      const shares = Number(form.get('rec-shares') || recShares || 0);
      const pricePerShare = Number(form.get('rec-price-per-share') || recPricePerShare || 0);
      const investmentAmount = Number(form.get('rec-amount') || recAmount || 0);
      const equityAllocated = Number(form.get('rec-equity') || recEquity || 0);
      const postMoneyValuation = Number(form.get('rec-postmoney') || recPostMoney || 0);
      const agreementFile = recAgreementFile;

      const { recognitionService } = await import('../../lib/recognitionService');
      const { storageService } = await import('../../lib/storage');

      let agreementUrl: string | undefined = undefined;
      if (agreementFile) {
        const uploaded = await storageService.uploadStartupDocument(agreementFile, String(startup.id), 'recognition-agreement');
        if (uploaded?.success && uploaded.url) agreementUrl = uploaded.url;
      }

      await recognitionService.createRecognitionRecord({
        startupId: startup.id,
        programName,
        facilitatorName,
        facilitatorCode,
        incubationType: incubationType as IncubationType,
        feeType: (feeType as FeeType),
        feeAmount: feeType === 'Fees' || feeType === 'Hybrid' ? feeAmount : 0,
        shares: (feeType === 'Equity' || feeType === 'Hybrid') ? shares : 0,
        pricePerShare: (feeType === 'Equity' || feeType === 'Hybrid') ? pricePerShare : 0,
        investmentAmount: (feeType === 'Equity' || feeType === 'Hybrid') ? investmentAmount : 0,
        equityAllocated: (feeType === 'Equity' || feeType === 'Hybrid') ? equityAllocated : 0,
        postMoneyValuation: (feeType === 'Equity' || feeType === 'Hybrid') ? postMoneyValuation : 0,
        signedAgreementUrl: agreementUrl,
      } as any);

      if (agreementUrl && recognitionFormState?.applicationId) {
        try {
          const { error: updateError } = await supabase
            .from('opportunity_applications')
            .update({ contract_url: agreementUrl })
            .eq('id', recognitionFormState.applicationId);
          if (updateError) {
            console.warn('⚠️ Failed to update agreement_url on application:', updateError);
          }
        } catch (e) {
          console.warn('⚠️ Error while persisting agreement_url:', e);
        }
      }

      setIsRecognitionModalOpen(false);
      messageService.success(
        'Agreement Uploaded',
        'Agreement uploaded and equity allocation recorded.',
        3000
      );
      loadIncubationPrograms();
    } catch (err) {
      console.error('Failed to submit recognition entry:', err);
      messageService.error(
        'Submission Failed',
        'Failed to submit. Please try again.'
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex flex-wrap justify-center gap-2 sm:gap-4 px-2" aria-label="Incubation sub tabs">
          <button
            type="button"
            onClick={() => setActiveSubTab('myCenters')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSubTab === 'myCenters'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            My Incubation Centers
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('programs')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSubTab === 'programs'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Incubation Programs
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('grantPrograms')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSubTab === 'grantPrograms'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Grant / Incubation Programs
          </button>
        </nav>
      </div>

      {/* Incubation Programs Section */}
      {activeSubTab === 'programs' && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Incubation Programs</h2>
              {form2Requests.length > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  {form2Requests.length} Form 2 Pending
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={incubationFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setIncubationFilter('all')}
                className="text-xs"
              >
                All
              </Button>
              <Button
                size="sm"
                variant={incubationFilter === 'pending' ? 'default' : 'outline'}
                onClick={() => setIncubationFilter('pending')}
                className="text-xs"
              >
                Pending
              </Button>
              <Button
                size="sm"
                variant={incubationFilter === 'accepted' ? 'default' : 'outline'}
                onClick={() => setIncubationFilter('accepted')}
                className="text-xs"
              >
                Accepted
              </Button>
              {form2Requests.length > 0 && (
                <Button
                  size="sm"
                  variant={incubationFilter === 'form2_pending' ? 'default' : 'outline'}
                  onClick={() => setIncubationFilter('form2_pending')}
                  className="text-xs bg-amber-500 hover:bg-amber-600 text-white border-amber-600"
                >
                  Form 2 Pending
                </Button>
              )}
            </div>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Program Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Facilitator</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Form 2</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {incubationPrograms
                    .filter(prog => {
                      if (incubationFilter === 'all') return true;
                      if (incubationFilter === 'pending') return prog.status === 'pending';
                      if (incubationFilter === 'accepted') return prog.status === 'accepted';
                      if (incubationFilter === 'form2_pending') return prog.form2.requested && prog.form2.status === 'pending';
                      return true;
                    })
                    .map(prog => (
                    <tr key={prog.id} className={prog.form2.requested && prog.form2.status === 'pending' ? 'bg-amber-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          {prog.programName}
                          {prog.isShortlisted && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              ⭐ Shortlisted
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {prog.facilitatorName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          prog.status === 'accepted' 
                            ? 'bg-green-100 text-green-800' 
                            : prog.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {prog.status === 'accepted' && '✓ Accepted'}
                          {prog.status === 'pending' && '⏳ Pending'}
                          {prog.status === 'rejected' && '✗ Rejected'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {!prog.form2.requested ? (
                          <span className="text-slate-400">Not Requested</span>
                        ) : prog.form2.status === 'pending' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            📝 Submission Required
                          </span>
                        ) : prog.form2.status === 'submitted' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            📤 Submitted
                          </span>
                        ) : prog.form2.status === 'under_review' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            🔍 Under Review
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col gap-2">
                          {prog.form2.requested && prog.form2.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedForm2Data({
                                  applicationId: prog.applicationId,
                                  opportunityId: prog.opportunityId,
                                  opportunityName: prog.programName,
                                });
                                setIsForm2ModalOpen(true);
                              }}
                              className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                            >
                              <FileText className="h-4 w-4" />
                              Fill Form 2
                            </Button>
                          )}

                          {prog.status === 'accepted' && !prog.contractUrl && (
                            <Button 
                              size="sm"
                              onClick={() => {
                                setRecognitionFormState({
                                  programName: prog.programName,
                                  facilitatorName: prog.facilitatorName,
                                  facilitatorCode: prog.facilitatorCode,
                                  applicationId: prog.applicationId
                                });
                                setIsRecognitionModalOpen(true);
                              }}
                              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <FileText className="h-4 w-4" />
                              Upload Agreement
                            </Button>
                          )}

                          {prog.status === 'accepted' && (prog.contractUrl || prog.agreementUrl) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadAgreement((prog.contractUrl || prog.agreementUrl)!)}
                              className="flex items-center gap-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                            >
                              <Download className="h-4 w-4" />
                              {prog.contractUrl ? 'Download Uploaded Agreement' : 'Download Agreement'}
                            </Button>
                          )}

                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOfferForMessaging({
                                applicationId: prog.applicationId,
                                facilitatorName: prog.facilitatorName
                              });
                              setIsMessagingModalOpen(true);
                            }}
                            className="flex items-center gap-1 text-slate-600 border-slate-300 hover:bg-slate-50"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Message Facilitator
                          </Button>

                          {prog.status === 'accepted' && prog.facilitatorId && (
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                handleOpenTrackingQuestions(
                                  prog.facilitatorId,
                                  prog.programName,
                                  prog.facilitatorName
                                );
                              }}
                              className="flex items-center gap-1 text-purple-600 border-purple-300 hover:bg-purple-50"
                            >
                              <FileText className="h-4 w-4" />
                              Tracking Questions
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {incubationPrograms.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        {isViewOnly ? (
                          <div className="space-y-2">
                            <p className="text-sm">No incubation programs found.</p>
                            <p className="text-xs text-slate-400">
                              This startup hasn't applied to any incubation programs yet.
                            </p>
                          </div>
                        ) : (
                          "You haven't applied to any incubation programs yet."
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeSubTab === 'grantPrograms' && (
        <div className="space-y-4">
          <OpportunitiesTab
            startup={{ id: startup.id, name: startup.name }}
            crmRef={crmRef}
            authUserId={authUserId || currentUser?.id}
          />
          <div className="hidden">
            <FundraisingCRM
              ref={crmRef}
              startupId={startup.id}
              userId={authUserId || currentUser?.id || ''}
              onInvestorAdded={() => {}}
            />
          </div>
        </div>
      )}

      {activeSubTab === 'myCenters' && (
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">My Incubation Centers</h2>
          
          {acceptedCenters.length === 0 ? (
            <Card>
              <div className="py-12 text-center text-slate-500">
                <p className="text-sm">No accepted incubation centers yet.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Once an incubation center accepts your application, it will appear here.
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {acceptedCenters.map(center => (
                <button
                  key={center.id}
                  onClick={() => handleOpenCenterDetail(center)}
                  className="text-left focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 rounded-lg"
                >
                  <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-slate-900">{center.facilitatorName}</h3>
                          <p className="text-sm text-slate-600">{center.programName}</p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Accepted
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 space-y-1">
                        {center.facilitatorCode && (
                          <p><span className="font-medium">Code:</span> {center.facilitatorCode}</p>
                        )}
                        <p><span className="font-medium">Applied:</span> {new Date(center.createdAt).toLocaleDateString()}</p>
                      </div>

                      {center.contractUrl && (
                        <div className="pt-2 border-t border-slate-200">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                            📄 Agreement Uploaded
                          </span>
                        </div>
                      )}

                      {(center.form2.requested && center.form2.status === 'submitted') && (
                        <div className="pt-2 border-t border-slate-200">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-50 text-purple-700">
                            📤 Form 2 Submitted
                          </span>
                        </div>
                      )}

                      <div className="pt-2 text-center text-sm text-brand-primary font-medium">
                        Click to view details →
                      </div>
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Incubation Center Detail Modal */}
      {isDetailModalOpen && selectedCenterForDetail && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedCenterForDetail(null);
            setDetailModalMentors([]);
          }}
          title={selectedCenterForDetail.facilitatorName || selectedCenterForDetail.programName}
          size="lg"
        >
          <div className="space-y-6 max-h-96 overflow-y-auto pr-4">
            
            {/* Center Information */}
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-slate-900">Center Information</h3>
              <div className="text-sm space-y-1 text-slate-600">
                <p><span className="font-medium text-slate-700">Center Name:</span> {selectedCenterForDetail.facilitatorName}</p>
                <p><span className="font-medium text-slate-700">Program:</span> {selectedCenterForDetail.programName}</p>
                {selectedCenterForDetail.facilitatorCode && (
                  <p><span className="font-medium text-slate-700">Facilitator Code:</span> {selectedCenterForDetail.facilitatorCode}</p>
                )}
                <p><span className="font-medium text-slate-700">Status:</span> Accepted</p>
                <p><span className="font-medium text-slate-700">Applied on:</span> {new Date(selectedCenterForDetail.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Agreements Section */}
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900">Agreements & Application</h3>
              <div className="space-y-2">
                {selectedCenterForDetail.contractUrl && (
                  <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-900">📄 Signed Agreement Uploaded</p>
                      <p className="text-xs text-slate-600">Contract URL present</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadAgreement(selectedCenterForDetail.contractUrl)}
                      className="text-blue-600 border-blue-300 hover:bg-blue-100"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                )}

                {selectedCenterForDetail.agreementUrl && (
                  <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm">🗂️ Agreement Link</p>
                      <p className="text-xs text-slate-600">{selectedCenterForDetail.agreementUrl}</p>
                    </div>
                    <a href={selectedCenterForDetail.agreementUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">Open</a>
                  </div>
                )}

                {selectedCenterForDetail.application ? (
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-sm font-medium">Application Details</p>
                    <div className="text-xs text-slate-600 mt-2 space-y-1">
                      {selectedCenterForDetail.application.contract_url && (
                        <p><span className="font-medium">Contract URL:</span> {selectedCenterForDetail.application.contract_url}</p>
                      )}
                      {selectedCenterForDetail.application.agreement_url && (
                        <p><span className="font-medium">Agreement URL:</span> {selectedCenterForDetail.application.agreement_url}</p>
                      )}
                      {selectedCenterForDetail.application.diligence_status && (
                        <p><span className="font-medium">Diligence Status:</span> {selectedCenterForDetail.application.diligence_status}</p>
                      )}
                      {selectedCenterForDetail.application.diligence_urls && (
                        <p><span className="font-medium">Diligence URLs:</span> {JSON.stringify(selectedCenterForDetail.application.diligence_urls)}</p>
                      )}
                      <p><span className="font-medium">Applied At:</span> {new Date(selectedCenterForDetail.application.created_at || selectedCenterForDetail.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ) : null}

                {!selectedCenterForDetail.contractUrl && !selectedCenterForDetail.agreementUrl && !selectedCenterForDetail.application && (
                  <div className="bg-amber-50 rounded-lg p-3">
                    <p className="text-sm text-amber-800">📋 No agreement or application details available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Forms Section */}
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900">Forms</h3>
              {selectedCenterForDetail.form2.requested ? (
                <div className={`rounded-lg p-3 ${
                  selectedCenterForDetail.form2.status === 'submitted' 
                    ? 'bg-green-50' 
                    : 'bg-amber-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {selectedCenterForDetail.form2.status === 'submitted' ? '✓ Form 2 Submitted' : '📝 Form 2 Pending'}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {selectedCenterForDetail.form2.status === 'submitted' 
                          ? 'Your Form 2 responses have been submitted'
                          : 'Form 2 submission is pending'
                        }
                      </p>
                    </div>
                    {selectedCenterForDetail.form2.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setIsDetailModalOpen(false);
                          setSelectedForm2Data({
                            applicationId: selectedCenterForDetail.applicationId,
                            opportunityId: selectedCenterForDetail.opportunityId,
                            opportunityName: selectedCenterForDetail.programName,
                          });
                          setIsForm2ModalOpen(true);
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
                      >
                        Fill Form 2
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-sm text-slate-600">No forms requested</p>
                </div>
              )}
            </div>

            {/* Tracking Questions Section */}
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900">Tracking Questions</h3>
              {detailTrackingQuestions.length > 0 ? (
                <div className="space-y-2">
                  {detailTrackingQuestions.map(q => (
                    <div key={q.id} className="p-3 bg-slate-50 rounded-lg">
                      <p className="font-medium text-sm">{q.question?.questionText || q.questionText || 'Question'}</p>
                      <p className="text-xs text-slate-600 mt-1">{detailTrackingResponses.get(q.question?.id || q.id) || detailTrackingResponses.get(q.id) || '— No response yet —'}</p>
                    </div>
                  ))}
                  <div className="pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        handleOpenTrackingQuestions(
                          selectedCenterForDetail.facilitatorId,
                          selectedCenterForDetail.programName,
                          selectedCenterForDetail.facilitatorName
                        );
                      }}
                      className="w-full text-purple-600 border-purple-300 hover:bg-purple-50"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      View & Update Tracking Questions
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-sm text-slate-600">No tracking questions available</p>
                </div>
              )}
            </div>

            {/* Updates & Messages Section */}
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900">Updates & Messages</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setSelectedOfferForMessaging({
                      applicationId: selectedCenterForDetail.applicationId,
                      facilitatorName: selectedCenterForDetail.facilitatorName
                    });
                    setIsMessagingModalOpen(true);
                  }}
                  className="bg-blue-600 text-white"
                >
                  <div className="flex items-center gap-2">
                    <span>View Messages & Updates</span>
                    {detailUnreadCount > 0 && (
                      <span className="inline-flex items-center justify-center bg-red-600 text-white text-xs font-semibold rounded-full px-2 py-0.5">
                        {detailUnreadCount}
                      </span>
                    )}
                  </div>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setSelectedOfferForMessaging({
                      applicationId: selectedCenterForDetail.applicationId,
                      facilitatorName: selectedCenterForDetail.facilitatorName
                    });
                    setIsMessagingModalOpen(true);
                  }}
                >
                  Send Update
                </Button>
              </div>
            </div>

            {/* Assigned Mentors Section */}
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900">Assigned Mentors</h3>
              {isLoadingDetailModal ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-primary"></div>
                </div>
              ) : detailModalMentors.length > 0 ? (
                <div className="space-y-2">
                  {detailModalMentors.map(mentor => (
                    <Card key={mentor.id || mentor.mentor_user_id} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-slate-900">{mentor.mentor_name || 'Unknown Mentor'}</p>
                          {mentor.mentor_email && (
                            <p className="text-xs text-slate-600">{mentor.mentor_email}</p>
                          )}
                          {mentor.mentor_type && (
                            <p className="text-xs text-slate-500 mt-1">📋 {mentor.mentor_type}</p>
                          )}
                          {mentor.status && (
                            <p className="text-xs text-slate-500">Status: <span className="font-medium">{mentor.status}</span></p>
                          )}
                          {mentor.assigned_at && (
                            <p className="text-xs text-slate-400">Assigned: {new Date(mentor.assigned_at).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedMentor(mentor);
                          setConnectModalOpen(true);
                        }}
                        className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white text-xs"
                      >
                        🤝 Connect with Mentor
                      </Button>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-sm text-slate-600">No mentors assigned yet</p>
                </div>
              )}
            </div>

            {/* Service providers & partners (from incubation center Partner network) */}
            {(() => {
              const links = startupFacilitatorNetwork.filter(
                (l) => String(l.facilitator_id) === String(selectedCenterForDetail.facilitatorId)
              );
              const providers = links.filter((l) => l.network_kind === 'service_provider');
              const partners = links.filter((l) => l.network_kind === 'partner');
              return (
                <div className="space-y-2">
                  <h3 className="font-semibold text-slate-900">Service providers & partners</h3>
                  {providers.length === 0 && partners.length === 0 ? (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-sm text-slate-600">None assigned by this center yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {providers.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                            Service providers
                          </p>
                          <div className="space-y-2">
                            {providers.map((l) => (
                              <Card key={`sp-${l.contact_id}`} className="p-3">
                                <p className="font-medium text-slate-900 text-sm">{l.name}</p>
                                {l.service_type ? (
                                  <p className="text-xs text-slate-600 mt-0.5">{l.service_type}</p>
                                ) : null}
                                {l.email ? <p className="text-xs text-slate-500 mt-1">{l.email}</p> : null}
                                {l.contact_number ? (
                                  <p className="text-xs text-slate-500">{l.contact_number}</p>
                                ) : null}
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                      {partners.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Partners</p>
                          <div className="space-y-2">
                            {partners.map((l) => (
                              <Card key={`p-${l.contact_id}`} className="p-3">
                                <p className="font-medium text-slate-900 text-sm">{l.name}</p>
                                {l.service_type ? (
                                  <p className="text-xs text-slate-600 mt-0.5">{l.service_type}</p>
                                ) : null}
                                {l.email ? <p className="text-xs text-slate-500 mt-1">{l.email}</p> : null}
                                {l.contact_number ? (
                                  <p className="text-xs text-slate-500">{l.contact_number}</p>
                                ) : null}
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={() => {
                setIsDetailModalOpen(false);
                setSelectedCenterForDetail(null);
              }}
            >
              Close
            </Button>
          </div>
        </Modal>
      )}

      {/* Form 2 Submission Modal */}
      {isForm2ModalOpen && selectedForm2Data && (
        <Form2SubmissionModal
          applicationId={selectedForm2Data.applicationId}
          opportunityId={selectedForm2Data.opportunityId}
          opportunityName={selectedForm2Data.opportunityName}
          startupId={startup.id}
          onClose={() => {
            setIsForm2ModalOpen(false);
            setSelectedForm2Data(null);
            loadIncubationPrograms();
          }}
          onSubmit={() => {
            setIsForm2ModalOpen(false);
            setSelectedForm2Data(null);
            loadIncubationPrograms();
          }}
        />
      )}

      {/* Messaging Modal */}
      {isMessagingModalOpen && selectedOfferForMessaging && (
        <StartupMessagingModal
          isOpen={isMessagingModalOpen}
          onClose={() => {
            setIsMessagingModalOpen(false);
            setSelectedOfferForMessaging(null);
          }}
          applicationId={selectedOfferForMessaging.applicationId || ''}
          facilitatorName={selectedOfferForMessaging.facilitatorName || 'Facilitator'}
          startupName={startup.name}
          receiverId={selectedOfferForMessaging.receiverId}
        />
      )}

      {/* Contract Modal */}
      {isRecognitionModalOpen && recognitionFormState && (
        <Modal 
          isOpen={isRecognitionModalOpen}
          onClose={() => setIsRecognitionModalOpen(false)}
          title="Recognition/Incubation"
        >
          <form onSubmit={handleSubmitRecognition} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Program Name" name="rec-program-name" id="rec-program-name" required value={recognitionFormState.programName || ''} readOnly />
              <Input label="Facilitator Name" name="rec-facilitator-name" id="rec-facilitator-name" required value={recognitionFormState.facilitatorName || ''} readOnly />
              <Input label="Facilitator Code" name="rec-facilitator-code" id="rec-facilitator-code" placeholder="e.g., FAC-D4E5F6" required value={recognitionFormState.facilitatorCode || ''} readOnly />
              <Select label="Incubation Type" name="rec-incubation-type" id="rec-incubation-type" required defaultValue={'Incubation Center'}>
                {Object.values(IncubationType).map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
              <Select label="Fee Type" name="rec-fee-type" id="rec-fee-type" value={recFeeType} onChange={e => setRecFeeType(e.target.value as FeeType)} required>
                {Object.values(FeeType).map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
              {(recFeeType === FeeType.Fees || recFeeType === FeeType.Hybrid) && (
                <Input label="Fee Amount" name="rec-fee-amount" id="rec-fee-amount" type="number" required />
              )}
              {(recFeeType === FeeType.Equity || recFeeType === FeeType.Hybrid) && (
                <>
                  <Input label="Number of Shares" name="rec-shares" id="rec-shares" type="number" required value={recShares} onChange={(e) => setRecShares(e.target.value)} />
                  <Input label={'Price per Share (USD)'} name="rec-price-per-share" id="rec-price-per-share" type="number" step="0.01" required value={recPricePerShare} onChange={(e) => setRecPricePerShare(e.target.value)} />
                  <Input label="Investment Amount (auto)" name="rec-amount" id="rec-amount" type="number" readOnly value={recAmount} />
                  <Input label="Equity Allocated (%) (auto)" name="rec-equity" id="rec-equity" type="number" readOnly value={recEquity} />
                  <Input label="Post-Money Valuation (auto)" name="rec-postmoney" id="rec-postmoney" type="number" readOnly value={recPostMoney} />
                </>
              )}
              <CloudDriveInput
                value=""
                onChange={(url) => {
                  console.log('📎 Cloud drive URL received:', url);
                }}
                onFileSelect={(file) => {
                  console.log('📎 File selected for recognition agreement:', file.name);
                  setRecAgreementFile(file);
                }}
                placeholder="Paste your cloud drive link here..."
                label="Upload Signed Agreement"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                maxSize={10}
                documentType="signed agreement"
                showPrivacyMessage={false}
              />
              <input type="hidden" id="rec-agreement-url" name="rec-agreement-url" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsRecognitionModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 text-white">Save</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Tracking Questions Modal */}
      {isTrackingQuestionsModalOpen && selectedProgramForTracking && (
        <Modal
          isOpen={isTrackingQuestionsModalOpen}
          onClose={() => {
            setIsTrackingQuestionsModalOpen(false);
            setTrackingQuestions([]);
            setTrackingResponses(new Map());
          }}
          title={`Tracking Questions - ${selectedProgramForTracking.programName}`}
        >
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {trackingQuestions.map(oppQuestion => {
              const questionData = oppQuestion.question;
              if (!questionData) return null;
              
              return (
                <div key={oppQuestion.id} className="space-y-2 p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <label className="font-medium text-slate-900 flex-1">{questionData.questionText}</label>
                    {oppQuestion.isRequired && <span className="text-red-500">*</span>}
                  </div>
                  {questionData.questionType === 'text' ? (
                    <input
                      type="text"
                      placeholder="Your answer"
                      value={trackingResponses.get(questionData.id) || ''}
                      onChange={(e) => {
                        const newResponses = new Map(trackingResponses);
                        newResponses.set(questionData.id, e.target.value);
                        setTrackingResponses(newResponses);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    />
                  ) : (
                    <textarea
                      placeholder="Your answer"
                      value={trackingResponses.get(questionData.id) || ''}
                      onChange={(e) => {
                        const newResponses = new Map(trackingResponses);
                        newResponses.set(questionData.id, e.target.value);
                        setTrackingResponses(newResponses);
                      }}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleSaveTrackingResponses}
              disabled={isSavingTrackingResponses}
              className="flex-1"
            >
              {isSavingTrackingResponses ? 'Saving...' : 'Save Responses'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsTrackingQuestionsModalOpen(false);
                setTrackingQuestions([]);
                setTrackingResponses(new Map());
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </Modal>
      )}

      {/* Mentor Connection Modal */}
      {connectModalOpen && selectedMentor && authUserId && (
        <ConnectMentorRequestModal
          isOpen={connectModalOpen}
          onClose={() => {
            setConnectModalOpen(false);
            setSelectedMentor(null);
          }}
          mentorId={selectedMentor.mentor_user_id}
          mentorName={selectedMentor.mentor_name || 'Unknown Mentor'}
          startupId={startup.id}
          requesterId={authUserId}
          onRequestSent={() => {
            // Close the connect modal and reopen the detail modal
            setConnectModalOpen(false);
            setSelectedMentor(null);
            // Redirect to the Explore Mentors requested section if the parent provides a handler
            onMentorRequestSent?.();
            // Keep the detail modal open unless the parent navigation changes the view
            setIsDetailModalOpen(true);
          }}
        />
      )}
    </div>
  );
};

export default IncubationTab;

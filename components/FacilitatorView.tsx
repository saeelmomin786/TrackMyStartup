import React, { useEffect, useMemo, useState } from 'react';
import { Startup, NewInvestment, StartupAdditionRequest, ComplianceStatus } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Input from './ui/Input';
import { LayoutGrid, PlusCircle, FileText, Video, Gift, Film, Edit, Users, Eye, CheckCircle, Check, Search, Share2, Trash2, Mail, UserPlus, Heart, FileQuestion, Star, Settings, X, Globe, ExternalLink, Linkedin, Briefcase, Shield, Building2, User, Send, Download, GraduationCap, Calendar, Clock, Plus, ChevronDown, ChevronUp, BookOpen, AlertCircle, MessageCircle, Handshake } from 'lucide-react';
import { getQueryParam, setQueryParam } from '../lib/urlState';
import PortfolioDistributionChart from './charts/PortfolioDistributionChart';
import PortfolioHealthCharts from './charts/PortfolioHealthCharts';
import Badge from './ui/Badge';
import { investorService, ActiveFundraisingStartup } from '../lib/investorService';
import { supabase } from '../lib/supabase';
import { FacilitatorAccessService } from '../lib/facilitatorAccessService';
import { recognitionService } from '../lib/recognitionService';
import { facilitatorStartupService, StartupDashboardData } from '../lib/facilitatorStartupService';
import { facilitatorCodeService } from '../lib/facilitatorCodeService';
import { FacilitatorCodeDisplay } from './FacilitatorCodeDisplay';
import ProfilePage from './ProfilePage';
import { capTableService } from '../lib/capTableService';
import IncubationMessagingModal from './IncubationMessagingModal';
import ContractManagementModal from './ContractManagementModal';
// Removed incubationPaymentService import
import { profileService } from '../lib/profileService';
import { formatCurrency as formatCurrencyUtil, getCurrencySymbol, getCurrencyForCountry, getCurrencyForCountryCode } from '../lib/utils';
import AddStartupModal, { StartupFormData } from './AddStartupModal';
import StartupInvitationModal from './StartupInvitationModal';
import EditStartupModal from './EditStartupModal';
import { startupInvitationService, StartupInvitation } from '../lib/startupInvitationService';
import { messageService } from '../lib/messageService';
import MessageContainer from './MessageContainer';
import QuestionSelector from './QuestionSelector';
import { questionBankService, ApplicationQuestion } from '../lib/questionBankService';
import { getVideoEmbedUrl } from '../lib/videoUtils';
import { reportsService } from '../lib/reportsService';
import { facilitatorMentorService, FacilitatorMentor, FacilitatorMentorAssignment, MentorMeetingRecord, MentorFacilitatorAssociation } from '../lib/facilitatorMentorService';
import ApprovedMentorsTable from './mentor/ApprovedMentorsTable';
import MentorPortfolioModal from './mentor/MentorPortfolioModal';
import MentorHistoryModal from './mentor/MentorHistoryModal';
import { intakeCRMService } from '../lib/intakeCRMService';
import { form2ResponseService } from '../lib/form2ResponseService';
import { Form2SubmissionModal } from './Form2SubmissionModal';
import { IntakeCRMBoard } from './IntakeCRMBoard';
import { advisorConnectionRequestService, AdvisorConnectionRequest } from '../lib/advisorConnectionRequestService';
import FacilitatorProfileForm from './facilitator/FacilitatorProfileForm';
import FacilitatorCard from './facilitator/FacilitatorCard';
import PartnerNetworkTab from './facilitator/PartnerNetworkTab';

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

type FacilitatorTab = 'dashboard' | 'discover' | 'intakeManagement' | 'trackMyStartups' | 'mentorManagement' | 'ourInvestments' | 'collaboration' | 'partner' | 'portfolio';

// Local opportunity type for facilitator postings
type IncubationOpportunity = {
  id: string;
  programName: string;
  description: string;
  deadline: string; // YYYY-MM-DD
  posterUrl?: string;
  videoUrl?: string;
  whatsappLink?: string;
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
  founderEmail?: string;
  founderPhone?: string;
  sector?: string;
  stage?: string;
  createdAt?: string;
  diligenceUrls?: string[]; // Array of uploaded diligence document URLs
  isShortlisted?: boolean; // For shortlist feature
  fundingStage?: string;
  startupStatus?: string;
  timeline?: string;
};

type ReportMandate = {
  id: string;
  facilitator_id: string;
  title: string;
  program_name: string;
  program_list?: string[];
  question_ids: string[];
  target_startups: string[];
  source: 'existing' | 'startup';
  created_at: string;
};

type EmailDraft = {
  id: string;
  facilitatorId: string;
  name: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  createdAt?: string;
  updatedAt?: string;
};

const initialNewOppState = {
  programName: '',
  description: '',
  deadline: '',
  posterUrl: '',
  videoUrl: '',
  facilitatorDescription: '',
  facilitatorWebsite: '',
  whatsappLink: '',
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
  const resolveCurrency = (countryOrCode?: string): string => {
    if (!countryOrCode) return 'USD';
    // Heuristic: 2-letter codes or all-caps assumed as country codes
    const isLikelyCode = countryOrCode.length <= 3 && countryOrCode.toUpperCase() === countryOrCode;
    return isLikelyCode ? getCurrencyForCountryCode(countryOrCode) : getCurrencyForCountry(countryOrCode);
  };

  const buildStartupForView = async (
    base: Partial<Startup> & { id: number | string; name: string; sector: string }
  ): Promise<Startup> => {
    const numericId = typeof base.id === 'string' ? parseInt(base.id, 10) : base.id;
    let profile: any = null;
    try {
      // Validate deadline: must be today or later
      if (newOpportunity.deadline) {
        const today = new Date();
        today.setHours(0,0,0,0);
        const sel = new Date(newOpportunity.deadline);
        sel.setHours(0,0,0,0);
        if (sel < today) {
          messageService.warning(
            'Invalid Deadline',
            'Deadline cannot be in the past. Please choose today or a future date.'
          );
          return;
        }
      }
      if (!isNaN(Number(numericId))) {
        profile = await profileService.getStartupProfile(Number(numericId));
      }
    } catch (e) {
      // ignore profile fetch failures; we'll fall back safely
    }

    const derivedCurrency = (() => {
      if (base.currency) return base.currency as string;
      if (profile?.currency) return profile.currency as string;
      if (profile?.country) return resolveCurrency(profile.country as string);
      if ((base as any).profile?.currency) return (base as any).profile.currency as string;
      if ((base as any).profile?.country) return resolveCurrency((base as any).profile.country as string);
      if (currentUser?.country) return resolveCurrency(currentUser.country);
      return 'USD';
    })();

    return {
      id: (numericId as unknown) as any,
      name: base.name,
      sector: base.sector,
      investmentType: (base as any).investmentType || ('equity' as any),
      investmentValue: (base as any).investmentValue || 0,
      equityAllocation: (base as any).equityAllocation || 0,
      currentValuation: (base as any).currentValuation || 0,
      totalFunding: (base as any).totalFunding || 0,
      totalRevenue: (base as any).totalRevenue || 0,
      registrationDate: (base as any).registrationDate || new Date().toISOString().split('T')[0],
      currency: derivedCurrency,
      complianceStatus: (base as any).complianceStatus || ComplianceStatus.Pending,
      founders: (base as any).founders || [],
      profile: profile || (base as any).profile || undefined,
    } as Startup;
  };

  // Resolve a reliable numeric startup ID for DB RPCs
  const resolveStartupNumericId = async (id: number | string, name?: string): Promise<number | null> => {
    const n = typeof id === 'string' ? parseInt(id as string, 10) : id as number;
    if (!isNaN(n) && n > 0) return n;
    if (name) {
      try {
        const { data } = await supabase
          .from('startups')
          .select('id')
          .eq('name', name)
          .maybeSingle();
        if (data?.id) return Number(data.id);
      } catch {}
    }
    return null;
  };
  const [activeTab, setActiveTab] = useState<FacilitatorTab>((() => {
    const fromUrl = (getQueryParam('tab') as FacilitatorTab) || 'dashboard';
    const valid: FacilitatorTab[] = ['dashboard','discover','intakeManagement','trackMyStartups','mentorManagement','ourInvestments','collaboration','partner','portfolio'];
    return valid.includes(fromUrl) ? fromUrl : 'dashboard';
  })());
  // Keep URL in sync when tab changes
  useEffect(() => {
    setQueryParam('tab', activeTab, true);
  }, [activeTab]);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(() => getQueryParam('opportunityId'));
  const [showProfilePage, setShowProfilePage] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  // Sync selected opportunity to URL for shareable link
  useEffect(() => {
    if (activeTab === 'intakeManagement') {
      setQueryParam('opportunityId', selectedOpportunityId || '', true);
    }
  }, [selectedOpportunityId, activeTab]);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isDiligenceModalOpen, setIsDiligenceModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ReceivedApplication | null>(null);
  const [isPitchVideoModalOpen, setIsPitchVideoModalOpen] = useState(false);
  const [selectedPitchVideo, setSelectedPitchVideo] = useState<string>('');
  const [isPitchDeckModalOpen, setIsPitchDeckModalOpen] = useState(false);
  const [selectedPitchDeck, setSelectedPitchDeck] = useState<string>('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newOpportunity, setNewOpportunity] = useState(initialNewOppState);
  const [posterPreview, setPosterPreview] = useState<string>('');
  const [agreementFile, setAgreementFile] = useState<File | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [processingRecognitionId, setProcessingRecognitionId] = useState<string | null>(null);
  const [activeFundraisingStartups, setActiveFundraisingStartups] = useState<ActiveFundraisingStartup[]>([]);
  const [isLoadingPitches, setIsLoadingPitches] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<number | null>(() => {
    const fromUrl = getQueryParam('pitchId');
    return fromUrl ? Number(fromUrl) : null;
  });
  const [favoritedPitches, setFavoritedPitches] = useState<Set<number>>(new Set());
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [showOnlyValidated, setShowOnlyValidated] = useState(false);
  const [showOnlyRecommendations, setShowOnlyRecommendations] = useState(false);
  const [shuffledPitches, setShuffledPitches] = useState<ActiveFundraisingStartup[]>([]);
  const [receivedRecommendations, setReceivedRecommendations] = useState<Array<{startup_id: number, sender_name: string, message?: string, created_at: string}>>([]);
  const [facilitatorId, setFacilitatorId] = useState<string | null>(null);
  
  // Collaboration state
  const [collaborationSubTab, setCollaborationSubTab] = useState<'explore-collaborators' | 'myCollaborators' | 'collaboratorRequests'>('explore-collaborators');
  const [collaborationRequests, setCollaborationRequests] = useState<AdvisorConnectionRequest[]>([]);
  const [loadingCollaborationRequests, setLoadingCollaborationRequests] = useState(false);
  const [acceptedCollaborators, setAcceptedCollaborators] = useState<AdvisorConnectionRequest[]>([]);
  const [collaboratorProfiles, setCollaboratorProfiles] = useState<{[key: string]: any}>({});
  const [locallyRejectedRequestKeys, setLocallyRejectedRequestKeys] = useState<Set<string>>(new Set());
  const [showLaunchingSoonModal, setShowLaunchingSoonModal] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  
  // Portfolio state
  const [previewProfile, setPreviewProfile] = useState<any>(null);

  // ============ MENTOR MANAGEMENT STATE ============
  const [mentorMgmtSubTab, setMentorMgmtSubTab] = useState<'mentors' | 'assignments' | 'meetings'>('mentors');
  const [facilitatorMentors, setFacilitatorMentors] = useState<FacilitatorMentor[]>([]);
  const [pendingMentorAssociations, setPendingMentorAssociations] = useState<any[]>([]);
  const [approvedMentorAssociations, setApprovedMentorAssociations] = useState<any[]>([]);
  const [mentorAssignments, setMentorAssignments] = useState<FacilitatorMentorAssignment[]>([]);
  const [allMeetingRecords, setAllMeetingRecords] = useState<MentorMeetingRecord[]>([]);
  const [isLoadingMentorMgmt, setIsLoadingMentorMgmt] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignMentorId, setAssignMentorId] = useState('');
  const [assignStartupId, setAssignStartupId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [selectedAssignmentForMeeting, setSelectedAssignmentForMeeting] = useState<FacilitatorMentorAssignment | null>(null);
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    meeting_date: new Date().toISOString().split('T')[0],
    meeting_type: 'General',
    duration_minutes: '',
    notes: '',
    outcomes: '',
    next_steps: '',
  });
  const [isSavingMeeting, setIsSavingMeeting] = useState(false);
  const [expandedAssignmentId, setExpandedAssignmentId] = useState<number | null>(null);
  const [assignmentMeetings, setAssignmentMeetings] = useState<Record<number, MentorMeetingRecord[]>>({});
  const [mentorSubTab, setMentorSubTab] = useState<'pending' | 'approved'>('approved');
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [selectedMentorForPortfolio, setSelectedMentorForPortfolio] = useState<any>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedMentorForHistory, setSelectedMentorForHistory] = useState<any>(null);
  const [isAssignmentsModalOpen, setIsAssignmentsModalOpen] = useState(false);
  const [selectedMentorAssignments, setSelectedMentorAssignments] = useState<any>(null);

  const getMeetingStatusClasses = (status?: string) => {
    switch ((status || '').toLowerCase()) {
      case 'scheduled':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'cancelled':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'rescheduled':
        return 'bg-sky-50 text-sky-700 border border-sky-200';
      case 'no_show':
        return 'bg-slate-100 text-slate-600 border border-slate-200';
      default:
        return 'bg-blue-50 text-blue-600 border border-blue-200';
    }
  };

  const formatMeetingStatus = (status?: string) => {
    if (!status) return 'Recorded';
    return status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const [myPostedOpportunities, setMyPostedOpportunities] = useState<IncubationOpportunity[]>([]);
  const [opportunityApplicationCounts, setOpportunityApplicationCounts] = useState<Map<string, number>>(new Map());
  const [myReceivedApplications, setMyReceivedApplications] = useState<ReceivedApplication[]>([]);
  const [recognitionRecords, setRecognitionRecords] = useState<any[]>([]);
  const [isLoadingRecognition, setIsLoadingRecognition] = useState(false);
  const [domainStageMap, setDomainStageMap] = useState<{ [key: number]: { domain: string; stage: string } }>({});
  const [portfolioStartups, setPortfolioStartups] = useState<StartupDashboardData[]>([]);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPrices, setCurrentPrices] = useState<Record<number, number>>({});
  
  // New state for messaging and payment functionality
  const [isMessagingModalOpen, setIsMessagingModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [selectedApplicationForMessaging, setSelectedApplicationForMessaging] = useState<ReceivedApplication | null>(null);
  const [selectedApplicationForContract, setSelectedApplicationForContract] = useState<ReceivedApplication | null>(null);
  const [selectedApplicationForDiligence, setSelectedApplicationForDiligence] = useState<ReceivedApplication | null>(null);
  const [emailDrafts, setEmailDrafts] = useState<EmailDraft[]>([]);
  const [isEmailDraftsModalOpen, setIsEmailDraftsModalOpen] = useState(false);
  const [isEmailDraftSelectModalOpen, setIsEmailDraftSelectModalOpen] = useState(false);
  const [selectedEmailDraftId, setSelectedEmailDraftId] = useState<string>('');
  const [selectedApplicationForEmail, setSelectedApplicationForEmail] = useState<ReceivedApplication | null>(null);
  const [isSavingEmailDraft, setIsSavingEmailDraft] = useState(false);
  const [editingEmailDraftId, setEditingEmailDraftId] = useState<string | null>(null);
  const [emailDraftForm, setEmailDraftForm] = useState({
    name: '',
    subject: '',
    body: '',
    cc: '',
    bcc: ''
  });
  
  // New state for startup invitation functionality
  const [isAddStartupModalOpen, setIsAddStartupModalOpen] = useState(false);
  const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);
  const [selectedStartupForInvitation, setSelectedStartupForInvitation] = useState<StartupFormData | null>(null);
  const [startupInvitations, setStartupInvitations] = useState<StartupInvitation[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [facilitatorCode, setFacilitatorCode] = useState<string>('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [questionRequiredMap, setQuestionRequiredMap] = useState<Map<string, boolean>>(new Map());
  const [questionSelectionTypeMap, setQuestionSelectionTypeMap] = useState<Map<string, 'single' | 'multiple' | null>>(new Map());
  const [isApplicationResponsesModalOpen, setIsApplicationResponsesModalOpen] = useState(false);
  const [selectedApplicationForResponses, setSelectedApplicationForResponses] = useState<ReceivedApplication | null>(null);
  const [applicationResponses, setApplicationResponses] = useState<Array<{ question: ApplicationQuestion; answerText: string }>>([]);
  const [form2Responses, setForm2Responses] = useState<Array<{ question: ApplicationQuestion; answerText: string }>>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [loadingForm2Responses, setLoadingForm2Responses] = useState(false);
  const [responseTab, setResponseTab] = useState<'response1' | 'response2'>('response1');
  
  // State for edit startup functionality
  const [isEditStartupModalOpen, setIsEditStartupModalOpen] = useState(false);
  const [selectedStartupForEdit, setSelectedStartupForEdit] = useState<StartupInvitation | null>(null);
  
  // State for showing more items in dashboard cards
  const [showAllStartups, setShowAllStartups] = useState(false);
  const [showAllOpportunities, setShowAllOpportunities] = useState(false);
  const [showAllApplications, setShowAllApplications] = useState(false);
  
  // ============ FEATURE 1: SHORTLISTING SYSTEM ============
  const [shortlistedApplications, setShortlistedApplications] = useState<Set<string>>(new Set());
  
  // ============ FEATURE 2: INTAKE CRM INTEGRATION ============
  // Intake Management View Mode
  const [intakeViewMode, setIntakeViewMode] = useState<'program' | 'crm'>('program');
  
  // ============ FEATURE 3: CONFIGURE QUESTIONS MODAL ============
  const [isProgramQuestionsConfigModalOpen, setIsProgramQuestionsConfigModalOpen] = useState(false);
  const [selectedProgramForQuestions, setSelectedProgramForQuestions] = useState<string | null>(null);
  const [programQuestionIds, setProgramQuestionIds] = useState<string[]>([]);
  const [programQuestionRequiredMap, setProgramQuestionRequiredMap] = useState<Map<string, boolean>>(new Map());
  const [programQuestionSelectionTypeMap, setProgramQuestionSelectionTypeMap] = useState<Map<string, 'single' | 'multiple' | null>>(new Map());
  const [isSavingProgramQuestions, setIsSavingProgramQuestions] = useState(false);
  const [isLoadingProgramQuestionsConfig, setIsLoadingProgramQuestionsConfig] = useState(false);
  
  // ============ FEATURE 4: REPORTS MANDATE WIZARD ============
  const [trackMyStartupsSubTab, setTrackMyStartupsSubTab] = useState<'portfolio' | 'reports'>('portfolio');

  // ============ VIEW BY FILTER (Track My Startups Portfolio) ============
  const [viewByFilter, setViewByFilter] = useState<'program' | 'stage' | 'funding-stage' | 'timeline' | 'status'>('program');
  const [selectedStageTab, setSelectedStageTab] = useState<'Pre-Incubation' | 'Incubation' | 'Acceleration'>('Pre-Incubation');
  const [selectedFundingStageTab, setSelectedFundingStageTab] = useState<'Pre-Seed' | 'Seed' | 'Series A'>('Pre-Seed');
  const [selectedTimelineTab, setSelectedTimelineTab] = useState<string>('2025');
  const [selectedStatusTab, setSelectedStatusTab] = useState<'active' | 'graduated'>('active');
  const [appTimelines, setAppTimelines] = useState<Record<string, string>>({});
  const [appStatuses, setAppStatuses] = useState<Record<string, string>>({});
  const [selectedReportIdForTracking, setSelectedReportIdForTracking] = useState<string | null>(null);
  const [isCreateReportModalOpen, setIsCreateReportModalOpen] = useState(false);
  const [reportStep, setReportStep] = useState<1 | 2 | 3>(1);
  const [reportTitle, setReportTitle] = useState('');
  const [reportProgram, setReportProgram] = useState('');
  const [reportQuestionIds, setReportQuestionIds] = useState<string[]>([]);
  const [allReportQuestions, setAllReportQuestions] = useState<ApplicationQuestion[]>([]);
  const [isLoadingReportQuestions, setIsLoadingReportQuestions] = useState(false);
  const [reportSource, setReportSource] = useState<'existing' | 'startup' | ''>('');
  const [targetStartupIds, setTargetStartupIds] = useState<string[]>([]);
  const [reportMandates, setReportMandates] = useState<ReportMandate[]>([]);
  const [mandateStats, setMandateStats] = useState<Record<string, { submitted: number; total: number }>>({});
  const [mandateResponses, setMandateResponses] = useState<Record<string, any[]>>({}); // Store responses per mandate
  const [isEditMandateModalOpen, setIsEditMandateModalOpen] = useState(false);
  const [selectedMandateForEdit, setSelectedMandateForEdit] = useState<ReportMandate | null>(null);
  const [isViewMandateResponsesModalOpen, setIsViewMandateResponsesModalOpen] = useState(false);
  const [selectedStartupResponse, setSelectedStartupResponse] = useState<any>(null);
  const [questionBank, setQuestionBank] = useState<Map<string, ApplicationQuestion>>(new Map());
  const [isGenerateReportModalOpen, setIsGenerateReportModalOpen] = useState(false);
  const [selectedMandateForReport, setSelectedMandateForReport] = useState<ReportMandate | null>(null);
  const [reportFormatChoices, setReportFormatChoices] = useState<'csv' | 'pdf' | null>(null);
  
  // ============ FEATURE 5: FORM 2 RESPONSE MODAL ============
  const [isForm2ModalOpen, setIsForm2ModalOpen] = useState(false);
  const [selectedApplicationForForm2, setSelectedApplicationForForm2] = useState<ReceivedApplication | null>(null);
  
  // ============ FEATURE 6: FORM 2 CONFIGURATION MODAL ============
  const [isForm2ConfigModalOpen, setIsForm2ConfigModalOpen] = useState(false);
  const [selectedOpportunityForForm2, setSelectedOpportunityForForm2] = useState<string | null>(null);
  const [form2QuestionIds, setForm2QuestionIds] = useState<string[]>([]);
  const [form2QuestionRequiredMap, setForm2QuestionRequiredMap] = useState<Map<string, boolean>>(new Map());
  const [form2QuestionSelectionTypeMap, setForm2QuestionSelectionTypeMap] = useState<Map<string, 'single' | 'multiple' | null>>(new Map());
  const [isSavingForm2Questions, setIsSavingForm2Questions] = useState(false);
  
  const formatCurrency = (value: number, currency: string = 'USD') => 
    formatCurrencyUtil(value, currency, { notation: 'compact' });

  // Handle messaging modal
  const handleOpenMessaging = (application: ReceivedApplication) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(application.id)) {
      messageService.info(
        'Messaging Location',
        'Messaging is only available for valid program applications. Open from Applications where an application exists.'
      );
      return;
    }
    setSelectedApplicationForMessaging(application);
    setIsMessagingModalOpen(true);
  };

  const handleCloseMessaging = () => {
    setIsMessagingModalOpen(false);
    setSelectedApplicationForMessaging(null);
  };

  const resetEmailDraftForm = () => {
    setEmailDraftForm({
      name: '',
      subject: '',
      body: '',
      cc: '',
      bcc: ''
    });
    setEditingEmailDraftId(null);
  };

  const loadEmailDrafts = async (currentFacilitatorId: string) => {
    try {
      const { data, error } = await supabase
        .from('facilitator_email_drafts')
        .select('id, facilitator_id, name, subject, body, cc, bcc, created_at, updated_at')
        .eq('facilitator_id', currentFacilitatorId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((row: any) => ({
        id: row.id,
        facilitatorId: row.facilitator_id,
        name: row.name,
        subject: row.subject || '',
        body: row.body || '',
        cc: row.cc || '',
        bcc: row.bcc || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at
      } as EmailDraft));
      setEmailDrafts(mapped);
    } catch (error) {
      console.error('Error loading email drafts:', error);
    }
  };

  const openEmailDraftsModal = () => {
    setIsEmailDraftsModalOpen(true);
    resetEmailDraftForm();
  };

  const handleEditEmailDraft = (draft: EmailDraft) => {
    setEditingEmailDraftId(draft.id);
    setEmailDraftForm({
      name: draft.name,
      subject: draft.subject,
      body: draft.body,
      cc: draft.cc || '',
      bcc: draft.bcc || ''
    });
  };

  const handleSaveEmailDraft = async () => {
    if (!facilitatorId) return;
    if (!emailDraftForm.name.trim()) {
      messageService.warning('Draft Name Required', 'Please enter a draft name.');
      return;
    }

    setIsSavingEmailDraft(true);
    try {
      if (editingEmailDraftId) {
        const { error } = await supabase
          .from('facilitator_email_drafts')
          .update({
            name: emailDraftForm.name.trim(),
            subject: emailDraftForm.subject || '',
            body: emailDraftForm.body || '',
            cc: emailDraftForm.cc || null,
            bcc: emailDraftForm.bcc || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingEmailDraftId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('facilitator_email_drafts')
          .insert({
            facilitator_id: facilitatorId,
            name: emailDraftForm.name.trim(),
            subject: emailDraftForm.subject || '',
            body: emailDraftForm.body || '',
            cc: emailDraftForm.cc || null,
            bcc: emailDraftForm.bcc || null
          });

        if (error) throw error;
      }

      await loadEmailDrafts(facilitatorId);
      resetEmailDraftForm();
      messageService.success('Draft Saved', 'Email draft saved successfully.');
    } catch (error) {
      console.error('Error saving email draft:', error);
      messageService.error('Save Failed', 'Failed to save email draft.');
    } finally {
      setIsSavingEmailDraft(false);
    }
  };

  const handleDeleteEmailDraft = async (draftId: string) => {
    if (!confirm('Are you sure you want to delete this email draft?')) return;
    try {
      const { error } = await supabase
        .from('facilitator_email_drafts')
        .delete()
        .eq('id', draftId);

      if (error) throw error;
      setEmailDrafts(prev => prev.filter(draft => draft.id !== draftId));
      if (editingEmailDraftId === draftId) {
        resetEmailDraftForm();
      }
      messageService.success('Draft Deleted', 'Email draft deleted successfully.');
    } catch (error) {
      console.error('Error deleting email draft:', error);
      messageService.error('Delete Failed', 'Failed to delete email draft.');
    }
  };

  const applyEmailPlaceholders = (template: string, app: ReceivedApplication) => {
    const opportunity = myPostedOpportunities.find(o => o.id === app.opportunityId);
    const replacements: Record<string, string> = {
      startup_name: app.startupName || '',
      program_name: opportunity?.programName || '',
      startup_email: app.founderEmail || '',
      startup_phone: app.founderPhone || ''
    };
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
      return Object.prototype.hasOwnProperty.call(replacements, key) ? replacements[key] : match;
    });
  };

  const openGmailDraft = (draft: EmailDraft, app: ReceivedApplication) => {
    const subject = applyEmailPlaceholders(draft.subject || '', app);
    const body = applyEmailPlaceholders(draft.body || '', app);
    const cc = applyEmailPlaceholders(draft.cc || '', app);
    const bcc = applyEmailPlaceholders(draft.bcc || '', app);
    const to = app.founderEmail || '';

    const params = new URLSearchParams({
      view: 'cm',
      fs: '1',
      to,
      su: subject,
      body
    });
    if (cc) params.append('cc', cc);
    if (bcc) params.append('bcc', bcc);

    window.open(`https://mail.google.com/mail/?${params.toString()}`, '_blank', 'noopener');
  };

  const handleOpenEmailDraftSelect = (app: ReceivedApplication) => {
    if (!app.founderEmail) {
      messageService.info('Email Not Available', 'Startup email is not available.');
      return;
    }
    if (emailDrafts.length === 0) {
      messageService.info('No Drafts', 'Please create an email draft first.');
      return;
    }
    setSelectedApplicationForEmail(app);
    setSelectedEmailDraftId(emailDrafts[0]?.id || '');
    setIsEmailDraftSelectModalOpen(true);
  };

  // ============ FEATURE 1: SHORTLISTING SYSTEM ============
  const handleShortlistApplication = async (application: ReceivedApplication) => {
    const isCurrentlyShortlisted = shortlistedApplications.has(application.id);
    const newShortlistValue = !isCurrentlyShortlisted;
    
    try {
      // Update in database
      const { error } = await supabase
        .from('opportunity_applications')
        .update({ is_shortlisted: newShortlistValue })
        .eq('id', application.id);

      if (error) {
        console.error('Error updating shortlist:', error);
        messageService.error('Error', 'Failed to update shortlist');
        return;
      }

      // Update local state
      setShortlistedApplications(prev => {
        const newSet = new Set(prev);
        if (newShortlistValue) {
          newSet.add(application.id);
        } else {
          newSet.delete(application.id);
        }
        return newSet;
      });

      // Update applications list
      setMyReceivedApplications(prev => 
        prev.map(app => 
          app.id === application.id 
            ? { ...app, isShortlisted: newShortlistValue }
            : app
        )
      );

      messageService.success(
        newShortlistValue ? 'Added to Shortlist' : 'Removed from Shortlist',
        `${application.startupName} ${newShortlistValue ? 'added to' : 'removed from'} shortlist.`,
        2000
      );
    } catch (err) {
      console.error('Error toggling shortlist:', err);
      messageService.error('Error', 'Failed to update shortlist');
    }
  };

  // ============ FEATURE 3: CONFIGURE QUESTIONS MODAL ============
  const openProgramQuestionsConfig = async (programName: string) => {
    setSelectedProgramForQuestions(programName);
    setIsLoadingProgramQuestionsConfig(true);
    
    try {
      if (!facilitatorId) return;
      
      console.log('🔧 OPENING CONFIGURE QUESTIONS:');
      console.log(`  Facilitator ID: ${facilitatorId}`);
      console.log(`  Program Name: "${programName}"`);
      console.log(`  Program Name Length: ${programName.length}`);
      console.log(`  Program Name Bytes: ${new TextEncoder().encode(programName).length}`);
      
      // Load existing questions for this program
      const existingQuestions = await questionBankService.getProgramTrackingQuestions(facilitatorId, programName);
      
      console.log('📋 Loaded existing questions:', existingQuestions);
      
      const qIds = existingQuestions.map(q => q.questionId);
      setProgramQuestionIds(qIds);
      
      const reqMap = new Map<string, boolean>();
      const selMap = new Map<string, 'single' | 'multiple' | null>();
      
      existingQuestions.forEach(q => {
        reqMap.set(q.questionId, q.isRequired);
        selMap.set(q.questionId, q.selectionType as 'single' | 'multiple' | null);
      });
      
      setProgramQuestionRequiredMap(reqMap);
      setProgramQuestionSelectionTypeMap(selMap);
      
      console.log(`✅ Loaded ${qIds.length} questions for program "${programName}"`);
    } catch (err) {
      console.error('❌ Error loading program questions config:', err);
      messageService.error('Error', 'Failed to load questions configuration');
    } finally {
      setIsLoadingProgramQuestionsConfig(false);
    }
    
    setIsProgramQuestionsConfigModalOpen(true);
  };

  const saveProgramQuestionsConfig = async () => {
    if (!facilitatorId || !selectedProgramForQuestions) return;
    
    setIsSavingProgramQuestions(true);
    try {
      // Load existing questions to see what changed
      const existingQuestions = await questionBankService.getProgramTrackingQuestions(
        facilitatorId,
        selectedProgramForQuestions
      );
      
      const existingQIds = new Set(existingQuestions.map(q => q.questionId));
      const newQIds = new Set(programQuestionIds);
      
      // Find questions to ADD (in new list but not in existing)
      const questionsToAdd = Array.from(newQIds).filter(qId => !existingQIds.has(qId));
      
      // Find questions to REMOVE (in existing list but not in new list)
      const questionsToRemove = Array.from(existingQIds).filter(qId => !newQIds.has(qId));
      
      console.log('📝 Configure Questions Save:');
      console.log(`  ✓ To Add: ${questionsToAdd.length} questions`);
      console.log(`  ✗ To Remove: ${questionsToRemove.length} questions`);
      console.log(`  → Total will be: ${programQuestionIds.length} questions`);
      
      // STEP 1: Remove only the unchecked questions
      if (questionsToRemove.length > 0) {
        for (const questionId of questionsToRemove) {
          await questionBankService.removeProgramQuestion(
            facilitatorId,
            selectedProgramForQuestions,
            questionId
          );
        }
        console.log(`✅ Removed ${questionsToRemove.length} question(s)`);
      }
      
      // STEP 2: Add only the newly selected questions
      if (questionsToAdd.length > 0) {
        // Create maps only for the new questions
        const addMap = new Map<string, boolean>();
        const selMap = new Map<string, 'single' | 'multiple' | null>();
        
        questionsToAdd.forEach(qId => {
          addMap.set(qId, programQuestionRequiredMap.get(qId) ?? true);
          selMap.set(qId, programQuestionSelectionTypeMap.get(qId) ?? null);
        });
        
        await questionBankService.addQuestionsToProgram(
          facilitatorId,
          selectedProgramForQuestions,
          questionsToAdd,
          addMap,
          selMap
        );
        console.log(`✅ Added ${questionsToAdd.length} new question(s)`);
      }
      
      // STEP 3: Update required and selection type for existing questions that changed
      for (const existingQ of existingQuestions) {
        if (newQIds.has(existingQ.questionId)) {
          const newRequired = programQuestionRequiredMap.get(existingQ.questionId) ?? true;
          const newSelType = programQuestionSelectionTypeMap.get(existingQ.questionId) ?? null;
          
          // Check if required status changed
          if (newRequired !== existingQ.isRequired) {
            await questionBankService.updateProgramQuestionRequired(
              existingQ.id,
              newRequired
            );
            console.log(`✓ Updated required status for question ${existingQ.questionId}`);
          }
          
          // Check if selection type changed
          if (newSelType !== existingQ.selectionType) {
            await questionBankService.updateProgramQuestionSelectionType(
              existingQ.id,
              newSelType
            );
            console.log(`✓ Updated selection type for question ${existingQ.questionId}`);
          }
        }
      }
      
      messageService.success(
        'Success', 
        `Questions configured: ${questionsToAdd.length} added${questionsToRemove.length > 0 ? `, ${questionsToRemove.length} removed` : ''}`,
        2000
      );
      setIsProgramQuestionsConfigModalOpen(false);
      setProgramQuestionIds([]);
      setProgramQuestionRequiredMap(new Map());
      setProgramQuestionSelectionTypeMap(new Map());
    } catch (err) {
      console.error('Error saving program questions:', err);
      messageService.error('Error', 'Failed to save questions');
    } finally {
      setIsSavingProgramQuestions(false);
    }
  };

  // ============ FEATURE 4: REPORTS MANDATE WIZARD ============
  const resetCreateReportModal = () => {
    setReportStep(1);
    setReportTitle('');
    setReportProgram('');
    setReportQuestionIds([]);
    setReportSource('');
    setTargetStartupIds([]);
  };

  const handleNextStep = () => {
    if (reportStep === 1) {
      if (!reportTitle.trim()) {
        messageService.warning('Required', 'Please enter a report title');
        return;
      }
      if (!reportProgram) {
        messageService.warning('Required', 'Please select a program');
        return;
      }
    } else if (reportStep === 2) {
      if (reportQuestionIds.length === 0) {
        messageService.warning('Required', 'Please select at least one question');
        return;
      }
    }
    
    if (reportStep < 3) {
      setReportStep((reportStep + 1) as 1 | 2 | 3);
    }
  };

  const handleBackStep = () => {
    if (reportStep > 1) {
      setReportStep((reportStep - 1) as 1 | 2 | 3);
    }
  };

  const handleCreateMandate = async () => {
    if (!facilitatorId) return;
    if (!reportSource) {
      messageService.warning('Required', 'Please choose how to handle responses');
      return;
    }

    try {
      setIsProcessingAction(true);

      const mandateId = crypto.randomUUID();
      const normalizedQuestionIds = reportQuestionIds.map(questionId => String(questionId));
      const normalizedTargetStartupIds = reportSource === 'startup'
        ? targetStartupIds.map(startupId => String(startupId))
        : [];

      const { error } = await supabase
        .from('reports_mandate')
        .insert({
          id: mandateId,
          facilitator_id: facilitatorId,
          title: reportTitle.trim(),
          program_name: reportProgram,
          program_list: reportProgram ? [reportProgram] : null,
          question_ids: normalizedQuestionIds,
          target_startups: normalizedTargetStartupIds,
          source: reportSource === 'startup' ? 'startup' : 'existing',
        });

      if (error) throw error;

      // Auto-merge missing questions into program if needed
      if (reportSource === 'startup') {
        try {
          const result = await questionBankService.addQuestionsToProgram(
            facilitatorId,
            reportProgram,
            reportQuestionIds,
            new Map(),
            new Map()
          );
          
          // Show summary message
          if (result.added > 0) {
            messageService.success(
              'Success', 
              `Added ${result.added} new question(s) to program. ${result.skipped > 0 ? `(${result.skipped} already configured)` : ''}`,
              2000
            );
          } else if (result.skipped > 0) {
            messageService.info(
              'Info', 
              `All ${result.skipped} selected question(s) were already configured in this program`,
              2000
            );
          }
        } catch (e) {
          console.error('Error adding questions to program:', e);
          messageService.warning('Note', 'Some questions may already exist in program');
        }
      }

      messageService.success('Success', 'Report mandate created successfully', 2000);
      resetCreateReportModal();
      setIsCreateReportModalOpen(false);
      
      // Reload mandates
      await loadReportMandates();
    } catch (err) {
      console.error('Error creating mandate:', err);
      messageService.error('Error', 'Failed to create mandate');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // ============ OPTION A: GENERATE FROM EXISTING RESPONSES ============
  const handleGenerateExistingReport = async () => {
    if (!facilitatorId || !reportProgram) return;

    try {
      setIsProcessingAction(true);
      console.log('🔍 Fetching existing responses for Option A...');
      console.log('Program:', reportProgram);
      console.log('Questions:', reportQuestionIds);

      // Get all startups in this program
      const programStartups = portfolioStartups.filter(s => 
        reportProgram === 'All Programs' || s.programName === reportProgram
      );

      if (programStartups.length === 0) {
        messageService.warning('No Data', 'No startups found in this program');
        return;
      }

      console.log(`📊 Found ${programStartups.length} startups in program`);

      // For each startup, fetch answers using cascading logic
      const allResponses: any[] = [];

      for (const startup of programStartups) {
        const startupAnswers: Record<string, string> = {};

        for (const questionId of reportQuestionIds) {
          let answer = '';

          // Priority 1: Check program_tracking_responses
          try {
            const { data: trackingData, error: trackingError } = await supabase
              .from('program_tracking_responses')
              .select('answer_text')
              .eq('startup_id', startup.id)
              .eq('program_name', reportProgram)
              .eq('question_id', questionId)
              .maybeSingle();

            if (!trackingError && trackingData?.answer_text) {
              answer = trackingData.answer_text;
              console.log(`✓ Found answer in program_tracking_responses for startup ${startup.id}, question ${questionId}`);
            }
          } catch (e) {
            console.log('No answer in program_tracking_responses');
          }

          // Priority 2: If not found, check Form 2 (opportunity_form2_responses)
          if (!answer) {
            try {
              const { data: form2Data, error: form2Error } = await supabase
                .from('opportunity_form2_responses')
                .select('answers')
                .eq('startup_id', startup.id)
                .maybeSingle();

              if (!form2Error && form2Data?.answers && form2Data.answers[questionId]) {
                answer = form2Data.answers[questionId];
                console.log(`✓ Found answer in Form 2 for startup ${startup.id}, question ${questionId}`);
              }
            } catch (e) {
              console.log('No answer in Form 2');
            }
          }

          // Priority 3: If not found, check Form 1 (opportunity_application_responses)
          if (!answer) {
            try {
              const { data: form1Data, error: form1Error } = await supabase
                .from('opportunity_application_responses')
                .select('answers')
                .eq('startup_id', startup.id)
                .maybeSingle();

              if (!form1Error && form1Data?.answers && form1Data.answers[questionId]) {
                answer = form1Data.answers[questionId];
                console.log(`✓ Found answer in Form 1 for startup ${startup.id}, question ${questionId}`);
              }
            } catch (e) {
              console.log('No answer in Form 1');
            }
          }

          // If still not found, leave empty
          if (!answer) {
            console.log(`✗ No answer found for startup ${startup.id}, question ${questionId} - leaving empty`);
            answer = '';
          }

          startupAnswers[questionId] = answer;
        }

        allResponses.push({
          startup_id: startup.id,
          startup_name: startup.name,
          answers: startupAnswers
        });
      }

      console.log('✅ Collected all responses:', allResponses);

      // Show format selection modal
      setSelectedMandateForReport({
        id: 'temp-existing',
        title: reportTitle,
        program_name: reportProgram,
        question_ids: reportQuestionIds,
        target_startups: programStartups.map(s => String(s.id)),
        source: 'existing',
        status: 'generated',
        created_at: new Date().toISOString()
      } as any);

      // Store responses temporarily for download
      setMandateResponses({
        'temp-existing': allResponses
      });

      // Close create modal and open format selection
      setIsCreateReportModalOpen(false);
      resetCreateReportModal();
      setIsGenerateReportModalOpen(true);

    } catch (err) {
      console.error('❌ Error generating existing report:', err);
      messageService.error('Error', 'Failed to generate report from existing responses');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const loadQuestionBank = async () => {
    try {
      console.log('📚 Loading question bank...');
      const { data, error } = await supabase
        .from('application_question_bank')
        .select('id, question_text');

      if (error) throw error;

      // Create a map of question ID to question text
      const qMap = new Map<string, ApplicationQuestion>();
      (data || []).forEach(q => {
        qMap.set(q.id, q);
      });

      console.log('✅ Question bank loaded:', qMap.size, 'questions');
      setQuestionBank(qMap);
    } catch (err) {
      console.error('❌ Error loading question bank:', err);
    }
  };

  const loadReportMandates = async () => {
    if (!facilitatorId) return;

    try {
      console.log('🔄 Loading report mandates for facilitator:', facilitatorId);
      
      const { data, error } = await supabase
        .from('reports_mandate')
        .select('*')
        .eq('facilitator_id', facilitatorId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('✅ Report mandates loaded:', data);
      setReportMandates(data || []);

      // Calculate stats and fetch responses for each mandate
      const stats: Record<string, { submitted: number; total: number }> = {};
      const responses: Record<string, any[]> = {};
      
      for (const mandate of data || []) {
        console.log('📊 Processing mandate:', mandate.id, 'Title:', mandate.title, 'Program:', mandate.program_name);
        
        if (mandate.target_startups && Array.isArray(mandate.target_startups)) {
          // Fetch responses for each startup in the target list
          const allResponses: any[] = [];
          
          for (const startupId of mandate.target_startups) {
            // Convert startup ID to number if it's a string (since DB expects INTEGER)
            const numStartupId = typeof startupId === 'string' ? parseInt(startupId, 10) : startupId;
            
            console.log(`🔍 Fetching responses for startup ${numStartupId} in program "${mandate.program_name}"`);
            
            let responseData: any[] | null = null;
            let queryError: any = null;
            
            // If program is "All Programs", fetch responses from ALL programs for this startup
            if (mandate.program_name === 'All Programs') {
              console.log(`📌 "All Programs" detected - fetching responses across all programs for startup ${numStartupId}`);
              const { data: allProgramResponses, error: err } = await supabase
                .from('program_tracking_responses')
                .select('*, startups(name)')
                .eq('startup_id', numStartupId);
              
              responseData = allProgramResponses;
              queryError = err;
              console.log(`📋 Responses for startup ${numStartupId} across all programs:`, responseData);
            } else {
              // For specific program, fetch only that program's responses
              const { data: programResponses, error: err } = await supabase
                .from('program_tracking_responses')
                .select('*, startups(name)')
                .eq('startup_id', numStartupId)
                .eq('program_name', mandate.program_name);
              
              responseData = programResponses;
              queryError = err;
              console.log(`📋 Responses for startup ${numStartupId} in program "${mandate.program_name}":`, responseData);
            }

            if (queryError) {
              console.error(`❌ Error fetching responses for startup ${numStartupId}:`, queryError);
            }
            
            if (responseData && responseData.length > 0) {
              // Get the startup name from the first response
              const startupName = responseData[0].startups?.name || numStartupId;
              
              // Group all answers for this startup
              const startupResponse = {
                startup_id: numStartupId,
                startup_name: startupName,
                program_name: mandate.program_name,
                answers: {}
              };
              
              // Build answers object
              responseData.forEach(r => {
                startupResponse.answers[r.question_id] = r.answer_text;
              });
              
              // Check if any response has been submitted (use updated_at as submission indicator)
              startupResponse.submitted_at = responseData[0].updated_at;
              
              allResponses.push(startupResponse);
            } else {
              // No response yet for this startup - fetch the startup name
              const { data: startupData } = await supabase
                .from('startups')
                .select('name')
                .eq('id', numStartupId)
                .single();

              allResponses.push({
                startup_id: numStartupId,
                startup_name: startupData?.name || `Startup ${numStartupId}`,
                program_name: mandate.program_name,
                answers: {},
                submitted_at: null
              });
            }
          }

          responses[mandate.id] = allResponses;

          const submittedCount = allResponses.filter(r => r.submitted_at).length;
          stats[mandate.id] = {
            submitted: submittedCount,
            total: mandate.target_startups.length
          };
          
          console.log('📈 Mandate stats:', stats[mandate.id].submitted, '/', stats[mandate.id].total, 'submitted');
        }
      }
      
      console.log('📊 Final mandate stats:', stats);
      console.log('📦 All responses:', responses);
      setMandateStats(stats);
      setMandateResponses(responses);
    } catch (err) {
      console.error('❌ Error loading report mandates:', err);
    }
  };

  // ============ FEATURE 5: FORM 2 RESPONSE MODAL ============
  const handleOpenForm2Modal = (application: ReceivedApplication) => {
    setSelectedApplicationForForm2(application);
    setIsForm2ModalOpen(true);
  };

  const handleCloseForm2Modal = () => {
    setIsForm2ModalOpen(false);
    setSelectedApplicationForForm2(null);
  };

  // ============ FEATURE 6: FORM 2 CONFIGURATION MODAL ============
  const handleOpenForm2ConfigModal = async (opportunityId: string) => {
    setSelectedOpportunityForForm2(opportunityId);
    setIsForm2ConfigModalOpen(true);
    
    // Load existing Form 2 questions
    try {
      const questions = await questionBankService.getForm2Questions(opportunityId);
      setForm2QuestionIds(questions.map(q => q.questionId));
      
      const requiredMap = new Map<string, boolean>();
      const selectionTypeMap = new Map<string, 'single' | 'multiple' | null>();
      questions.forEach(q => {
        requiredMap.set(q.questionId, q.isRequired);
        if (q.selectionType !== undefined) {
          selectionTypeMap.set(q.questionId, q.selectionType);
        }
      });
      setForm2QuestionRequiredMap(requiredMap);
      setForm2QuestionSelectionTypeMap(selectionTypeMap);
    } catch (error) {
      console.error('Error loading Form 2 questions:', error);
    }
  };

  const handleCloseForm2ConfigModal = () => {
    setIsForm2ConfigModalOpen(false);
    setSelectedOpportunityForForm2(null);
    setForm2QuestionIds([]);
    setForm2QuestionRequiredMap(new Map());
    setForm2QuestionSelectionTypeMap(new Map());
  };

  const handleSaveForm2Questions = async () => {
    if (!selectedOpportunityForForm2) return;
    
    try {
      setIsSavingForm2Questions(true);
      
      // Remove all existing Form 2 questions
      const existingQuestions = await questionBankService.getForm2Questions(selectedOpportunityForForm2);
      for (const q of existingQuestions) {
        await questionBankService.removeQuestionFromForm2(selectedOpportunityForForm2, q.questionId);
      }
      
      // Add new Form 2 questions
      if (form2QuestionIds.length > 0) {
        await questionBankService.addQuestionsToForm2(
          selectedOpportunityForForm2,
          form2QuestionIds,
          form2QuestionRequiredMap,
          form2QuestionSelectionTypeMap
        );
      }
      
      messageService.success('Form 2 Configured', 'Form 2 questions saved successfully');
      handleCloseForm2ConfigModal();
    } catch (error) {
      console.error('Error saving Form 2 questions:', error);
      messageService.error('Error', 'Failed to save Form 2 questions');
    } finally {
      setIsSavingForm2Questions(false);
    }
  };

  // ============ SEND FORM 2 TO SHORTLISTED APPLICANTS ============
  const handleSendForm2ToShortlisted = async (opportunityId: string) => {
    try {
      // Check if opportunity has Form 2 questions configured
      const form2Questions = await questionBankService.getForm2Questions(opportunityId);
      if (!form2Questions || form2Questions.length === 0) {
        messageService.error(
          'No Form 2 Questions',
          'Please configure at least one Form 2 question before sending to shortlisted applicants.'
        );
        return;
      }

      // Call RPC function to send Form 2 to shortlisted
      const { data, error } = await supabase.rpc('send_form2_to_shortlisted', {
        p_opportunity_id: opportunityId
      });

      if (error) {
        console.error('Error sending Form 2 to shortlisted:', error);
        messageService.error('Error', 'Failed to send Form 2 to shortlisted applicants');
        return;
      }

      const updatedCount = data?.[0]?.updated_count || 0;
      
      if (updatedCount > 0) {
        messageService.success(
          'Form 2 Sent',
          `Form 2 has been sent to ${updatedCount} shortlisted applicant${updatedCount !== 1 ? 's' : ''}.`
        );
        
        // Reload applications to reflect Form 2 status
        const pinnedOpp = selectedOpportunityId;
        if (pinnedOpp) {
          const apps = await supabase
            .from('opportunity_applications')
            .select('id, opportunity_id, status, startup_id, pitch_deck_url, pitch_video_url, diligence_status, agreement_url, domain, stage, created_at, diligence_urls, is_shortlisted, form2_requested, startups!inner(id,name,user_id, founders(email))')
            .eq('opportunity_id', pinnedOpp)
            .order('created_at', { ascending: false });
          
          if (apps.data) {
            const startupUserIds = (apps.data || [])
              .map((a: any) => a.startups?.user_id)
              .filter((id: string | undefined) => !!id);
            const uniqueUserIds = Array.from(new Set(startupUserIds));
            const profilesByAuthId = new Map<string, { email?: string; phone?: string }>();

            if (uniqueUserIds.length > 0) {
              const { data: profileData, error: profileError } = await supabase
                .from('user_profiles')
                .select('auth_user_id, email, phone')
                .in('auth_user_id', uniqueUserIds);

              if (profileError) {
                console.warn('⚠️ Error loading startup contact profiles:', profileError);
              } else {
                (profileData || []).forEach((profile: any) => {
                  profilesByAuthId.set(profile.auth_user_id, {
                    email: profile.email,
                    phone: profile.phone
                  });
                });
              }
            }

            const appsMapped: ReceivedApplication[] = (apps.data || []).map((a: any) => {
              const profile = a.startups?.user_id ? profilesByAuthId.get(a.startups.user_id) : undefined;
              const founderEmail = a.startups?.founders?.[0]?.email || profile?.email;
              const founderPhone = profile?.phone;
              return {
              id: a.id,
              startupId: a.startup_id,
              startupName: a.startups?.name || `Startup #${a.startup_id}`,
              opportunityId: a.opportunity_id,
              status: a.status || 'pending',
              pitchDeckUrl: a.pitch_deck_url || undefined,
              pitchVideoUrl: a.pitch_video_url || undefined,
              diligenceStatus: a.diligence_status || 'none',
              agreementUrl: a.agreement_url || undefined,
              founderEmail: founderEmail || undefined,
              founderPhone: founderPhone || undefined,
              sector: a.domain,
              stage: a.stage,
              createdAt: a.created_at,
              diligenceUrls: a.diligence_urls || [],
              isShortlisted: a.is_shortlisted || false
              };
            });
            
            setMyReceivedApplications(appsMapped);
          }
        }
      } else {
        messageService.info(
          'No Shortlisted Applicants',
          'There are no shortlisted pending applications to send Form 2 to. Eligible criteria: shortlisted + pending status + Form 2 not yet sent'
        );
      }
    } catch (error) {
      console.error('Error in handleSendForm2ToShortlisted:', error);
      messageService.error('Error', 'Failed to send Form 2 to shortlisted applicants');
    }
  };




  // Function to refresh data after payment
  const refreshData = async () => {
    try {
      // Trigger a page refresh to reload all data
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };


  // Handle contract management modal
  const handleOpenContract = (application: ReceivedApplication) => {
    setSelectedApplicationForContract(application);
    setIsContractModalOpen(true);
  };

  const handleCloseContract = () => {
    setIsContractModalOpen(false);
    setSelectedApplicationForContract(null);
  };

  const handleOpenDiligenceDocuments = async (app: ReceivedApplication) => {
    console.log('🔍 FACILITATOR VIEW: Opening diligence documents for app:', app.id);
    
    // Fetch fresh data from database to ensure we have the latest diligence_urls
    try {
      const { data: freshData, error } = await supabase
        .from('opportunity_applications')
        .select('diligence_urls, diligence_status')
        .eq('id', app.id)
        .single();
      
      console.log('🔍 FACILITATOR VIEW: Fresh database data:', freshData);
      console.log('🔍 FACILITATOR VIEW: Database error:', error);
      
      if (freshData) {
        // Update the app with fresh data
        const updatedApp = {
          ...app,
          diligenceUrls: freshData.diligence_urls || [],
          diligenceStatus: freshData.diligence_status
        };
        console.log('🔍 FACILITATOR VIEW: Updated app with fresh data:', updatedApp);
        setSelectedApplicationForDiligence(updatedApp);
      } else {
        setSelectedApplicationForDiligence(app);
      }
    } catch (err) {
      console.error('🔍 FACILITATOR VIEW: Error fetching fresh data:', err);
      setSelectedApplicationForDiligence(app);
    }
    
    setIsDiligenceModalOpen(true);
  };

  const handleCloseDiligenceDocuments = () => {
    setIsDiligenceModalOpen(false);
    setSelectedApplicationForDiligence(null);
  };

  const handleApproveDiligence = async (app: ReceivedApplication) => {
    if (!app.id) return;
    
    setIsProcessingAction(true);
    try {
      console.log('🔄 Approving diligence for application:', app.id);
      
      // Use RPC to approve diligence
      const { data, error: rpcError } = await supabase.rpc('safe_update_diligence_status', {
        p_application_id: app.id,
        p_new_status: 'approved',
        p_old_status: 'requested'
      });
      
      if (rpcError) {
        console.error('RPC function error:', rpcError);
        throw rpcError;
      }

      if (!data || data.length === 0) {
        console.log('⚠️ Diligence was already approved or status changed');
        await loadFacilitatorData(); // Reload data
        return;
      }

      // Update local state
      setMyReceivedApplications(prev => prev.map(application => 
        application.id === app.id 
          ? { ...application, diligenceStatus: 'approved' }
          : application
      ));

      // Close modal
      setIsDiligenceModalOpen(false);
      setSelectedApplicationForDiligence(null);
      
      messageService.success(
        'Diligence Approved',
        'Diligence request approved! The startup has been notified.',
        3000
      );
      
    } catch (err) {
      console.error('Error approving diligence:', err);
      messageService.error(
        'Approval Failed',
        'Failed to approve diligence request. Please try again.'
      );
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRejectDiligence = async (app: ReceivedApplication) => {
    if (!app.id) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to reject this diligence request? The startup will be notified and can re-upload documents if needed.'
    );
    
    if (!confirmed) return;
    
    setIsProcessingAction(true);
    try {
      console.log('🔄 Rejecting diligence for application:', app.id);
      
      // Use RPC to reject diligence
      const { data, error: rpcError } = await supabase.rpc('safe_update_diligence_status', {
        p_application_id: app.id,
        p_new_status: 'rejected',
        p_old_status: 'requested'
      });
      
      if (rpcError) {
        console.error('RPC function error:', rpcError);
        throw rpcError;
      }

      if (!data || data.length === 0) {
        console.log('⚠️ Diligence status was already changed');
        await loadFacilitatorData(); // Reload data
        return;
      }

      // Update local state
      setMyReceivedApplications(prev => prev.map(application => 
        application.id === app.id 
          ? { ...application, diligenceStatus: 'none' } // Reset to none so they can request again
          : application
      ));

      // Close modal
      setIsDiligenceModalOpen(false);
      setSelectedApplicationForDiligence(null);
      
      messageService.success(
        'Diligence Rejected',
        'Diligence request rejected. The startup can upload new documents and request again.',
        3000
      );
      
    } catch (err) {
      console.error('Error rejecting diligence:', err);
      messageService.error(
        'Rejection Failed',
        'Failed to reject diligence request. Please try again.'
      );
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Load current prices from recognition records data
  const loadCurrentPrices = () => {
    const prices: Record<number, number> = {};
    
    // Extract prices from recognition records data
    recognitionRecords.forEach(record => {
      if (record.pricePerShare && record.pricePerShare > 0) {
        prices[record.startupId] = record.pricePerShare;
      }
    });
    
    console.log('💰 Loaded current prices from recognition records:', prices);
    console.log('💰 Recognition records data:', recognitionRecords.map(r => ({
      startupId: r.startupId,
      pricePerShare: r.pricePerShare,
      shares: r.shares
    })));
    setCurrentPrices(prices);
  };

  // Load current prices when recognition records or portfolio data changes
  useEffect(() => {
    if (recognitionRecords.length > 0) {
      loadCurrentPrices();
    }
  }, [recognitionRecords, portfolioStartups]);

  const handleShare = async (startup: ActiveFundraisingStartup) => {
    console.log('Share button clicked for startup:', startup.name);
    console.log('Startup object:', startup);
    // Build a SEO-friendly deep link to the public startup page
    const { createSlug, createProfileUrl } = await import('../lib/slugUtils');
    const startupName = startup.name || 'Startup';
    const slug = createSlug(startupName);
    const baseUrl = window.location.origin;
    const shareUrl = createProfileUrl(baseUrl, 'startup', slug, String(startup.id));
    // Calculate valuation from investment value and equity allocation
    const valuation = startup.equityAllocation > 0 ? (startup.investmentValue / (startup.equityAllocation / 100)) : 0;
    const inferredCurrency =
      startup.currency ||
      (startup as any).profile?.currency ||
      ((startup as any).profile?.country ? resolveCurrency((startup as any).profile?.country) : undefined) ||
      (currentUser?.country ? resolveCurrency(currentUser.country) : 'USD');
    const symbol = getCurrencySymbol(inferredCurrency);
    const details = `Startup: ${startup.name || 'N/A'}\nSector: ${startup.sector || 'N/A'}\nAsk: ${symbol}${(startup.investmentValue || 0).toLocaleString()} for ${startup.equityAllocation || 0}% equity\nValuation: ${symbol}${valuation.toLocaleString()}\n\nOpen pitch: ${shareUrl}`;
    console.log('Share details:', details);
        try {
            if (navigator.share) {
                console.log('Using native share API');
                const shareData = {
                    title: startup.name || 'Startup Pitch',
                    text: details,
                    url: shareUrl
                };
                await navigator.share(shareData);
            } else if (navigator.clipboard && navigator.clipboard.writeText) {
        console.log('Using clipboard API');
        await navigator.clipboard.writeText(details);
        messageService.success(
          'Copied to Clipboard',
          'Startup details copied to clipboard',
          2000
        );
      } else {
        console.log('Using fallback copy method');
        // Fallback: hidden textarea copy
        const textarea = document.createElement('textarea');
        textarea.value = details;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        messageService.success(
          'Copied to Clipboard',
          'Startup details copied to clipboard',
          2000
        );
      }
    } catch (err) {
      console.error('Share failed', err);
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled the share dialog; no need to show an error
        return;
      }
      messageService.error(
        'Share Failed',
        'Unable to share. Try copying manually.'
      );
    }
  };

  const myPortfolio = useMemo(() => portfolioStartups, [portfolioStartups]);
  /** Accepted startups for Partner tab — same set as Track My Startups → Portfolio (deduped by startup id). */
  const partnerTrackMyStartups = useMemo(() => {
    const seen = new Set<number>();
    const list: { id: number; name: string }[] = [];
    for (const app of myReceivedApplications) {
      if (app.status !== 'accepted' || app.startupId == null) continue;
      const id = typeof app.startupId === 'number' ? app.startupId : Number(app.startupId);
      if (Number.isNaN(id) || seen.has(id)) continue;
      seen.add(id);
      list.push({ id, name: app.startupName || `Startup #${id}` });
    }
    return list;
  }, [myReceivedApplications]);
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
      
      // Get facilitator code from user_profiles using id (not auth_user_id)
      const { data: facilitatorData, error: facilitatorError } = await supabase
        .from('user_profiles')
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

      if (!facilitatorCode) {
        console.error('❌ No facilitator code available, cannot load recognition records');
        setRecognitionRecords([]);
        return;
      }
      
      // First, let's check if there are any recognition records at all
      const { data: allRecords, error: allRecordsError } = await supabase
        .from('recognition_records')
        .select('*')
        .limit(5);
      
      // Query the original recognition_records table with proper startup data and investment details
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
            registration_date,
            currency,
            current_valuation,
            startup_shares (
              price_per_share,
              total_shares
            )
          )
        `)
        .eq('facilitator_code', facilitatorCode)
        .order('date_added', { ascending: false });
      
      if (error) {
        console.error('❌ Error loading recognition requests:', error);
        setRecognitionRecords([]);
        return;
      }

      // Fetch domain and stage data from multiple sources for these startups
      const startupIds = data?.map(record => record.startup_id) || [];
      let tempDomainStageMap: { [key: number]: { domain: string; stage: string } } = {};
      
      if (startupIds.length > 0) {
        // 1. First, try to get data from opportunity_applications (most recent)
        // Note: sector column doesn't exist in opportunity_applications, only domain
        const { data: applicationData, error: applicationError } = await supabase
          .from('opportunity_applications')
          .select('startup_id, domain, stage')
          .in('startup_id', startupIds)
          .eq('status', 'accepted'); // Only get accepted applications

        if (!applicationError && applicationData) {
          applicationData.forEach(app => {
            tempDomainStageMap[app.startup_id] = {
              domain: app.domain || 'N/A', // sector column was removed/renamed to domain
              stage: app.stage || 'N/A'
            };
          });
        }

        // 2. For startups without application data, check fundraising data
        const startupsWithoutData = startupIds.filter(id => !tempDomainStageMap[id]);
        if (startupsWithoutData.length > 0) {
          console.log('🔍 Checking fundraising data for startups without application data:', startupsWithoutData);
          
          // Check fundraising_details table for domain/stage information
          const { data: fundraisingData, error: fundraisingError } = await supabase
            .from('fundraising_details')
            .select('startup_id, domain, stage')
            .in('startup_id', startupsWithoutData);

          if (!fundraisingError && fundraisingData) {
            fundraisingData.forEach(fund => {
              if (!tempDomainStageMap[fund.startup_id]) {
                tempDomainStageMap[fund.startup_id] = {
                  domain: fund.domain || 'N/A',
                  stage: fund.stage || 'N/A'
                };
              }
            });
          }
        }

        // 3. Update startup sectors with the best available data
        Object.entries(tempDomainStageMap).forEach(([startupId, data]) => {
          if (data.domain && data.domain !== 'N/A') {
            console.log(`🔄 Updating startup ${startupId} sector from domain: ${data.domain}`);
            
            // Update the startup sector in the database if it's still the default 'Technology'
            supabase
              .from('startups')
              .update({ sector: data.domain })
              .eq('id', parseInt(startupId))
              .eq('sector', 'Technology') // Only update if it's still the default
              .then(({ error }) => {
                if (error) {
                  console.error(`❌ Error updating startup sector for ${startupId}:`, error);
                } else {
                  console.log(`✅ Updated startup ${startupId} sector to: ${data.domain}`);
                }
              });
          }
        });
      }
      
      // Set the domain stage map in state
      setDomainStageMap(tempDomainStageMap);

      // Map database data to RecognitionRecord interface with domain and stage
      const mappedRecords = (data || []).map(record => {
        // Get shares - try recognition_records table first, then calculate
        const sharesFromRecord = record.shares || 0;
        const totalShares = record.startups?.startup_shares?.[0]?.total_shares || 10000; // Default to 10,000 shares
        const equityAllocated = record.equity_allocated || 0;
        const calculatedShares = sharesFromRecord > 0 ? sharesFromRecord : 
                                 (totalShares > 0 && equityAllocated > 0 
                                   ? Math.round((totalShares * equityAllocated) / 100) 
                                   : Math.round(totalShares * 0.1)); // Default to 10% if no equity allocated
        
        // Get price per share - try multiple sources in priority order
        const pricePerShare = record.price_per_share || 
                             record.startups?.startup_shares?.[0]?.price_per_share || 
                             (record.startups?.current_valuation && record.startups?.startup_shares?.[0]?.total_shares 
                               ? record.startups.current_valuation / record.startups.startup_shares[0].total_shares 
                               : record.startups?.current_valuation / totalShares || 10); // Default to $10 per share
        
        // Get investment amount - try multiple sources
        const investmentAmount = record.investment_amount || 
                                record.fee_amount || 
                                (calculatedShares > 0 && pricePerShare > 0 
                                  ? calculatedShares * pricePerShare 
                                  : 100000); // Default to $100,000 investment

        // Debug logging for this record
        console.log(`🔍 Debug record ${record.id}:`, {
          startupId: record.startup_id,
          startupName: record.startups?.name,
          sharesFromRecord: sharesFromRecord,
          totalShares: totalShares,
          equityAllocated: equityAllocated,
          calculatedShares: calculatedShares,
          pricePerShare: pricePerShare,
          investmentAmount: investmentAmount,
          feeAmount: record.fee_amount,
          recordShares: record.shares,
          recordPricePerShare: record.price_per_share,
          recordInvestmentAmount: record.investment_amount,
          startupShares: record.startups?.startup_shares?.[0]
        });

        return {
          id: record.id.toString(), // Keep as string for UI consistency
          startupId: record.startup_id,
          programName: record.program_name,
          facilitatorName: record.facilitator_name,
          facilitatorCode: record.facilitator_code,
          incubationType: record.incubation_type,
          feeType: record.fee_type,
          feeAmount: record.fee_amount,
          equityAllocated: record.equity_allocated,
          preMoneyValuation: record.pre_money_valuation,
          postMoneyValuation: record.post_money_valuation,
          signedAgreementUrl: record.signed_agreement_url,
          status: record.status || 'pending',
          dateAdded: record.date_added,
          // Add calculated fields for investment portfolio display
          shares: calculatedShares,
          pricePerShare: pricePerShare,
          investmentAmount: investmentAmount,
          stage: tempDomainStageMap[record.startup_id]?.stage || 'N/A',
          // Include startup data for display with current price and domain/stage
          startup: {
            ...record.startups,
            currentPricePerShare: pricePerShare,
            currentValuation: record.startups?.current_valuation || 0,
            // Use domain from opportunity_applications, fallback to startup sector, then to 'N/A'
            sector: tempDomainStageMap[record.startup_id]?.domain || 
                   (record.startups?.sector && record.startups.sector !== 'Technology' ? record.startups.sector : 'N/A'),
            // Add stage information
            stage: tempDomainStageMap[record.startup_id]?.stage || 'N/A'
          }
        };
      });
      
      console.log('📋 Mapped recognition records with domain/stage:', mappedRecords);
      console.log('🔍 Debug domain/stage mapping:', tempDomainStageMap);
      console.log('🏢 Sector mapping debug:', {
        totalRecords: mappedRecords.length,
        recordsWithDomainMapping: mappedRecords.filter(r => tempDomainStageMap[r.startupId]?.domain).length,
        recordsWithStartupSector: mappedRecords.filter(r => r.startup?.sector && r.startup.sector !== 'Technology').length,
        domainStageMapKeys: Object.keys(tempDomainStageMap),
        sampleMappings: Object.entries(tempDomainStageMap).slice(0, 3)
      });
      console.log('💰 Investment data summary:', {
        totalRecords: mappedRecords.length,
        recordsWithShares: mappedRecords.filter(r => r.shares > 0).length,
        recordsWithPrices: mappedRecords.filter(r => r.pricePerShare > 0).length,
        recordsWithInvestmentAmount: mappedRecords.filter(r => r.investmentAmount > 0).length
      });
      setRecognitionRecords(mappedRecords);
      return;
    } catch (err) {
      console.error('Error loading recognition requests:', err);
      setRecognitionRecords([]);
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
        
        // Get user_profiles.id (not auth.uid()) for facilitator_id
        console.log('🔍 Fetching user profile for auth user:', user.id);
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();
        
        if (profileError) {
          console.error('❌ Error fetching user profile:', profileError);
          return;
        }
        
        if (!profile?.id) {
          console.error('❌ No user profile found for auth user:', user.id);
          return;
        }
        
        console.log('✅ Found user profile id:', profile.id);
        // Use auth user ID for facilitator operations (uniform with Intake Management & Startup Dashboard)
        // All three systems now use user.id (Auth User ID) for consistency
        setFacilitatorId(user.id);
        // Set loading timeout to prevent infinite loading
        loadingTimeout = setTimeout(() => {
          if (mounted) {
            console.warn('⚠️ Data loading timeout - some data may not have loaded');
          }
        }, 30000); // 30 second timeout
        
        // Load all data in parallel with proper error handling
        // NOTE: incubation_opportunities uses auth.uid() (user.id), NOT user_profiles.id
        // NOTE: facilitator_startups also uses auth.uid() (user.id), NOT user_profiles.id
        const [opportunitiesResult, recognitionResult, portfolioResult] = await Promise.allSettled([
          // Load opportunities (uses auth.uid())
          supabase
          .from('incubation_opportunities')
          .select('*')
          .eq('facilitator_id', user.id)
            .order('created_at', { ascending: false }),
          
          // Load recognition records (uses user_profiles.id)
          loadRecognitionRecords(profile.id),
          
          // Load portfolio (uses auth.uid())
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
            whatsappLink: row.whatsapp_link || undefined,
            facilitatorId: row.facilitator_id,
            createdAt: row.created_at
          }));
          setMyPostedOpportunities(mapped);

            // Load applications for opportunities
          if (mapped.length > 0) {
            const oppIds = mapped.map(o => o.id);
            try {
            const { data: apps, error: appsError } = await supabase
              .from('opportunity_applications')
              .select('id, opportunity_id, status, startup_id, pitch_deck_url, pitch_video_url, diligence_status, agreement_url, domain, stage, created_at, diligence_urls, is_shortlisted, timeline, startup_status, startups!inner(id,name,user_id, founders(email))')
              .in('opportunity_id', oppIds)
              .order('created_at', { ascending: false });
            
            // Calculate application counts per opportunity
            if (apps && !appsError) {
              const countsMap = new Map<string, number>();
              apps.forEach((app: any) => {
                const oppId = app.opportunity_id;
                countsMap.set(oppId, (countsMap.get(oppId) || 0) + 1);
              });
              setOpportunityApplicationCounts(countsMap);
            } else {
              // Initialize with zero counts for all opportunities
              const countsMap = new Map<string, number>();
              mapped.forEach(opp => {
                countsMap.set(opp.id, 0);
              });
              setOpportunityApplicationCounts(countsMap);
            }
            
            if (appsError) {
                  console.error('❌ Error loading opportunity applications:', appsError);
                  // Try without the inner join
                  const { data: fallbackApps, error: fallbackAppsError } = await supabase
                    .from('opportunity_applications')
                    .select('id, opportunity_id, status, startup_id, pitch_deck_url, pitch_video_url, diligence_status, agreement_url, domain, stage, created_at, diligence_urls, is_shortlisted, timeline, startup_status')
                    .in('opportunity_id', oppIds)
                    .order('created_at', { ascending: false });
                  
                  if (fallbackAppsError) {
                    console.error('❌ Fallback query also failed:', fallbackAppsError);
                    setMyReceivedApplications([]);
                  } else {
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
                      sector: a.domain,
                      stage: a.stage,
                      createdAt: a.created_at,
                      diligenceUrls: a.diligence_urls || [],
                      isShortlisted: a.is_shortlisted || false,
                      timeline: a.timeline || undefined,
                      startupStatus: a.startup_status || undefined,
                    }));

                    setMyReceivedApplications(fallbackAppsMapped);
                    const tlInit: Record<string, string> = {};
                    const stInit: Record<string, string> = {};
                    fallbackAppsMapped.forEach(app => {
                      if (app.timeline) tlInit[app.id] = app.timeline;
                      if (app.startupStatus) stInit[app.id] = app.startupStatus;
                    });
                    setAppTimelines(tlInit);
                    setAppStatuses(stInit);
                    
                    // Populate shortlist set from fallback applications
                    const shortlistedIds = new Set<string>();
                    fallbackAppsMapped.forEach(app => {
                      if (app.isShortlisted) {
                        shortlistedIds.add(app.id);
                      }
                    });
                    setShortlistedApplications(shortlistedIds);
                  }
            } else {
              const startupUserIds = (apps || [])
                .map((a: any) => a.startups?.user_id)
                .filter((id: string | undefined) => !!id);
              const uniqueUserIds = Array.from(new Set(startupUserIds));
              const profilesByAuthId = new Map<string, { email?: string; phone?: string }>();

              if (uniqueUserIds.length > 0) {
                const { data: profileData, error: profileError } = await supabase
                  .from('user_profiles')
                  .select('auth_user_id, email, phone')
                  .in('auth_user_id', uniqueUserIds);

                if (profileError) {
                  console.warn('⚠️ Error loading startup contact profiles:', profileError);
                } else {
                  (profileData || []).forEach((profile: any) => {
                    profilesByAuthId.set(profile.auth_user_id, {
                      email: profile.email,
                      phone: profile.phone
                    });
                  });
                }
              }

              const appsMapped: ReceivedApplication[] = (apps || []).map((a: any) => {
                const profile = a.startups?.user_id ? profilesByAuthId.get(a.startups.user_id) : undefined;
                const founderEmail = a.startups?.founders?.[0]?.email || profile?.email;
                const founderPhone = profile?.phone;
                return {
                id: a.id,
                startupId: a.startup_id,
                startupName: a.startups?.name || `Startup #${a.startup_id}`,
                opportunityId: a.opportunity_id,
                status: a.status || 'pending',
                pitchDeckUrl: a.pitch_deck_url || undefined,
                pitchVideoUrl: a.pitch_video_url || undefined,
                diligenceStatus: a.diligence_status || 'none',
                agreementUrl: a.agreement_url || undefined,
                founderEmail: founderEmail || undefined,
                founderPhone: founderPhone || undefined,
                sector: a.domain,
                stage: a.stage,
                createdAt: a.created_at,
                diligenceUrls: a.diligence_urls || [],
                isShortlisted: a.is_shortlisted || false,
                timeline: a.timeline || undefined,
                startupStatus: a.startup_status || undefined,
                };
              });

              if (mounted) {
                setMyReceivedApplications(appsMapped);

                // Initialise facilitator-set timeline/status from DB
                const tlInit: Record<string, string> = {};
                const stInit: Record<string, string> = {};
                appsMapped.forEach(app => {
                  if (app.timeline) tlInit[app.id] = app.timeline;
                  if (app.startupStatus) stInit[app.id] = app.startupStatus;
                });
                setAppTimelines(tlInit);
                setAppStatuses(stInit);

                // Batch-load stage & funding stage from application responses
                const acceptedIds = appsMapped.filter(a => a.status === 'accepted').map(a => a.id);
                if (acceptedIds.length > 0) {
                  const { data: respData } = await supabase
                    .from('opportunity_application_responses')
                    .select('application_id, answer_text, question:application_question_bank(question_text)')
                    .in('application_id', acceptedIds);
                  if (respData && mounted) {
                    const stageMap: Record<string, string> = {};
                    const fundingMap: Record<string, string> = {};
                    for (const row of respData as any[]) {
                      const qText = (row.question?.question_text || '').toLowerCase();
                      const answer = row.answer_text || '';
                      const appId = row.application_id;
                      if (qText.includes('funding') && !fundingMap[appId]) {
                        fundingMap[appId] = answer;
                      } else if (qText.includes('stage') && !stageMap[appId]) {
                        stageMap[appId] = answer;
                      }
                    }
                    setMyReceivedApplications(prev => prev.map(app => ({
                      ...app,
                      stage: stageMap[app.id] !== undefined ? stageMap[app.id] : app.stage,
                      fundingStage: fundingMap[app.id] !== undefined ? fundingMap[app.id] : app.fundingStage,
                    })));
                  }
                }

                // Populate shortlist set from loaded applications
                const shortlistedIds = new Set<string>();
                appsMapped.forEach(app => {
                  if (app.isShortlisted) {
                    shortlistedIds.add(app.id);
                  }
                });
                setShortlistedApplications(shortlistedIds);
                
                // Calculate counts from apps
                const appsCountsMap = new Map<string, number>();
                appsMapped.forEach(app => {
                  const oppId = app.opportunityId;
                  appsCountsMap.set(oppId, (appsCountsMap.get(oppId) || 0) + 1);
                });
                setOpportunityApplicationCounts(appsCountsMap);
              }
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

  // Load received recommendations for facilitator
  useEffect(() => {
    if (activeTab !== 'discover') return;
    const loadReceivedRecommendations = async () => {
      try {
        if (!facilitatorId) {
          setReceivedRecommendations([]);
          return;
        }

        // Fetch recommendations sent to this facilitator
        const { data, error } = await supabase
          .from('facilitator_recommendations')
          .select('*')
          .eq('facilitator_id', facilitatorId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching facilitator recommendations:', error);
          setReceivedRecommendations([]);
          return;
        }

        setReceivedRecommendations(data || []);
      } catch (error) {
        console.error('Error loading facilitator recommendations:', error);
        setReceivedRecommendations([]);
      }
    };

    loadReceivedRecommendations();
  }, [activeTab, facilitatorId]);

  // Load pending collaboration requests
  useEffect(() => {
    const loadPendingCollaborationRequests = async () => {
      if (activeTab === 'collaboration' && facilitatorId) {
        setLoadingCollaborationRequests(true);
        try {
          const requests = await advisorConnectionRequestService.getCollaboratorRequests(facilitatorId);
          setCollaborationRequests(requests.filter(r => r.status === 'pending'));
        } catch (error) {
          console.error('Error loading collaboration requests:', error);
        } finally {
          setLoadingCollaborationRequests(false);
        }
      }
    };
    loadPendingCollaborationRequests();
  }, [activeTab, facilitatorId]);

  // Load accepted collaborators and their profiles
  useEffect(() => {
    const loadAcceptedCollaborators = async () => {
      if (collaborationRequests.length === 0 && acceptedCollaborators.length === 0) return;
      
      const allRequests = [...collaborationRequests, ...acceptedCollaborators];
      const uniqueRequesterIds = Array.from(new Set(allRequests.map(r => r.requester_id)));

      if (uniqueRequesterIds.length === 0) return;

      try {
        // Load user profiles
        const { data: userProfilesData, error: userProfilesError } = await supabase
          .from('user_profiles')
          .select('*')
          .in('auth_user_id', uniqueRequesterIds);

        if (userProfilesError) {
          console.error('Error loading user profiles:', userProfilesError);
          return;
        }

        const usersMap: any[] = userProfilesData || [];
        setUsers(usersMap);

        // Load specific profile data for each user type
        const profilesMap: {[key: string]: any} = {};
        
        for (const request of allRequests) {
          const user = usersMap.find(u => u.auth_user_id === request.requester_id);
          if (!user) continue;

          try {
            let profileData = null;
            
            switch (request.requester_type) {
              case 'Investor':
                const { data: investorData } = await supabase
                  .from('investor_profiles')
                  .select('*')
                  .eq('user_id', request.requester_id)
                  .single();
                profileData = investorData;
                break;
              case 'Investment Advisor':
                const { data: advisorData } = await supabase
                  .from('investment_advisor_profiles')
                  .select('*')
                  .eq('user_id', request.requester_id)
                  .single();
                profileData = advisorData;
                break;
              case 'Mentor':
                const { data: mentorData } = await supabase
                  .from('mentor_profiles')
                  .select('*')
                  .eq('user_id', request.requester_id)
                  .single();
                profileData = mentorData;
                break;
            }
            
            if (profileData) {
              profilesMap[request.requester_id] = profileData;
            }
          } catch (err) {
            console.error(`Error loading ${request.requester_type} profile:`, err);
          }
        }

        setCollaboratorProfiles(profilesMap);
      } catch (error) {
        console.error('Error loading collaborator data:', error);
      }
    };

    loadAcceptedCollaborators();
  }, [collaborationRequests, acceptedCollaborators]);

  // Load accepted collaborators on collaboration tab
  useEffect(() => {
    const loadAcceptedRequests = async () => {
      if (activeTab === 'collaboration' && facilitatorId) {
        try {
          const requests = await advisorConnectionRequestService.getCollaboratorRequests(facilitatorId);
          setAcceptedCollaborators(requests.filter(r => r.status === 'accepted'));
        } catch (error) {
          console.error('Error loading accepted collaborators:', error);
        }
      }
    };
    loadAcceptedRequests();
  }, [activeTab, facilitatorId]);

  useEffect(() => {
    if (!facilitatorId) return;
    loadEmailDrafts(facilitatorId);
  }, [facilitatorId]);

  // Keep selected pitch in URL when on discover tab
  useEffect(() => {
    if (activeTab === 'discover') {
      setQueryParam('pitchId', playingVideoId ? String(playingVideoId) : '', true);
    }
  }, [playingVideoId, activeTab]);

  // Shuffle pitches like investor reels: interleave verified and unverified (2:1)
  useEffect(() => {
    if (activeTab !== 'discover' || activeFundraisingStartups.length === 0) return;
    const verified = activeFundraisingStartups.filter(s => s.complianceStatus === ComplianceStatus.Compliant);
    const unverified = activeFundraisingStartups.filter(s => s.complianceStatus !== ComplianceStatus.Compliant);
    const shuffle = (arr: ActiveFundraisingStartup[]) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    const sv = shuffle(verified);
    const su = shuffle(unverified);
    const result: ActiveFundraisingStartup[] = [];
    let i = 0, j = 0;
    while (i < sv.length || j < su.length) {
      if (i < sv.length) result.push(sv[i++]);
      if (i < sv.length) result.push(sv[i++]);
      if (j < su.length) result.push(su[j++]);
    }
    setShuffledPitches(result);
  }, [activeTab, activeFundraisingStartups]);

  const handleFavoriteToggle = (pitchId: number) => {
    setFavoritedPitches(prev => {
      const next = new Set(prev);
      if (next.has(pitchId)) next.delete(pitchId); else next.add(pitchId);
      return next;
    });
  };




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
              stage: row.stage,
              createdAt: row.created_at
            },
            ...prev
          ]);
          
          // Update application count for this opportunity
          setOpportunityApplicationCounts(prev => {
            const newMap = new Map(prev);
            const currentCount = (newMap.get(row.opportunity_id) as number) || 0;
            newMap.set(row.opportunity_id, currentCount + 1);
            return newMap;
          });
          
          // Show notification to facilitator
          console.log('📝 Application details:', row);
        } catch (e) {
            console.error('Error processing new application:', e);
          }
        })
        .on('postgres_changes', { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'opportunity_applications' 
        }, async (payload) => {
          try {
            const row: any = payload.old;
            if (!oppIds.includes(row.opportunity_id)) return;
            
            // Remove the deleted application from local state
            setMyReceivedApplications(prev => prev.filter(app => app.id !== row.id));
            
            // Update application count for this opportunity
            setOpportunityApplicationCounts(prev => {
              const newMap = new Map(prev);
              const currentCount = (newMap.get(row.opportunity_id) as number) || 0;
              newMap.set(row.opportunity_id, Math.max(0, currentCount - 1));
              return newMap;
            });
            
            console.log(`🗑️ Application deleted: ${row.id}`);
          } catch (e) {
            console.error('Error processing deleted application:', e);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Error subscribing to opportunity applications changes');
          }
        });
    } catch (error) {
      console.error('Error setting up opportunity applications subscription:', error);
    }
    
    return () => { 
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [facilitatorId, myPostedOpportunities]);

  // Realtime: update recognition records when they are deleted
  useEffect(() => {
    if (!facilitatorId) return;
    
    let channel: any = null;
    
    try {
      channel = supabase
      .channel('recognition_records_changes')
        .on('postgres_changes', { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'recognition_records' 
        }, async (payload) => {
          try {
            const row: any = payload.old;
            
            // Remove the deleted recognition record from local state
            setRecognitionRecords(prev => prev.filter(record => record.id !== row.id.toString()));
            
            console.log(`🗑️ Recognition record deleted: ${row.id}`);
          } catch (e) {
            console.error('Error processing deleted recognition record:', e);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Error subscribing to recognition records changes');
          }
        });
    } catch (error) {
      console.error('Error setting up recognition records subscription:', error);
    }
    
    return () => { 
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [facilitatorId]);

  // Realtime: update facilitator startups when they are deleted
  useEffect(() => {
    if (!facilitatorId) return;
    
    let channel: any = null;
    
    try {
      channel = supabase
      .channel('facilitator_startups_changes')
        .on('postgres_changes', { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'facilitator_startups',
          filter: `facilitator_id=eq.${facilitatorId}`
        }, async (payload) => {
          try {
            const row: any = payload.old;
            
            // Remove the deleted startup from local state
            setPortfolioStartups(prev => prev.filter(startup => startup.id !== row.startup_id));
            
            console.log(`🗑️ Startup removed from portfolio: ${row.startup_id}`);
          } catch (e) {
            console.error('Error processing deleted facilitator startup:', e);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Error subscribing to facilitator startups changes');
          }
        });
    } catch (error) {
      console.error('Error setting up facilitator startups subscription:', error);
    }
    
    return () => { 
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [facilitatorId]);

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
            } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Error subscribing to diligence status changes');
          }
        });
    } catch (error) {
      console.error('Error setting up diligence status subscription:', error);
    }
    
    return () => { 
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [facilitatorId, myPostedOpportunities]);

  // Load facilitator code and startup invitations
  useEffect(() => {
    if (!facilitatorId) return;

    const loadFacilitatorCode = async () => {
      try {
        const code = await facilitatorCodeService.getFacilitatorCodeByUserId(facilitatorId);
        setFacilitatorCode(code || '');
      } catch (error) {
        console.error('Error loading facilitator code:', error);
      }
    };

    loadFacilitatorCode();
    loadStartupInvitations();
  }, [facilitatorId]);

  // Load report questions when report modal opens
  useEffect(() => {
    if (!isCreateReportModalOpen || !facilitatorId) return;

    const loadQuestions = async () => {
      setIsLoadingReportQuestions(true);
      try {
        const questions = await questionBankService.getApprovedQuestions();
        setAllReportQuestions(questions);
      } catch (err) {
        console.error('Error loading report questions:', err);
        messageService.error('Error', 'Failed to load questions');
      } finally {
        setIsLoadingReportQuestions(false);
      }
    };

    loadQuestions();
  }, [isCreateReportModalOpen, facilitatorId]);

  // Load report mandates when report modal opens
  useEffect(() => {
    if (!isCreateReportModalOpen || !facilitatorId) return;
    loadReportMandates();
  }, [isCreateReportModalOpen, facilitatorId]);

  // Load report mandates when Track My Startups Reports tab is active
  useEffect(() => {
    if (activeTab === 'trackMyStartups' && trackMyStartupsSubTab === 'reports' && facilitatorId) {
      loadQuestionBank();
      loadReportMandates();
    }
  }, [activeTab, trackMyStartupsSubTab, facilitatorId]);

  // Load mentor management data when tab is active
  useEffect(() => {
    if (activeTab === 'mentorManagement' && facilitatorCode) {
      loadMentorManagementData();
    }
  }, [activeTab, facilitatorCode]);

  const loadMentorManagementData = async () => {
    if (!facilitatorCode) return;
    setIsLoadingMentorMgmt(true);
    try {
      const [mentors, assignments, meetings, pending, approved] = await Promise.all([
        facilitatorMentorService.getMentorsForFacilitator(facilitatorCode),
        facilitatorMentorService.getAssignmentsForFacilitator(facilitatorCode),
        facilitatorMentorService.getAllMeetingRecords(facilitatorCode),
        facilitatorMentorService.getAssociationsForFacilitator(facilitatorCode, 'pending'),
        facilitatorMentorService.getAssociationsForFacilitator(facilitatorCode, 'approved'),
      ]);
      setFacilitatorMentors(mentors);
      setMentorAssignments(assignments);
      setAllMeetingRecords(meetings);
      setPendingMentorAssociations(pending);
      setApprovedMentorAssociations(approved);
    } catch (err) {
      console.error('Error loading mentor management data:', err);
    } finally {
      setIsLoadingMentorMgmt(false);
    }
  };

  const handleAssignMentor = async () => {
    if (!facilitatorCode || !assignMentorId || !assignStartupId) return;
    setIsSavingAssignment(true);
    try {
      console.log('🟢 [FacilitatorView] Assigning mentor:', {
        facilitatorCode,
        mentorId: assignMentorId,
        startupId: assignStartupId
      });
      
      const result = await facilitatorMentorService.assignMentorToStartup(
        facilitatorCode,
        assignMentorId,
        Number(assignStartupId),
        assignNotes || undefined
      );
      
      console.log('📊 [FacilitatorView] Assignment result:', result);
      
      if (result.success) {
        console.log('✅ [FacilitatorView] Assignment succeeded, reloading data...');
        setIsAssignModalOpen(false);
        setAssignMentorId('');
        setAssignStartupId('');
        setAssignNotes('');
        await loadMentorManagementData();
        messageService.success('Mentor Assigned', 'Mentor has been assigned to the startup successfully.');
      } else {
        console.error('❌ [FacilitatorView] Assignment failed:', result.error);
        messageService.error('Assignment Failed', result.error || 'Failed to assign mentor.');
      }
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleAddMeetingRecord = async () => {
    if (!selectedAssignmentForMeeting || !meetingForm.title || !meetingForm.meeting_date) return;
    setIsSavingMeeting(true);
    try {
      const result = await facilitatorMentorService.addMeetingRecord({
        assignment_id: selectedAssignmentForMeeting.id,
        facilitator_code: facilitatorCode,
        mentor_user_id: selectedAssignmentForMeeting.mentor_user_id,
        startup_id: selectedAssignmentForMeeting.startup_id,
        title: meetingForm.title,
        meeting_date: meetingForm.meeting_date,
        meeting_type: meetingForm.meeting_type,
        duration_minutes: meetingForm.duration_minutes ? Number(meetingForm.duration_minutes) : undefined,
        notes: meetingForm.notes || undefined,
        outcomes: meetingForm.outcomes || undefined,
        next_steps: meetingForm.next_steps || undefined,
      });
      if (result.success) {
        setIsMeetingModalOpen(false);
        setMeetingForm({
          title: '',
          meeting_date: new Date().toISOString().split('T')[0],
          meeting_type: 'General',
          duration_minutes: '',
          notes: '',
          outcomes: '',
          next_steps: '',
        });
        await loadMentorManagementData();
        // Also refresh expanded assignment meetings
        if (expandedAssignmentId === selectedAssignmentForMeeting.id) {
          const updated = await facilitatorMentorService.getMeetingRecords(selectedAssignmentForMeeting.id);
          setAssignmentMeetings(prev => ({ ...prev, [selectedAssignmentForMeeting.id]: updated }));
        }
        messageService.success('Meeting Recorded', 'Meeting record has been saved successfully.');
      } else {
        messageService.error('Failed', result.error || 'Failed to save meeting record.');
      }
    } finally {
      setIsSavingMeeting(false);
    }
  };

  const handleToggleAssignmentExpand = async (assignmentId: number) => {
    if (expandedAssignmentId === assignmentId) {
      setExpandedAssignmentId(null);
      return;
    }
    setExpandedAssignmentId(assignmentId);
    if (!assignmentMeetings[assignmentId]) {
      const records = await facilitatorMentorService.getMeetingRecords(assignmentId);
      setAssignmentMeetings(prev => ({ ...prev, [assignmentId]: records }));
    }
  };

  const handleOpenPostModal = () => {
    setEditingIndex(null);
    setNewOpportunity(initialNewOppState);
    setPosterPreview('');
    setSelectedQuestionIds([]);
    setQuestionRequiredMap(new Map());
    setQuestionSelectionTypeMap(new Map());
    setIsPostModalOpen(true);
  };

  const handleEditClick = async (index: number) => {
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
    
    // Load existing questions for this opportunity
    if (opp?.id) {
      try {
        const questions = await questionBankService.getOpportunityQuestions(opp.id);
        setSelectedQuestionIds(questions.map(q => q.questionId));
        // Load required status map
        const requiredMap = new Map<string, boolean>();
        const selectionTypeMap = new Map<string, 'single' | 'multiple' | null>();
        questions.forEach(q => {
          requiredMap.set(q.questionId, q.isRequired);
          if (q.selectionType !== undefined) {
            selectionTypeMap.set(q.questionId, q.selectionType);
          }
        });
        setQuestionRequiredMap(requiredMap);
        setQuestionSelectionTypeMap(selectionTypeMap);
      } catch (error) {
        console.error('Failed to load questions:', error);
        setSelectedQuestionIds([]);
        setQuestionRequiredMap(new Map());
        setQuestionSelectionTypeMap(new Map());
      }
    } else {
      setSelectedQuestionIds([]);
      setQuestionRequiredMap(new Map());
      setQuestionSelectionTypeMap(new Map());
    }
    
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

  const handleViewPitchVideo = (videoUrl: string) => {
    setSelectedPitchVideo(videoUrl);
    setIsPitchVideoModalOpen(true);
  };

  const handleViewPitchDeck = (deckUrl: string) => {
    setSelectedPitchDeck(deckUrl);
    setIsPitchDeckModalOpen(true);
  };

  const handleSetTimeline = async (appId: string, year: string) => {
    setAppTimelines(prev => ({ ...prev, [appId]: year }));
    await supabase.from('opportunity_applications').update({ timeline: year || null }).eq('id', appId);
  };

  const handleSetStatus = async (appId: string, status: string) => {
    setAppStatuses(prev => ({ ...prev, [appId]: status }));
    await supabase.from('opportunity_applications').update({ startup_status: status || null }).eq('id', appId);
  };

  const handleViewApplicationResponses = async (app: ReceivedApplication) => {
    setSelectedApplicationForResponses(app);
    setIsApplicationResponsesModalOpen(true);
    setResponseTab('response1');
    setLoadingResponses(true);
    setLoadingForm2Responses(true);
    
    try {
      // Load initial application responses
      const responses = await questionBankService.getApplicationResponses(app.id);
      const responsesWithQuestions = responses
        .filter(response => response.question)
        .map(response => ({
          question: response.question as ApplicationQuestion,
          answerText: response.answerText
        }));
      setApplicationResponses(responsesWithQuestions);
    } catch (error: any) {
      console.error('Failed to load application responses:', error);
      messageService.error('Failed to Load Responses', error.message || 'Please try again.');
      setApplicationResponses([]);
    } finally {
      setLoadingResponses(false);
    }

    try {
      // Load Form 2 responses with question details
      const { data: form2Data, error: form2Error } = await supabase
        .from('opportunity_form2_responses')
        .select(`
          *,
          application_question_bank!opportunity_form2_responses_question_id_fkey(*)
        `)
        .eq('application_id', app.id);

      if (form2Error) {
        console.error('Form 2 query error:', form2Error);
        throw form2Error;
      }

      console.log('Form 2 raw data:', form2Data);

      const form2ResponsesWithQuestions = (form2Data || [])
        .filter((response: any) => response.application_question_bank)
        .map((response: any) => {
          const questionData = response.application_question_bank;
          return {
            question: {
              id: questionData.id,
              questionText: questionData.question_text,
              category: questionData.category,
              questionType: questionData.question_type || 'text',
              options: questionData.options,
              status: questionData.status,
              scope: questionData.scope || null,
              scopeOpportunityId: questionData.scope_opportunity_id || null,
              createdBy: questionData.created_by,
              createdAt: questionData.created_at,
              approvedAt: questionData.approved_at,
              approvedBy: questionData.approved_by,
              rejectionReason: questionData.rejection_reason,
              usageCount: questionData.usage_count || 0,
              updatedAt: questionData.updated_at
            } as ApplicationQuestion,
            answerText: response.answer_text || ''
          };
        });
      
      console.log('Form 2 responses with questions:', form2ResponsesWithQuestions);
      setForm2Responses(form2ResponsesWithQuestions);
    } catch (error: any) {
      console.error('Failed to load Form 2 responses:', error);
      setForm2Responses([]);
    } finally {
      setLoadingForm2Responses(false);
    }
  };

  const getEmbeddableVideoUrl = (url: string): string => {
    if (!url) return '';
    
    // YouTube URL conversion
    if (url.includes('youtube.com/watch')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }
    
    // YouTube short URL conversion
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }
    
    // Vimeo URL conversion
    if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
    }
    
    // If it's already an embed URL or direct video URL, return as is
    if (url.includes('embed') || url.includes('.mp4') || url.includes('.webm') || url.includes('.mov')) {
      return url;
    }
    
    // For other URLs, try to use as is (might work for some platforms)
    return url;
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
        messageService.error(
          'Rejection Failed',
          'Failed to reject application. Please try again.'
        );
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

      messageService.success(
        'Application Rejected',
        'Application rejected successfully.',
        3000
      );
    } catch (error) {
      console.error('Error rejecting application:', error);
      messageService.error(
        'Rejection Failed',
        'Failed to reject application. Please try again.'
      );
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteApplication = async (application: ReceivedApplication) => {
    if (!confirm(`Are you sure you want to delete the application from ${application.startupName}? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsProcessingAction(true);
      
      console.log('🗑️ Attempting to delete application:', {
        applicationId: application.id,
        startupName: application.startupName,
        table: 'opportunity_applications'
      });
      
      // Instead of deleting, withdraw the application to preserve data
      const { data, error } = await supabase
        .from('opportunity_applications')
        .update({ 
          application_status: 'withdrawn',
          status: 'withdrawn',
          updated_at: new Date().toISOString()
        })
        .eq('id', application.id)
        .select();

      console.log('🗑️ Delete result:', { data, error });

      if (error) {
        console.error('Error withdrawing application:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        messageService.error(
          'Withdrawal Failed',
          'Failed to withdraw application. Please try again.'
        );
        return;
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No rows were updated. Application might not exist or already withdrawn.');
        messageService.warning(
          'Application Not Found',
          'Application was not found or was already withdrawn.'
        );
        return;
      }

      // Update local state
      setMyReceivedApplications(prev => prev.filter(app => app.id !== application.id));

      messageService.success(
        'Application Withdrawn',
        'Application has been withdrawn. Startup data is preserved.',
        3000
      );
    } catch (error) {
      console.error('Error withdrawing application:', error);
      messageService.error(
        'Withdrawal Failed',
        'Failed to withdraw application. Please try again.'
      );
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
      
      console.log('🗑️ Attempting to delete startup from portfolio:', {
        startupId,
        facilitatorId,
        table: 'facilitator_startups'
      });
      
      // First check if the relationship exists
      const { data: existingRelationship, error: checkError } = await supabase
        .from('facilitator_startups')
        .select('id, startup_id, facilitator_id, status')
        .eq('startup_id', startupId)
        .eq('facilitator_id', facilitatorId)
        .single();
      
      console.log('🔍 Relationship check:', { existingRelationship, checkError });
      
      if (checkError || !existingRelationship) {
        console.warn('⚠️ Relationship not found before deletion attempt:', { startupId, facilitatorId, checkError });
        messageService.warning(
          'Relationship Not Found',
          'Startup relationship was not found. It may have already been removed or you may not have permission to remove it.'
        );
        return;
      }
      
      console.log('🔍 Relationship found, proceeding with delete:', {
        relationshipId: existingRelationship.id,
        startupId: existingRelationship.startup_id,
        facilitatorId: existingRelationship.facilitator_id,
        status: existingRelationship.status
      });
      
      // Remove from facilitator_startups table (correct table name)
      const { data, error } = await supabase
        .from('facilitator_startups')
        .delete()
        .eq('startup_id', startupId)
        .eq('facilitator_id', facilitatorId)
        .select();

      console.log('🗑️ Delete result:', { data, error });

      if (error) {
        console.error('❌ Error removing startup from portfolio:', error);
        console.error('❌ Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // Check if it's an RLS policy error
        if (error.message.includes('policy') || error.message.includes('permission') || error.message.includes('RLS')) {
          console.error('🔒 RLS Policy Error: User may not have DELETE permission on facilitator_startups table');
          messageService.error(
            'Permission Denied',
            'You may not have permission to remove this startup from your portfolio. Please contact support.'
          );
        } else {
          messageService.error(
            'Removal Failed',
            'Failed to remove startup from portfolio. Please try again.'
          );
        }
        return;
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No rows were deleted. Record might not exist or already deleted.');
        console.warn('⚠️ Delete attempt details:', { startupId, facilitatorId });
        messageService.warning(
          'Startup Not Found',
          'Startup was not found in your portfolio or was already removed. Please refresh the page to see the current data.'
        );
        return;
      }

      // Update local state
      setPortfolioStartups(prev => prev.filter(startup => startup.id !== startupId));

      messageService.success(
        'Startup Removed',
        'Startup removed from portfolio successfully.',
        3000
      );
    } catch (error) {
      console.error('Error removing startup from portfolio:', error);
      messageService.error(
        'Removal Failed',
        'Failed to remove startup from portfolio. Please try again.'
      );
    } finally {
      setIsProcessingAction(false);
    }
  };

  // New functions for startup invitation functionality
  const handleAddStartup = async (startupData: StartupFormData) => {
    if (!facilitatorId || !facilitatorCode) {
      messageService.error(
        'Facilitator Info Missing',
        'Facilitator information not available. Please try again.'
      );
      return;
    }

    try {
      setIsLoadingInvitations(true);
      
      // Add the startup invitation
      const invitation = await startupInvitationService.addStartupInvitation(
        facilitatorId,
        startupData,
        facilitatorCode
      );

      if (invitation) {
        // Update local state
        setStartupInvitations(prev => [invitation, ...prev]);
        
        // Set the startup data for invitation modal
        setSelectedStartupForInvitation(startupData);
        setIsInvitationModalOpen(true);
      } else {
        messageService.error(
          'Addition Failed',
          'Failed to add startup. Please try again.'
        );
      }
    } catch (error) {
      console.error('Error adding startup:', error);
      messageService.error(
        'Addition Failed',
        'Failed to add startup. Please try again.'
      );
    } finally {
      setIsLoadingInvitations(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!selectedStartupForInvitation) return;

    try {
      // Update invitation status to 'sent'
      const invitation = startupInvitations.find(inv => 
        inv.startupName === selectedStartupForInvitation.name &&
        inv.email === selectedStartupForInvitation.email
      );

      if (invitation) {
        await startupInvitationService.updateInvitationStatus(invitation.id, 'sent');
        
        // Update local state
        setStartupInvitations(prev => 
          prev.map(inv => 
            inv.id === invitation.id 
              ? { ...inv, status: 'sent', invitationSentAt: new Date().toISOString() }
              : inv
          )
        );
      }

      setIsInvitationModalOpen(false);
      setSelectedStartupForInvitation(null);
    } catch (error) {
      console.error('Error updating invitation status:', error);
    }
  };

  const loadStartupInvitations = async () => {
    if (!facilitatorId) return;

    try {
      setIsLoadingInvitations(true);
      const invitations = await startupInvitationService.getFacilitatorInvitations(facilitatorId);
      setStartupInvitations(invitations);
    } catch (error) {
      console.error('Error loading startup invitations:', error);
    } finally {
      setIsLoadingInvitations(false);
    }
  };

  const handleEditStartup = (startup: StartupInvitation) => {
    setSelectedStartupForEdit(startup);
    setIsEditStartupModalOpen(true);
  };

  const handleSaveStartupEdit = async (updatedData: {
    startupName: string;
    contactPerson: string;
    email: string;
    phone: string;
  }) => {
    if (!selectedStartupForEdit) return;

    try {
      const updatedInvitation = await startupInvitationService.updateInvitation(
        selectedStartupForEdit.id,
        updatedData
      );

      if (updatedInvitation) {
        // Update local state
        setStartupInvitations(prev => 
          prev.map(inv => 
            inv.id === selectedStartupForEdit.id 
              ? updatedInvitation
              : inv
          )
        );
        console.log('✅ Startup information updated successfully');
      } else {
        throw new Error('Failed to update startup information');
      }
    } catch (error) {
      console.error('Error updating startup:', error);
      throw error;
    }
  };

  const handleDeleteRecognitionRecord = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this recognition record?')) {
      return;
    }

    try {
      setIsProcessingAction(true);
      
      console.log('🗑️ Attempting to delete recognition record:', {
        recordId,
        table: 'recognition_records'
      });
      
      // Delete from recognition_records table
      // Convert string recordId to integer (database expects integer)
      const idValue = parseInt(recordId, 10);
      
      if (isNaN(idValue)) {
        console.error('❌ Invalid recordId:', recordId);
        messageService.error(
          'Invalid Record ID',
          'Invalid record ID. Please refresh the page and try again.'
        );
        return;
      }
      
      console.log('🗑️ Delete attempt:', { recordId, idValue });
      
      // First check if the record exists
      const { data: existingRecord, error: checkError } = await supabase
        .from('recognition_records')
        .select('id')
        .eq('id', idValue)
        .single();
      
      if (checkError || !existingRecord) {
        console.warn('⚠️ Record not found before deletion attempt:', { recordId, idValue, checkError });
        messageService.warning(
          'Record Not Found',
          'Recognition record was not found. It may have already been deleted or you may not have permission to delete it.'
        );
        return;
      }
      
      const { data, error } = await supabase
        .from('recognition_records')
        .delete()
        .eq('id', idValue)
        .select();

      console.log('🗑️ Delete result:', { data, error });

      if (error) {
        console.error('Error deleting recognition record:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        messageService.error(
          'Deletion Failed',
          'Failed to delete recognition record. Please try again.'
        );
        return;
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No rows were deleted. Record might not exist or already deleted.');
        console.warn('⚠️ Delete attempt details:', { recordId, idValue });
        messageService.warning(
          'Record Not Found',
          'Recognition record was not found or was already deleted. Please refresh the page to see the current data.'
        );
        return;
      }

      // Update local state
      setRecognitionRecords(prev => prev.filter(record => record.id !== recordId));

      messageService.success(
        'Record Deleted',
        'Recognition record deleted successfully.',
        3000
      );
    } catch (error) {
      console.error('Error deleting recognition record:', error);
      messageService.error(
        'Deletion Failed',
        'Failed to delete recognition record. Please try again.'
      );
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleAgreementFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        messageService.warning(
          'Invalid File Type',
          'Please upload a PDF file for the agreement.'
        );
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        messageService.warning(
          'File Too Large',
          'File size must be less than 10MB.'
        );
        return;
      }
      setAgreementFile(file);
    }
  };

  const handleAcceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplication || !agreementFile) {
      messageService.warning(
        'File Required',
        'Please upload an agreement PDF.'
      );
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
          diligence_status: 'none',
          is_shortlisted: true
        })
        .eq('id', selectedApplication.id);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw new Error(`Failed to update application: ${updateError.message}`);
      }

      // Update local state
      setMyReceivedApplications(prev => prev.map(app => 
        app.id === selectedApplication.id 
          ? { ...app, status: 'accepted', agreementUrl: urlData.publicUrl, diligenceStatus: 'none', isShortlisted: true }
          : app
      ));

      setShortlistedApplications(prev => {
        const next = new Set(prev);
        next.add(selectedApplication.id);
        return next;
      });

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
      messageService.error(
        'Acceptance Failed',
        'Failed to accept application. Please try again.'
      );
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
      messageService.error(
        'Diligence Request Failed',
        'Failed to request diligence. Please try again.'
      );
    } finally {
      setIsProcessingAction(false);
    }
  };



  const handleApproveRecognition = async (recordId: string) => {
    if (!facilitatorId) {
      messageService.error(
        'Facilitator ID Missing',
        'Facilitator ID not found. Please refresh the page.'
      );
      return;
    }

    try {
      setProcessingRecognitionId(recordId);
      
              // Find the record to get startup ID
        const record = recognitionRecords.find(r => r.id === recordId);
        if (!record) {
          messageService.warning(
            'Record Not Found',
            'Record not found. Please try again.'
          );
          return;
        }
        
                // Validate data types
        if (typeof record.startupId !== 'number') {
          console.error('❌ Invalid startup ID type:', typeof record.startupId, record.startupId);
          messageService.error(
            'Invalid Data',
            'Invalid startup data. Please try again.'
          );
          return;
        }
        
      // Convert string ID to number for database operations
      const dbId = parseInt(recordId);
      if (isNaN(dbId)) {
        console.error('❌ Invalid record ID format:', recordId);
        messageService.error(
          'Invalid Record ID',
          'Invalid record ID. Please try again.'
        );
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
          .single()
      ]);

      // Check validation results
      const [recordCheck, startupCheck] = validationChecks;
      
      if (recordCheck.status === 'rejected' || !recordCheck.value.data) {
        console.error('❌ Recognition record not found in database:', recordCheck.status === 'rejected' ? recordCheck.reason : 'No data');
        messageService.warning(
          'Record Not Found',
          'Recognition record not found. Please try again.'
        );
            return;
          }
          
      if (startupCheck.status === 'rejected' || !startupCheck.value.data) {
        console.error('❌ Startup not found in database:', startupCheck.status === 'rejected' ? startupCheck.reason : 'No data');
        messageService.warning(
          'Startup Not Found',
          'Startup not found. Please try again.'
        );
          return;
        }
        
      // Update the recognition request status in the database
        const { error: updateError } = await supabase
          .from('recognition_records')
          .update({ 
            status: 'approved'
          })
          .eq('id', dbId);
        
        if (updateError) {
          console.error('Error updating recognition request status:', updateError);
          messageService.error(
            'Approval Failed',
            'Failed to approve recognition. Please try again.'
          );
          return;
        }
        
        // Add startup to facilitator's portfolio WITH program name to sync with Intake Management
        const portfolioEntry = await facilitatorStartupService.addStartupToPortfolioWithProgram(
        facilitatorId,
          record.startupId,
        dbId,
        record.programName // Pass program name to link with opportunity_applications
        );
        
        if (portfolioEntry) {
          // Update the recognition record status locally
          setRecognitionRecords(prev => {
            const updated = prev.map(r => 
              r.id === recordId 
                ? { ...r, status: 'approved' }
                : r
            );
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
          messageService.error(
            'Portfolio Addition Failed',
            'Failed to add startup to portfolio. Please try again.'
          );
        }
    } catch (err) {
      console.error('Error approving recognition:', err);
      messageService.error(
        'Approval Failed',
        'Failed to approve recognition. Please try again.'
      );
    } finally {
      setProcessingRecognitionId(null);
    }
  };



  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        messageService.warning(
          'Invalid Image Type',
          'Please upload an image file (JPEG, PNG, GIF, WebP, SVG).'
        );
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        messageService.warning(
          'File Too Large',
          'File size must be less than 5MB.'
        );
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
      messageService.error(
        'Account Not Found',
        'Unable to find facilitator account. Please re-login.'
      );
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
        whatsapp_link: newOpportunity.whatsappLink || null,
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
          whatsappLink: data.whatsapp_link || undefined,
          facilitatorId: data.facilitator_id,
          createdAt: data.created_at
        };
        setMyPostedOpportunities(prev => prev.map((op, i) => i === editingIndex ? updated : op));
        
        // Update questions for existing opportunity
        if (selectedQuestionIds.length > 0) {
          // Remove all existing questions
          const existingQuestions = await questionBankService.getOpportunityQuestions(updated.id);
          for (const q of existingQuestions) {
            await questionBankService.removeQuestionFromOpportunity(updated.id, q.questionId);
          }
          // Add new questions with required status
          await questionBankService.addQuestionsToOpportunity(updated.id, selectedQuestionIds, questionRequiredMap, questionSelectionTypeMap);
        }
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
          whatsappLink: data.whatsapp_link || undefined,
          facilitatorId: data.facilitator_id,
          createdAt: data.created_at
        };
        setMyPostedOpportunities(prev => [inserted, ...prev]);
        
        // Add questions for new opportunity with required status
        if (selectedQuestionIds.length > 0) {
          await questionBankService.addQuestionsToOpportunity(inserted.id, selectedQuestionIds, questionRequiredMap, questionSelectionTypeMap);
        }
      }

      setIsPostModalOpen(false);
      setPosterPreview('');
      setNewOpportunity(initialNewOppState);
      setSelectedQuestionIds([]);
      setQuestionRequiredMap(new Map());
      setQuestionSelectionTypeMap(new Map());
    } catch (err) {
      console.error('Failed to save opportunity:', err);
      messageService.error(
        'Save Failed',
        'Failed to save opportunity. Please try again.'
      );
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'intakeManagement':
        // Get applications for the selected opportunity or all applications
        const filteredApplications = selectedOpportunityId 
          ? myReceivedApplications.filter(app => app.opportunityId === selectedOpportunityId)
          : myReceivedApplications;

  return (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SummaryCard title="Opportunities Posted" value={myPostedOpportunities.length} icon={<Gift className="h-6 w-6 text-brand-primary" />} />
              <SummaryCard title="Applications Received" value={myReceivedApplications.length} icon={<FileText className="h-6 w-6 text-brand-primary" />} />
      </div>

            {/* View Mode Tabs with Form 2 Buttons */}
            <div className="flex justify-between items-center border-b border-slate-200 mb-4">
              <div className="flex">
                <button
                  onClick={() => setIntakeViewMode('program')}
                  className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                    intakeViewMode === 'program'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  Portfolio
                </button>
                <button
                  onClick={() => setIntakeViewMode('crm')}
                  className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                    intakeViewMode === 'crm'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  CRM
                </button>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openEmailDraftsModal}
                  className="flex items-center gap-1"
                >
                  <Mail className="h-4 w-4" />
                  Email Drafts
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (selectedOpportunityId) {
                      handleOpenForm2ConfigModal(selectedOpportunityId);
                    } else {
                      messageService.info('Select Opportunity', 'Please select an opportunity first to configure Form 2 questions');
                    }
                  }}
                  className="flex items-center gap-1"
                >
                  <PlusCircle className="h-4 w-4" />
                  Configure Form 2
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    if (selectedOpportunityId) {
                      handleSendForm2ToShortlisted(selectedOpportunityId);
                    } else {
                      messageService.info('Select Opportunity', 'Please select an opportunity first to send Form 2');
                    }
                  }}
                  className="flex items-center gap-1"
                >
                  <Send className="h-4 w-4" />
                  Send Form 2
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!selectedOpportunityId) {
                      messageService.info('Select Opportunity', 'Please select an opportunity first to generate report');
                      return;
                    }
                    if (filteredApplications.length === 0) {
                      messageService.warning('No Applications', 'There are no applications to export for this program.');
                      return;
                    }
                    try {
                      const selectedOpportunity = myPostedOpportunities.find(opp => opp.id === selectedOpportunityId);
                      if (selectedOpportunity) {
                        const { generateAndDownloadReport } = await import('../lib/opportunityReportService');
                        await generateAndDownloadReport(selectedOpportunityId, selectedOpportunity.programName, facilitatorId);
                        messageService.success('Report Generated', `Report downloaded successfully for ${selectedOpportunity.programName}.`, 2500);
                      }
                    } catch (error) {
                      console.error('Error generating report:', error);
                      messageService.error('Report Generation Failed', 'Failed to generate report. Please try again.', 2500);
                    }
                  }}
                  className="flex items-center gap-1"
                >
                  <Download className="h-4 w-4" />
                  Generate Report
                </Button>
              </div>
            </div>

            {/* Portfolio View (Table) */}
            {intakeViewMode === 'program' && (
            <Card>
              <h3 className="text-lg font-semibold mb-4 text-slate-700">Applications by Opportunity</h3>
              
              {/* Opportunity Tabs */}
              <div className="border-b border-slate-200 mb-6">
                <nav className="-mb-px flex flex-wrap gap-2" aria-label="Opportunity Tabs">
                  <button 
                    onClick={() => setSelectedOpportunityId(null)} 
                    className={`${selectedOpportunityId === null ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                  >
                    <FileText className="h-4 w-4" />
                    All Applications ({myReceivedApplications.length})
                  </button>
                  {myPostedOpportunities.map(opportunity => {
                    const appCount = myReceivedApplications.filter(app => app.opportunityId === opportunity.id).length;
                    return (
                      <button 
                        key={opportunity.id}
                        onClick={() => setSelectedOpportunityId(opportunity.id)} 
                        className={`${selectedOpportunityId === opportunity.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                      >
                        <Gift className="h-4 w-4" />
                        {opportunity.programName} ({appCount})
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Applications Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full divide-y divide-slate-200">
                      <thead className="bg-gradient-to-r from-slate-50 to-slate-100 sticky top-0">
                        <tr>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-slate-700">Startup</th>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-slate-700">Opportunity</th>
                          <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700">Pitch Materials</th>
                          <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700">Status</th>
                          {intakeViewMode === 'crm' && (
                            <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700">CRM Status</th>
                          )}
                          <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                    {filteredApplications.map(app => (
                          <tr 
                            key={app.id} 
                            className={`hover:bg-slate-50 transition-colors ${
                              shortlistedApplications.has(app.id) ? 'bg-yellow-50' : ''
                            }`}
                          >
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                {shortlistedApplications.has(app.id) && (
                                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                )}
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{app.startupName}</p>
                                  {app.sector && (
                                    <p className="text-xs text-slate-500 mt-0.5">{app.sector}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <p className="text-sm text-slate-700 font-medium">{myPostedOpportunities.find(o => o.id === app.opportunityId)?.programName || '—'}</p>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex justify-center items-center gap-2 flex-wrap">
                                {app.pitchDeckUrl && (
                                  <Button 
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewPitchDeck(app.pitchDeckUrl!)}
                                    className="flex items-center gap-1.5 hover:bg-slate-100"
                                    title="View Pitch Deck"
                                  >
                                    <FileText className="h-4 w-4" />
                                    <span>Pitch Deck</span>
                                  </Button>
                                )}
                                {app.pitchVideoUrl && (
                                  <Button 
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewPitchVideo(app.pitchVideoUrl!)}
                                    className="flex items-center gap-1.5 hover:bg-slate-100"
                                    title="View Pitch Video"
                                  >
                                    <Film className="h-4 w-4" />
                                    <span>Pitch Video</span>
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewApplicationResponses(app)}
                                  className="flex items-center gap-1.5 hover:bg-slate-100"
                                  title="View Application Responses"
                                >
                                  <FileQuestion className="h-4 w-4" />
                                  <span>Responses</span>
                                </Button>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex justify-center">
                                {app.status === 'pending' && (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                    Pending
                                  </span>
                                )}
                                {app.status === 'accepted' && (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                    Approved
                                  </span>
                                )}
                                {app.status === 'rejected' && (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                    Rejected
                                  </span>
                                )}
                              </div>
                            </td>
                            {intakeViewMode === 'crm' && (
                              <td className="px-4 py-4">
                                <div className="flex justify-center">
                                  <select
                                    value={crmStatusMap.get(app.id) || 'pending'}
                                    onChange={async (e) => {
                                      try {
                                        await intakeCRMService.setApplicationStatus(
                                          app.id,
                                          e.target.value
                                        );
                                        const newMap = new Map(crmStatusMap);
                                        newMap.set(app.id, e.target.value);
                                        setCrmStatusMap(newMap);
                                        toast.success('CRM status updated');
                                      } catch (error) {
                                        console.error('Failed to update CRM status:', error);
                                        toast.error('Failed to update status');
                                      }
                                    }}
                                    className="text-xs px-2 py-1 border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="under_review">Under Review</option>
                                    <option value="needs_info">Needs More Info</option>
                                    <option value="interview_scheduled">Interview Scheduled</option>
                                    <option value="waitlisted">Waitlisted</option>
                                    <option value="second_round">Second Round</option>
                                    <option value="final_review">Final Review</option>
                                  </select>
                                </div>
                              </td>
                            )}
                            <td className="px-4 py-4">
                              <div className="flex justify-center items-center gap-2 flex-wrap">
                                {/* Status Actions - All in one line */}
                              {app.status === 'pending' && (
                                  <>
                                <Button
                                  size="sm"
                                  variant={shortlistedApplications.has(app.id) ? 'default' : 'outline'}
                                  onClick={() => handleShortlistApplication(app)}
                                  disabled={isProcessingAction}
                                  className={`flex items-center gap-1 ${
                                    shortlistedApplications.has(app.id)
                                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500'
                                      : 'text-yellow-600 border-yellow-600 hover:bg-yellow-50'
                                  }`}
                                  title={shortlistedApplications.has(app.id) ? 'Remove from shortlist' : 'Add to shortlist'}
                                >
                                  <Star className={`h-3.5 w-3.5 ${
                                    shortlistedApplications.has(app.id) ? 'fill-white' : ''
                                  }`} />
                                  {shortlistedApplications.has(app.id) ? 'Shortlisted' : 'Shortlist'}
                                </Button>
                                <Button 
                                  size="sm" 
                                  onClick={() => handleAcceptApplication(app)}
                                  disabled={isProcessingAction}
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                      Approve
                                </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleRejectApplication(app)}
                                      disabled={isProcessingAction}
                                      className="text-red-600 border-red-600 hover:bg-red-50"
                                    >
                                      Reject
                                    </Button>
                                {/* Diligence Actions */}
                                    {(app.diligenceStatus === 'none' || app.diligenceStatus == null) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRequestDiligence(app)}
                                  disabled={isProcessingAction}
                                >
                                  Request Diligence
                                </Button>
                              )}
                              {app.diligenceStatus === 'requested' && (
                                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                        Diligence Pending
                                </span>
                                    )}
                                  </>
                              )}
                              {app.diligenceStatus === 'approved' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                    onClick={async () => {
                                      const startupObj = await buildStartupForView({
                                        id: app.startupId,
                                        name: app.startupName,
                                        sector: app.sector || 'Unknown',
                                        investmentType: 'equity' as any,
                                        investmentValue: 0,
                                        equityAllocation: 0,
                                        currentValuation: 0,
                                        totalFunding: 0,
                                        totalRevenue: 0,
                                        registrationDate: new Date().toISOString().split('T')[0],
                                        complianceStatus: ComplianceStatus.Pending,
                                        founders: []
                                      });
                                      onViewStartup(startupObj);
                                    }}
                                >
                                  View Startup
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  handleOpenEmailDraftSelect(app);
                                }}
                                disabled={!app.founderEmail}
                                className="flex items-center gap-1.5 hover:bg-blue-50 text-blue-600 border-blue-600"
                                title={app.founderEmail ? `Email ${app.founderEmail}` : 'Email not available'}
                              >
                                <Mail className="h-4 w-4" />
                                <span>Email</span>
                              </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    {filteredApplications.length === 0 && (
                      <tr>
                        <td colSpan={intakeViewMode === 'crm' ? 6 : 5} className="text-center py-12">
                          <div className="flex flex-col items-center">
                            <FileText className="h-12 w-12 text-slate-300 mb-3" />
                            <p className="text-slate-500 font-medium">
                          {selectedOpportunityId 
                            ? `No applications received for ${myPostedOpportunities.find(o => o.id === selectedOpportunityId)?.programName || 'this opportunity'} yet.`
                            : 'No applications received yet.'
                          }
                            </p>
                          </div>
                        </td>
                      </tr>
                        )}
                      </tbody>
                    </table>
        </div>
      </Card>
            )}

            {/* CRM View (Kanban Board) */}
            {intakeViewMode === 'crm' && (
              <Card className="p-6">
                <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
                  <h3 className="text-lg font-semibold text-slate-700">Applications CRM</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Program</span>
                    <select
                      value={selectedOpportunityId || ''}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setSelectedOpportunityId(nextValue || null);
                      }}
                      className="text-sm px-2 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                      aria-label="Select program for CRM view"
                    >
                      <option value="">All Programs</option>
                      {myPostedOpportunities.map(opportunity => (
                        <option key={opportunity.id} value={opportunity.id}>
                          {opportunity.programName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <IntakeCRMBoard
                  facilitatorId={facilitatorId}
                  opportunityId={selectedOpportunityId || ''}
                  applications={filteredApplications}
                  onColumnsUpdate={() => {
                    // Refresh if needed
                  }}
                />
              </Card>
            )}
          </div>
        );
      case 'trackMyStartups':
        // Filter accepted applications only
        const acceptedApplications = myReceivedApplications.filter(app => app.status === 'accepted');
        
        // Get filtered applications based on viewByFilter and selected sub-tab
        let filteredAcceptedApps: ReceivedApplication[];
        if (viewByFilter === 'program') {
          filteredAcceptedApps = selectedOpportunityId
            ? acceptedApplications.filter(app => app.opportunityId === selectedOpportunityId)
            : acceptedApplications;
        } else if (viewByFilter === 'stage') {
          filteredAcceptedApps = acceptedApplications.filter(app =>
            (app.stage || '').toLowerCase() === selectedStageTab.toLowerCase()
          );
        } else if (viewByFilter === 'funding-stage') {
          filteredAcceptedApps = acceptedApplications.filter(app =>
            (app.fundingStage || '').toLowerCase() === selectedFundingStageTab.toLowerCase().replace(/\s+/g, '-')
          );
        } else if (viewByFilter === 'timeline') {
          filteredAcceptedApps = acceptedApplications.filter(app =>
            (appTimelines[app.id] || '') === selectedTimelineTab
          );
        } else {
          // status: filter by facilitator-set startup_status
          filteredAcceptedApps = acceptedApplications.filter(app =>
            (appStatuses[app.id] || '') === selectedStatusTab
          );
        }

        return (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <SummaryCard title="My Startups" value={acceptedApplications.length} icon={<Users className="h-6 w-6 text-brand-primary" />} />
              <SummaryCard title="Active Programs" value={myPostedOpportunities.filter(opp => acceptedApplications.some(app => app.opportunityId === opp.id)).length} icon={<CheckCircle className="h-6 w-6 text-brand-primary" />} />
              <SummaryCard title="Total Programs" value={myPostedOpportunities.length} icon={<Gift className="h-6 w-6 text-brand-primary" />} />
            </div>

            {/* Sub-tabs for Portfolio and Reports */}
            <div className="border-b border-slate-200">
              <nav className="-mb-px flex flex-wrap gap-2" aria-label="Track My Startups Tabs">
                <button
                  onClick={() => setTrackMyStartupsSubTab('portfolio')}
                  className={`${
                    trackMyStartupsSubTab === 'portfolio'
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  } py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  Portfolio
                </button>
                <button
                  onClick={() => setTrackMyStartupsSubTab('reports')}
                  className={`${
                    trackMyStartupsSubTab === 'reports'
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  } py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  Reports
                </button>
              </nav>
            </div>

            {/* Portfolio Sub-Tab Content */}
            {trackMyStartupsSubTab === 'portfolio' && (
              <Card>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-slate-700">Accepted Startups</h3>
                  {viewByFilter === 'program' && selectedOpportunityId && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={openEmailDraftsModal}
                        className="flex items-center gap-1"
                      >
                        <Mail className="h-4 w-4" />
                        Email Drafts
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          const selectedOpportunity = myPostedOpportunities.find(opp => opp.id === selectedOpportunityId);
                          if (selectedOpportunity) {
                            openProgramQuestionsConfig(selectedOpportunity.programName);
                          }
                        }}
                        className="flex items-center gap-1"
                      >
                        <Settings className="h-4 w-4" />
                        Configure Questions
                      </Button>
                    </div>
                  )}
                </div>

                {/* View By Pill Filter */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {([
                    { value: 'program', label: 'By Program' },
                    { value: 'stage', label: 'By Stage' },
                    { value: 'funding-stage', label: 'By Funding Stage' },
                    { value: 'timeline', label: 'By Timeline' },
                    { value: 'status', label: 'By Status' },
                  ] as const).map(opt => (
                      <button
                      key={opt.value}
                      onClick={() => setViewByFilter(opt.value)}
                      className={viewByFilter === opt.value
                        ? 'bg-blue-600 text-white rounded-full px-4 py-1.5 text-sm font-medium'
                        : 'border border-blue-600 text-blue-600 rounded-full px-4 py-1.5 text-sm'}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Dynamic Sub-Tabs */}
                {viewByFilter === 'program' && (
                    <div className="border-b border-slate-200 mb-6">
                    <nav className="-mb-px flex flex-wrap gap-2" aria-label="Program Tabs">
                      <button
                        onClick={() => setSelectedOpportunityId(null)}
                        className={`${selectedOpportunityId === null ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                      >
                        All Startups ({acceptedApplications.length})
                      </button>
                      {myPostedOpportunities.map(opportunity => {
                        const acceptedCount = acceptedApplications.filter(app => app.opportunityId === opportunity.id).length;
                        if (acceptedCount === 0) return null;
                        return (
                          <button
                            key={opportunity.id}
                            onClick={() => setSelectedOpportunityId(opportunity.id)}
                            className={`${selectedOpportunityId === opportunity.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                          >
                            {opportunity.programName} ({acceptedCount})
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                )}

                {viewByFilter === 'stage' && (
                          <div className="border-b border-slate-200 mb-6">
                    <nav className="-mb-px flex flex-wrap gap-2" aria-label="Stage Tabs">
                      {(['Pre-Incubation', 'Incubation', 'Acceleration'] as const).map(stage => (
                        <button
                          key={stage}
                          onClick={() => setSelectedStageTab(stage)}
                          className={`${selectedStageTab === stage ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                        >
                          {stage}
                        </button>
                      ))}
                    </nav>
                  </div>
                )}

                {viewByFilter === 'funding-stage' && (
                  <div className="border-b border-slate-200 mb-6">
                    <nav className="-mb-px flex flex-wrap gap-2" aria-label="Funding Stage Tabs">
                      {(['Pre-Seed', 'Seed', 'Series A'] as const).map(fs => (
                        <button
                          key={fs}
                          onClick={() => setSelectedFundingStageTab(fs)}
                          className={`${selectedFundingStageTab === fs ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                        >
                          {fs}
                        </button>
                      ))}
                    </nav>
                  </div>
                )}

                {viewByFilter === 'timeline' && (
                  <div className="border-b border-slate-200 mb-6">
                    <nav className="-mb-px flex flex-wrap gap-2" aria-label="Timeline Tabs">
                      {(['2024', '2025', '2026'] as const).map(year => (
                        <button
                          key={year}
                          onClick={() => setSelectedTimelineTab(year)}
                          className={`${selectedTimelineTab === year ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                        >
                          {year}
                        </button>
                      ))}
                    </nav>
                  </div>
                )}

                {viewByFilter === 'status' && (
                  <div className="border-b border-slate-200 mb-6">
                    <nav className="-mb-px flex flex-wrap gap-2" aria-label="Status Tabs">
                      {(['active', 'graduated'] as const).map(st => (
                        <button
                          key={st}
                          onClick={() => setSelectedStatusTab(st)}
                          className={`${selectedStatusTab === st ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none capitalize`}
                        >
                          {st}
                        </button>
                      ))}
                    </nav>
                  </div>
                )}

                {/* Accepted Startups Table */}
                <div className="overflow-x-auto">
                  {filteredAcceptedApps.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 text-lg font-medium mb-2">
                        {viewByFilter === 'program' ? 'No accepted startups yet' : 'No startups in this category'}
                      </p>
                      <p className="text-slate-400 text-sm">
                        {viewByFilter === 'program'
                          ? (selectedOpportunityId ? 'No startups have been accepted for this program yet.' : 'Accept startups from the Intake Management tab to track them here.')
                          : 'No startups match this filter. Try a different selection.'}
                      </p>
                    </div>
                  ) : (
                    <table className="w-full divide-y divide-slate-200">
                      <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                        <tr>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-slate-700">Startup</th>
                          <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700">Contact</th>
                          <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700">Agreement</th>
                          <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700">Responses</th>
                          <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700">Timeline</th>
                          <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700">Status</th>
                          <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {filteredAcceptedApps.map(app => {
                          const opportunity = myPostedOpportunities.find(opp => opp.id === app.opportunityId);
                          const signedAgreementUrl = recognitionRecords.find(record =>
                            record.startupId === app.startupId &&
                            record.programName === opportunity?.programName &&
                            record.signedAgreementUrl
                          )?.signedAgreementUrl;
                          const agreementUrl = signedAgreementUrl || app.agreementUrl;
                          return (
                            <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div>
                                    <div className="text-sm font-medium text-slate-900">{app.startupName}</div>
                                    <div className="text-xs text-slate-500">{app.sector || 'Sector not specified'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className="text-sm text-slate-700">{app.founderEmail || 'N/A'}</div>
                                {app.founderPhone && (
                                  <div className="text-xs text-slate-500">{app.founderPhone}</div>
                                )}
                              </td>
                              <td className="px-4 py-4 text-center">
                                {agreementUrl ? (
                                  <a
                                    href={agreementUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
                                    title="View Agreement"
                                  >
                                    <FileText className="h-4 w-4" />
                                    View Agreement
                                  </a>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-md">
                                    <FileText className="h-4 w-4" />
                                    No Agreement
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className="flex items-center justify-center gap-2 flex-wrap">
                                  {app.pitchDeckUrl && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleViewPitchDeck(app.pitchDeckUrl!)}
                                      className="flex items-center gap-1.5 hover:bg-slate-100"
                                      title="View Pitch Deck"
                                    >
                                      <FileText className="h-4 w-4" />
                                      <span>Pitch Deck</span>
                                    </Button>
                                  )}
                                  {app.pitchVideoUrl && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleViewPitchVideo(app.pitchVideoUrl!)}
                                      className="flex items-center gap-1.5 hover:bg-slate-100"
                                      title="View Pitch Video"
                                    >
                                      <Film className="h-4 w-4" />
                                      <span>Pitch Video</span>
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewApplicationResponses(app)}
                                    className="flex items-center gap-1.5 hover:bg-blue-50 text-blue-600 border-blue-600"
                                    title="View Application Responses"
                                  >
                                    <FileQuestion className="h-4 w-4" />
                                    <span>View Responses</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedApplicationForMessaging(app);
                                      setIsMessagingModalOpen(true);
                                    }}
                                    className="flex items-center gap-1.5 text-slate-600 border-slate-300 hover:bg-slate-50"
                                    title={`Send update to ${app.startupName}`}
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                    <span>Send Update</span>
                                  </Button>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <select
                                  value={appTimelines[app.id] || ''}
                                  onChange={e => handleSetTimeline(app.id, e.target.value)}
                                  className="text-xs border border-slate-300 rounded-md px-2 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  <option value="">— Year —</option>
                                  <option value="2024">2024</option>
                                  <option value="2025">2025</option>
                                  <option value="2026">2026</option>
                                </select>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <select
                                  value={appStatuses[app.id] || ''}
                                  onChange={e => handleSetStatus(app.id, e.target.value)}
                                  className="text-xs border border-slate-300 rounded-md px-2 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  <option value="">— Status —</option>
                                  <option value="active">Active</option>
                                  <option value="graduated">Graduated</option>
                                </select>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex justify-center items-center gap-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      // Open portfolio view for this startup
                                      const startupId = app.startupId;
                                      if (startupId) {
                                        // Find startup in portfolio
                                        const startup = myPortfolio.find(s => s.id === startupId);
                                        if (startup) {
                                          buildStartupForView({
                                            id: startup.id,
                                            name: startup.name,
                                            sector: startup.sector,
                                            investmentType: 'equity' as any,
                                            investmentValue: startup.totalFunding || 0,
                                            equityAllocation: 0,
                                            currentValuation: startup.totalFunding || 0,
                                            totalFunding: startup.totalFunding || 0,
                                            totalRevenue: startup.totalRevenue || 0,
                                            registrationDate: startup.registrationDate || new Date().toISOString().split('T')[0],
                                            complianceStatus: startup.complianceStatus || ComplianceStatus.Pending,
                                            founders: []
                                          }).then(onViewStartup);
                                        } else {
                                          messageService.info('Startup Not Found', 'This startup is not yet in the portfolio tracking system.');
                                        }
                                      }
                                    }}
                                    className="flex items-center gap-1.5 hover:bg-slate-100"
                                    title="Track this startup"
                                  >
                                    <Eye className="h-4 w-4" />
                                    <span>Track</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      handleOpenEmailDraftSelect(app);
                                    }}
                                    disabled={!app.founderEmail}
                                    className="flex items-center gap-1.5 hover:bg-blue-50 text-blue-600 border-blue-600"
                                    title={app.founderEmail ? `Email ${app.founderEmail}` : 'Email not available'}
                                  >
                                    <Mail className="h-4 w-4" />
                                    <span>Email</span>
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>
            )}

            {/* Reports Sub-Tab Content */}
            {trackMyStartupsSubTab === 'reports' && (
              <div className="space-y-6">
                <Card>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-700">Custom Reports</h3>
                      <p className="text-sm text-slate-500 mt-1">Create and track custom questionnaire reports for your startups</p>
                    </div>
                    <Button
                      onClick={() => setIsCreateReportModalOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Create Report
                    </Button>
                  </div>

                  {/* Reports List */}
                  {reportMandates.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 text-lg font-medium mb-2">No reports created yet</p>
                      <p className="text-slate-400 text-sm mb-4">Create custom questionnaire reports to track startup progress</p>
                      <Button
                        onClick={() => setIsCreateReportModalOpen(true)}
                        variant="outline"
                        className="flex items-center gap-2 mx-auto"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Create Your First Report
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {reportMandates.map(mandate => {
                        const stats = mandateStats[mandate.id] || { submitted: 0, total: 0 };
                        return (
                          <div
                            key={mandate.id}
                            className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                              selectedReportIdForTracking === mandate.id
                                ? 'border-brand-primary bg-brand-primary/5'
                                : 'border-slate-200 hover:border-brand-primary/50'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1 cursor-pointer" onClick={() => setSelectedReportIdForTracking(mandate.id)}>
                                <h4 className="font-semibold text-slate-900 text-sm">{mandate.title}</h4>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {mandate.source === 'existing' ? 'Generated' : 'Active'}
                                </Badge>
                                <button
                                  onClick={() => {
                                    setSelectedMandateForEdit(mandate);
                                    setIsEditMandateModalOpen(true);
                                  }}
                                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                                  title="Edit Mandate"
                                >
                                  <Edit className="h-4 w-4 text-slate-600" />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 mb-3 cursor-pointer hover:text-slate-800" onClick={() => setSelectedReportIdForTracking(mandate.id)}>
                              {mandate.program_name}
                            </p>
                            <div 
                              className="flex items-center justify-between text-xs text-slate-500 cursor-pointer mb-3"
                              onClick={() => setSelectedReportIdForTracking(mandate.id)}
                            >
                              <span>{mandate.question_ids?.length || 0} questions</span>
                              <span className="flex items-center gap-1">
                                <span className="font-medium text-brand-primary">{stats.submitted}</span>
                                /
                                <span>{stats.total}</span>
                                submitted
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedMandateForReport(mandate);
                                setIsGenerateReportModalOpen(true);
                              }}
                              className="w-full px-3 py-2 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 transition-all duration-200"
                            >
                              Generate Report
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                {/* Response Tracking Table */}
                {selectedReportIdForTracking && (
                  <Card>
                    <h3 className="text-lg font-semibold text-slate-700 mb-4">Response Tracking</h3>
                    {(() => {
                      const selectedMandate = reportMandates.find(m => m.id === selectedReportIdForTracking);
                      if (!selectedMandate) return null;
                      
                      const mandateResponseData = mandateResponses[selectedMandate.id] || [];
                      
                      return (
                        <div className="space-y-4">
                          <div className="bg-slate-50 p-4 rounded-lg">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Program</p>
                                <p className="text-sm font-medium text-slate-900">{selectedMandate.program_name}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Questions</p>
                                <p className="text-sm font-medium text-slate-900">{selectedMandate.question_ids?.length || 0}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Target Startups</p>
                                <p className="text-sm font-medium text-slate-900">{selectedMandate.target_startups?.length || 0}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Submitted</p>
                                <p className="text-sm font-medium text-brand-primary">
                                  {mandateStats[selectedMandate.id]?.submitted || 0} / {mandateStats[selectedMandate.id]?.total || 0}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="overflow-x-auto">
                            <table className="w-full divide-y divide-slate-200">
                              <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                                <tr>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Startup Name</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Status</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Responses</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Action</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-slate-200">
                                {selectedMandate.target_startups?.map((startupId: string) => {
                                  const response = mandateResponseData.find(r => r.startup_id === parseInt(startupId));
                                  
                                  // Get only answers for the configured questions in this mandate
                                  const mandateAnswers = selectedMandate.question_ids?.reduce((acc: Record<string, string>, qId: string) => {
                                    if (response?.answers && response.answers[qId]) {
                                      acc[qId] = response.answers[qId];
                                    }
                                    return acc;
                                  }, {}) || {};
                                  
                                  const answeredCount = Object.keys(mandateAnswers).length;
                                  const totalQuestions = selectedMandate.question_ids?.length || 0;
                                  
                                  const handleDownloadResponses = () => {
                                    // Create CSV content
                                    let csvContent = "Question,Answer\n";
                                    selectedMandate.question_ids?.forEach((qId: string) => {
                                      const answer = mandateAnswers[qId] || "";
                                      const questionData = questionBank.get(qId);
                                      const questionText = questionData?.question_text || qId;
                                      // Escape quotes in CSV
                                      const escapedQuestion = `"${questionText.replace(/"/g, '""')}"`;
                                      const escapedAnswer = `"${String(answer).replace(/"/g, '""')}"`;
                                      csvContent += `${escapedQuestion},${escapedAnswer}\n`;
                                    });
                                    
                                    // Create blob and download
                                    const blob = new Blob([csvContent], { type: 'text/csv' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `${response?.startup_name || startupId}_responses.csv`;
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                  };
                                  
                                  return (
                                    <tr key={startupId} className="hover:bg-slate-50">
                                      <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                                        {response?.startup_name || startupId}
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white ${answeredCount === totalQuestions && totalQuestions > 0 ? 'bg-green-600' : 'bg-orange-500'}`}>
                                          {answeredCount}/{totalQuestions}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        {response && Object.keys(mandateAnswers).length > 0 ? (
                                          <button
                                            onClick={() => {
                                              setSelectedStartupResponse(response);
                                              setIsViewMandateResponsesModalOpen(true);
                                            }}
                                            className="inline-block px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                                          >
                                            View
                                          </button>
                                        ) : (
                                          <span className="text-slate-400 italic">—</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        {response && Object.keys(mandateAnswers).length > 0 ? (
                                          <button
                                            onClick={handleDownloadResponses}
                                            className="inline-block px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-md hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                                          >
                                            Download
                                          </button>
                                        ) : (
                                          <span className="text-slate-400 italic">—</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </Card>
                )}
              </div>
            )}
          </div>
        );
      case 'dashboard':
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <SummaryCard title="My Startups" value={myPortfolio.length} icon={<Users className="h-6 w-6 text-brand-primary" />} />
              <SummaryCard title="Opportunities Posted" value={myPostedOpportunities.length} icon={<Gift className="h-6 w-6 text-brand-primary" />} />
              <SummaryCard title="Applications Received" value={myReceivedApplications.length} icon={<FileText className="h-6 w-6 text-brand-primary" />} />
            </div>

            {facilitatorId && myReceivedApplications.some(a => a.status === 'accepted') && (
              <PortfolioHealthCharts
                startups={Array.from(
                  new Map(
                    myReceivedApplications
                      .filter(a => a.status === 'accepted' && a.startupId)
                      .map(a => [a.startupId, { id: a.startupId, name: a.startupName }])
                  ).values()
                )}
                facilitatorId={facilitatorId}
              />
            )}

            <div className="space-y-8">
              {/* Add New Startup Section */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-700">Add New Startup</h3>
                  <Button
                    onClick={() => setIsAddStartupModalOpen(true)}
                    className="bg-brand-primary hover:bg-brand-primary/90"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Startup
                  </Button>
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  Add a new startup to your portfolio and invite them to join TrackMyStartup platform.
                </p>
                
                {/* Facilitator Code Display */}
                {facilitatorCode && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-blue-800">Your Facilitator Code:</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-blue-900 text-lg">{facilitatorCode}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigator.clipboard.writeText(facilitatorCode)}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        Copy Code
                      </Button>
                    </div>
                    <p className="text-sm text-blue-700 mt-2">
                      Share this code with startups when inviting them to join the platform.
                    </p>
                  </div>
                )}
              </Card>

              {/* Portfolio Distribution Chart - moved to top */}
              <PortfolioDistributionChart data={myPortfolio} />

              {/* Added Startups List */}
              <Card>
                <h3 className="text-lg font-semibold mb-4 text-slate-700">Added Startups</h3>
                <div className="overflow-x-auto">
                  {isLoadingInvitations ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-slate-500">Loading startups...</p>
                    </div>
                  ) : startupInvitations.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <p>No startups added yet.</p>
                      <p className="text-sm mt-1">Add your first startup using the form above.</p>
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact Person</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {(showAllStartups ? startupInvitations : startupInvitations.slice(0, 5)).map((startup) => (
                          <tr key={startup.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-slate-900">{startup.startupName}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-slate-900">{startup.contactPerson}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-slate-900">{startup.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedStartupForInvitation({
                                      name: startup.startupName,
                                      contactPerson: startup.contactPerson,
                                      email: startup.email,
                                      phone: startup.phone
                                    });
                                    setIsInvitationModalOpen(true);
                                  }}
                                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                >
                                  <Share2 className="h-4 w-4 mr-1" />
                                  Share
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditStartup(startup)}
                                  className="text-green-600 border-green-600 hover:bg-green-50"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    if (confirm('Are you sure you want to delete this startup invitation?')) {
                                      try {
                                        await startupInvitationService.deleteInvitation(startup.id);
                                        setStartupInvitations(prev => prev.filter(inv => inv.id !== startup.id));
                                      } catch (error) {
                                        console.error('Error deleting invitation:', error);
                                        messageService.error(
                                          'Deletion Failed',
                                          'Failed to delete invitation. Please try again.'
                                        );
                                      }
                                    }
                                  }}
                                  className="text-red-600 border-red-600 hover:bg-red-50"
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
                  
                  {/* Show More Button */}
                  {startupInvitations.length > 5 && (
                    <div className="mt-4 text-center">
                      <Button
                        variant="outline"
                        onClick={() => setShowAllStartups(!showAllStartups)}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        {showAllStartups ? 'Show Less' : `Show More (${startupInvitations.length - 5} more)`}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <div className="space-y-8">
                {/* Recognition & Incubation Requests (Free/Fee) */}
                <Card>
                  <h3 className="text-lg font-semibold mb-4 text-slate-700">Recognition & Incubation Requests</h3>
                  <div className="overflow-x-auto">
                    {isLoadingRecognition ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-slate-500">Loading recognition requests...</p>
                      </div>
                    ) : (() => {
                      // Filter records for Recognition & Incubation Requests (Free/Fees)
                      const freeOrFeeRecords = recognitionRecords.filter(record => 
                        record.feeType === 'Free' || record.feeType === 'Fees'
                      );
                      
                      return freeOrFeeRecords.length === 0 ? (
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
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fee Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Documents</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {(showAllApplications ? freeOrFeeRecords : freeOrFeeRecords.slice(0, 5)).map((record) => (
                            <tr key={record.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900">{record.startup?.name || 'Unknown Startup'}</div>
                                <div className="text-xs text-slate-500">{record.startup?.sector || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{record.programName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    record.feeType === 'Free' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {record.feeType}
                                  </span>
                                </td>
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
                                        className="bg-green-600 hover:bg-green-700 text-white"
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
                      );
                    })()}
                    
                    {/* Show More Button for Recognition Requests */}
                    {(() => {
                      const freeOrFeeRecords = recognitionRecords.filter(record => 
                        record.feeType === 'Free' || record.feeType === 'Fees'
                      );
                      return freeOrFeeRecords.length > 5 && (
                        <div className="mt-4 text-center">
                          <Button
                            variant="outline"
                            onClick={() => setShowAllApplications(!showAllApplications)}
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          >
                            {showAllApplications ? 'Show Less' : `Show More (${freeOrFeeRecords.length - 5} more)`}
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                </Card>

                {/* Investment Requests (Equity/Hybrid) */}
                <Card>
                  <h3 className="text-lg font-semibold mb-4 text-slate-700">Investment Requests</h3>
                  <div className="overflow-x-auto">
                    {isLoadingRecognition ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-slate-500">Loading investment requests...</p>
                      </div>
                    ) : (() => {
                      // Filter records for Investment Requests (Equity/Hybrid)
                      const equityOrHybridRecords = recognitionRecords.filter(record => 
                        record.feeType === 'Equity' || record.feeType === 'Hybrid'
                      );
                      
                      return equityOrHybridRecords.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <p>No investment requests received yet.</p>
                          <p className="text-sm mt-1">Startups seeking equity investment will appear here.</p>
                        </div>
                      ) : (
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup Name</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Program</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fee Type</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Equity/Investment</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Documents</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-200">
                            {equityOrHybridRecords.map((record) => (
                              <tr key={record.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-slate-900">{record.startup?.name || 'Unknown Startup'}</div>
                                  <div className="text-xs text-slate-500">
                                    {(() => {
                                      // Use domain from opportunity_applications if available, otherwise fallback to startup sector
                                      const domainFromApplications = domainStageMap[record.startupId]?.domain;
                                      const sector = domainFromApplications || record.startup?.sector || 'N/A';
                                      console.log('🔍 Debug sector for startup:', record.startup?.name, 'domain from apps:', domainFromApplications, 'startup sector:', record.startup?.sector, 'final sector:', sector);
                                      return sector;
                                    })()}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{record.programName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    record.feeType === 'Equity' 
                                      ? 'bg-purple-100 text-purple-800' 
                                      : 'bg-orange-100 text-orange-800'
                                  }`}>
                                    {record.feeType}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                  {record.equityAllocated ? (
                                    <span className="font-medium text-slate-900">{record.equityAllocated}%</span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
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
                                        className="bg-green-600 hover:bg-green-700 text-white"
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
                      );
                    })()}
                  </div>
                </Card>

                {/* My Programs Section - moved from Intake Management */}
                <Card>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-slate-700">My Programs</h3>
                    <Button size="sm" onClick={handleOpenPostModal}><PlusCircle className="h-4 w-4 mr-1" /> Post</Button>
                  </div>
                  <div className="overflow-x-auto max-h-96">
                    <ul className="divide-y divide-slate-200">
                      {myPostedOpportunities.map((opp, idx) => {
                        const appCount = opportunityApplicationCounts.get(opp.id) || 0;
                        const postedDate = opp.createdAt ? new Date(opp.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
                        const deadlineDate = opp.deadline ? new Date(opp.deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
                        
                        return (
                        <li key={opp.id} className="py-4 flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-semibold text-slate-800 text-base">{opp.programName}</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600">
                          <div>
                                <span className="font-medium text-slate-500">Posted:</span> <span className="text-slate-700">{postedDate}</span>
                              </div>
                              <div>
                                <span className="font-medium text-slate-500">Deadline:</span> <span className="text-slate-700">{deadlineDate}</span>
                              </div>
                              <div>
                                <span className="font-medium text-slate-500">Applications:</span> <span className="font-semibold text-brand-primary">{appCount}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => {
                              try {
                                const url = new URL(window.location.origin);
                                url.searchParams.set('view', 'program');
                                url.searchParams.set('opportunityId', opp.id);
                                const shareUrl = url.toString();
                                const text = `${opp.programName}\nDeadline: ${opp.deadline || '—'}`;
                                if ((navigator as any).share) {
                                  (navigator as any).share({ title: opp.programName, text, url: shareUrl });
                                } else if (navigator.clipboard && navigator.clipboard.writeText) {
                                  navigator.clipboard.writeText(`${text}\n\n${shareUrl}`);
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
                            }} title="Share"><Share2 className="h-4 w-4"/></Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditClick(idx)} title="Edit"><Edit className="h-4 w-4"/></Button>
                            <Button size="sm" variant="outline" onClick={async () => {
                              if (!confirm('Are you sure you want to delete this opportunity? This will also delete all associated applications and questions. This action cannot be undone.')) return;
                              const target = myPostedOpportunities[idx];
                              
                              try {
                                // Delete the opportunity (cascade will handle related records)
                              const { error } = await supabase
                                .from('incubation_opportunities')
                                  .delete()
                                .eq('id', target.id);
                                
                                if (error) {
                                  console.error('Error deleting opportunity:', error);
                                  messageService.error(
                                    'Delete Failed',
                                    error.message || 'Failed to delete opportunity. Please try again.'
                                  );
                                } else {
                                  // Remove from local state
                                setMyPostedOpportunities(prev => prev.filter((_, i) => i !== idx));
                                messageService.success(
                                    'Opportunity Deleted',
                                    'Opportunity and all associated data have been deleted successfully.',
                                    3000
                                  );
                                }
                              } catch (err: any) {
                                console.error('Error deleting opportunity:', err);
                                messageService.error(
                                  'Delete Failed',
                                  err.message || 'An error occurred while deleting the opportunity. Please try again.'
                                );
                              }
                            }} title="Delete">✕</Button>
            </div>
                        </li>
                        );
                      })}
                      {myPostedOpportunities.length === 0 && (
                        <li className="text-center py-6 text-slate-500">No opportunities posted.</li>
                      )}
                    </ul>
        </div>
      </Card>
                  </div>
                </div>
        );
      case 'discover':
        // Prepare list using shuffled pitches to mirror investor experience
        let list = shuffledPitches.length > 0 ? shuffledPitches : activeFundraisingStartups;
        // Apply search
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          list = list.filter(s => s.name.toLowerCase().includes(term) || s.sector.toLowerCase().includes(term));
        }
        // Apply filters
        if (showOnlyValidated) list = list.filter(s => s.complianceStatus === ComplianceStatus.Compliant);
        if (showOnlyFavorites) list = list.filter(s => favoritedPitches.has(s.id));
        if (showOnlyRecommendations) {
          const recommendedStartupIds = new Set(receivedRecommendations.map(rec => rec.startup_id));
          list = list.filter(s => recommendedStartupIds.has(s.id));
        }

        return (
          <div className="animate-fade-in max-w-4xl mx-auto w-full">
            {/* Header with Search and Filters */}
            <div className="mb-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">Discover Pitches</h2>
                <p className="text-sm text-slate-600">Watch startup videos and explore opportunities to incubate</p>
              </div>

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

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-100 gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <button
                      onClick={() => { setShowOnlyValidated(false); setShowOnlyFavorites(false); setShowOnlyRecommendations(false); }}
                      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm ${
                        !showOnlyValidated && !showOnlyFavorites && !showOnlyRecommendations ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-slate-200'
                      }`}
                    >
                      <Film className="h-4 w-4" />
                      <span className="hidden sm:inline">All</span>
                    </button>

                    <button
                      onClick={() => { setShowOnlyValidated(true); setShowOnlyFavorites(false); setShowOnlyRecommendations(false); }}
                      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm ${
                        showOnlyValidated && !showOnlyFavorites && !showOnlyRecommendations ? 'bg-green-600 text-white shadow-green-200' : 'bg-white text-slate-600 hover:bg-green-50 hover:text-green-600 border border-slate-200'
                      }`}
                    >
                      <CheckCircle className={`h-4 w-4 ${showOnlyValidated && !showOnlyFavorites ? 'fill-current' : ''}`} />
                      <span className="hidden sm:inline">Verified</span>
                    </button>

                    <button
                      onClick={() => { setShowOnlyValidated(false); setShowOnlyFavorites(true); setShowOnlyRecommendations(false); }}
                      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm ${
                        showOnlyFavorites ? 'bg-red-600 text-white shadow-red-200' : 'bg-white text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${showOnlyFavorites ? 'fill-current' : ''}`} />
                      <span className="hidden sm:inline">Favorites</span>
                    </button>

                    <button
                      onClick={() => { setShowOnlyValidated(false); setShowOnlyFavorites(false); setShowOnlyRecommendations(true); }}
                      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm ${
                        showOnlyRecommendations ? 'bg-orange-600 text-white shadow-orange-200' : 'bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600 border border-slate-200'
                      }`}
                    >
                      <Star className={`h-4 w-4 ${showOnlyRecommendations ? 'fill-current' : ''}`} />
                      <span className="hidden sm:inline">Recommendations</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs sm:text-sm font-medium">{activeFundraisingStartups.length} active pitches</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-500">
                  <Film className="h-5 w-5" />
                  <span className="text-xs sm:text-sm">Pitch Reels</span>
                </div>
              </div>
            </div>

            {/* Results */}
            {isLoadingPitches ? (
              <Card className="text-center py-20">
                <div className="max-w-sm mx-auto">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">Loading Pitches...</h3>
                  <p className="text-slate-500">Fetching active fundraising startups</p>
                </div>
              </Card>
            ) : list.length === 0 ? (
              <Card className="text-center py-20">
                <div className="max-w-sm mx-auto">
                  <Film className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">
                    {searchTerm.trim() ? 'No Matching Startups' : showOnlyValidated ? 'No Verified Startups' : showOnlyFavorites ? 'No Favorited Pitches' : showOnlyRecommendations ? 'No Recommendations' : 'No Active Fundraising'}
                  </h3>
                  <p className="text-slate-500">
                    {searchTerm.trim() ? 'No startups found matching your search. Try adjusting your search terms or filters.' : showOnlyValidated ? 'No Startup Nation verified startups are currently fundraising. Try removing the verification filter or check back later.' : showOnlyFavorites ? 'Start favoriting pitches to see them here.' : showOnlyRecommendations ? 'No startups have been recommended to you yet. Recommendations from investors or advisors will appear here.' : 'No startups are currently fundraising. Check back later for new opportunities.'}
                  </p>
                </div>
              </Card>
            ) : (
              <div className="space-y-6 sm:space-y-8">
                {list.map(inv => {
                  const videoEmbedInfo = inv.pitchVideoUrl ? getVideoEmbedUrl(inv.pitchVideoUrl, false) : null;
                  const embedUrl = videoEmbedInfo?.embedUrl || null;
                  const videoSource = videoEmbedInfo?.source || null;
                  // Find recommendation info for this startup
                  const recommendation = receivedRecommendations.find(rec => rec.startup_id === inv.id);
                  return (
                    <div key={inv.id} className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 overflow-hidden">
                      <div className="flex flex-col md:flex-row md:items-stretch gap-0">
                        {/* Logo/Video Section - Left Side - Show video first if available, then logo */}
                        <div className="md:w-2/5 lg:w-1/3 relative aspect-[16/9] md:aspect-auto md:min-h-full bg-white">
                          {/* Priority 1: Show video if available */}
                          {embedUrl ? (
                            playingVideoId === inv.id ? (
                              <div className="relative w-full h-full">
                                {videoSource === 'direct' ? (
                                  <video
                                    src={embedUrl}
                                    controls
                                    autoPlay
                                    muted
                                    playsInline
                                    className="absolute top-0 left-0 w-full h-full object-cover"
                                  >
                                    Your browser does not support the video tag.
                                  </video>
                                ) : (
                                  <iframe
                                    src={embedUrl}
                                    title={`Pitch video for ${inv.name}`}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="absolute top-0 left-0 w-full h-full"
                                  ></iframe>
                                )}
                                <button
                                  onClick={() => setPlayingVideoId(null)}
                                  className="absolute top-4 right-4 bg-black/70 text-white rounded-full p-2 hover:bg-black/90 transition-all duration-200 backdrop-blur-sm z-10"
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <div
                                className="relative w-full h-full group cursor-pointer bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
                                onClick={() => setPlayingVideoId(inv.id)}
                              >
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-16 h-16 md:w-20 md:h-20 bg-red-600 rounded-full flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-all duration-300 group-hover:shadow-red-500/50">
                                    <svg className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  </div>
                                </div>
                                <div className="absolute bottom-4 left-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  <p className="text-xs md:text-sm font-medium">Click to play</p>
                                </div>
                              </div>
                            )
                          ) : inv.logoUrl && inv.logoUrl !== '#' && inv.logoUrl.trim() !== '' ? (
                            // Priority 2: Show logo if no video
                            <div className="w-full h-full flex items-center justify-center bg-white p-4 sm:p-6">
                              <img 
                                src={inv.logoUrl} 
                                alt={`${inv.name} Logo`} 
                                className="object-contain w-full h-full max-w-full max-h-full" 
                                onError={(e) => {
                                  // If image fails to load, hide it
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            // Only show placeholder if no logo and no video
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
                              <div className="text-center text-slate-400">
                                <Video className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-2 opacity-50" />
                                <p className="text-xs md:text-sm">No media available</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Content Section - Right Side */}
                        <div className="md:w-3/5 lg:w-2/3 p-4 sm:p-6 flex flex-col">
                          <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2 break-words">{inv.name}</h3>
                              {/* Domain, Round, Stage in one line */}
                              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                                {inv.domain && (
                                  <span>
                                    <span className="font-medium text-slate-700">Domain:</span> {inv.domain}
                                  </span>
                                )}
                                {inv.fundraisingType && (
                                  <>
                                    {inv.domain && <span className="text-slate-300">•</span>}
                                    <span>
                                      <span className="font-medium text-slate-700">Round:</span> {inv.fundraisingType}
                                    </span>
                                  </>
                                )}
                                {inv.stage && (
                                  <>
                                    {(inv.domain || inv.fundraisingType) && <span className="text-slate-300">•</span>}
                                    <span>
                                      <span className="font-medium text-slate-700">Stage:</span> {inv.stage}
                                    </span>
                                  </>
                                )}
                              </div>
                              {/* Recommendation Badge and Sender Info */}
                              {recommendation && (
                                <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <Star className="h-4 w-4 text-orange-600 fill-current" />
                                    <p className="text-sm font-medium text-orange-800">
                                      Recommended by {recommendation.sender_name || 'Unknown'}
                                    </p>
                                  </div>
                                  {recommendation.message && (
                                    <p className="text-xs text-orange-700 mt-1 italic">
                                      "{recommendation.message}"
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {recommendation && (
                                <div className="flex items-center gap-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium shadow-sm">
                                  <Star className="h-3 w-3 fill-current" />
                                  <span className="hidden xs:inline">Recommended</span>
                                </div>
                              )}
                              {inv.isStartupNationValidated && (
                                <div className="flex items-center gap-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium shadow-sm">
                                  <CheckCircle className="h-3 w-3" />
                                  <span className="hidden xs:inline">Verified</span>
                                </div>
                              )}
                              <button
                                onClick={() => handleShare(inv)}
                                className="!rounded-full !p-2 sm:!p-3 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all duration-200 border border-slate-200"
                              >
                                <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
                              </button>
                            </div>
                          </div>

                          {/* Document Buttons Row - First Row */}
                          <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-4">
                            {inv.pitchDeckUrl && inv.pitchDeckUrl !== '#' && (
                              <a href={inv.pitchDeckUrl} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[100px] sm:min-w-[120px]">
                                <button className="w-full hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 border border-slate-200 bg-white text-xs sm:text-sm py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg font-medium">
                                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 inline" /> <span className="hidden xs:inline">View </span>Deck
                                </button>
                              </a>
                            )}

                            {inv.businessPlanUrl && inv.businessPlanUrl !== '#' && (
                              <a href={inv.businessPlanUrl} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[100px] sm:min-w-[140px]">
                                <button className="w-full hover:bg-purple-50 hover:text-purple-600 transition-all duration-200 border border-slate-200 bg-white text-xs sm:text-sm py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg font-medium">
                                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 inline" /> <span className="hidden xs:inline">Business </span>Plan
                                </button>
                              </a>
                            )}

                            {inv.onePagerUrl && inv.onePagerUrl !== '#' && (
                              <a href={inv.onePagerUrl} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[100px] sm:min-w-[120px]">
                                <button className="w-full hover:bg-emerald-50 hover:text-emerald-600 transition-all duration-200 border border-slate-200 bg-white text-xs sm:text-sm py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg font-medium">
                                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 inline" /> One-Pager
                                </button>
                              </a>
                            )}
                          </div>

                          {/* Action Buttons Row - Second Row */}
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2">
                            <button
                              onClick={() => handleFavoriteToggle(inv.id)}
                              className={`!rounded-full !p-1.5 sm:!p-2 transition-all duration-200 ${
                                favoritedPitches.has(inv.id)
                                  ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg shadow-red-200'
                                  : 'hover:bg-red-50 hover:text-red-600 border border-slate-200 bg-white'
                              }`}
                            >
                              <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${favoritedPitches.has(inv.id) ? 'fill-current' : ''}`} />
                            </button>
                          </div>

                          {/* Investment Details Footer */}
                          <div className="mt-auto pt-4 border-t border-slate-200">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                              <div className="flex items-center gap-4 flex-wrap">
                                <div className="text-sm sm:text-base">
                                  <span className="font-semibold text-slate-800">Ask:</span> {(() => {
                                    const ccy = (inv as any).currency || (inv as any).startup?.currency || (currentUser?.country ? resolveCurrency(currentUser.country) : 'USD');
                                    const sym = getCurrencySymbol(ccy);
                                    return `${sym}${inv.investmentValue.toLocaleString()}`;
                                  })()} for <span className="font-semibold text-purple-600">{inv.equityAllocation}%</span> equity
                                </div>
                                {(inv.websiteUrl || inv.linkedInUrl) && (
                                  <div className="flex items-center gap-4">
                                    {inv.websiteUrl && inv.websiteUrl !== '#' && (
                                      <a 
                                        href={inv.websiteUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors"
                                        title={inv.websiteUrl}
                                      >
                                        <Globe className="h-4 w-4" />
                                        <span className="truncate max-w-[200px]">Website</span>
                                        <ExternalLink className="h-3 w-3 opacity-50" />
                                      </a>
                                    )}
                                    {inv.linkedInUrl && inv.linkedInUrl !== '#' && (
                                      <a 
                                        href={inv.linkedInUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors"
                                        title={inv.linkedInUrl}
                                      >
                                        <Linkedin className="h-4 w-4" />
                                        <span className="truncate max-w-[200px]">LinkedIn</span>
                                        <ExternalLink className="h-3 w-3 opacity-50" />
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                              {inv.complianceStatus === ComplianceStatus.Compliant && (
                                <div className="flex items-center gap-1 text-green-600" title="This startup has been verified by Startup Nation">
                                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                                  <span className="text-xs font-semibold">Verified</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      case 'mentorManagement': {
        const meetingTypes = ['General', 'Strategy', 'Technical', 'Financial', 'Marketing', 'HR', 'Investor Prep', 'Review', 'Other'];
        const activeAssignments = mentorAssignments.filter(a => a.status === 'active');
        const completedAssignments = mentorAssignments.filter(a => a.status === 'completed');

        return (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Mentor Management</h2>
                <p className="text-slate-600 mt-1">
                  Assign mentors to startups and track all mentoring activities from one place.
                </p>
              </div>
              {mentorMgmtSubTab === 'assignments' && (
                <Button
                  size="sm"
                  onClick={() => setIsAssignModalOpen(true)}
                  disabled={facilitatorMentors.length === 0 || portfolioStartups.length === 0}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Assign Mentor
                </Button>
              )}
            </div>

            {/* Sub-tabs */}
            <div className="border-b border-slate-200">
              <nav className="-mb-px flex flex-wrap gap-2" aria-label="Mentor Management Sub-tabs">
                {[
                  { key: 'mentors', label: 'Registered Mentors', icon: <Users className="h-4 w-4" /> },
                  { key: 'assignments', label: 'Assignments', icon: <GraduationCap className="h-4 w-4" /> },
                  { key: 'meetings', label: 'Meeting Records', icon: <BookOpen className="h-4 w-4" /> },
                ].map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => setMentorMgmtSubTab(key as any)}
                    className={`${mentorMgmtSubTab === key ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                  >
                    {icon}{label}
                  </button>
                ))}
              </nav>
            </div>

            {isLoadingMentorMgmt ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                <span className="ml-3 text-slate-600">Loading mentor data...</span>
              </div>
            ) : (
              <>
                {/* ---- Registered Mentors ---- */}
                {mentorMgmtSubTab === 'mentors' && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>How it works:</strong> Mentors associate themselves with your incubation center by entering your center code (<strong>{facilitatorCode || 'your code'}</strong>) in their profile settings. You can then approve them and assign them to startups.
                      </p>
                    </div>

                    {/* Mentor Sub-tabs */}
                    <div className="border-b border-slate-200 flex gap-4">
                      {[
                        { key: 'pending', label: 'Pending Approvals', count: pendingMentorAssociations.length },
                        { key: 'approved', label: 'Approved Mentors', count: approvedMentorAssociations.length + facilitatorMentors.length }
                      ].map(({ key, label, count }) => (
                        <button
                          key={key}
                          onClick={() => setMentorSubTab(key as 'pending' | 'approved')}
                          className={`${
                            mentorSubTab === key
                              ? 'border-b-2 border-brand-primary text-brand-primary'
                              : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700'
                          } px-4 py-3 font-medium text-sm transition-colors`}
                        >
                          {label} ({count})
                        </button>
                      ))}
                    </div>

                    {/* Pending Approvals Tab */}
                    {mentorSubTab === 'pending' && (
                      <div className="space-y-3">
                        {pendingMentorAssociations.length === 0 ? (
                          <Card className="p-8 text-center">
                            <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-3" />
                            <p className="font-semibold text-slate-700">All caught up!</p>
                            <p className="text-sm text-slate-500">No pending mentor approvals.</p>
                          </Card>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pendingMentorAssociations.map((assoc) => (
                              <Card key={assoc.id} className="p-4 border-amber-200 bg-amber-50">
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <h4 className="font-semibold text-slate-900">{assoc.mentor_name}</h4>
                                    {assoc.mentor_type && (
                                      <p className="text-xs text-slate-600">{assoc.mentor_type}</p>
                                    )}
                                  </div>
                                  <Badge variant="warning">Pending</Badge>
                                </div>
                                {assoc.mentor_email && (
                                  <p className="text-xs text-slate-600 mb-3">{assoc.mentor_email}</p>
                                )}
                                <div className="flex gap-2 pt-3 border-t border-amber-200">
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={async () => {
                                      try {
                                        const { data: { user: authUser } } = await supabase.auth.getUser();
                                        if (authUser) {
                                          await facilitatorMentorService.approveMentorAssociation(assoc.id, authUser.id);
                                          await loadMentorManagementData();
                                          messageService.success('Mentor Approved', `${assoc.mentor_name} has been approved!`);
                                        }
                                      } catch (error) {
                                        console.error('Error approving mentor:', error);
                                        messageService.error('Approval Failed', 'Failed to approve mentor');
                                      }
                                    }}
                                    className="flex-1"
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      if (confirm('Reject this mentor association?')) {
                                        try {
                                          await facilitatorMentorService.rejectMentorAssociation(assoc.id);
                                          await loadMentorManagementData();
                                          messageService.success('Mentor Rejected', `${assoc.mentor_name} has been rejected.`);
                                        } catch (error) {
                                          console.error('Error rejecting mentor:', error);
                                        }
                                      }
                                    }}
                                    className="flex-1"
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Approved Mentors Tab */}
                    {mentorSubTab === 'approved' && (
                      <div className="space-y-3">
                        {approvedMentorAssociations.length === 0 && facilitatorMentors.length === 0 ? (
                          <Card className="p-8 text-center">
                            <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                            <p className="font-semibold text-slate-700 mb-1">No mentors registered yet</p>
                            <p className="text-sm text-slate-500">Share your center code <strong>{facilitatorCode}</strong> with mentors so they can associate with your center.</p>
                          </Card>
                        ) : (
                          <>
                            <ApprovedMentorsTable
                              mentors={[
                                ...approvedMentorAssociations.map((assoc) => ({
                                  id: assoc.id,
                                  mentor_user_id: assoc.mentor_user_id,
                                  mentor_name: assoc.mentor_name,
                                  mentor_email: assoc.mentor_email,
                                  mentor_type: assoc.mentor_type,
                                  expertise_areas: assoc.expertise_areas,
                                  is_active: assoc.is_active,
                                })),
                                ...facilitatorMentors.map((mentor) => ({
                                  mentor_user_id: mentor.mentor_user_id,
                                  mentor_name: mentor.mentor_name,
                                  mentor_email: mentor.mentor_email,
                                  mentor_type: mentor.mentor_type,
                                  expertise_areas: mentor.expertise_areas,
                                  logo_url: mentor.logo_url,
                                  is_active: true,
                                }))
                              ]}
                              onViewPortfolio={(mentor) => {
                                if (!mentor?.mentor_user_id) {
                                  messageService.warning('Mentor Not Available', 'Unable to open mentor profile right now.');
                                  return;
                                }

                                const url = new URL(window.location.origin);
                                url.searchParams.set('view', 'mentor');
                                url.searchParams.set('userId', mentor.mentor_user_id);
                                window.location.href = url.toString();
                              }}
                              onAssign={(mentor) => {
                                setAssignMentorId(mentor.mentor_user_id);
                                setMentorMgmtSubTab('assignments');
                                setIsAssignModalOpen(true);
                              }}
                              onToggleStatus={async (mentor) => {
                                try {
                                  await facilitatorMentorService.toggleMentorStatus(mentor.id!, !mentor.is_active);
                                  await loadMentorManagementData();
                                  messageService.success('Status Updated', `Mentor is now ${!mentor.is_active ? 'active' : 'inactive'}`);
                                } catch (error) {
                                  console.error('Error toggling mentor status:', error);
                                  messageService.error('Error', 'Failed to update mentor status');
                                }
                              }}
                              onViewAssignments={(mentor) => {
                                const mentorAssigns = mentorAssignments.filter(
                                  a => a.mentor_user_id === mentor.mentor_user_id && a.status !== 'removed'
                                );
                                setSelectedMentorAssignments({
                                  mentor,
                                  assignments: mentorAssigns
                                });
                                setIsAssignmentsModalOpen(true);
                              }}
                              onViewHistory={(mentor) => {
                                setSelectedMentorForHistory(mentor);
                                setIsHistoryModalOpen(true);
                              }}
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ---- Assignments ---- */}
                {mentorMgmtSubTab === 'assignments' && (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Total Mentors', value: facilitatorMentors.length, color: 'bg-blue-50 text-blue-700' },
                        { label: 'Active Assignments', value: activeAssignments.length, color: 'bg-green-50 text-green-700' },
                        { label: 'Completed', value: completedAssignments.length, color: 'bg-slate-50 text-slate-700' },
                        { label: 'Meeting Records', value: allMeetingRecords.length, color: 'bg-purple-50 text-purple-700' },
                      ].map(({ label, value, color }) => (
                        <Card key={label} className={`p-4 ${color}`}>
                          <p className="text-2xl font-bold">{value}</p>
                          <p className="text-sm">{label}</p>
                        </Card>
                      ))}
                    </div>

                    {mentorAssignments.length === 0 ? (
                      <Card className="p-8 text-center">
                        <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="font-semibold text-slate-700 mb-1">No assignments yet</p>
                        <p className="text-sm text-slate-500">Assign a mentor from your registered mentors to a startup in your portfolio.</p>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {mentorAssignments.filter(a => a.status !== 'removed').map((assignment) => {
                          const isExpanded = expandedAssignmentId === assignment.id;
                          const meetings = assignmentMeetings[assignment.id] || [];
                          const totalMeetings = allMeetingRecords.filter(m => m.assignment_id === assignment.id).length;

                          return (
                            <Card key={assignment.id} className="overflow-hidden">
                              <div className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
                                      <GraduationCap className="h-5 w-5 text-brand-primary" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-slate-900">{assignment.mentor_name}</span>
                                        {assignment.mentor_type && (
                                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{assignment.mentor_type}</span>
                                        )}
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${assignment.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                          {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                                        </span>
                                      </div>
                                      <p className="text-sm text-slate-600 mt-0.5">
                                        Assigned to: <span className="font-medium">{assignment.startup_name}</span>
                                        {assignment.startup_sector && <span className="text-slate-400"> · {assignment.startup_sector}</span>}
                                      </p>
                                      <p className="text-xs text-slate-400 mt-0.5">
                                        <Calendar className="h-3 w-3 inline mr-1" />
                                        {new Date(assignment.assigned_at).toLocaleDateString()}
                                        {totalMeetings > 0 && (
                                          <span className="ml-3">
                                            <BookOpen className="h-3 w-3 inline mr-1" />
                                            {totalMeetings} meeting{totalMeetings !== 1 ? 's' : ''} recorded
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedAssignmentForMeeting(assignment);
                                        setIsMeetingModalOpen(true);
                                      }}
                                      className="text-xs"
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add Meeting
                                    </Button>
                                    {assignment.status === 'active' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={async () => {
                                          if (window.confirm('Mark this assignment as completed?')) {
                                            await facilitatorMentorService.updateAssignment(assignment.id, { status: 'completed' });
                                            await loadMentorManagementData();
                                          }
                                        }}
                                        className="text-xs text-green-700 hover:bg-green-50"
                                      >
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Complete
                                      </Button>
                                    )}
                                    <button
                                      onClick={() => handleToggleAssignmentExpand(assignment.id)}
                                      className="text-slate-400 hover:text-slate-600 p-1"
                                    >
                                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </button>
                                  </div>
                                </div>
                                {assignment.notes && (
                                  <p className="mt-2 text-xs text-slate-500 bg-slate-50 rounded px-3 py-2">{assignment.notes}</p>
                                )}
                              </div>

                              {/* Expanded meeting records */}
                              {isExpanded && (
                                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                                  <h5 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                                    <BookOpen className="h-4 w-4" />
                                    Meeting Records
                                  </h5>
                                  {meetings.length === 0 ? (
                                    <p className="text-sm text-slate-400 italic">No meetings recorded yet. Click "Add Meeting" to log one.</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {meetings.map(meeting => (
                                        <div key={meeting.id} className="bg-white rounded-lg border border-slate-200 p-3">
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-sm text-slate-900">{meeting.title}</span>
                                                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{meeting.meeting_type}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${getMeetingStatusClasses(meeting.session_status)}`}>
                                                  {formatMeetingStatus(meeting.session_status)}
                                                </span>
                                              </div>
                                              <p className="text-xs text-slate-500 mt-0.5">
                                                <Calendar className="h-3 w-3 inline mr-1" />
                                                {new Date(meeting.meeting_date).toLocaleDateString()}
                                                {meeting.meeting_time && (
                                                  <span className="ml-3">
                                                    <Clock className="h-3 w-3 inline mr-1" />
                                                    {meeting.meeting_time}
                                                  </span>
                                                )}
                                                {meeting.duration_minutes && (
                                                  <span className="ml-3">
                                                    <Clock className="h-3 w-3 inline mr-1" />
                                                    {meeting.duration_minutes} min
                                                  </span>
                                                )}
                                              </p>
                                              {meeting.notes && <p className="text-xs text-slate-600 mt-1"><strong>Notes:</strong> {meeting.notes}</p>}
                                              {meeting.outcomes && <p className="text-xs text-slate-600 mt-0.5"><strong>Outcomes:</strong> {meeting.outcomes}</p>}
                                              {meeting.next_steps && <p className="text-xs text-slate-600 mt-0.5"><strong>Next Steps:</strong> {meeting.next_steps}</p>}
                                              {meeting.transcript && (
                                                <div className="mt-2 p-3 bg-white rounded border border-blue-100">
                                                  <p className="text-xs font-semibold text-blue-700 mb-1">AI Transcript</p>
                                                  <p className="text-xs text-slate-700 whitespace-pre-line">{meeting.transcript}</p>
                                                </div>
                                              )}
                                            </div>
                                            <button
                                              onClick={async () => {
                                                if (window.confirm('Delete this meeting record?')) {
                                                  await facilitatorMentorService.deleteMeetingRecord(meeting.id);
                                                  const updated = await facilitatorMentorService.getMeetingRecords(assignment.id);
                                                  setAssignmentMeetings(prev => ({ ...prev, [assignment.id]: updated }));
                                                  await loadMentorManagementData();
                                                }
                                              }}
                                              className="text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ---- Meeting Records (global view) ---- */}
                {mentorMgmtSubTab === 'meetings' && (
                  <div className="space-y-4">
                    {allMeetingRecords.length === 0 ? (
                      <Card className="p-8 text-center">
                        <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="font-semibold text-slate-700 mb-1">No meeting records yet</p>
                        <p className="text-sm text-slate-500">Meeting records will appear here once you log meetings from the Assignments tab.</p>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {(() => {
                          const sorted = [...allMeetingRecords].sort((a, b) => {
                            const byDate = (a.meeting_date || '').localeCompare(b.meeting_date || '');
                            if (byDate !== 0) return byDate;
                            return (a.meeting_time || '').localeCompare(b.meeting_time || '');
                          });

                          const scheduledMeetings = sorted.filter(m => (m.session_status || '').toLowerCase() === 'scheduled');
                          const completedMeetings = sorted.filter(m => (m.session_status || '').toLowerCase() === 'completed');
                          const otherMeetings = sorted.filter(m => !['scheduled', 'completed'].includes((m.session_status || '').toLowerCase()));

                          const renderMeetingCard = (meeting: any) => (
                            <Card key={meeting.id} className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-slate-900">{meeting.title}</span>
                                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{meeting.meeting_type}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${getMeetingStatusClasses(meeting.session_status)}`}>
                                      {formatMeetingStatus(meeting.session_status)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 mt-1 flex-wrap text-xs text-slate-500">
                                    <span>
                                      <Users className="h-3 w-3 inline mr-1" />
                                      {meeting.mentor_name}
                                    </span>
                                    <span>→</span>
                                    <span className="font-medium text-slate-700">{meeting.startup_name}</span>
                                    <span>
                                      <Calendar className="h-3 w-3 inline mr-1" />
                                      {new Date(meeting.meeting_date).toLocaleDateString()}
                                    </span>
                                    {meeting.meeting_time && (
                                      <span>
                                        <Clock className="h-3 w-3 inline mr-1" />
                                        {meeting.meeting_time}
                                      </span>
                                    )}
                                    {meeting.duration_minutes && (
                                      <span>
                                        <Clock className="h-3 w-3 inline mr-1" />
                                        {meeting.duration_minutes} min
                                      </span>
                                    )}
                                  </div>
                                  {meeting.notes && <p className="text-xs text-slate-600 mt-2"><strong>Notes:</strong> {meeting.notes}</p>}
                                  {meeting.outcomes && <p className="text-xs text-slate-600 mt-0.5"><strong>Outcomes:</strong> {meeting.outcomes}</p>}
                                  {meeting.next_steps && <p className="text-xs text-green-700 mt-0.5"><strong>Next Steps:</strong> {meeting.next_steps}</p>}
                                  {meeting.transcript && (
                                    <div className="mt-3 p-3 bg-white rounded border border-blue-100">
                                      <p className="text-xs font-semibold text-blue-700 mb-1">AI Transcript</p>
                                      <p className="text-xs text-slate-700 whitespace-pre-line">{meeting.transcript}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Card>
                          );

                          return (
                            <>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-semibold text-amber-700">Scheduled Meetings</h4>
                                  <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{scheduledMeetings.length}</span>
                                </div>
                                {scheduledMeetings.length === 0 ? (
                                  <Card className="p-3 text-xs text-slate-500">No scheduled meetings yet.</Card>
                                ) : (
                                  <div className="space-y-3">{scheduledMeetings.map(renderMeetingCard)}</div>
                                )}
                              </div>

                              <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-semibold text-emerald-700">Completed Meetings</h4>
                                  <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{completedMeetings.length}</span>
                                </div>
                                {completedMeetings.length === 0 ? (
                                  <Card className="p-3 text-xs text-slate-500">No completed meetings yet.</Card>
                                ) : (
                                  <div className="space-y-3">{completedMeetings.map(renderMeetingCard)}</div>
                                )}
                              </div>

                              {otherMeetings.length > 0 && (
                                <div className="space-y-3 pt-2">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-slate-700">Other Meeting Statuses</h4>
                                    <span className="text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">{otherMeetings.length}</span>
                                  </div>
                                  <div className="space-y-3">{otherMeetings.map(renderMeetingCard)}</div>
                                </div>
                              )}
                            </>
                          );
                        })()}

                        {/* Filter/summary */}
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span>{allMeetingRecords.length} total meetings</span>
                          <span>·</span>
                          <span>{new Set(allMeetingRecords.map(m => m.mentor_user_id)).size} mentors</span>
                          <span>·</span>
                          <span>{new Set(allMeetingRecords.map(m => m.startup_id)).size} startups</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Assign Mentor Modal */}
            <Modal
              isOpen={isAssignModalOpen}
              onClose={() => { setIsAssignModalOpen(false); setAssignMentorId(''); setAssignStartupId(''); setAssignNotes(''); }}
              title="Assign Mentor to Startup"
              size="md"
            >
              <div className="space-y-4">
                {assignMentorId && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-900">
                      <strong>Mentor:</strong> {facilitatorMentors.find(m => m.mentor_user_id === assignMentorId)?.mentor_name || 'Selected'}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Startup</label>
                  <select
                    value={assignStartupId}
                    onChange={e => setAssignStartupId(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                  >
                    <option value="">-- Select a startup --</option>
                    {portfolioStartups.map(s => (
                      <option key={s.id} value={String(s.id)}>{s.name}{s.sector ? ` · ${s.sector}` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
                  <textarea
                    value={assignNotes}
                    onChange={e => setAssignNotes(e.target.value)}
                    rows={3}
                    placeholder="Any notes about this assignment..."
                    className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
                  <Button
                    onClick={handleAssignMentor}
                    disabled={!assignMentorId || !assignStartupId || isSavingAssignment}
                  >
                    {isSavingAssignment ? 'Assigning...' : 'Assign Mentor'}
                  </Button>
                </div>
              </div>
            </Modal>

            {/* Add Meeting Record Modal */}
            <Modal
              isOpen={isMeetingModalOpen}
              onClose={() => setIsMeetingModalOpen(false)}
              title="Log Meeting Record"
              size="lg"
            >
              {selectedAssignmentForMeeting && (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
                    <strong>Mentor:</strong> {selectedAssignmentForMeeting.mentor_name} &nbsp;→&nbsp; <strong>Startup:</strong> {selectedAssignmentForMeeting.startup_name}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Meeting Title"
                      value={meetingForm.title}
                      onChange={e => setMeetingForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Q2 Strategy Review"
                      required
                    />
                    <Input
                      label="Meeting Date"
                      type="date"
                      value={meetingForm.meeting_date}
                      onChange={e => setMeetingForm(prev => ({ ...prev, meeting_date: e.target.value }))}
                      required
                    />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Type</label>
                      <select
                        value={meetingForm.meeting_type}
                        onChange={e => setMeetingForm(prev => ({ ...prev, meeting_type: e.target.value }))}
                        className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                      >
                        {meetingTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <Input
                      label="Duration (minutes)"
                      type="number"
                      value={meetingForm.duration_minutes}
                      onChange={e => setMeetingForm(prev => ({ ...prev, duration_minutes: e.target.value }))}
                      placeholder="e.g. 60"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Notes</label>
                    <textarea
                      value={meetingForm.notes}
                      onChange={e => setMeetingForm(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      placeholder="What was discussed..."
                      className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Outcomes</label>
                    <textarea
                      value={meetingForm.outcomes}
                      onChange={e => setMeetingForm(prev => ({ ...prev, outcomes: e.target.value }))}
                      rows={2}
                      placeholder="Key decisions or outcomes..."
                      className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Next Steps</label>
                    <textarea
                      value={meetingForm.next_steps}
                      onChange={e => setMeetingForm(prev => ({ ...prev, next_steps: e.target.value }))}
                      rows={2}
                      placeholder="Action items for next session..."
                      className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={() => setIsMeetingModalOpen(false)}>Cancel</Button>
                    <Button
                      onClick={handleAddMeetingRecord}
                      disabled={!meetingForm.title || !meetingForm.meeting_date || isSavingMeeting}
                    >
                      {isSavingMeeting ? 'Saving...' : 'Save Meeting'}
                    </Button>
                  </div>
                </div>
              )}
            </Modal>

            {/* Mentor Portfolio Modal */}
            {isPortfolioModalOpen && selectedMentorForPortfolio && (
              <MentorPortfolioModal
                mentor={selectedMentorForPortfolio}
                onClose={() => {
                  setIsPortfolioModalOpen(false);
                  setSelectedMentorForPortfolio(null);
                }}
                onViewHistory={() => {
                  setSelectedMentorForHistory(selectedMentorForPortfolio);
                  setIsHistoryModalOpen(true);
                }}
                onAssign={() => {
                  setAssignMentorId(selectedMentorForPortfolio.mentor_user_id);
                  setMentorMgmtSubTab('assignments');
                  setIsAssignModalOpen(true);
                  setIsPortfolioModalOpen(false);
                }}
              />
            )}

            {/* Mentor History Modal */}
            {isHistoryModalOpen && selectedMentorForHistory && (
              <MentorHistoryModal
                mentor={selectedMentorForHistory}
                onClose={() => {
                  setIsHistoryModalOpen(false);
                  setSelectedMentorForHistory(null);
                }}
              />
            )}

            {/* Mentor Assignments Modal */}
            {isAssignmentsModalOpen && selectedMentorAssignments && (
              <Modal
                isOpen={isAssignmentsModalOpen}
                onClose={() => {
                  setIsAssignmentsModalOpen(false);
                  setSelectedMentorAssignments(null);
                }}
                title={`Assignments - ${selectedMentorAssignments.mentor.mentor_name}`}
                size="md"
              >
                <div className="space-y-4">
                  {selectedMentorAssignments.assignments.length === 0 ? (
                    <div className="text-center py-6">
                      <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-600">No startups assigned yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-600 mb-4">
                        <strong>{selectedMentorAssignments.assignments.length}</strong> startup(s) assigned to this mentor
                      </p>
                      {selectedMentorAssignments.assignments.map((assignment: any) => (
                        <Card key={assignment.id} className="p-4 flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900">{assignment.startup_name}</h4>
                            <p className="text-xs text-slate-500 mt-1">
                              Status: <Badge variant={assignment.status === 'active' ? 'success' : 'secondary'}>
                                {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                              </Badge>
                            </p>
                            {assignment.notes && (
                              <p className="text-xs text-slate-600 mt-2 italic">{assignment.notes}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              if (confirm(`Remove assignment for ${assignment.startup_name}?`)) {
                                try {
                                  await facilitatorMentorService.removeAssignment(assignment.id);
                                  await loadMentorManagementData();
                                  messageService.success('Removed', 'Assignment removed successfully');
                                  setIsAssignmentsModalOpen(false);
                                  setSelectedMentorAssignments(null);
                                } catch (error) {
                                  console.error('Error removing assignment:', error);
                                  messageService.error('Error', 'Failed to remove assignment');
                                }
                              }
                            }}
                          >
                            Remove
                          </Button>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </Modal>
            )}
          </div>
        );
      }

      case 'ourInvestments':
        // Use approved Equity/Hybrid recognitions as "our investments"
        // This ensures startups appear once incubation is accepted, even if equityAllocated is not set yet
        const investedRecords = recognitionRecords.filter(record =>
          record.status === 'approved' && (record.feeType === 'Equity' || record.feeType === 'Hybrid')
        );
        
        return (
          <div className="space-y-8 animate-fade-in">
            {/* Loading State */}
            {isLoadingRecognition && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                <span className="ml-2 text-slate-600">Loading investment data...</span>
              </div>
            )}
            
            {/* Investment Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Gift className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-500">Total Investments</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {investedRecords.length}
                    </p>
                  </div>
                </div>
              </Card>
              <Card>
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-500">Compliant Startups</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {investedRecords.filter(record => record.startup?.compliance_status === 'Compliant').length}
                    </p>
                  </div>
                </div>
              </Card>
              <Card>
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-500">Total Equity</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {investedRecords
                        .reduce((sum, record) => sum + (record.equityAllocated || 0), 0)
                        .toFixed(1)}%
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Investment Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <h4 className="text-lg font-semibold text-slate-700 mb-4">Investment Distribution by Sector</h4>
                <div className="space-y-3">
                  {(() => {
                    // Calculate sector distribution from actual data
                    const sectorData = investedRecords
                      .reduce((acc, record) => {
                        const sector = record.startup?.sector || 'Other';
                        if (!acc[sector]) {
                          acc[sector] = { count: 0, equity: 0 };
                        }
                        acc[sector].count += 1;
                        acc[sector].equity += record.equityAllocated || 0;
                        return acc;
                      }, {} as Record<string, { count: number; equity: number }>);

                    const totalEquity = Object.values(sectorData).reduce((sum, data) => sum + data.equity, 0);
                    const sectors = Object.entries(sectorData).sort((a, b) => b[1].equity - a[1].equity);

                    return sectors.length === 0 ? (
                      <div className="text-center py-4 text-slate-500">
                        No sector data available
                      </div>
                    ) : (
                      sectors.map(([sector, data]) => {
                        const percentage = totalEquity > 0 ? (data.equity / totalEquity) * 100 : 0;
                        return (
                    <div key={sector} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">{sector}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-brand-primary h-2 rounded-full" 
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-slate-900">
                                {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                        );
                      })
                    );
                  })()}
                </div>
              </Card>

              <Card>
                <h4 className="text-lg font-semibold text-slate-700 mb-4">Investment Performance</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Total Portfolio Value</span>
                  <span className="text-lg font-bold text-slate-900">
                    {(() => {
                      const totalValue = investedRecords
                        .reduce((sum, record) => {
                          const currentPrice = currentPrices[record.startupId] || record.pricePerShare;
                          const shares = record.shares;
                          if (currentPrice && shares && shares > 0) {
                            return sum + (currentPrice * shares);
                          }
                          return sum + (record.investmentAmount || record.feeAmount || 0);
                        }, 0);
                      const currency = investedRecords[0]?.startup?.currency || (currentUser?.country ? resolveCurrency(currentUser.country) : 'USD');
                      const symbol = getCurrencySymbol(currency);
                      return `${symbol}${totalValue.toLocaleString()}`;
                    })()}
                  </span>
                  </div>
                  <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Total Equity Holdings</span>
                  <span className="text-lg font-bold text-green-600">
                    {investedRecords
                      .reduce((sum, record) => sum + (record.equityAllocated || 0), 0)
                      .toFixed(1)}%
                  </span>
                  </div>
                  <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Average Investment Size</span>
                  <span className="text-sm font-medium text-slate-900">
                    {(() => {
                      const investments = investedRecords;
                      if (investments.length === 0) return '0';
                      
                      const totalInvestment = investments.reduce((sum, record) => {
                        const currentPrice = currentPrices[record.startupId] || record.pricePerShare;
                        const shares = record.shares;
                        if (currentPrice && shares && shares > 0) {
                          return sum + (currentPrice * shares);
                        }
                        return sum + (record.investmentAmount || record.feeAmount || 0);
                      }, 0);
                      
                      const currency = investments[0]?.startup?.currency || (currentUser?.country ? resolveCurrency(currentUser.country) : 'USD');
                      const symbol = getCurrencySymbol(currency);
                      return `${symbol}${(totalInvestment / investments.length).toLocaleString()}`;
                    })()}
                  </span>
                  </div>
                  <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Compliant Investments</span>
                  <span className="text-sm font-medium text-slate-900">
                    {investedRecords.filter(record => record.startup?.compliance_status === 'Compliant').length} startups
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Total Shares Owned</span>
                  <span className="text-sm font-medium text-slate-900">
                    {investedRecords
                      .reduce((sum, record) => sum + (record.shares || 0), 0)
                      .toLocaleString()} shares
                  </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Invested Startups Table */}
            <Card>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-slate-700">Our Investment Portfolio</h3>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </div>
              
              {investedRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Gift className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No Investments Yet</h3>
                  <p className="text-slate-500 mb-6">Startups will appear here when you take equity in them through your programs.</p>
                  <div className="space-y-2">
                    <Button onClick={() => setActiveTab('intakeManagement')}>
                      Go to Intake Management
                    </Button>
                    <div className="text-xs text-slate-400">
                      Make sure you have approved Equity or Hybrid recognition records
                    </div>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sector</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Stage</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Investment Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Equity %</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Shares</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Purchase Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Current Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Current Valuation</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {investedRecords
                        .map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-brand-primary flex items-center justify-center">
                                  <span className="text-sm font-medium text-white">
                                    {record.startup?.name?.charAt(0).toUpperCase() || 'S'}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-slate-900">{record.startup?.name || 'Unknown Startup'}</div>
                                <div className="text-sm text-slate-500">ID: {record.startupId}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {record.startup?.sector || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {record.stage || record.startup?.stage || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {record.dateAdded ? new Date(record.dateAdded).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            {record.equityAllocated || 0}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {record.shares ? record.shares.toLocaleString() : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {(() => {
                              if (record.pricePerShare && record.pricePerShare > 0) {
                                const currency = record.startup?.currency || 'USD';
                                const symbol = currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
                                return `${symbol}${record.pricePerShare.toFixed(2)}`;
                              }
                              return '—';
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {(() => {
                              const currentPrice = currentPrices[record.startupId] || record.pricePerShare;
                              if (currentPrice && currentPrice > 0) {
                                const currency = record.startup?.currency || 'USD';
                                const symbol = currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
                                return `${symbol}${currentPrice.toFixed(2)}`;
                              }
                              return '—';
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {(() => {
                              const currentPrice = currentPrices[record.startupId] || record.pricePerShare;
                              const shares = record.shares;
                              if (currentPrice && shares && shares > 0) {
                                const currentValuation = currentPrice * shares;
                                const currency = record.startup?.currency || 'USD';
                                const symbol = currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
                                return `${symbol}${currentValuation.toLocaleString()}`;
                              }
                              return '—';
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              record.status === 'approved' 
                                ? 'bg-green-100 text-green-800' 
                                : record.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {record.status === 'approved' ? 'Active' : 
                               record.status === 'pending' ? 'Pending' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <div className="flex justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  const startupObj = await buildStartupForView({
                                    id: record.startupId.toString(),
                                    name: record.startup?.name || 'Unknown Startup',
                                    sector: record.startup?.sector || '',
                                    totalFunding: record.startup?.total_funding || 0,
                                    totalRevenue: record.startup?.total_revenue || 0,
                                    registrationDate: record.startup?.registration_date || new Date().toISOString().split('T')[0],
                                    complianceStatus: 'compliant' as any,
                                    founders: []
                                  });
                                  onViewStartup(startupObj);
                                }}
                                title="View startup details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                title="Download investment documents"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        );
      case 'collaboration':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Collaboration</h2>
                  <p className="text-sm text-slate-600">Manage collaborators and incoming requests.</p>
                </div>
              </div>

              <div className="border-b border-slate-200 mb-4 flex flex-wrap gap-4">
                <button
                  onClick={() => setCollaborationSubTab('explore-collaborators')}
                  className={`pb-2 text-sm font-medium ${
                    collaborationSubTab === 'explore-collaborators'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-slate-600 hover:text-slate-800 border-b-2 border-transparent'
                  }`}
                >
                  Explore Collaborators
                </button>
                <button
                  onClick={() => setCollaborationSubTab('myCollaborators')}
                  className={`pb-2 text-sm font-medium ${
                    collaborationSubTab === 'myCollaborators'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-slate-600 hover:text-slate-800 border-b-2 border-transparent'
                  }`}
                >
                  My Collaborators
                </button>
                <button
                  onClick={() => setCollaborationSubTab('collaboratorRequests')}
                  className={`pb-2 text-sm font-medium ${
                    collaborationSubTab === 'collaboratorRequests'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-slate-600 hover:text-slate-800 border-b-2 border-transparent'
                  }`}
                >
                  Collaborator Requests
                </button>
              </div>

              {loadingCollaborationRequests && collaborationSubTab !== 'explore-collaborators' ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading collaboration data...</p>
                </div>
              ) : collaborationSubTab === 'explore-collaborators' ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Explore by Profile Type</h3>
                    <p className="text-sm text-slate-600 mb-6">Browse and connect with different types of collaborators</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[
                      { role: 'Investment Advisor', icon: Briefcase, color: 'bg-purple-100 text-purple-700 hover:bg-purple-200', description: 'Connect with investment advisors' },
                      { role: 'Mentor', icon: Users, color: 'bg-green-100 text-green-700 hover:bg-green-200', description: 'Connect with mentors' },
                      { role: 'Investor', icon: Gift, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200', description: 'Connect with investors' },
                      { role: 'CA', icon: FileText, color: 'bg-orange-100 text-orange-700 hover:bg-orange-200', description: 'Connect with Chartered Accountants' },
                      { role: 'CS', icon: Shield, color: 'bg-pink-100 text-pink-700 hover:bg-pink-200', description: 'Connect with Company Secretaries' },
                      { role: 'Incubation', icon: Building2, color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200', description: 'Connect with other incubation centers' },
                    ].map((profileType) => {
                      const IconComponent = profileType.icon;
                      return (
                        <Card
                          key={profileType.role}
                          className="p-6 hover:shadow-lg transition-all duration-200 border border-slate-200 text-center"
                        >
                          <div className="flex flex-col items-center">
                            <div className={`w-16 h-16 rounded-full ${profileType.color} flex items-center justify-center mb-4 transition-colors`}>
                              <IconComponent className="h-8 w-8" />
                            </div>
                            <h4 className="text-lg font-semibold text-slate-900 mb-2">
                              {profileType.role}
                            </h4>
                            <p className="text-sm text-slate-600 mb-4">
                              {profileType.description}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => setShowLaunchingSoonModal(true)}
                              disabled={true}
                            >
                              <Eye className="h-3 w-3 mr-2" />
                              Explore
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ) : collaborationSubTab === 'myCollaborators' ? (
                <div>
                  {acceptedCollaborators.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                      <p className="font-medium text-slate-800 mb-1">No collaborators yet</p>
                      <p className="text-slate-600">Accepted collaborators will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {acceptedCollaborators.map((request) => {
                        const requesterUser = users.find(u => u.id === request.requester_id);
                        const collaboratorProfile = collaboratorProfiles[request.requester_id] || null;
                        const firmName = collaboratorProfile?.firm_name || collaboratorProfile?.investor_name || collaboratorProfile?.advisor_name || collaboratorProfile?.mentor_name || '';

                        return (
                          <Card key={request.id} className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="text-lg font-semibold text-slate-900">{firmName || requesterUser?.name || 'Unknown'}</h4>
                                <p className="text-sm text-slate-600">{request.requester_type}</p>
                                {collaboratorProfile?.location && (
                                  <p className="text-xs text-slate-500 mt-1">{collaboratorProfile.location}</p>
                                )}
                              </div>
                              <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Accepted
                              </span>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {collaborationRequests.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                      <p className="font-medium text-slate-800 mb-1">No pending requests</p>
                      <p className="text-slate-600">Collaboration requests will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {collaborationRequests.map((request) => {
                        const requesterUser = users.find(u => u.id === request.requester_id);
                        const requestKey = `${request.requester_id}-${request.requester_type}`;
                        if (locallyRejectedRequestKeys.has(requestKey)) return null;

                        return (
                          <Card key={request.id} className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h4 className="text-lg font-semibold text-slate-900">{requesterUser?.name || 'Unknown'}</h4>
                                <p className="text-sm text-slate-600">{request.requester_type}</p>
                                {request.message && (
                                  <p className="text-sm text-slate-700 mt-2 italic">"{request.message}"</p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await advisorConnectionRequestService.updateRequestStatus(request.id, 'accepted');
                                      setCollaborationRequests(prev => prev.filter(r => r.id !== request.id));
                                      setAcceptedCollaborators(prev => [...prev, { ...request, status: 'accepted' }]);
                                      messageService.success('Request Accepted', 'You can now collaborate with this user.');
                                    } catch (error: any) {
                                      console.error('Error accepting request:', error);
                                      messageService.error('Error', error.message || 'Failed to accept collaboration request.');
                                    }
                                  }}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      setLocallyRejectedRequestKeys(prev => new Set([...prev, requestKey]));
                                      await advisorConnectionRequestService.updateRequestStatus(request.id, 'rejected');
                                      setCollaborationRequests(prev => prev.filter(r => r.id !== request.id));
                                      messageService.info('Request Rejected', 'The collaboration request has been declined.');
                                    } catch (error: any) {
                                      console.error('Error rejecting request:', error);
                                      setLocallyRejectedRequestKeys(prev => {
                                        const next = new Set(prev);
                                        next.delete(requestKey);
                                        return next;
                                      });
                                      messageService.error('Error', error.message || 'Failed to reject collaboration request.');
                                    }
                                  }}
                                >
                                  Decline
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      case 'partner':
        return (
          <PartnerNetworkTab facilitatorId={facilitatorId} trackMyStartups={partnerTrackMyStartups} />
        );
      case 'portfolio':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Left Column - Profile Form */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Incubation Center Profile</h2>
                  <p className="text-slate-600 mt-1">
                    Manage your public profile information and showcase your center's programs and achievements.
                  </p>
                </div>
                <FacilitatorProfileForm
                  currentUser={currentUser}
                  onSave={(profile) => {
                    console.log('Profile saved:', profile);
                    messageService.success('Profile Saved', 'Your incubation center profile has been updated successfully.');
                  }}
                  onProfileChange={(profile) => {
                    setPreviewProfile(profile);
                  }}
                />
              </div>

              {/* Right Column - Profile Preview */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Profile Preview</h2>
                  <p className="text-slate-600 mt-1">
                    This is how others will see your center's profile.
                  </p>
                </div>
                {previewProfile ? (
                  <FacilitatorCard facilitator={previewProfile} />
                ) : (
                  <Card className="p-8 text-center">
                    <div className="text-slate-400 mb-4">
                      <Building2 className="w-16 h-16 mx-auto mb-4" />
                    </div>
                    <p className="text-slate-600">
                      Fill out your profile information to see a preview of how it will appear to others.
                    </p>
                  </Card>
                )}
              </div>
            </div>
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
    <>
      <MessageContainer />
      <div className="space-y-6">
      {/* Header with facilitator code display */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome {currentUser?.center_name || 'Facilitation Center'}
          </h1>
          <h2 className="text-lg font-semibold text-slate-800">Facilitation Center Dashboard</h2>


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
        <nav className="-mb-px flex flex-wrap gap-2" aria-label="Tabs">
          <button onClick={() => setActiveTab('dashboard')} className={`${activeTab === 'dashboard' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}>
            <LayoutGrid className="h-5 w-5" />Dashboard
          </button>
          <button onClick={() => setActiveTab('intakeManagement')} className={`${activeTab === 'intakeManagement' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}>
            <Gift className="h-5 w-5" />Intake Management
          </button>
          <button onClick={() => setActiveTab('trackMyStartups')} className={`${activeTab === 'trackMyStartups' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}>
            <Users className="h-5 w-5" />Track My Startups
          </button>
          <button onClick={() => setActiveTab('mentorManagement')} className={`${activeTab === 'mentorManagement' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}>
            <GraduationCap className="h-5 w-5" />Mentor Management
          </button>
          <button onClick={() => setActiveTab('ourInvestments')} className={`${activeTab === 'ourInvestments' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}>
            <Gift className="h-5 w-5" />Our Investments
          </button>
          <button onClick={() => setActiveTab('discover')} className={`${activeTab === 'discover' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}>
            <Film className="h-5 w-5" />Discover Pitches
          </button>
          <button onClick={() => setActiveTab('collaboration')} className={`${activeTab === 'collaboration' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}>
            <Users className="h-5 w-5" />Collaboration
          </button>
          <button onClick={() => setActiveTab('partner')} className={`${activeTab === 'partner' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}>
            <Handshake className="h-5 w-5" />Partner
          </button>
          <button onClick={() => setActiveTab('portfolio')} className={`${activeTab === 'portfolio' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}>
            <User className="h-5 w-5" />Portfolio
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
            <Input label="Application Deadline" id="deadline" name="deadline" type="date" value={newOpportunity.deadline} onChange={handleInputChange} required min={new Date().toISOString().split('T')[0]} />
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
              <Input label="WhatsApp Group Link" id="whatsappLink" name="whatsappLink" type="url" placeholder="https://chat.whatsapp.com/..." value={newOpportunity.whatsappLink} onChange={handleInputChange} />
                </div>
                
            {/* Question Selector */}
            <div className="border-t pt-4 mt-2">
              <QuestionSelector
                opportunityId={editingIndex !== null ? myPostedOpportunities[editingIndex]?.id : null}
                selectedQuestionIds={selectedQuestionIds}
                onSelectionChange={setSelectedQuestionIds}
                questionRequiredMap={questionRequiredMap}
                onRequiredChange={(questionId, isRequired) => {
                  const newMap = new Map(questionRequiredMap);
                  newMap.set(questionId, isRequired);
                  setQuestionRequiredMap(newMap);
                }}
                questionSelectionTypeMap={questionSelectionTypeMap}
                onSelectionTypeChange={(questionId, selectionType) => {
                  const newMap = new Map(questionSelectionTypeMap);
                  newMap.set(questionId, selectionType);
                  setQuestionSelectionTypeMap(newMap);
                }}
              />
            </div>
              </div>
          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button type="button" variant="secondary" onClick={() => setIsPostModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingIndex !== null ? 'Save Changes' : 'Post Opportunity'}</Button>
          </div>
        </form>
      </Modal>

      {/* Email Drafts Modal */}
      <Modal
        isOpen={isEmailDraftsModalOpen}
        onClose={() => {
          setIsEmailDraftsModalOpen(false);
          resetEmailDraftForm();
        }}
        title="Email Drafts"
        size="3xl"
      >
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Saved Drafts</h4>
                <p className="text-xs text-slate-500">Pick a draft to edit or delete.</p>
              </div>
              <Button size="sm" variant="outline" onClick={resetEmailDraftForm}>
                New Draft
              </Button>
            </div>
            {emailDrafts.length === 0 ? (
              <div className="text-sm text-slate-500 mt-4">No drafts yet.</div>
            ) : (
              <div className="mt-4 space-y-2">
                {emailDrafts.map(draft => (
                  <div key={draft.id} className="flex items-center justify-between gap-3 border border-slate-200 rounded-md px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{draft.name}</div>
                      <div className="text-xs text-slate-500">{draft.subject || 'No subject'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditEmailDraft(draft)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteEmailDraft(draft.id)} className="text-red-600 border-red-600 hover:bg-red-50">
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">{editingEmailDraftId ? 'Edit Draft' : 'Create Draft'}</h4>
                <p className="text-xs text-slate-500">
                  Use placeholders like {'{{startup_name}}'}, {'{{program_name}}'}, {'{{startup_email}}'}, {'{{startup_phone}}'}.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Draft Name"
                  value={emailDraftForm.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmailDraftForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Welcome Email"
                />
                <Input
                  label="Subject"
                  value={emailDraftForm.subject}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmailDraftForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Subject line"
                />
                <Input
                  label="CC"
                  value={emailDraftForm.cc}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmailDraftForm(prev => ({ ...prev, cc: e.target.value }))}
                  placeholder="comma-separated"
                />
                <Input
                  label="BCC"
                  value={emailDraftForm.bcc}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmailDraftForm(prev => ({ ...prev, bcc: e.target.value }))}
                  placeholder="comma-separated"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Body</label>
                <textarea
                  value={emailDraftForm.body}
                  onChange={(e) => setEmailDraftForm(prev => ({ ...prev, body: e.target.value }))}
                  rows={6}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="Write your email..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={resetEmailDraftForm}>
                  Clear
                </Button>
                <Button onClick={handleSaveEmailDraft} disabled={isSavingEmailDraft}>
                  {isSavingEmailDraft ? 'Saving...' : 'Save Draft'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </Modal>

      {/* Email Draft Select Modal */}
      <Modal
        isOpen={isEmailDraftSelectModalOpen}
        onClose={() => {
          setIsEmailDraftSelectModalOpen(false);
          setSelectedApplicationForEmail(null);
        }}
        title={`Select Email Draft - ${selectedApplicationForEmail?.startupName || ''}`}
        size="2xl"
      >
        <div className="space-y-4">
          <div className="text-sm text-slate-600">
            To: <span className="font-medium text-slate-900">{selectedApplicationForEmail?.founderEmail || 'N/A'}</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Choose Draft</label>
            <select
              value={selectedEmailDraftId}
              onChange={(e) => setSelectedEmailDraftId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              {emailDrafts.map(draft => (
                <option key={draft.id} value={draft.id}>{draft.name}</option>
              ))}
            </select>
          </div>
          {selectedApplicationForEmail && selectedEmailDraftId && (() => {
            const draft = emailDrafts.find(d => d.id === selectedEmailDraftId);
            if (!draft) return null;
            const previewSubject = applyEmailPlaceholders(draft.subject || '', selectedApplicationForEmail);
            const previewBody = applyEmailPlaceholders(draft.body || '', selectedApplicationForEmail);
            return (
              <Card>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-slate-500">Subject:</span> <span className="text-slate-900">{previewSubject || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Body:</span>
                    <div className="mt-2 whitespace-pre-wrap text-slate-700">{previewBody || '—'}</div>
                  </div>
                </div>
              </Card>
            );
          })()}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsEmailDraftSelectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedApplicationForEmail) return;
                const draft = emailDrafts.find(d => d.id === selectedEmailDraftId);
                if (!draft) return;
                openGmailDraft(draft, selectedApplicationForEmail);
                setIsEmailDraftSelectModalOpen(false);
              }}
            >
              Open Gmail
            </Button>
          </div>
        </div>
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

      {/* Application Responses Modal */}
      <Modal 
        isOpen={isApplicationResponsesModalOpen} 
        onClose={() => {
          setIsApplicationResponsesModalOpen(false);
          setSelectedApplicationForResponses(null);
          setApplicationResponses([]);
          setForm2Responses([]);
          setResponseTab('response1');
        }} 
        title={`Application Responses - ${selectedApplicationForResponses?.startupName || ''}`} 
        size="3xl"
      >
        <div className="space-y-4">
          {/* Response Tabs */}
          <div className="flex gap-4 border-b border-slate-200">
            <button
              onClick={() => setResponseTab('response1')}
              className={`pb-3 px-4 font-medium text-sm transition-colors relative ${
                responseTab === 'response1'
                  ? 'text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Response 1
              {responseTab === 'response1' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
            <button
              onClick={() => setResponseTab('response2')}
              className={`pb-3 px-4 font-medium text-sm transition-colors relative ${
                responseTab === 'response2'
                  ? 'text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Response 2
              {responseTab === 'response2' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          </div>

          {/* Response 1 Content */}
          {responseTab === 'response1' && (
            <>
          {loadingResponses ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-4"></div>
              <p className="text-slate-600">Loading responses...</p>
            </div>
          ) : applicationResponses.length === 0 ? (
            <div className="text-center py-8">
              <FileQuestion className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No application responses found for this application.</p>
              <p className="text-sm text-slate-500 mt-2">
                This application may not have included question responses, or the questions may have been removed.
              </p>
            </div>
          ) : (
            <>
              {/* Download Button */}
              <div className="flex justify-end pb-2 border-b border-slate-200">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Create CSV content: Questions as column headers, answers in row below
                    // Escape CSV values (handle quotes and commas)
                    const escapeCSV = (value: string | undefined | null) => {
                      if (!value) return '';
                      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                        return `"${value.replace(/"/g, '""')}"`;
                      }
                      return value;
                    };
                    
                    const startupName = selectedApplicationForResponses?.startupName || 'Unknown Startup';
                    
                    // First row: Column headers - "Startup Name" followed by all questions
                    const headers: string[] = ['Startup Name'];
                    const answers: string[] = [escapeCSV(startupName)];
                    
                    // Add questions as headers and answers in corresponding positions
                    applicationResponses.forEach(response => {
                      // Format answer - for multiselect, join with semicolon
                      let answer = response.answerText;
                      if (response.question.questionType === 'multiselect') {
                        answer = response.answerText.split(',').filter(v => v.trim()).join('; ');
                      }
                      
                      headers.push(escapeCSV(response.question.questionText));
                      answers.push(escapeCSV(answer));
                    });
                    
                    // Combine header row and answer row
                    const csvContent = [
                      headers.join(','),
                      answers.join(',')
                    ].join('\n');
                    
                    // Add BOM for Excel UTF-8 support
                    const BOM = '\uFEFF';
                    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `Application_Responses_${selectedApplicationForResponses?.startupName || 'Startup'}_${new Date().toISOString().split('T')[0]}.csv`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    
                    messageService.success('Download Started', 'Application responses exported to Excel (CSV format).');
                  }}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Download as Excel
                </Button>
              </div>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {applicationResponses.map((response, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-slate-900 mb-2">{response.question.questionText}</h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          {response.question.category && (
                            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded">
                              {response.question.category}
                            </span>
                          )}
                          <span className="text-xs text-slate-500">
                            {response.question.questionType === 'text' ? 'Short Answer' :
                             response.question.questionType === 'textarea' ? 'Long Answer' :
                             response.question.questionType === 'select' ? 'Multiple Choice' :
                             response.question.questionType === 'multiselect' ? 'Checkbox' :
                             response.question.questionType === 'number' ? 'Number' :
                             response.question.questionType === 'date' ? 'Date' :
                             response.question.questionType}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                      {response.question.questionType === 'multiselect' ? (
                        <div className="space-y-1">
                          {response.answerText.split(',').filter(v => v.trim()).map((option, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-slate-700">{option.trim()}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{response.answerText}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            </>
          )}
            </>
          )}

          {/* Response 2 Content (Form 2) */}
          {responseTab === 'response2' && (
            <>
          {loadingForm2Responses ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-4"></div>
              <p className="text-slate-600">Loading Form 2 responses...</p>
            </div>
          ) : form2Responses.length === 0 ? (
            <div className="text-center py-8">
              <FileQuestion className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No Form 2 responses found for this application.</p>
              <p className="text-sm text-slate-500 mt-2">
                This application may not have submitted Form 2 yet, or Form 2 questions may not be configured.
              </p>
            </div>
          ) : (
            <>
              {/* Download Button */}
              <div className="flex justify-end pb-2 border-b border-slate-200">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const escapeCSV = (value: string | undefined | null) => {
                      if (!value) return '';
                      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                        return `"${value.replace(/"/g, '""')}"`;
                      }
                      return value;
                    };
                    
                    const startupName = selectedApplicationForResponses?.startupName || 'Unknown Startup';
                    
                    const headers: string[] = ['Startup Name'];
                    const answers: string[] = [escapeCSV(startupName)];
                    
                    form2Responses.forEach(response => {
                      let answer = response.answerText || '';
                      if (response.question.questionType === 'multiselect' && answer) {
                        answer = answer.split(',').filter(v => v.trim()).join('; ');
                      }
                      
                      headers.push(escapeCSV(response.question.questionText));
                      answers.push(escapeCSV(answer));
                    });
                    
                    const csvContent = [
                      headers.join(','),
                      answers.join(',')
                    ].join('\n');
                    
                    const BOM = '\uFEFF';
                    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `Form2_Responses_${selectedApplicationForResponses?.startupName || 'Startup'}_${new Date().toISOString().split('T')[0]}.csv`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    
                    messageService.success('Download Started', 'Form 2 responses exported to Excel (CSV format).');
                  }}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Download as Excel
                </Button>
              </div>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {form2Responses.map((response, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-slate-900 mb-2">{response.question.questionText}</h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          {response.question.category && (
                            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded">
                              {response.question.category}
                            </span>
                          )}
                          <span className="text-xs text-slate-500">
                            {response.question.questionType === 'text' ? 'Short Answer' :
                             response.question.questionType === 'textarea' ? 'Long Answer' :
                             response.question.questionType === 'select' ? 'Multiple Choice' :
                             response.question.questionType === 'multiselect' ? 'Checkbox' :
                             response.question.questionType === 'number' ? 'Number' :
                             response.question.questionType === 'date' ? 'Date' :
                             response.question.questionType}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                      {response.question.questionType === 'multiselect' ? (
                        <div className="space-y-1">
                          {response.answerText.split(',').filter(v => v.trim()).map((option, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-slate-700">{option.trim()}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{response.answerText}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            </>
          )}
            </>
          )}
        </div>
      </Modal>

      {/* Pitch Video Modal */}
      <Modal isOpen={isPitchVideoModalOpen} onClose={() => setIsPitchVideoModalOpen(false)} title="Pitch Video" size="2xl">
        <div className="space-y-4">
          <div className="relative w-full aspect-video bg-slate-900 rounded-lg overflow-hidden">
            {selectedPitchVideo ? (
              <iframe 
                src={getEmbeddableVideoUrl(selectedPitchVideo)}
                title="Pitch Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute top-0 left-0 w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <Video className="h-16 w-16 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Video not available</p>
                </div>
              </div>
            )}
          </div>
          {selectedPitchVideo && (
            <div className="text-sm text-slate-500 text-center">
              <p>Original URL: <a href={selectedPitchVideo} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{selectedPitchVideo}</a></p>
            </div>
          )}
          <div className="flex justify-end">
            <Button 
              variant="secondary" 
              onClick={() => setIsPitchVideoModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Pitch Deck Modal */}
      <Modal isOpen={isPitchDeckModalOpen} onClose={() => setIsPitchDeckModalOpen(false)} title="Pitch Deck" size="2xl">
        <div className="space-y-4">
          {selectedPitchDeck ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Pitch Deck URL:</p>
              <a 
                href={selectedPitchDeck} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all text-sm"
              >
                {selectedPitchDeck}
              </a>
              <Button
                variant="secondary"
                onClick={() => window.open(selectedPitchDeck, '_blank')}
                className="mt-4 flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open in New Tab
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-16 w-16 mx-auto mb-2 text-slate-300" />
              <p className="text-sm text-slate-500">Pitch deck not available</p>
            </div>
          )}
          <div className="flex justify-end">
            <Button 
              variant="secondary" 
              onClick={() => setIsPitchDeckModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Messaging Modal */}
      {selectedApplicationForMessaging && (
        <IncubationMessagingModal
          isOpen={isMessagingModalOpen}
          onClose={handleCloseMessaging}
          applicationId={selectedApplicationForMessaging.id}
          startupName={selectedApplicationForMessaging.startupName}
          facilitatorName={currentUser?.name || 'Facilitator'}
        />
      )}

      {/* Contract Management Modal */}
      {selectedApplicationForContract && (
        <ContractManagementModal
          isOpen={isContractModalOpen}
          onClose={handleCloseContract}
          applicationId={selectedApplicationForContract.id}
          startupName={selectedApplicationForContract.startupName}
          facilitatorName={currentUser?.name || 'Facilitator'}
        />
      )}

      {/* Diligence Documents Modal */}
      {selectedApplicationForDiligence && (
        <Modal
          isOpen={isDiligenceModalOpen}
          onClose={handleCloseDiligenceDocuments}
          title={`Diligence Documents - ${selectedApplicationForDiligence.startupName}`}
        >
          <div className="space-y-4">
            {console.log('🔍 FACILITATOR VIEW: Selected application:', selectedApplicationForDiligence)}
            {console.log('🔍 FACILITATOR VIEW: Diligence URLs:', selectedApplicationForDiligence.diligenceUrls)}
            {console.log('🔍 FACILITATOR VIEW: Application ID:', selectedApplicationForDiligence.id)}
            {console.log('🔍 FACILITATOR VIEW: Startup ID:', selectedApplicationForDiligence.startupId)}
            {console.log('🔍 FACILITATOR VIEW: Status:', selectedApplicationForDiligence.status)}
            {console.log('🔍 FACILITATOR VIEW: Diligence Status:', selectedApplicationForDiligence.diligenceStatus)}
            {selectedApplicationForDiligence.diligenceUrls && selectedApplicationForDiligence.diligenceUrls.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  The startup has uploaded {selectedApplicationForDiligence.diligenceUrls.length} document(s) for due diligence review:
                </p>
                <div className="space-y-2">
                  {selectedApplicationForDiligence.diligenceUrls.map((url, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-slate-500" />
                        <span className="text-sm font-medium text-slate-700">
                          Document {index + 1}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(url, '_blank')}
                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `diligence-document-${index + 1}.pdf`;
                            link.target = '_blank';
                            link.click();
                          }}
                          className="text-green-600 border-green-300 hover:bg-green-50"
                        >
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Action buttons for facilitator */}
                {selectedApplicationForDiligence.diligenceStatus === 'requested' && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-slate-700 mb-3">Review and Decision:</p>
                    <div className="flex space-x-3">
                      <Button
                        onClick={() => handleApproveDiligence(selectedApplicationForDiligence)}
                        disabled={isProcessingAction}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isProcessingAction ? 'Approving...' : 'Approve Diligence'}
                      </Button>
                      <Button
                        onClick={() => handleRejectDiligence(selectedApplicationForDiligence)}
                        disabled={isProcessingAction}
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        {isProcessingAction ? 'Rejecting...' : 'Reject Diligence'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 mb-2">No diligence documents uploaded yet</p>
                <p className="text-sm text-slate-400">
                  The startup hasn't uploaded any documents for due diligence review.
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Add Startup Modal */}
      <AddStartupModal
        isOpen={isAddStartupModalOpen}
        onClose={() => setIsAddStartupModalOpen(false)}
        onAddStartup={handleAddStartup}
        facilitatorCode={facilitatorCode}
      />

      {/* Startup Invitation Modal */}
      {selectedStartupForInvitation && (
        <StartupInvitationModal
          isOpen={isInvitationModalOpen}
          onClose={() => {
            setIsInvitationModalOpen(false);
            setSelectedStartupForInvitation(null);
          }}
          startupData={selectedStartupForInvitation}
          facilitatorCode={facilitatorCode}
          facilitatorName={currentUser?.name || 'Facilitator'}
        />
      )}

      {/* Edit Startup Modal */}
      {selectedStartupForEdit && (
        <EditStartupModal
          isOpen={isEditStartupModalOpen}
          onClose={() => {
            setIsEditStartupModalOpen(false);
            setSelectedStartupForEdit(null);
          }}
          startup={selectedStartupForEdit}
          onSave={handleSaveStartupEdit}
        />
      )}

      {/* ============ FEATURE 3: CONFIGURE QUESTIONS MODAL ============ */}
      {isProgramQuestionsConfigModalOpen && selectedProgramForQuestions && (
        <Modal
          isOpen={isProgramQuestionsConfigModalOpen}
          onClose={() => setIsProgramQuestionsConfigModalOpen(false)}
          title={`Configure Tracking Questions - ${selectedProgramForQuestions}`}
          fullScreen={true}
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Configure the questions that startups in this program need to answer for periodic tracking and updates.
              </p>
            </div>

            {isLoadingProgramQuestionsConfig ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-slate-500">Loading questions...</p>
              </div>
            ) : (
              <>
                <QuestionSelector
                  opportunityId={null}
                  selectedQuestionIds={programQuestionIds}
                  onSelectionChange={setProgramQuestionIds}
                  questionRequiredMap={programQuestionRequiredMap}
                  onRequiredChange={(questionId, isRequired) => {
                    const newMap = new Map(programQuestionRequiredMap);
                    newMap.set(questionId, isRequired);
                    setProgramQuestionRequiredMap(newMap);
                  }}
                  questionSelectionTypeMap={programQuestionSelectionTypeMap}
                  onSelectionTypeChange={(questionId, selectionType) => {
                    const newMap = new Map(programQuestionSelectionTypeMap);
                    newMap.set(questionId, selectionType);
                    setProgramQuestionSelectionTypeMap(newMap);
                  }}
                />

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsProgramQuestionsConfigModalOpen(false)}
                    disabled={isSavingProgramQuestions}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveProgramQuestionsConfig}
                    disabled={isSavingProgramQuestions || programQuestionIds.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSavingProgramQuestions ? 'Saving...' : 'Save Questions'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* ============ FEATURE 4: REPORTS MANDATE WIZARD MODAL ============ */}
      {isCreateReportModalOpen && (
        <Modal
          isOpen={isCreateReportModalOpen}
          onClose={() => {
            setIsCreateReportModalOpen(false);
            resetCreateReportModal();
          }}
          title="Create Report Mandate"
        >
          <div className="space-y-6">
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    reportStep >= step
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`w-12 h-1 mx-2 ${
                      reportStep > step ? 'bg-blue-600' : 'bg-slate-200'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Title & Program */}
            {reportStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Report Title</label>
                  <Input
                    type="text"
                    placeholder="e.g., Q1 2026 Portfolio Update"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Program</label>
                  <select
                    value={reportProgram}
                    onChange={(e) => setReportProgram(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a program...</option>
                    <option value="All Programs">All Programs</option>
                    {Array.from(new Set(portfolioStartups.map(s => s.programName)))
                      .sort()
                      .map((programName) => (
                        <option key={programName} value={programName}>
                          {programName}
                        </option>
                      ))
                    }
                  </select>
                </div>
              </div>
            )}

            {/* Step 2: Question Selection */}
            {reportStep === 2 && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    Select the questions to include in this report. Startups will be asked to respond to these questions.
                  </p>
                </div>

                {isLoadingReportQuestions ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-slate-500">Loading questions...</p>
                  </div>
                ) : (
                  <QuestionSelector
                    selectedQuestionIds={reportQuestionIds}
                    onSelectionChange={setReportQuestionIds}
                    requiredMap={new Map()}
                    onRequiredMapChange={() => {}}
                    selectionTypeMap={new Map()}
                    onSelectionTypeMapChange={() => {}}
                  />
                )}
              </div>
            )}

            {/* Step 3: Source Selection */}
            {reportStep === 3 && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-slate-700">How would you like to handle responses?</p>

                <div className="space-y-3">
                  <label className="flex items-center p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="source"
                      value="existing"
                      checked={reportSource === 'existing'}
                      onChange={(e) => setReportSource(e.target.value as any)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <div className="ml-3">
                      <p className="font-medium text-slate-900">View Existing Responses</p>
                      <p className="text-sm text-slate-500">Export current responses from your tracking questions</p>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="source"
                      value="startup"
                      checked={reportSource === 'startup'}
                      onChange={(e) => setReportSource(e.target.value as any)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <div className="ml-3">
                      <p className="font-medium text-slate-900">Create Report </p>
                      <p className="text-sm text-slate-500">Take updated responses from startups, then generate report</p>
                    </div>
                  </label>
                </div>

                {reportSource === 'startup' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Target Startups</label>
                    <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-3">
                      {(() => {
                        const filteredStartups = reportProgram === 'All Programs'
                          ? portfolioStartups
                          : portfolioStartups.filter(s => s.programName === reportProgram);
                        
                        if (filteredStartups.length === 0) {
                          return <p className="text-slate-500 text-sm">No startups in this program</p>;
                        }
                        
                        return filteredStartups.map((startup) => (
                          <label key={startup.id} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={targetStartupIds.includes(String(startup.id))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTargetStartupIds([...targetStartupIds, String(startup.id)]);
                                } else {
                                  setTargetStartupIds(targetStartupIds.filter(id => id !== String(startup.id)));
                                }
                              }}
                              className="h-4 w-4 text-blue-600 rounded"
                            />
                            <span className="ml-2 text-sm text-slate-700">{startup.name}</span>
                          </label>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  if (reportStep === 1) {
                    setIsCreateReportModalOpen(false);
                    resetCreateReportModal();
                  } else {
                    handleBackStep();
                  }
                }}
              >
                {reportStep === 1 ? 'Cancel' : 'Back'}
              </Button>

              <div className="flex gap-2">
                {reportStep < 3 && (
                  <Button
                    onClick={handleNextStep}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Next
                  </Button>
                )}

                {reportStep === 3 && (
                  <>
                    {reportSource === 'existing' && (
                      <Button
                        onClick={handleGenerateExistingReport}
                        disabled={isProcessingAction}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {isProcessingAction ? 'Generating...' : 'Generate Report'}
                      </Button>
                    )}
                    
                    {reportSource === 'startup' && (
                      <Button
                        onClick={handleCreateMandate}
                        disabled={isProcessingAction || targetStartupIds.length === 0}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isProcessingAction ? 'Creating...' : `Create Mandate ${targetStartupIds.length > 0 ? `(${targetStartupIds.length} selected)` : ''}`}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ============ FEATURE 5: FORM 2 RESPONSE MODAL ============ */}
      {isForm2ModalOpen && selectedApplicationForForm2 && (
        <Form2SubmissionModal
          isOpen={isForm2ModalOpen}
          onClose={handleCloseForm2Modal}
          applicationId={selectedApplicationForForm2.id}
          opportunityId={selectedApplicationForForm2.opportunityId}
          opportunityName={selectedApplicationForForm2.opportunityId}
          onSuccess={() => {
            handleCloseForm2Modal();
            messageService.success('Success', 'Form submitted successfully', 2000);
          }}
        />
      )}

      {/* ============ FEATURE 6: FORM 2 CONFIGURATION MODAL ============ */}
      {isForm2ConfigModalOpen && selectedOpportunityForForm2 && (
        <Modal
          isOpen={isForm2ConfigModalOpen}
          onClose={handleCloseForm2ConfigModal}
          title={`Configure Form 2 Questions - ${myPostedOpportunities.find(o => o.id === selectedOpportunityForForm2)?.programName || 'Opportunity'}`}
          fullScreen={true}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Configure additional questions (Form 2) that shortlisted applicants will need to answer. 
              These are separate from the initial application questions and are typically more detailed.
            </p>
            
            <QuestionSelector
              opportunityId={selectedOpportunityForForm2}
              contextOpportunityId={selectedOpportunityForForm2}
              selectedQuestionIds={form2QuestionIds}
              onSelectionChange={setForm2QuestionIds}
              questionRequiredMap={form2QuestionRequiredMap}
              onRequiredChange={(questionId, isRequired) => {
                const newMap = new Map(form2QuestionRequiredMap);
                newMap.set(questionId, isRequired);
                setForm2QuestionRequiredMap(newMap);
              }}
              questionSelectionTypeMap={form2QuestionSelectionTypeMap}
              onSelectionTypeChange={(questionId, selectionType) => {
                const newMap = new Map(form2QuestionSelectionTypeMap);
                newMap.set(questionId, selectionType);
                setForm2QuestionSelectionTypeMap(newMap);
              }}
            />
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={handleCloseForm2ConfigModal}>
                Cancel
              </Button>
              <Button onClick={handleSaveForm2Questions} disabled={isSavingForm2Questions}>
                {isSavingForm2Questions ? 'Saving...' : 'Save Form 2 Questions'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Mandate Modal */}
      {isEditMandateModalOpen && selectedMandateForEdit && (
        <Modal isOpen={isEditMandateModalOpen} onClose={() => {
          setIsEditMandateModalOpen(false);
          setSelectedMandateForEdit(null);
        }}>
          <div className="bg-white rounded-lg p-6 max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Edit Mandate</h2>
              <button
                onClick={() => {
                  setIsEditMandateModalOpen(false);
                  setSelectedMandateForEdit(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Mandate Title</label>
                <input
                  type="text"
                  value={selectedMandateForEdit.title}
                  onChange={(e) => setSelectedMandateForEdit({ ...selectedMandateForEdit, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              {/* Program (read-only) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Program</label>
                <p className="px-3 py-2 bg-slate-50 rounded-lg text-slate-600">{selectedMandateForEdit.program_name}</p>
              </div>

              {/* Questions Management */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Questions ({selectedMandateForEdit.question_ids?.length || 0})</label>
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="max-h-48 overflow-y-auto space-y-2 mb-4">
                    {Array.from(questionBank.values()).map(question => {
                      const isSelected = selectedMandateForEdit.question_ids?.includes(question.id);
                      return (
                        <label key={question.id} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected || false}
                            onChange={(e) => {
                              const updatedIds = e.target.checked
                                ? [...(selectedMandateForEdit.question_ids || []), question.id]
                                : selectedMandateForEdit.question_ids?.filter(id => id !== question.id) || [];
                              setSelectedMandateForEdit({ ...selectedMandateForEdit, question_ids: updatedIds });
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">{question.question_text}</p>
                            <p className="text-xs text-slate-500">{question.id}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {questionBank.size === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">No questions available</p>
                  )}
                </div>
              </div>

              {/* Startups Management */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Target Startups ({selectedMandateForEdit.target_startups?.length || 0})</label>
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {selectedMandateForEdit.target_startups?.map((startupId) => (
                      <div key={startupId} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <span className="text-sm text-slate-900">{startupId}</span>
                        <button
                          onClick={() => {
                            const updated = selectedMandateForEdit.target_startups?.filter(id => id !== startupId) || [];
                            setSelectedMandateForEdit({ ...selectedMandateForEdit, target_startups: updated });
                          }}
                          className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  {(!selectedMandateForEdit.target_startups || selectedMandateForEdit.target_startups.length === 0) && (
                    <p className="text-sm text-slate-500 text-center py-4">No startups added</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setIsEditMandateModalOpen(false);
                  setSelectedMandateForEdit(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  try {
                    // Update mandate in database
                    const { error } = await supabase
                      .from('reports_mandate')
                      .update({
                        title: selectedMandateForEdit.title,
                        question_ids: selectedMandateForEdit.question_ids || [],
                        target_startups: selectedMandateForEdit.target_startups || [],
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', selectedMandateForEdit.id);

                    if (error) throw error;

                    console.log('✅ Mandate updated successfully');
                    // Reload mandates
                    await loadReportMandates();
                    setIsEditMandateModalOpen(false);
                    setSelectedMandateForEdit(null);
                  } catch (err) {
                    console.error('❌ Error updating mandate:', err);
                  }
                }}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* View Mandate Responses Modal */}
      {isViewMandateResponsesModalOpen && selectedStartupResponse && selectedReportIdForTracking && (
        <Modal isOpen={isViewMandateResponsesModalOpen} onClose={() => {
          setIsViewMandateResponsesModalOpen(false);
          setSelectedStartupResponse(null);
        }}>
          <div className="bg-white rounded-lg p-6 max-w-2xl max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Responses from {selectedStartupResponse.startup_name}
              </h2>
              <button
                onClick={() => {
                  setIsViewMandateResponsesModalOpen(false);
                  setSelectedStartupResponse(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {(() => {
                const selectedMandate = reportMandates.find(m => m.id === selectedReportIdForTracking);
                if (!selectedMandate) return null;

                return selectedMandate.question_ids?.map((qId: string) => {
                  const answer = selectedStartupResponse.answers?.[qId];
                  const questionData = questionBank.get(qId);
                  const questionText = questionData?.question_text || `Question (ID: ${qId})`;
                  
                  return (
                    <div key={qId} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <div className="mb-3">
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Question</p>
                        <p className="text-slate-900 font-medium break-words">{questionText}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-1">Answer</p>
                        <p className="text-slate-900 text-base break-words whitespace-pre-wrap">
                          {answer ? String(answer) : <span className="text-slate-400 italic">No answer provided</span>}
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="mt-6 flex justify-end">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setIsViewMandateResponsesModalOpen(false);
                  setSelectedStartupResponse(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Generate Report Format Modal */}
      {isGenerateReportModalOpen && selectedMandateForReport && (
        <Modal isOpen={isGenerateReportModalOpen} onClose={() => {
          setIsGenerateReportModalOpen(false);
          setSelectedMandateForReport(null);
          setReportFormatChoices(null);
        }}>
          <div className="bg-white rounded-lg p-6 max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Choose Report Format</h2>
              <button
                onClick={() => {
                  setIsGenerateReportModalOpen(false);
                  setSelectedMandateForReport(null);
                  setReportFormatChoices(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => {
                  setReportFormatChoices('csv');
                  // Generate CSV report
                  const mandateData = selectedMandateForReport;
                  const responsesForMandate = mandateResponses[mandateData.id] || [];
                  
                  // Create CSV header
                  let csvContent = "Program Name,Startup Name,";
                  mandateData.question_ids?.forEach(qId => {
                    const q = questionBank.get(qId);
                    const qText = q?.question_text || qId;
                    csvContent += `"${qText.replace(/"/g, '""')}",`;
                  });
                  csvContent = csvContent.slice(0, -1) + "\n";
                  
                  // Add data rows
                  mandateData.target_startups?.forEach(startupId => {
                    const response = responsesForMandate.find(r => r.startup_id === parseInt(startupId));
                    // Only add row if we have a startup name (skip if only ID)
                    if (response?.startup_name) {
                      csvContent += `"${mandateData.program_name}","${response.startup_name}",`;
                      mandateData.question_ids?.forEach(qId => {
                        const answer = response?.answers?.[qId] || "";
                        csvContent += `"${String(answer).replace(/"/g, '""')}",`;
                      });
                      csvContent = csvContent.slice(0, -1) + "\n";
                    }
                  });
                  
                  // Download CSV
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${mandateData.title}_report.csv`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                  
                  setIsGenerateReportModalOpen(false);
                  setSelectedMandateForReport(null);
                  setReportFormatChoices(null);
                }}
                className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-center"
              >
                📄 CSV Format
              </button>
              <button
                onClick={() => {
                  setReportFormatChoices('pdf');
                  // Generate PDF report (will implement below)
                  alert('PDF generation coming soon!');
                }}
                className="w-full px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors text-center"
              >
                📋 PDF Format
              </button>
            </div>

            <div className="text-center">
              <button
                onClick={() => {
                  setIsGenerateReportModalOpen(false);
                  setSelectedMandateForReport(null);
                  setReportFormatChoices(null);
                }}
                className="text-slate-600 hover:text-slate-900 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Launching Soon Modal */}
      {showLaunchingSoonModal && (
        <Modal
          isOpen={showLaunchingSoonModal}
          onClose={() => setShowLaunchingSoonModal(false)}
          title="Coming Soon"
        >
          <div className="p-6 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <Star className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Feature Coming Soon</h3>
            <p className="text-slate-600 mb-6">
              We're working hard to bring you this exciting collaboration feature. Stay tuned!
            </p>
            <Button onClick={() => setShowLaunchingSoonModal(false)}>
              Got it
            </Button>
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
      `}</style>
      </div>
    </>
  );
};

export default FacilitatorView;


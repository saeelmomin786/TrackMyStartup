import React, { useState, useEffect } from 'react';
import { Startup, InvestmentRecord, InvestorType, InvestmentRoundType, Founder, FundraisingDetails, UserRole, InvestmentType, IncubationProgram, AddIncubationProgramData, RecognitionRecord, IncubationType, FeeType, StartupDomain, StartupStage } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import SimpleModal from '../ui/SimpleModal';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import DateInput from '../DateInput';
import CloudDriveInput from '../ui/CloudDriveInput';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Plus, Trash2, Edit, Edit3, Save, X, TrendingUp, Users, DollarSign, PieChart as PieChartIcon, UserPlus, Download, Upload, Check, Eye, RefreshCw } from 'lucide-react';
import PricePerShareInput from './PricePerShareInput';
import { capTableService } from '../../lib/capTableService';
import { messageService } from '../../lib/messageService';
import { startupAdditionService, investmentService } from '../../lib/database';
import { incubationProgramsService } from '../../lib/incubationProgramsService';
import { financialsService } from '../../lib/financialsService';
import { validationService } from '../../lib/validationService';
import { recognitionService } from '../../lib/recognitionService';
import { storageService } from '../../lib/storage';
import { employeesService } from '../../lib/employeesService';
import { AuthUser } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';
import { formatCurrency, formatCurrencyCompact, getCurrencyForCountry } from '../../lib/utils';
import { useStartupCurrency } from '../../lib/hooks/useStartupCurrency';
import { generateInvestorListPDF, generateIndividualInvestorPDF, downloadBlob, InvestorReportData, IndividualInvestorReportData, PDFReportOptions } from '../../lib/pdfGenerator';
import { testInvestmentOffers } from '../../lib/testInvestmentOffers';

interface CapTableTabProps {
  startup: Startup;
  userRole?: UserRole;
  user?: AuthUser;
  onActivateFundraising: (details: FundraisingDetails, startup: Startup) => void;
  onInvestorAdded: (investment: InvestmentRecord, startup: Startup) => void;
  onUpdateFounders: (startupId: number, founders: Founder[]) => void;
  isViewOnly?: boolean;
}

interface FounderStateItem extends Founder {
  id: number;
}

interface InvestmentSummary {
  totalEquityFunding: number;
  totalDebtFunding: number;
  totalGrantFunding: number;
  totalInvestments: number;
  avgEquityAllocated: number;
}

interface ValuationHistoryData {
  roundName: string;
  valuation: number;
  investmentAmount: number;
  date: string;
}

interface EquityDistributionData {
  holderType: string;
  equityPercentage: number;
  totalAmount: number;
}

// Types for offers received
interface OfferReceived {
  id: string;
  from: string;
  type: 'Incubation' | 'Due Diligence' | 'Investment';
  offerDetails: string;
  status: 'pending' | 'accepted' | 'rejected';
  code: string;
  agreementUrl?: string;
  applicationId?: string;
  createdAt: string;
  isInvestmentOffer?: boolean;
  investmentOfferId?: number;
  startupScoutingFee?: number;
  investorScoutingFee?: number;
  contactDetailsRevealed?: boolean;
}

// Currency formatting functions - using startup's currency
const formatCurrencyLocal = (value: number, currency: string) => formatCurrency(value, currency);
const formatCurrencyCompactLocal = (value: number, currency: string) => formatCurrencyCompact(value, currency);

const COLORS = ['#1e40af', '#1d4ed8', '#3b82f6', '#60a5fa'];

const CapTableTab: React.FC<CapTableTabProps> = ({ startup, userRole, user, onActivateFundraising, onInvestorAdded, onUpdateFounders, isViewOnly }) => {
    const startupCurrency = useStartupCurrency(startup);
    const [isEditing, setIsEditing] = useState(false);
    const [isFundraisingModalOpen, setIsFundraisingModalOpen] = useState(false);
    const [isAddInvestorModalOpen, setIsAddInvestorModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [esopData, setEsopData] = useState<{esopReservedShares: number, totalShares: number, pricePerShare: number} | null>(null);
    
    // Debug startup object - FORCE VISIBLE
    // Component initialized successfully
    
    // Direct database check
    useEffect(() => {
        const checkDatabaseDirectly = async () => {
            if (startup?.id) {
                console.log('🔍 DIRECT DATABASE CHECK FOR STARTUP ID:', startup.id);
                
                // Check founders directly
                const { data: foundersData, error: foundersError } = await supabase
                    .from('founders')
                    .select('*')
                    .eq('startup_id', startup.id);
                console.log('🔍 Direct founders query result:', foundersData, foundersError);
                
                // Check startup_shares directly - THIS IS CRITICAL
                const { data: sharesData, error: sharesError } = await supabase
                    .from('startup_shares')
                    .select('*')
                    .eq('startup_id', startup.id);
                console.log('🚨 CRITICAL - Direct startup_shares query result:', sharesData, sharesError);
                console.log('🚨 CRITICAL - ESOP reserved shares from database:', sharesData?.[0]?.esop_reserved_shares);
                
                // Check startups table for profile data
                const { data: profileData, error: profileError } = await supabase
                    .from('startups')
                    .select('country_of_registration, company_type, registration_date, currency, country, total_shares, price_per_share, esop_reserved_shares')
                    .eq('id', startup.id);
                console.log('🔍 Direct profile query result:', profileData, profileError);
            }
        };
        
        checkDatabaseDirectly();
    }, [startup?.id]);
    
    // Real data states
    const [investmentRecords, setInvestmentRecords] = useState<InvestmentRecord[]>([]);
    const [recognitionRecords, setRecognitionRecords] = useState<RecognitionRecord[]>([]);
    const [founders, setFounders] = useState<Founder[]>([]);
    const [fundraisingDetails, setFundraisingDetails] = useState<FundraisingDetails[]>([]);
    const [valuationHistory, setValuationHistory] = useState<ValuationHistoryData[]>([]);
    const [equityDistribution, setEquityDistribution] = useState<EquityDistributionData[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [investmentSummary, setInvestmentSummary] = useState<InvestmentSummary>({
        totalEquityFunding: 0,
        totalDebtFunding: 0,
        totalGrantFunding: 0,
        totalInvestments: 0,
        avgEquityAllocated: 0
    });

    // Toggle system state
    const [entryType, setEntryType] = useState<'investment' | 'recognition'>('investment');
    const [feeType, setFeeType] = useState<FeeType>(FeeType.Free);

    const canEdit = (userRole === 'Startup' || userRole === 'Admin') && !isViewOnly;
    console.log('CapTableTab - userRole:', userRole, 'isViewOnly:', isViewOnly, 'canEdit:', canEdit);
    
    // Form states
    const [isEditingFundraising, setIsEditingFundraising] = useState(false);
    const [fundraising, setFundraising] = useState<FundraisingDetails>({
        active: false,
        type: InvestmentType.SeriesA,
        value: 5000000,
        equity: 15,
        validationRequested: false,
        pitchDeckUrl: '',
        pitchVideoUrl: '',
    });
    const [pitchDeckFile, setPitchDeckFile] = useState<File | null>(null);
    
    const [isFounderModalOpen, setIsFounderModalOpen] = useState(false);
    const [editingFounders, setEditingFounders] = useState<FounderStateItem[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [investmentToDelete, setInvestmentToDelete] = useState<InvestmentRecord | null>(null);
    const [isEditInvestmentModalOpen, setIsEditInvestmentModalOpen] = useState(false);
    const [editingInvestment, setEditingInvestment] = useState<InvestmentRecord | null>(null);
    const [isEditRecognitionModalOpen, setIsEditRecognitionModalOpen] = useState(false);
    const [editingRecognition, setEditingRecognition] = useState<RecognitionRecord | null>(null);
    const [isDeleteRecognitionModalOpen, setIsDeleteRecognitionModalOpen] = useState(false);
    const [recognitionToDelete, setRecognitionToDelete] = useState<RecognitionRecord | null>(null);
    
    // Incubation Programs states
    const [incubationPrograms, setIncubationPrograms] = useState<IncubationProgram[]>([]);
    const [isDeleteProgramModalOpen, setIsDeleteProgramModalOpen] = useState(false);
    const [programToDelete, setProgramToDelete] = useState<IncubationProgram | null>(null);
    const [popularPrograms, setPopularPrograms] = useState<string[]>([]);
    const [financialRecords, setFinancialRecords] = useState<any[]>([]);
    // Total shares are now calculated automatically
    const [pricePerShare, setPricePerShare] = useState<number>(0);
    // Startup profile data from second stage registration
    const [startupProfileData, setStartupProfileData] = useState<any>(null);
    // Draft states for investment auto-calculations
    const [invAmountDraft, setInvAmountDraft] = useState<string>('');
    const [invEquityDraft, setInvEquityDraft] = useState<string>('');
    const [invPostMoneyDraft, setInvPostMoneyDraft] = useState<string>('');
    // New shares-based calculation states
    const [invSharesDraft, setInvSharesDraft] = useState<string>('');
    const [invPricePerShareDraft, setInvPricePerShareDraft] = useState<string>('');
    // Removed isSavingShares - no longer needed since total shares are calculated automatically

    // Recognition form state for equity calculations
    const [recSharesDraft, setRecSharesDraft] = useState<string>('');
    const [recPricePerShareDraft, setRecPricePerShareDraft] = useState<string>('');
    const [recAmountDraft, setRecAmountDraft] = useState<string>('');
    const [recEquityDraft, setRecEquityDraft] = useState<string>('');
    const [recPostMoneyDraft, setRecPostMoneyDraft] = useState<string>('');

    // Edit recognition form state for auto-calculations
    const [editRecSharesDraft, setEditRecSharesDraft] = useState<string>('');
    const [editRecPricePerShareDraft, setEditRecPricePerShareDraft] = useState<string>('');
    const [editRecAmountDraft, setEditRecAmountDraft] = useState<string>('');
    const [editRecEquityDraft, setEditRecEquityDraft] = useState<string>('');
    const [editRecPostMoneyDraft, setEditRecPostMoneyDraft] = useState<string>('');

    // Always keep local price per share synced with the most recent investment
    useEffect(() => {
        try {
            if (!startup?.id) return;
            const totalSharesNow = calculateTotalShares();

            if (investmentRecords && investmentRecords.length > 0) {
                const latest = [...investmentRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                const nextPricePerShare = (latest?.postMoneyValuation && totalSharesNow > 0) ? (latest.postMoneyValuation / totalSharesNow) : 0;
                if (nextPricePerShare > 0 && nextPricePerShare !== pricePerShare) {
                    setPricePerShare(nextPricePerShare);
                    capTableService.upsertPricePerShare(startup.id, nextPricePerShare).catch(() => {});
                    if (startup) startup.pricePerShare = nextPricePerShare;
                }
            } else {
                // Fallback: use price per share provided during second registration (stored on startup)
                const profilePps = Number(startup.pricePerShare) || 0;
                if (profilePps > 0 && profilePps !== pricePerShare) {
                    setPricePerShare(profilePps);
                    capTableService.upsertPricePerShare(startup.id, profilePps).catch(() => {});
                }
            }
        } catch (e) {
            // ignore
        }
        // Recompute when any share components change as they affect total shares
    }, [investmentRecords, founders, recognitionRecords, startup?.esopReservedShares, startup?.pricePerShare]);

    // Auto-calc for Edit Investment modal (amount, equity %, post-money)
    useEffect(() => {
        if (!isEditInvestmentModalOpen || !editingInvestment) return;
        const shares = Number((editingInvestment as any).shares) || 0;
        const pps = Number((editingInvestment as any).pricePerShare) || 0;
        if (shares > 0 && pps > 0) {
            const amount = shares * pps;
            const currentTotalShares = calculateTotalShares();
            const equityPercentage = currentTotalShares > 0 ? (shares / currentTotalShares) * 100 : 0;
            const postMoney = equityPercentage > 0 ? (amount * 100) / equityPercentage : 0;
            setEditingInvestment(prev => prev ? ({
                ...prev,
                investmentAmount: amount,
                equityAllocated: Number(equityPercentage.toFixed(2)),
                postMoneyValuation: postMoney,
            }) : prev);
        }
    }, [isEditInvestmentModalOpen, editingInvestment?.shares, editingInvestment?.pricePerShare]);

    // Helper function to calculate total shares including recognition records with equity
    const calculateTotalShares = () => {
        const totalFounderShares = founders.reduce((sum, founder) => sum + (founder.shares || 0), 0);
        const totalInvestorShares = investmentRecords.reduce((sum, inv) => sum + (inv.shares || 0), 0);
        const esopReservedShares = esopData?.esopReservedShares || startup.esopReservedShares || 0; // Use startup object as fallback
        const totalRecognitionShares = recognitionRecords
            .filter(rec => (rec.feeType === 'Equity' || rec.feeType === 'Hybrid') && rec.shares && rec.shares > 0)
            .reduce((sum, rec) => sum + (rec.shares || 0), 0);
        
        const totalShares = totalFounderShares + totalInvestorShares + esopReservedShares + totalRecognitionShares;
        
        console.log('📊 RECREATED Total Shares Calculation:', {
            totalFounderShares,
            totalInvestorShares,
            esopReservedShares,
            totalRecognitionShares,
            totalShares,
            esopData: esopData,
            esopDataEsopReservedShares: esopData?.esopReservedShares
        });
        
        return totalShares;
    };

    // Utility function to validate total shares allocation
    const validateSharesAllocation = (newShares: number, excludeInvestmentId?: string): { isValid: boolean; message?: string; availableShares: number } => {
        // Since total shares are now calculated automatically, this validation is no longer needed
        // Total shares will always equal the sum of all allocated shares
        return { isValid: true, availableShares: 0 };
    };

    // Utility function to validate and fix founder shares
    const validateAndFixFounderShares = (): { isValid: boolean; message?: string; fixedFounders?: any[] } => {
        // Since total shares are now calculated automatically, this validation is no longer needed
        // Total shares will always equal the sum of all allocated shares
        return { isValid: true };
    };
    // Removed isSharesModalOpen - no longer needed since total shares are calculated automatically


    // Load data on component mount
    useEffect(() => {
        console.log('🔄 useEffect triggered - loading data for startup:', startup?.id);
        if (startup?.id) {
            loadCapTableData();
            setupRealTimeSubscriptions();
        }
    }, [startup?.id]); // Only depend on startup.id, not the entire startup object

    // Monitor esopData changes
    useEffect(() => {
        console.log('🚨 CRITICAL - esopData changed:', esopData);
    }, [esopData]);

    // Validate shares allocation when data changes
    useEffect(() => {
        if (founders.length > 0) {
            const validation = validateAndFixFounderShares();
            if (!validation.isValid) {
                console.warn('⚠️ Shares allocation issue detected:', validation.message);
                // You could show a toast notification here
            }
        }
    }, [founders, investmentRecords, startup.esopReservedShares]);

    // Legacy calculation removed - now using shares-based calculation only

    // Auto-calc investment amount, equity, and post-money when shares or price changes
    useEffect(() => {
        const shares = Number(invSharesDraft);
        const pricePerShare = Number(invPricePerShareDraft);
        
        console.log('🔄 Auto-calculation triggered:', { shares, pricePerShare, invSharesDraft, invPricePerShareDraft });
        
        if (Number.isFinite(shares) && shares > 0 && Number.isFinite(pricePerShare) && pricePerShare > 0) {
            // Calculate investment amount
            const amount = shares * pricePerShare;
            setInvAmountDraft(String(amount));
            
            // Calculate equity percentage based on shares
            const currentTotalShares = calculateTotalShares();
            
            // Include the new shares in the total for post-money calculation
            const postMoneyTotalShares = currentTotalShares + shares;
            
            console.log('📊 Share calculation details:', {
                currentTotalShares,
                postMoneyTotalShares,
                shares
            });
            
            if (postMoneyTotalShares > 0) {
                const equityPercentage = (shares / postMoneyTotalShares) * 100;
                setInvEquityDraft(String(equityPercentage.toFixed(2)));
                
                // Calculate post-money valuation
                const postMoney = (amount * 100) / equityPercentage;
                setInvPostMoneyDraft(String(postMoney.toFixed(2)));
                
                console.log('✅ Calculations completed:', {
                    amount,
                    equityPercentage: equityPercentage.toFixed(2),
                    postMoney: postMoney.toFixed(2),
                    currentTotalShares,
                    postMoneyTotalShares,
                    shares
                });
            } else {
                // Fallback: if no existing shares, use a reasonable default
                // Assume founders will have shares (common startup scenario)
                console.log('⚠️ No existing shares found, using fallback calculation');
                
                // Use a reasonable assumption: if this is the first investment, 
                // assume founders will have 80% and this investment gets 20%
                const assumedFounderShares = shares * 4; // 4x the investment shares
                const totalSharesWithFounders = assumedFounderShares + shares;
                const equityPercentage = (shares / totalSharesWithFounders) * 100;
                
                setInvEquityDraft(String(equityPercentage.toFixed(2)));
                setInvPostMoneyDraft(String(amount.toFixed(2)));
                
                console.log('📊 Fallback calculation:', {
                    assumedFounderShares,
                    totalSharesWithFounders,
                    equityPercentage: equityPercentage.toFixed(2),
                    amount
                });
            }
        } else if (shares === 0 || pricePerShare === 0) {
            // Clear calculations if either field is empty
            setInvAmountDraft('');
            setInvEquityDraft('');
            setInvPostMoneyDraft('');
        }
    }, [invSharesDraft, invPricePerShareDraft, founders, investmentRecords, startup.esopReservedShares, recognitionRecords]);

    // Auto-calc recognition amount, equity, and post-money when shares or price changes (for equity/hybrid fee types)
    useEffect(() => {
        const shares = Number(recSharesDraft);
        const pricePerShare = Number(recPricePerShareDraft);
        
        console.log('🔄 Recognition auto-calculation triggered:', { shares, pricePerShare, recSharesDraft, recPricePerShareDraft });
        
        if (Number.isFinite(shares) && shares > 0 && Number.isFinite(pricePerShare) && pricePerShare > 0) {
            // Calculate investment amount
            const amount = shares * pricePerShare;
            setRecAmountDraft(String(amount));
            
            // Calculate equity percentage based on shares
            const currentTotalShares = calculateTotalShares();
            
            // Include the new shares in the total for post-money calculation
            const postMoneyTotalShares = currentTotalShares + shares;
            
            console.log('📊 Recognition share calculation details:', {
                currentTotalShares,
                postMoneyTotalShares,
                shares
            });
            
            if (postMoneyTotalShares > 0) {
                const equityPercentage = (shares / postMoneyTotalShares) * 100;
                setRecEquityDraft(String(equityPercentage.toFixed(2)));
                
                // Calculate post-money valuation
                const postMoney = (amount * 100) / equityPercentage;
                setRecPostMoneyDraft(String(postMoney.toFixed(2)));
                
                console.log('✅ Recognition calculations completed:', {
                    amount,
                    equityPercentage: equityPercentage.toFixed(2),
                    postMoney: postMoney.toFixed(2),
                    currentTotalShares,
                    postMoneyTotalShares,
                    shares
                });
            } else {
                // Fallback: if no existing shares, use a reasonable default
                console.log('⚠️ No existing shares found for recognition, using fallback calculation');
                
                // Use a reasonable assumption: if this is the first investment, 
                // assume founders will have 80% and this recognition gets 20%
                const assumedFounderShares = shares * 4; // 4x the recognition shares
                const totalSharesWithFounders = assumedFounderShares + shares;
                const equityPercentage = (shares / totalSharesWithFounders) * 100;
                
                setRecEquityDraft(String(equityPercentage.toFixed(2)));
                setRecPostMoneyDraft(String(amount.toFixed(2)));
                
                console.log('📊 Recognition fallback calculation:', {
                    assumedFounderShares,
                    totalSharesWithFounders,
                    equityPercentage: equityPercentage.toFixed(2),
                    amount
                });
            }
        } else if (shares === 0 || pricePerShare === 0) {
            // Clear calculations if either field is empty
            setRecAmountDraft('');
            setRecEquityDraft('');
            setRecPostMoneyDraft('');
        }
    }, [recSharesDraft, recPricePerShareDraft, founders, investmentRecords, startup.esopReservedShares, recognitionRecords]);

    // Auto-calc edit recognition amount, equity, and post-money when shares or price changes
    useEffect(() => {
        const shares = Number(editRecSharesDraft);
        const pricePerShare = Number(editRecPricePerShareDraft);
        
        console.log('🔄 Edit Recognition auto-calculation triggered:', { shares, pricePerShare, editRecSharesDraft, editRecPricePerShareDraft });
        
        if (Number.isFinite(shares) && shares > 0 && Number.isFinite(pricePerShare) && pricePerShare > 0) {
            // Calculate investment amount
            const amount = shares * pricePerShare;
            setEditRecAmountDraft(String(amount));
            
            // Calculate equity percentage based on shares
            const currentTotalShares = calculateTotalShares();
            
            // Include the new shares in the total for post-money calculation
            const postMoneyTotalShares = currentTotalShares + shares;
            
            console.log('📊 Edit Recognition share calculation details:', {
                currentTotalShares,
                postMoneyTotalShares,
                shares
            });
            
            if (postMoneyTotalShares > 0) {
                const equityPercentage = (shares / postMoneyTotalShares) * 100;
                setEditRecEquityDraft(String(equityPercentage.toFixed(2)));
                
                // Calculate post-money valuation
                const postMoney = (amount * 100) / equityPercentage;
                setEditRecPostMoneyDraft(String(postMoney.toFixed(2)));
                
                console.log('✅ Edit Recognition calculations completed:', {
                    amount,
                    equityPercentage: equityPercentage.toFixed(2),
                    postMoney: postMoney.toFixed(2),
                    currentTotalShares,
                    postMoneyTotalShares,
                    shares
                });
            } else {
                // Fallback: if no existing shares, use a reasonable default
                console.log('⚠️ No existing shares found for edit recognition, using fallback calculation');
                
                // Use a reasonable assumption: if this is the first investment, 
                // assume founders will have 80% and this recognition gets 20%
                const assumedFounderShares = shares * 4; // 4x the recognition shares
                const totalSharesWithFounders = assumedFounderShares + shares;
                const equityPercentage = (shares / totalSharesWithFounders) * 100;
                
                setEditRecEquityDraft(String(equityPercentage.toFixed(2)));
                setEditRecPostMoneyDraft(String(amount.toFixed(2)));
                
                console.log('📊 Edit Recognition fallback calculation:', {
                    assumedFounderShares,
                    totalSharesWithFounders,
                    equityPercentage: equityPercentage.toFixed(2),
                    amount
                });
            }
        } else if (shares === 0 || pricePerShare === 0) {
            // Clear calculations if either field is empty
            setEditRecAmountDraft('');
            setEditRecEquityDraft('');
            setEditRecPostMoneyDraft('');
        }
    }, [editRecSharesDraft, editRecPricePerShareDraft, founders, investmentRecords, startup.esopReservedShares, recognitionRecords]);

    // Initialize edit recognition form state when modal opens
    useEffect(() => {
        if (isEditRecognitionModalOpen && editingRecognition) {
            setEditRecSharesDraft(editingRecognition.shares?.toString() || '');
            setEditRecPricePerShareDraft(editingRecognition.pricePerShare?.toString() || '');
            setEditRecAmountDraft(editingRecognition.investmentAmount?.toString() || '');
            setEditRecEquityDraft(editingRecognition.equityAllocated?.toString() || '');
            setEditRecPostMoneyDraft(editingRecognition.postMoneyValuation?.toString() || '');
        }
    }, [isEditRecognitionModalOpen, editingRecognition]);

    // Recompute price per share whenever shares or valuation data changes
    useEffect(() => {
        const calculatedTotalShares = calculateTotalShares();
        
        if (calculatedTotalShares <= 0) {
            setPricePerShare(0);
            return;
        }
        // Use latest post-money valuation if available; fallback to startup.currentValuation
        let latestValuation = startup.currentValuation || 0;
        if (investmentRecords && investmentRecords.length > 0) {
            const latest = [...investmentRecords]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] as any;
            if (latest?.postMoneyValuation && latest.postMoneyValuation > 0) {
                latestValuation = latest.postMoneyValuation;
            }
        }
        const computed = latestValuation > 0 ? (latestValuation / calculatedTotalShares) : 0;
        setPricePerShare(computed);
    }, [founders, investmentRecords, startup.currentValuation, startup.esopReservedShares, recognitionRecords]);

    // Real-time subscription for offers received
    useEffect(() => {
        if (!startup?.id) return;

        console.log('🔔 Setting up real-time subscription for startup:', startup.id);

        const channel = supabase
            .channel('offers_received_changes')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'opportunity_applications',
                filter: 'startup_id=eq.' + startup.id
            }, async (payload) => {
                console.log('🔄 Offers received change detected:', payload);
                console.log('📝 Change details:', {
                    event: payload.eventType,
                    table: payload.table,
                    record: payload.new,
                    old: payload.old
                });
            })
            .subscribe((status) => {
                console.log('📡 Real-time subscription status:', status);
            });

        return () => { 
            console.log('🔌 Unsubscribing from offers received changes');
            channel.unsubscribe(); 
        };
    }, [startup.id]);

                // Real-time subscription for recognition records changes
            useEffect(() => {
                if (!startup?.id) return;

                console.log('🔔 Setting up real-time subscription for recognition records:', startup.id);

                const channel = supabase
                    .channel('recognition_records_changes')
                    .on('postgres_changes', { 
                        event: '*', 
                        schema: 'public', 
                        table: 'recognition_records',
                        filter: 'startup_id=eq.' + startup.id
                    }, async (payload) => {
                        console.log('🔄 Recognition records change detected:', payload);
                        console.log('📝 Change details:', {
                            event: payload.eventType,
                            table: payload.table,
                            record: payload.new,
                            old: payload.old
                        });
                        // Refresh recognition records when they change
                        const recognitionData = await recognitionService.getRecognitionRecordsByStartupId(startup.id);
                        setRecognitionRecords(recognitionData);
                    })
                    .subscribe((status) => {
                        console.log('📡 Recognition records real-time subscription status:', status);
                    });

                return () => { 
                    console.log('🔌 Unsubscribing from recognition records changes');
                    channel.unsubscribe(); 
                };
            }, [startup.id]);

    const loadCapTableData = async () => {
        if (!startup?.id) return;
        
        console.log('🔍 CapTableTab loading data for startup ID:', startup.id);
        console.log('🔍 Startup object:', startup);
        console.log('🔍 Startup ESOP data:', {
            esopReservedShares: startup.esopReservedShares,
            pricePerShare: startup.pricePerShare,
            totalShares: startup.totalShares
        });
        
        setIsLoading(true);
        setError(null);
        
        try {
            const [
                records,
                foundersData,
                fundraisingData,
                valuationData,
                equityData,
                summaryData,
                totalSharesData,
                incubationProgramsData,
                popularProgramsData,
                financialRecordsData,
                recognitionData,
                startupData,
                employeesData
            ] = await Promise.allSettled([
                            capTableService.getInvestmentRecords(startup.id),
            capTableService.getFounders(startup.id),
            capTableService.getFundraisingDetails(startup.id),
            capTableService.getValuationHistoryData(startup.id),
            capTableService.getEquityDistributionData(startup.id),
            capTableService.getInvestmentSummary(startup.id),
            capTableService.getStartupSharesData(startup.id),
                            incubationProgramsService.getIncubationPrograms(startup.id),
                incubationProgramsService.getPopularPrograms(),
                financialsService.getFinancialRecords(startup.id),
                recognitionService.getRecognitionRecordsByStartupId(startup.id),
                // Load startup data to get country, registration info, and profile data (all from startups table)
                supabase.from('startups').select('country_of_registration, company_type, registration_date, currency, country, total_shares, price_per_share').eq('id', startup.id).single(),
                employeesService.getEmployees(startup.id)
            ]);

            // Handle each result individually
            setInvestmentRecords(records.status === 'fulfilled' ? records.value : []);
            
            // Check if startup already has founders data (e.g., from facilitator access)
            const hasExistingFoundersData = startup.founders && startup.founders.length > 0;
            
            if (hasExistingFoundersData) {
                console.log('🔍 Startup already has founders data, preserving it:', startup.founders);
                setFounders(startup.founders);
            } else {
            const foundersResult = foundersData.status === 'fulfilled' ? foundersData.value : [];
                console.log('🔍 Founders data loaded from database:', foundersResult);
            console.log('🔍 Founders data status:', foundersData.status);
            if (foundersData.status === 'rejected') {
                console.error('❌ Founders data loading failed:', foundersData.reason);
            }
            setFounders(foundersResult);
            }
            
            // Debug all the data loading results
            console.log('🔍 All data loading results:');
            console.log('Records:', records.status, records.status === 'fulfilled' ? records.value.length : records.reason);
            console.log('Founders:', foundersData.status, foundersData.status === 'fulfilled' ? foundersData.value.length : foundersData.reason);
            console.log('Total Shares:', totalSharesData.status, totalSharesData.status === 'fulfilled' ? totalSharesData.value : totalSharesData.reason);
            setFundraisingDetails(fundraisingData.status === 'fulfilled' ? fundraisingData.value : []);
            setValuationHistory(valuationData.status === 'fulfilled' ? valuationData.value.map(item => ({
                roundName: item.round_name,
                valuation: item.valuation,
                investmentAmount: item.investment_amount,
                date: item.date
            })) : []);
            setEquityDistribution(equityData.status === 'fulfilled' ? equityData.value.map(item => ({
                holderType: item.holder_type,
                equityPercentage: item.equity_percentage,
                totalAmount: item.total_amount
            })) : []);
            setEmployees(employeesData.status === 'fulfilled' ? employeesData.value : []);
            setInvestmentSummary(summaryData.status === 'fulfilled' ? {
                totalEquityFunding: summaryData.value.total_equity_funding || 0,
                totalDebtFunding: summaryData.value.total_debt_funding || 0,
                totalGrantFunding: summaryData.value.total_grant_funding || 0,
                totalInvestments: summaryData.value.total_investments || 0,
                avgEquityAllocated: summaryData.value.avg_equity_allocated || 0
            } : {
                totalEquityFunding: 0,
                totalDebtFunding: 0,
                totalGrantFunding: 0,
                totalInvestments: 0,
                avgEquityAllocated: 0
            });

            // Handle shares data - only load ESOP reserved shares and price per share
            // Check if startup already has share data (e.g., from facilitator access)
            // Only consider it existing if the values are meaningful (not 0 or undefined)
            const hasExistingShareData = (startup.esopReservedShares !== undefined && startup.esopReservedShares > 0) || 
                                       (startup.pricePerShare !== undefined && startup.pricePerShare > 0);
            
            console.log('🚨 CRITICAL - totalSharesData status check:', {
                totalSharesDataStatus: totalSharesData.status,
                hasExistingShareData,
                startupEsopReservedShares: startup.esopReservedShares,
                startupPricePerShare: startup.pricePerShare
            });
            
            if (hasExistingShareData) {
                console.log('🔍 Startup already has share data, preserving it:', {
                    esopReservedShares: startup.esopReservedShares,
                    pricePerShare: startup.pricePerShare,
                    totalShares: startup.totalShares
                });
                setPricePerShare(startup.pricePerShare || 0);
            } else if (totalSharesData.status === 'fulfilled') {
                console.log('🚨 CRITICAL - totalSharesData.status is fulfilled');
                const sharesData = totalSharesData.value;
                console.log('🚨 CRITICAL - sharesData from totalSharesData:', sharesData);
                const esopShares = Number(sharesData.esopReservedShares) || 0;
                const pricePerShare = Number(sharesData.pricePerShare) || 0;
                
                console.log('🔍 Shares data loaded from database:', { esopShares, pricePerShare });
                console.log('🔍 Raw shares data:', sharesData);
                console.log('🔍 Setting price per share to:', pricePerShare);
                
                setPricePerShare(pricePerShare);
                
                // Update startup object with ESOP reserved shares
                if (startup) {
                    startup.esopReservedShares = esopShares;
                    startup.totalShares = sharesData.totalShares || 0;
                    startup.pricePerShare = pricePerShare;
                    console.log('✅ Updated startup object with fresh data:', {
                        esopReservedShares: startup.esopReservedShares,
                        totalShares: startup.totalShares,
                        pricePerShare: startup.pricePerShare
                    });
                    console.log('🔍 Startup object after update:', startup);
                }
                    
                    // Update ESOP data state to force re-render
                const newEsopData = {
                        esopReservedShares: esopShares,
                        totalShares: sharesData.totalShares || 0,
                        pricePerShare: pricePerShare
                };
                setEsopData(newEsopData);
                
                console.log('✅ ESOP data state updated from startup_shares table:', newEsopData);
                console.log('🚨 CRITICAL DEBUG - setEsopData called with:', newEsopData);
                
                // Calculate and save price per share if not already saved
                if (pricePerShare === 0 && sharesData.totalShares > 0) {
                    console.log('🔄 No price per share in database, calculating and saving...');
                    try {
                        // Get latest valuation
                        let latestValuation = startup.currentValuation || 0;
                        if (investmentRecords && investmentRecords.length > 0) {
                            const latest = [...investmentRecords]
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] as any;
                            if (latest?.postMoneyValuation && latest.postMoneyValuation > 0) {
                                latestValuation = latest.postMoneyValuation;
                            }
                        }
                        
                        if (latestValuation > 0) {
                            const calculatedPricePerShare = latestValuation / sharesData.totalShares;
                            console.log('✅ Calculated price per share:', calculatedPricePerShare, '(Valuation:', latestValuation, '/ Shares:', sharesData.totalShares, ')');
                            
                            // Save to database
                            await capTableService.upsertPricePerShare(startup.id, calculatedPricePerShare);
                            console.log('✅ Saved calculated price per share to database:', calculatedPricePerShare);
                            
                            // Update local state
                            setPricePerShare(calculatedPricePerShare);
                            if (startup) {
                                startup.pricePerShare = calculatedPricePerShare;
                            }
                        }
                    } catch (err) {
                        console.error('❌ Failed to calculate and save price per share:', err);
                    }
                }
                
                // Check if startup_shares record exists, if not, create it with default ESOP
                if (esopShares === 0 && pricePerShare === 0) {
                    console.log('⚠️ No startup_shares record found, creating default record...');
                    try {
                        const defaultEsopShares = 10000;
                        await capTableService.upsertEsopReservedShares(startup.id, defaultEsopShares);
                        console.log('✅ Created default startup_shares record with ESOP:', defaultEsopShares);
                        
                        // Update startup object with new ESOP data
                        if (startup) {
                            startup.esopReservedShares = defaultEsopShares;
                        }
                    } catch (err) {
                        console.error('❌ Failed to create default startup_shares record:', err);
                    }
                }
            } else {
                console.error('❌ Shares data loading failed:', totalSharesData.reason);
                // Try to load from startup_profiles table as fallback
                try {
                    const { data: profileData } = await supabase
                        .from('startup_profiles')
                        .select('price_per_share, esop_reserved_shares')
                        .eq('startup_id', startup.id)
                        .single();
                    
                    if (profileData) {
                        console.log('🔄 Fallback: Loading shares from startup_profiles:', profileData);
                        setPricePerShare(profileData.price_per_share || 0);
                        if (startup) {
                            startup.esopReservedShares = profileData.esop_reserved_shares || 0;
                        }
                        
                        // Update ESOP data state from fallback
                        const fallbackEsopData = {
                            esopReservedShares: profileData.esop_reserved_shares || 0,
                            totalShares: 0,
                            pricePerShare: profileData.price_per_share || 0
                        };
                        setEsopData(fallbackEsopData);
                        console.log('🚨 CRITICAL DEBUG - setEsopData called from fallback with:', fallbackEsopData);
                    } else {
                        setPricePerShare(0);
                        const defaultEsopData = {
                            esopReservedShares: 0,
                            totalShares: 0,
                            pricePerShare: 0
                        };
                        setEsopData(defaultEsopData);
                        console.log('🚨 CRITICAL DEBUG - setEsopData called with default values:', defaultEsopData);
                    }
                } catch (fallbackError) {
                    console.error('❌ Fallback shares loading also failed:', fallbackError);
                    setPricePerShare(0);
                }
            }

            // Set current fundraising details if available
            if (fundraisingData.status === 'fulfilled' && fundraisingData.value.length > 0) {
                setFundraising(fundraisingData.value[0]);
                setPitchDeckFile(null); // Reset file state when loading fundraising data
            }

            // Handle recognition records
            if (recognitionData.status === 'fulfilled') {
                setRecognitionRecords(recognitionData.value);
                console.log('✅ Recognition records loaded:', recognitionData.value.length);
            } else {
                console.error('Failed to load recognition records:', recognitionData.reason);
            }

            // Handle startup profile data (without ESOP data - that comes from startup_shares)
            console.log('🔍 Processing startup profile data...');
            console.log('🔍 Startup data status:', startupData.status);
            
            if (startupData.status === 'rejected') {
                console.error('❌ Startup data loading failed:', startupData.reason);
            }
            
            const startupDataResult = startupData.status === 'fulfilled' ? startupData.value : null;
            
            console.log('🔍 Startup data result:', startupDataResult);
            
            if (startupDataResult) {
                setStartupProfileData(startupDataResult);
                console.log('✅ Startup profile data loaded and set:', startupDataResult);
            } else {
                console.log('⚠️ No startup profile data available');
            }

            // Currency is now handled by the useStartupCurrency hook

            // Log any errors for debugging
            [records, foundersData, fundraisingData, valuationData, equityData, summaryData, incubationProgramsData, popularProgramsData, financialRecordsData, recognitionData].forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.warn('Failed to load data ' + index + ':', result.reason);
                }
            });

            // Debug loaded data
            console.log('📊 Equity Allocation Data Loaded:', {
                investmentRecords: records.status === 'fulfilled' ? records.value.length : 'failed',
                founders: foundersData.status === 'fulfilled' ? foundersData.value.length : 'failed',
                fundraisingDetails: fundraisingData.status === 'fulfilled' ? fundraisingData.value.length : 'failed',
                valuationHistory: valuationData.status === 'fulfilled' ? valuationData.value.length : 'failed',
                equityDistribution: equityData.status === 'fulfilled' ? equityData.value.length : 'failed',
                investmentSummary: summaryData.status === 'fulfilled' ? summaryData.value : 'failed',
                totalShares: totalSharesData.status === 'fulfilled' ? totalSharesData.value : 'failed',
                incubationPrograms: incubationProgramsData.status === 'fulfilled' ? incubationProgramsData.value.length : 'failed',
                popularPrograms: popularProgramsData.status === 'fulfilled' ? popularProgramsData.value.length : 'failed',
                financialRecords: financialRecordsData.status === 'fulfilled' ? financialRecordsData.value.length : 'failed',
                recognitionRecords: recognitionData.status === 'fulfilled' ? recognitionData.value.length : 'failed'
            });
            
            // Debug summary data specifically
            if (summaryData.status === 'fulfilled') {
                console.log('💰 Investment Summary Raw Data:', summaryData.value);
                console.log('💰 Investment Summary Mapped Data:', {
                    totalEquityFunding: summaryData.value.total_equity_funding || 0,
                    totalDebtFunding: summaryData.value.total_debt_funding || 0,
                    totalGrantFunding: summaryData.value.total_grant_funding || 0,
                    totalInvestments: summaryData.value.total_investments || 0,
                    avgEquityAllocated: summaryData.value.avg_equity_allocated || 0
                });
            }
            
            // Debug valuation history data specifically
            if (valuationData.status === 'fulfilled') {
                console.log('📈 Valuation History Raw Data:', valuationData.value);
                console.log('📈 Valuation History Mapped Data:', valuationData.value.map(item => ({
                    roundName: item.round_name,
                    valuation: item.valuation,
                    investmentAmount: item.investment_amount,
                    date: item.date
                })));
            } else if (valuationData.status === 'rejected') {
                console.error('❌ Valuation History Failed:', valuationData.reason);
            }
            
            // Debug equity distribution data specifically
            if (equityData.status === 'fulfilled') {
                console.log('🥧 Equity Distribution Raw Data:', equityData.value);
                console.log('🥧 Equity Distribution Mapped Data:', equityData.value.map(item => ({
                    holderType: item.holder_type,
                    equityPercentage: item.equity_percentage,
                    totalAmount: item.total_amount
                })));
            } else if (equityData.status === 'rejected') {
                console.error('❌ Equity Distribution Failed:', equityData.reason);
            }

            // Process incubation programs data
            if (incubationProgramsData.status === 'fulfilled') {
                setIncubationPrograms(incubationProgramsData.value);
                console.log('🎓 Incubation Programs Data:', incubationProgramsData.value);
                console.log('🎓 Incubation Programs Count:', incubationProgramsData.value?.length || 0);
            } else if (incubationProgramsData.status === 'rejected') {
                console.error('❌ Incubation Programs Failed:', incubationProgramsData.reason);
                setIncubationPrograms([]);
            } else {
                console.log('⚠️ Incubation Programs Status: unavailable');
                setIncubationPrograms([]);
            }

            if (popularProgramsData.status === 'fulfilled') {
                setPopularPrograms(popularProgramsData.value);
                console.log('📚 Popular Programs:', popularProgramsData.value);
            }

            if (financialRecordsData.status === 'fulfilled') {
                setFinancialRecords(financialRecordsData.value);
                console.log('💰 Financial Records:', financialRecordsData.value.length, 'records loaded');
                
                // Debug: Check for pooja-related records
                const poojaRecords = financialRecordsData.value.filter(record => 
                    record.funding_source && record.funding_source.toLowerCase().includes('pooja')
                );
                if (poojaRecords.length > 0) {
                    console.log('🔍 Found Pooja Financial Records:', poojaRecords);
                } else {
                    console.log('⚠️ No Pooja financial records found');
                }
                
                // Debug: Show all funding sources
                const allFundingSources = financialRecordsData.value
                    .filter(record => record.funding_source)
                    .map(record => record.funding_source);
                console.log('📋 All Funding Sources:', allFundingSources);
            } else if (financialRecordsData.status === 'rejected') {
                console.error('❌ Financial Records Failed:', financialRecordsData.reason);
            }
        } catch (err) {
            console.error('Error loading equity allocation data:', err);
            setError('Failed to load equity allocation data');
        } finally {
            setIsLoading(false);
        }
    };

    const setupRealTimeSubscriptions = () => {
        if (!startup?.id) return;

        // Subscribe to real-time changes
        const investmentSubscription = capTableService.subscribeToInvestmentRecords(startup.id, (records) => {
            setInvestmentRecords(records);
        });

        const foundersSubscription = capTableService.subscribeToFounders(startup.id, (founders) => {
            setFounders(founders);
        });

        const fundraisingSubscription = capTableService.subscribeToFundraisingDetails(startup.id, (details) => {
            setFundraisingDetails(details);
            if (details.length > 0) {
                setFundraising(details[0]);
                setPitchDeckFile(null); // Reset file state when fundraising data updates
            }
        });

        const incubationProgramsSubscription = incubationProgramsService.subscribeToIncubationPrograms(startup.id, (programs) => {
            setIncubationPrograms(programs);
        });

        // Cleanup subscriptions on unmount
        return () => {
            investmentSubscription?.unsubscribe();
            foundersSubscription?.unsubscribe();
            fundraisingSubscription?.unsubscribe();
            incubationProgramsSubscription?.unsubscribe();
        };
    };

    const handleEditFoundersClick = () => {
        console.log('🔧 Opening founder edit modal with founders:', founders);
        setEditingFounders(founders.map(f => ({ ...f, id: Math.random() * 10000 })));
        setIsFounderModalOpen(true);
    };

    const handleFounderChange = (id: number, field: keyof Omit<FounderStateItem, 'id'>, value: string) => {
        console.log('✏️ Editing founder:', { id, field, value });
        setEditingFounders(editingFounders.map(f => {
            if (f.id === id) {
                const updatedFounder = { ...f };
                if (field === 'equityPercentage' || field === 'shares') {
                    // Convert to number for numeric fields
                    updatedFounder[field] = value === '' ? undefined : Number(value);
                } else {
                    updatedFounder[field] = value;
                }
                return updatedFounder;
            }
            return f;
        }));
    };

    const handleAddFounder = () => {
        setEditingFounders([...editingFounders, { 
            id: Date.now(), 
            name: '', 
            email: '', 
            equityPercentage: undefined, 
            shares: undefined 
        }]);
    };
    
    const handleRemoveFounder = (id: number) => {
        if (editingFounders.length > 1) {
            setEditingFounders(editingFounders.filter(f => f.id !== id));
        }
    };

    const handleFounderSave = async () => {
        if (!startup?.id) return;
        
        try {
            const finalFounders = editingFounders.map(({ id, ...rest }) => rest);
            
            // Validate shares allocation before saving
            const totalFounderShares = finalFounders.reduce((sum, founder) => sum + (founder.shares || 0), 0);
            const totalInvestorShares = investmentRecords.reduce((sum, inv) => sum + (inv.shares || 0), 0);
            const esopReservedShares = startup.esopReservedShares || 0;
            const totalAllocatedShares = totalFounderShares + totalInvestorShares + esopReservedShares;
            
            // No need to check for over-allocation since total shares are now calculated automatically
            
            console.log('💾 Saving founders with equity data:', finalFounders.map(f => ({
                name: f.name,
                email: f.email,
                equityPercentage: f.equityPercentage,
                shares: f.shares
            })));
            
            // Clear existing founders and add new ones
            await capTableService.deleteAllFounders(startup.id);
            console.log('🗑️ Deleted existing founders');
            
            for (const founder of finalFounders) {
                await capTableService.addFounder(startup.id, founder);
                console.log('➕ Added founder with equity:', {
                    name: founder.name,
                    equityPercentage: founder.equityPercentage,
                    shares: founder.shares
                });
            }
            
            onUpdateFounders(startup.id, finalFounders);
            setIsFounderModalOpen(false);
            setError(null); // Clear any previous errors
            console.log('✅ Founders saved successfully');
        } catch (err) {
            console.error('Error saving founders:', err);
            setError('Failed to save founder information');
        }
    };

    const handleFundraisingSave = async () => {
        if (!startup?.id) return;
        
        try {
            // Validate required fields
            if (!fundraising.type) {
                setError('Fundraising type is required');
                return;
            }
            if (!fundraising.value || fundraising.value <= 0) {
                setError('Valid fundraising value is required');
                return;
            }
            if (!fundraising.equity || fundraising.equity <= 0 || fundraising.equity > 100) {
                setError('Valid equity percentage (1-100%) is required');
                return;
            }

            // Show loading state
            setIsLoading(true);
            setError(null);

            // Handle pitch deck upload if user selected a file
            let deckUrl = fundraising.pitchDeckUrl;
            
            if (pitchDeckFile) {
                console.log('📁 Uploading pitch deck:', pitchDeckFile.name);
                deckUrl = await capTableService.uploadPitchDeck(pitchDeckFile, startup.id);
                console.log('✅ Pitch deck uploaded:', deckUrl);
                // Clear the file after successful upload
                setPitchDeckFile(null);
            }

            const toSave = { ...fundraising, pitchDeckUrl: deckUrl };
            console.log('💾 Saving fundraising details:', toSave);

            // Upsert via update-or-insert
            const savedFundraising = await capTableService.updateFundraisingDetails(startup.id, toSave);
            console.log('✅ Fundraising details saved:', savedFundraising);

            // Update local state with saved data
            setFundraising(savedFundraising);
            setFundraisingDetails([savedFundraising]);
            setPitchDeckFile(null); // Clear file after successful save
            
            // Handle validation request logic
            if (savedFundraising.validationRequested) {
                try {
                    console.log('🔄 Creating/updating validation request for startup:', startup.name);
                    const validationRequest = await validationService.createValidationRequest(startup.id, startup.name);
                    console.log('✅ Validation request processed:', validationRequest);
                    
                    // Show success message with validation info
                    messageService.success(
                      'Fundraising Activated',
                      startup.name + ' fundraising is now active! A Startup Nation validation request has been submitted and is pending admin approval.',
                      5000
                    );
                } catch (validationError) {
                    console.error('❌ Error processing validation request:', validationError);
                    messageService.warning(
                      'Fundraising Activated with Issue',
                      startup.name + ' fundraising is now active! However, there was an issue submitting the validation request. Please contact support.',
                      5000
                    );
                }
            } else {
                // If validation was unchecked, remove any existing validation request
                try {
                    console.log('🔄 Removing validation request for startup:', startup.name);
                    await validationService.removeValidationRequest(startup.id);
                    console.log('✅ Validation request removed');
                } catch (validationError) {
                    console.error('❌ Error removing validation request:', validationError);
                    // Don't show error to user as this is not critical
                }
                
                // Call parent callback for non-validation fundraising
                onActivateFundraising(savedFundraising, startup);
                messageService.success(
                  'Fundraising Activated',
                  startup.name + ' fundraising is now active!',
                  3000
                );
            }
            
            // Exit edit mode
            setIsEditingFundraising(false);
            
            // Show success message (you can replace this with a toast notification)
            console.log('🎉 Fundraising details updated successfully!');
            
            // Reload data to ensure everything is in sync
            await loadCapTableData();
            
        } catch (err) {
            console.error('❌ Error saving fundraising details:', err);
            
            // Provide more specific error messages
            let errorMessage = 'Failed to save fundraising details. Please try again.';
            
            if (err instanceof Error) {
                if (err.message.includes('RLS')) {
                    errorMessage = 'Permission denied. Please check your authentication.';
                } else if (err.message.includes('foreign key')) {
                    errorMessage = 'Invalid startup reference. Please refresh the page.';
                } else if (err.message.includes('unique constraint')) {
                    errorMessage = 'Fundraising details already exist for this startup.';
                } else if (err.message.includes('not null')) {
                    errorMessage = 'Please fill in all required fields.';
                } else {
                    errorMessage = 'Database error: ' + err.message;
                }
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddInvestment = async (e: React.FormEvent<HTMLFormElement>) => {
        console.log('🎯 handleAddInvestment called!');
        e.preventDefault();
        if (!startup?.id) {
            console.error('❌ No startup ID found!');
            return;
        }
        
        try {
            const formData = new FormData(e.currentTarget);
            const proofFile = (e.currentTarget.querySelector('input[name="inv-proof"]') as HTMLInputElement)?.files?.[0];
            
            // Debug form data
            console.log('🔍 Investment Form Debug:');
            console.log('Form data entries:');
            for (const [key, value] of formData.entries()) {
                console.log(key + ': ' + value);
            }
            
            // Debug current state
            console.log('Current state values:');
            console.log('invSharesDraft:', invSharesDraft);
            console.log('invPricePerShareDraft:', invPricePerShareDraft);
            console.log('invAmountDraft:', invAmountDraft);
            console.log('invEquityDraft:', invEquityDraft);
            console.log('invPostMoneyDraft:', invPostMoneyDraft);
            // totalShares removed - now calculated automatically
            console.log('esopReservedShares:', startup.esopReservedShares);
            console.log('founders:', founders.map(f => ({ name: f.name, shares: f.shares })));
            console.log('investmentRecords:', investmentRecords.map(inv => ({ name: inv.investorName, shares: inv.shares })));
            
            const date = formData.get('inv-date') as string;
            const investorType = formData.get('inv-investor-type') as InvestorType;
            const investmentType = formData.get('inv-type') as InvestmentRoundType;
            const investorName = formData.get('inv-name') as string;
            const investorCode = formData.get('inv-code') as string;
            const shares = Number(invSharesDraft);
            const pricePerShare = Number(invPricePerShareDraft);
            const amount = Number(invAmountDraft);
            const equityAllocated = Number(invEquityDraft);
            const postMoneyValuation = Number(invPostMoneyDraft) || ((equityAllocated && equityAllocated > 0) ? (amount * 100) / equityAllocated : 0);
            
            // Validate required fields
            if (!date) {
                setError('Date is required');
                return;
            }
            if (!investorType) {
                setError('Investor type is required');
                return;
            }
            if (!investmentType) {
                setError('Investment type is required');
                return;
            }
            if (!investorName) {
                setError('Investor name is required');
                return;
            }
            if (!shares || shares <= 0) {
                setError('Valid number of shares is required');
                return;
            }
            if (!pricePerShare || pricePerShare <= 0) {
                setError('Valid price per share is required');
                return;
            }
            if (!amount || amount <= 0) {
                setError('Valid investment amount is required');
                return;
            }
            if (!equityAllocated || equityAllocated < 0) {
                setError('Valid equity allocation is required');
                return;
            }
            
            // Validate that total shares don't exceed available shares
            console.log('🔍 Shares Validation Debug:');
            console.log('Requested shares:', shares);
            // Total shares now calculated automatically
            console.log('ESOP reserved shares:', startup.esopReservedShares);
            console.log('Founder shares:', founders.reduce((sum, founder) => sum + (founder.shares || 0), 0));
            console.log('Existing investor shares:', investmentRecords.reduce((sum, inv) => sum + (inv.shares || 0), 0));
            
            const validation = validateSharesAllocation(shares);
            console.log('Validation result:', validation);
            
            if (!validation.isValid) {
                console.error('❌ Shares validation failed:', validation.message);
                setError(validation.message || 'Invalid shares allocation');
                return;
            }
            if (!postMoneyValuation || postMoneyValuation <= 0) {
                setError('Post-money valuation could not be calculated');
                return;
            }
            
            let proofUrl = '';
            if (proofFile) {
                proofUrl = await capTableService.uploadProofDocument(startup.id, proofFile);
            }
            
            const newInvestment = {
                id: Date.now().toString(), // Temporary ID for UI state
                startupId: startup.id,
                date,
                investorType,
                investmentType,
                investorName,
                investorCode,
                amount,
                equityAllocated,
                shares,
                pricePerShare,
                postMoneyValuation: postMoneyValuation,
                proofUrl
            };
            
            console.log('Adding investment:', newInvestment);
            console.log('Startup ID:', startup.id);
            console.log('Investment data type:', typeof newInvestment);
            console.log('Investment data keys:', Object.keys(newInvestment));
            
            // Remove startupId from the data passed to service since it's passed separately
            const { startupId, ...investmentDataForService } = newInvestment;
            console.log('Investment data for service:', investmentDataForService);

            // 1) Save the investment record
            const savedInvestment = await capTableService.addInvestmentRecord(startup.id, investmentDataForService as any);
            console.log('✅ Investment record saved successfully:', savedInvestment);

            // Reset form drafts
            setInvAmountDraft('');
            setInvEquityDraft('');
            setInvPostMoneyDraft('');
            setInvSharesDraft('');
            setInvPricePerShareDraft('');

            // 2) Recompute price per share from latest post-money
            try {
                const latestList = [...(investmentRecords || []), savedInvestment].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const latest = latestList[0];
                const totalSharesNow = calculateTotalShares();
                const nextPricePerShare = (latest?.postMoneyValuation && totalSharesNow > 0) ? (latest.postMoneyValuation / totalSharesNow) : 0;
                if (nextPricePerShare > 0) {
                    await capTableService.upsertPricePerShare(startup.id, nextPricePerShare);
                    setPricePerShare(nextPricePerShare);
                    if (startup) startup.pricePerShare = nextPricePerShare;
                }
            } catch (ppsErr) {
                console.warn('Failed to recompute price per share after investment:', ppsErr);
            }

            // Note: Investor code validation can be added here in the future
            if (investorCode && investorCode.trim().length > 0) {
                console.log('Investor code provided:', investorCode);
                
                // 2) Call onInvestorAdded callback with the saved investment data
                console.log('🔄 Calling onInvestorAdded callback...');
                try {
                    onInvestorAdded(savedInvestment, startup);
                    console.log('✅ onInvestorAdded callback executed successfully');
                } catch (callbackError) {
                    console.error('❌ Error in onInvestorAdded callback:', callbackError);
                }
            } else {
                console.log('⚠️ No investor code provided, skipping onInvestorAdded callback');
            }
             
             // Safely reset the form
             if (e.currentTarget) {
                 e.currentTarget.reset();
             }
             setError(null); // Clear any previous errors
             
             // Force reload ALL data including charts
             console.log('🔄 Reloading data after adding investment...');
             await loadCapTableData();
             
             // Additional reload for chart data specifically
             try {
                 const [valuationData, equityData] = await Promise.allSettled([
                     capTableService.getValuationHistoryData(startup.id),
                     capTableService.getEquityDistributionData(startup.id)
                 ]);
                 
                 if (valuationData.status === 'fulfilled') {
                     setValuationHistory(valuationData.value.map(item => ({
                         roundName: item.round_name,
                         valuation: item.valuation,
                         investmentAmount: item.investment_amount,
                         date: item.date
                     })));
                     console.log('✅ Valuation history updated after investment');
                 }
                 
                 if (equityData.status === 'fulfilled') {
                     setEquityDistribution(equityData.value.map(item => ({
                         holderType: item.holder_type,
                         equityPercentage: item.equity_percentage,
                         totalAmount: item.total_amount
                     })));
                     console.log('✅ Equity distribution updated after investment');
                 }
             } catch (err) {
                 console.error('Error updating chart data:', err);
             }
        } catch (err) {
            console.error('Error adding investment:', err);
            setError('Failed to add investment');
        }
    };

    const handleDeleteInvestment = async (investment: InvestmentRecord) => {
        if (!startup?.id || !canEdit) return;
        
        try {
            setError(null);
            setIsLoading(true);
            
            console.log('🗑️ Deleting investment:', investment);
            console.log('💰 Amount to remove from total funding:', investment.amount);
            console.log('🏷️ Investor code to clean up:', investment.investorCode);
            
            // Delete from database (this will clean up the investment record)
            await capTableService.deleteInvestmentRecord(investment.id);
            
            // Update startup funding (reduce by the deleted investment amount)
            try {
                console.log('💰 Updating startup funding after investment deletion');
                await capTableService.updateStartupFundingAfterDeletion(startup.id, investment.amount);
            } catch (fundingError) {
                console.warn('⚠️ Warning: Could not update startup funding:', fundingError);
                // Don't fail the deletion if funding update fails
            }
            
            // Clean up startup addition requests for this investor code
            if (investment.investorCode) {
                try {
                    console.log('🧹 Cleaning up startup addition requests for investor code:', investment.investorCode);
                    await startupAdditionService.cleanupOrphanedRequests();
                } catch (cleanupError) {
                    console.warn('⚠️ Warning: Could not clean up startup addition requests:', cleanupError);
                    // Don't fail the deletion if cleanup fails
                }
            }
            
            // Remove from local state
            setInvestmentRecords(prev => prev.filter(inv => inv.id !== investment.id));
            
            // Close modal and clear selection
            setIsDeleteModalOpen(false);
            setInvestmentToDelete(null);
            
            // Reload ALL data to ensure charts and summaries are updated
            console.log('🔄 Reloading all data after investment deletion...');
            await loadCapTableData();
            
            console.log('✅ Investment and all related data deleted successfully from Supabase');
        } catch (err) {
            console.error('❌ Error deleting investment:', err);
            setError('Failed to delete investment. Please try again.');
            
            // Keep modal open on error so user can try again
            setIsLoading(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddRecognition = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!startup?.id) return;
        
        const formData = new FormData(e.currentTarget);
        const programName = formData.get('rec-program-name') as string;
        const facilitatorName = formData.get('rec-facilitator-name') as string;
        const facilitatorCode = formData.get('rec-facilitator-code') as string;
        const incubationType = formData.get('rec-incubation-type') as IncubationType;
        const feeType = formData.get('rec-fee-type') as FeeType;
        const feeAmount = formData.get('rec-fee-amount') ? parseFloat(formData.get('rec-fee-amount') as string) : undefined;
        const shares = formData.get('rec-shares') ? parseInt(formData.get('rec-shares') as string) : undefined;
        const pricePerShare = formData.get('rec-price-per-share') ? parseFloat(formData.get('rec-price-per-share') as string) : undefined;
        const investmentAmount = formData.get('rec-amount') ? parseFloat(formData.get('rec-amount') as string) : undefined;
        const equityAllocated = formData.get('rec-equity') ? parseFloat(formData.get('rec-equity') as string) : undefined;
        const postMoneyValuation = formData.get('rec-postmoney') ? parseFloat(formData.get('rec-postmoney') as string) : undefined;
        const agreementFileEntry = formData.get('rec-agreement');
        const agreementFile = agreementFileEntry instanceof File && agreementFileEntry.size > 0 ? agreementFileEntry : null;
        const agreementUrlEntry = formData.get('rec-agreement-url-new');
        const agreementUrl = typeof agreementUrlEntry === 'string' ? agreementUrlEntry.trim() : '';
        
        if (!programName || !facilitatorName || !facilitatorCode || !incubationType || !feeType || (!agreementFile && !agreementUrl)) {
            setError('Please upload the signed agreement file or provide a valid cloud link.');
            return;
        }
        
        try {
            setError(null);
            setIsLoading(true);
            
            // Handle file upload for signed agreement
            let signedAgreementUrl = agreementUrl;
            if (agreementFile) {
                try {
                    const uploadResult = await storageService.uploadFile(agreementFile, 'startup-documents', 'agreements/' + startup.id + '/signed_agreement_' + Date.now() + '_' + agreementFile.name);
                    if (uploadResult.success && uploadResult.url) {
                        signedAgreementUrl = uploadResult.url;
                    } else {
                        throw new Error(uploadResult.error || 'Upload failed');
                    }
                } catch (uploadErr) {
                    console.error('Failed to upload agreement file:', uploadErr);
                    setError('Failed to upload agreement file');
                    return;
                }
            }
            
            // Debug: Log the data being sent
            console.log('🔍 Debug - Data being sent to createRecognitionRecord:', {
                startupId: startup.id,
                programName,
                facilitatorName,
                facilitatorCode,
                incubationType,
                feeType,
                feeAmount,
                shares,
                pricePerShare,
                investmentAmount,
                equityAllocated,
                postMoneyValuation,
                signedAgreementUrl
            });
            
            // Create recognition record using the service
            const newRecognitionRecord = await recognitionService.createRecognitionRecord({
                startupId: startup.id,
                programName,
                facilitatorName,
                facilitatorCode,
                incubationType,
                feeType,
                feeAmount,
                shares,
                pricePerShare,
                investmentAmount,
                equityAllocated,
                postMoneyValuation,
                signedAgreementUrl
            });
            
            // Add to local state
            setRecognitionRecords(prev => [newRecognitionRecord, ...prev]);
            
            // Reset form
            if (e.currentTarget) {
                e.currentTarget.reset();
            }
            setError(null);
            setFeeType(FeeType.Free);
            
            // Reset recognition form fields
            setRecSharesDraft('');
            setRecPricePerShareDraft('');
            setRecAmountDraft('');
            setRecEquityDraft('');
            setRecPostMoneyDraft('');
            
            console.log('✅ Recognition record added successfully to backend');
            console.log('📋 New record:', newRecognitionRecord);
        } catch (err) {
            console.error('❌ Error adding recognition record:', err);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to add recognition record');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateRecognition = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!startup?.id || !editingRecognition) return;
        
        const formData = new FormData(e.currentTarget);
        const programName = formData.get('rec-program-name') as string;
        const facilitatorName = formData.get('rec-facilitator-name') as string;
        const facilitatorCode = formData.get('rec-facilitator-code') as string;
        const incubationType = formData.get('rec-incubation-type') as IncubationType;
        const feeType = formData.get('rec-fee-type') as FeeType;
        const feeAmount = formData.get('rec-fee-amount') ? parseFloat(formData.get('rec-fee-amount') as string) : undefined;
        const shares = formData.get('rec-shares') ? parseInt(formData.get('rec-shares') as string) : undefined;
        const pricePerShare = formData.get('rec-price-per-share') ? parseFloat(formData.get('rec-price-per-share') as string) : undefined;
        const investmentAmount = formData.get('rec-amount') ? parseFloat(formData.get('rec-amount') as string) : undefined;
        const equityAllocated = formData.get('rec-equity') ? parseFloat(formData.get('rec-equity') as string) : undefined;
        const postMoneyValuation = formData.get('rec-postmoney') ? parseFloat(formData.get('rec-postmoney') as string) : undefined;
        const agreementFileEntry = formData.get('rec-agreement');
        const agreementFile = agreementFileEntry instanceof File && agreementFileEntry.size > 0 ? agreementFileEntry : null;
        const agreementUrlEntry = formData.get('rec-agreement-url');
        const agreementUrl = typeof agreementUrlEntry === 'string' ? agreementUrlEntry.trim() : '';
        
        if (!programName || !facilitatorName || !facilitatorCode || !incubationType || !feeType) {
            setError('Please fill in all required fields');
            return;
        }
        
        try {
            setError(null);
            setIsLoading(true);
            
            // Handle file upload for signed agreement if a new file is provided
            let signedAgreementUrl = agreementUrl || editingRecognition.signedAgreementUrl;
            if (agreementFile) {
                try {
                    const uploadResult = await storageService.uploadFile(agreementFile, 'startup-documents', 'agreements/' + startup.id + '/signed_agreement_' + Date.now() + '_' + agreementFile.name);
                    if (uploadResult.success && uploadResult.url) {
                        signedAgreementUrl = uploadResult.url;
                    } else {
                        throw new Error(uploadResult.error || 'Upload failed');
                    }
                } catch (uploadErr) {
                    console.error('Failed to upload agreement file:', uploadErr);
                    setError('Failed to upload agreement file');
                    return;
                }
            }
            
            // Update recognition record using the service
            const updatedRecognitionRecord = await recognitionService.updateRecognitionRecord(editingRecognition.id, {
                programName,
                facilitatorName,
                facilitatorCode,
                incubationType,
                feeType,
                feeAmount,
                shares,
                pricePerShare,
                investmentAmount,
                equityAllocated,
                postMoneyValuation,
                signedAgreementUrl
            });
            
            // Update local state
            setRecognitionRecords(prev => prev.map(rec => 
                rec.id === editingRecognition.id ? updatedRecognitionRecord : rec
            ));
            
            // Close modal and reset state
            setIsEditRecognitionModalOpen(false);
            setEditingRecognition(null);
            setError(null);
            
            console.log('✅ Recognition record updated successfully');
            console.log('📋 Updated record:', updatedRecognitionRecord);
        } catch (err) {
            console.error('❌ Error updating recognition record:', err);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to update recognition record');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleEntrySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        console.log('🚀 Form submitted! Entry type:', entryType);
        e.preventDefault();
        
        try {
            if (entryType === 'investment') {
                console.log('📈 Calling handleAddInvestment...');
                await handleAddInvestment(e);
            } else {
                console.log('🏆 Calling handleAddRecognition...');
                await handleAddRecognition(e);
            }
        } catch (error) {
            console.error('❌ Error in handleEntrySubmit:', error);
            setError('Failed to submit form. Please try again.');
        }
    };

    const openDeleteModal = (investment: InvestmentRecord) => {
        console.log('🗑️ Opening delete modal for investment:', investment);
        setInvestmentToDelete(investment);
        setIsDeleteModalOpen(true);
    };

    const handleEditInvestment = (investment: InvestmentRecord) => {
        console.log('🔧 Editing investment:', investment);
        setEditingInvestment(investment);
        setIsEditInvestmentModalOpen(true);
    };

    const handleEditRecognition = (recognition: RecognitionRecord) => {
        console.log('🔧 Editing recognition:', recognition);
        setEditingRecognition(recognition);
        setIsEditRecognitionModalOpen(true);
    };

    const handleDeleteRecognition = (recognition: RecognitionRecord) => {
        console.log('🗑️ Deleting recognition:', recognition);
        setRecognitionToDelete(recognition);
        setIsDeleteRecognitionModalOpen(true);
    };

    const handleDeleteRecognitionRecord = async (recordId: string) => {
        try {
            setIsLoading(true);
            
            // Delete from database
            const { error } = await supabase
                .from('recognition_records')
                .delete()
                .eq('id', parseInt(recordId));

            if (error) {
                console.error('Error deleting recognition record:', error);
                setError('Failed to delete recognition record. Please try again.');
                return;
            }

            // Update local state
            setRecognitionRecords(prev => prev.filter(rec => rec.id !== recordId));
            
            // Close modal
            setIsDeleteRecognitionModalOpen(false);
            setRecognitionToDelete(null);
            
            console.log('✅ Recognition record deleted successfully');
        } catch (error) {
            console.error('Error deleting recognition record:', error);
            setError('Failed to delete recognition record. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditIncubationProgram = (program: any) => {
        console.log('🔧 Editing incubation program:', program);
        // TODO: Implement edit modal functionality
        messageService.info(
          'Coming Soon',
          'Edit functionality will be implemented in the next update'
        );
    };

    const handleDownloadProof = async (proofUrl: string, investorName: string) => {
        try {
            const downloadUrl = await capTableService.getAttachmentDownloadUrl(proofUrl);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = 'investment-proof-' + investorName + '.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Error downloading proof:', err);
            setError('Failed to download proof document');
        }
    };

    // =====================================================
    // INCUBATION PROGRAMS HANDLERS
    // =====================================================


    const handleDeleteProgram = async (programId: string) => {
        if (!startup?.id) return;
        
        try {
            await incubationProgramsService.deleteIncubationProgram(programId);
            setIsDeleteProgramModalOpen(false);
            setProgramToDelete(null);
            await loadCapTableData();
        } catch (err) {
            console.error('Error deleting program:', err);
            setError('Failed to delete program');
        }
    };

    const openDeleteProgramModal = (program: IncubationProgram) => {
        setProgramToDelete(program);
        setIsDeleteProgramModalOpen(true);
    };

    // Handle download fund utilization report
    const handleDownloadFundUtilizationReport = async () => {
        try {
            // Prepare report data for PDF (using plain numbers without currency formatting)
            const reportData: InvestorReportData[] = investmentRecords.map(inv => {
                const utilization = calculateInvestorUtilization(inv.investorName, inv.amount);
                return {
                    investorName: inv.investorName,
                    investmentAmount: inv.amount.toLocaleString(),
                    equityAllocated: inv.equityAllocated + '%',
                    utilized: utilization.utilized.toLocaleString(),
                    remainingFunds: (inv.amount - utilization.utilized).toLocaleString(),
                    investmentDate: new Date(inv.date).toLocaleDateString()
                };
            });

            // PDF options
            const options: PDFReportOptions = {
                title: 'Fund Utilization Report',
                subtitle: 'Investor Investment Summary',
                companyName: startup.name,
                generatedDate: new Date().toLocaleDateString(),
                currency: startupCurrency
            };

            // Generate PDF
            const pdfBlob = await generateInvestorListPDF(reportData, options);
            
            // Download PDF
            const filename = 'fund-utilization-report-' + startup.name.replace(/[^a-zA-Z0-9]/g, '-') + '-' + new Date().toISOString().split('T')[0] + '.pdf';
            downloadBlob(pdfBlob, filename);

            console.log('✅ Fund utilization report downloaded successfully as PDF');
        } catch (error) {
            console.error('❌ Error generating fund utilization report:', error);
            messageService.error(
              'Report Generation Failed',
              'Failed to generate fund utilization report. Please try again.'
            );
        }
    };

    // Handle download individual fund utilization report
    const handleDownloadIndividualFundReport = async (investment: InvestmentRecord) => {
        try {
            const utilization = calculateInvestorUtilization(investment.investorName, investment.amount);
            
            // Get detailed expense records for this investor
            // Use only the investor name to match funding sources (same as calculateInvestorUtilization)
            const investorFundingSource = investment.investorName;
            const expenseRecords = financialRecords.filter(record => 
                record.record_type === 'expense' && 
                record.funding_source && 
                record.funding_source.toLowerCase() === investorFundingSource.toLowerCase()
            );

            // Debug logging
            console.log('🔍 PDF Generation Debug:', {
                investorName: investment.investorName,
                investorFundingSource,
                totalFinancialRecords: financialRecords.length,
                expenseRecordsFound: expenseRecords.length,
                utilization: utilization,
                allFundingSources: financialRecords
                    .filter(record => record.funding_source)
                    .map(record => record.funding_source)
                    .filter((value, index, self) => self.indexOf(value) === index) // unique values
            });

            // Prepare detailed report data for PDF (using plain numbers without currency formatting)
            const reportData: IndividualInvestorReportData[] = expenseRecords.map(expense => ({
                date: new Date(expense.date).toLocaleDateString(),
                description: expense.description || 'N/A',
                amount: (expense.amount || 0).toLocaleString(),
                fundingSource: expense.funding_source || 'N/A',
                invoiceLink: expense.attachment_url || 'No invoice attached'
            }));

            // PDF options (using plain numbers without currency formatting)
            const options: PDFReportOptions = {
                title: 'Individual Fund Utilization Report',
                subtitle: 'Detailed expense breakdown for ' + investment.investorName + ' (' + utilization.percentage.toFixed(2) + '% utilized)',
                companyName: startup.name,
                generatedDate: new Date().toLocaleDateString(),
                currency: startupCurrency,
                investmentAmount: investment.amount.toLocaleString(),
                equityAllocated: investment.equityAllocated + '%',
                utilizedAmount: utilization.utilized.toLocaleString()
            };

            // Generate PDF
            const pdfBlob = await generateIndividualInvestorPDF(investment.investorName, reportData, options);
            
            // Download PDF
            const filename = 'fund-utilization-' + investment.investorName.replace(/[^a-zA-Z0-9]/g, '-') + '-' + new Date().toISOString().split('T')[0] + '.pdf';
            downloadBlob(pdfBlob, filename);

            console.log('✅ Individual fund utilization report downloaded successfully as PDF');
        } catch (error) {
            console.error('❌ Error generating individual fund utilization report:', error);
            messageService.error(
              'Report Generation Failed',
              'Failed to generate individual fund utilization report. Please try again.'
            );
        }
    };


    // =====================================================
    // UTILIZATION CALCULATION
    // =====================================================

    const calculateInvestorUtilization = (investorName: string, investmentAmount: number): { utilized: number; percentage: number } => {
        // Use only the investor name to match funding sources (no type suffix)
        const investorFundingSource = investorName;
        
        // Debug logging for pooja specifically
        if (investorName.toLowerCase().includes('pooja')) {
            console.log('🔍 Debugging Pooja Utilization:', {
                investorName,
                investmentAmount,
                expectedFundingSource: investorFundingSource,
                totalFinancialRecords: financialRecords.length,
                matchingRecords: financialRecords.filter(record => 
                    record.record_type === 'expense' && 
                    record.funding_source && 
                    record.funding_source.toLowerCase() === investorFundingSource.toLowerCase()
                ),
                allFundingSources: financialRecords
                    .filter(record => record.funding_source)
                    .map(record => record.funding_source)
            });
        }
        
        // Calculate total utilized amount from financial records
        // Use case-insensitive matching to handle potential case issues
        const utilizedAmount = financialRecords
            .filter(record => 
                record.record_type === 'expense' && 
                record.funding_source && 
                record.funding_source.toLowerCase() === investorFundingSource.toLowerCase()
            )
            .reduce((total, record) => total + (record.amount || 0), 0);
        
        const percentage = investmentAmount > 0 ? (utilizedAmount / investmentAmount) * 100 : 0;
        
        return {
            utilized: utilizedAmount,
            percentage: Math.min(percentage, 100)
        };
    };

    // Progress bar component for utilization display
    const UtilizationProgressBar = ({ utilized, total, percentage }: { utilized: number; total: number; percentage: number }) => {
        // Show minimum 1% progress if there's any utilization, even if percentage is very small
        const displayPercentage = utilized > 0 ? Math.max(percentage, 1) : 0;
        
        return (
            <div className="space-y-1">
                <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: displayPercentage + '%' }}
                    />
                </div>
                <div className="text-xs text-slate-600">
                    {formatCurrency(utilized, startupCurrency)} Utilized ({percentage.toFixed(4)}%)
                </div>
            </div>
        );
    };

         // Prepare chart data directly from investment records (not fundraising data)
     const valuationData = investmentRecords.length > 0 ? 
         investmentRecords.map(inv => ({
             name: inv.investmentType || 'Investment Round',
             valuation: Number(inv.preMoneyValuation) || 0,
             investment: Number(inv.amount) || 0
         })).filter(item => item.valuation > 0 || item.investment > 0) : [];

     // Calculate equity distribution from investment records, founders, and ESOP
     const equityData = (() => {
         const distribution: { name: string; value: number }[] = [];
         
         // Calculate total allocated shares (this is now the total shares)
         const totalFounderShares = founders.reduce((sum, founder) => sum + (founder.shares || 0), 0);
         const totalInvestorShares = investmentRecords.reduce((sum, inv) => sum + (inv.shares || 0), 0);
         const esopReservedShares = startup.esopReservedShares || 0;
         const calculatedTotalShares = totalFounderShares + totalInvestorShares + esopReservedShares;
         
         // No normalization needed since total shares = total allocated shares
         
         // Add founders equity - use shares-based calculation
         founders.forEach(founder => {
             if (founder.shares && founder.shares > 0 && calculatedTotalShares > 0) {
                 const founderPercentage = (founder.shares / calculatedTotalShares) * 100;
                 
                 if (founderPercentage > 0) {
                     distribution.push({
                         name: 'Founder (' + founder.name + ')',
                         value: founderPercentage
                     });
                 }
             }
         });
         
         // Add investor equity - merge investors with same investor code
         const investorGroups = new Map<string, { name: string; totalShares: number; totalEquity: number }>();
         
         investmentRecords.forEach(inv => {
             if (inv.shares && inv.shares > 0 && calculatedTotalShares > 0) {
                 const investorPercentage = (inv.shares / calculatedTotalShares) * 100;
                 
                 if (investorPercentage > 0) {
                     const key = inv.investorCode || inv.investorName;
                     if (investorGroups.has(key)) {
                         const existing = investorGroups.get(key)!;
                         existing.totalShares += inv.shares;
                         existing.totalEquity += investorPercentage;
                     } else {
                         investorGroups.set(key, {
                             name: inv.investorName,
                             totalShares: inv.shares,
                             totalEquity: investorPercentage
                         });
                     }
                 }
             } else if (inv.equityAllocated && inv.equityAllocated > 0) {
                 // Fallback to stored equity percentage if no shares data
                 const key = inv.investorCode || inv.investorName;
                 if (investorGroups.has(key)) {
                     const existing = investorGroups.get(key)!;
                     existing.totalEquity += inv.equityAllocated;
                 } else {
                     investorGroups.set(key, {
                         name: inv.investorName,
                         totalShares: 0,
                         totalEquity: inv.equityAllocated
                     });
                 }
             }
         });
         
         // Add merged investor groups to distribution
         investorGroups.forEach((group, key) => {
             if (group.totalEquity > 0) {
                 const displayName = group.totalShares > 0 
                     ? 'Investor (' + group.name + ')' 
                     : 'Investor (' + group.name + ')';
                 
                 distribution.push({
                     name: displayName,
                     value: group.totalEquity
                 });
             }
         });
         
         // Add ESOP equity from reserved shares
         if (esopReservedShares > 0 && calculatedTotalShares > 0) {
             const esopPercentage = (esopReservedShares / calculatedTotalShares) * 100;
             
             if (esopPercentage > 0) {
                 distribution.push({
                     name: 'ESOP Pool',
                     value: esopPercentage
                 });
             }
         }
         
         // Add Recognition and Incubation equity from shares
         const totalRecognitionShares = recognitionRecords
             .filter(rec => (rec.feeType === 'Equity' || rec.feeType === 'Hybrid') && rec.shares && rec.shares > 0)
             .reduce((sum, rec) => sum + (rec.shares || 0), 0);
             
         if (totalRecognitionShares > 0 && calculatedTotalShares > 0) {
             const recognitionPercentage = (totalRecognitionShares / calculatedTotalShares) * 100;
             
             if (recognitionPercentage > 0) {
                 distribution.push({
                     name: 'Recognition & Incubation',
                     value: recognitionPercentage
                 });
             }
         }
         
         // Calculate total percentage and add "Unallocated" if needed
         const totalPercentage = distribution.reduce((sum, item) => sum + item.value, 0);
         const unallocatedPercentage = 100 - totalPercentage;
         
         if (unallocatedPercentage > 0.1) { // Only show if more than 0.1%
             distribution.push({
                 name: 'Unallocated',
                 value: unallocatedPercentage
             });
         }
         
         return distribution.filter(item => item.value > 0);
     })();

    // Debug chart data (commented out for production)
    // console.log('📈 Chart Data:', {
    //     valuationData: valuationData.length > 0 ? valuationData : 'No valuation data',
    //     equityData: equityData.length > 0 ? equityData : 'No equity data',
    //     founders: founders.map(f => ({ name: f.name, shares: f.shares, equityPercentage: f.equityPercentage })),
    //     investmentRecords: investmentRecords.map(inv => ({ name: inv.investorName, shares: inv.shares, equityAllocated: inv.equityAllocated })),
    //     esopReservedShares: startup.esopReservedShares
    // });
    
    // Debug logs commented out for production
    // console.log('📊 Valuation History State:', { ... });
    // console.log('📊 Equity Distribution State:', { ... });
    
    // All debug logs commented out for production
    // Charts are ready to render based on data availability


    // Offers functionality moved to dashboard tab


    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading equity allocation data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={loadCapTableData}>Retry</Button>
            </div>
        );
    }

    // Add error boundary to prevent crashes
    try {
        return (
            <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                 <Card>
                     <p className="text-sm font-medium text-slate-500">Current Valuation</p>
                     <p className="text-2xl font-bold">
                        {(() => {
                            // Use cumulative current valuation from startup object
                            // This ensures we show the total valuation, not just the latest investment
                            return formatCurrency(startup.currentValuation || 0, startupCurrency);
                        })()}
                    </p>
                </Card>
                                <Card>
                    <p className="text-sm font-medium text-slate-500">Total Shares</p>
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <div className="text-2xl font-bold text-slate-900">
                                {(() => {
                                    const calculatedTotalShares = calculateTotalShares();
                                    
                                    console.log('🔍 Total Shares Display - Using calculateTotalShares():', {
                                        calculatedTotalShares,
                                        breakdown: {
                                            totalFounderShares: founders.reduce((sum, founder) => sum + (founder.shares || 0), 0),
                                            totalInvestorShares: investmentRecords.reduce((sum, inv) => sum + (inv.shares || 0), 0),
                                            esopReservedShares: startup.esopReservedShares || 0,
                                            totalRecognitionShares: recognitionRecords
                                                .filter(rec => (rec.feeType === 'Equity' || rec.feeType === 'Hybrid') && rec.shares && rec.shares > 0)
                                                .reduce((sum, rec) => sum + (rec.shares || 0), 0)
                                        }
                                    });
                                    
                                    return calculatedTotalShares.toLocaleString();
                                })()}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Calculated automatically</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-500">
                                {(() => {
                                    const calculatedTotalShares = calculateTotalShares();
                                    
                                    if (calculatedTotalShares > 0) {
                                        // Use cumulative current valuation for price per share calculation
                                        // This ensures consistent pricing across all shares
                                        const cumulativeValuation = startup.currentValuation || 0;
                                        const computedPricePerShare = cumulativeValuation / calculatedTotalShares;
                                        
                                        // DETAILED DEBUG: Track Equity Allocation price calculation
                                        console.log('🔍 DETAILED DEBUG - Equity Allocation Price Per Share Calculation:', {
                                            'startup.currentValuation': startup.currentValuation,
                                            'cumulativeValuation': cumulativeValuation,
                                            'calculatedTotalShares': calculatedTotalShares,
                                            'computedPricePerShare': computedPricePerShare,
                                            'formattedPrice': formatCurrency(computedPricePerShare, startupCurrency),
                                            'calculation': cumulativeValuation + ' / ' + calculatedTotalShares + ' = ' + computedPricePerShare
                                        });
                                        
                                        // Save the calculated price per share to database
                                        if (computedPricePerShare > 0) {
                                            capTableService.upsertPricePerShare(startup.id, computedPricePerShare)
                                                .then(() => {
                                                    console.log('✅ Saved calculated price per share to database:', computedPricePerShare);
                                                })
                                                .catch(err => {
                                                    console.error('❌ Failed to save price per share:', err);
                                                });
                                        }
                                        
                                        return 'Price/Share: ' + formatCurrency(computedPricePerShare, startupCurrency);
                                    }
                                    return 'Price/Share: —';
                                })()}
                            </p>
                        </div>
                    </div>
                     
                     {/* Shares Allocation Summary - Recreated */}
                     {(() => {
                         // Calculate all share components
                         const totalFounderShares = founders.reduce((sum, founder) => sum + (founder.shares || 0), 0);
                         const totalInvestorShares = investmentRecords.reduce((sum, inv) => sum + (inv.shares || 0), 0);
                         const totalRecognitionShares = recognitionRecords
                             .filter(rec => (rec.feeType === 'Equity' || rec.feeType === 'Hybrid') && rec.shares && rec.shares > 0)
                             .reduce((sum, rec) => sum + (rec.shares || 0), 0);
                         
                         // Get ESOP reserved shares from the correct source
                         // Use startup object as fallback since esopData state is not updating properly
                         const esopReservedShares = esopData?.esopReservedShares || startup.esopReservedShares || 0;
                         
                         // CRITICAL DEBUG: Check what we're actually using
                         console.log('🚨 CRITICAL - ESOP calculation values:', {
                             esopData,
                             esopDataEsopReservedShares: esopData?.esopReservedShares,
                             startupEsopReservedShares: startup.esopReservedShares,
                             esopReservedShares,
                             esopReservedSharesType: typeof esopReservedShares
                         });
                         
                         // Calculate total shares
                         const calculatedTotalShares = totalFounderShares + totalInvestorShares + esopReservedShares + totalRecognitionShares;
                         
                         // CRITICAL DEBUG: Check if esopData is null
                         console.log('🚨 CRITICAL DEBUG - esopData Status:', {
                             esopDataIsNull: esopData === null,
                             esopDataIsUndefined: esopData === undefined,
                             esopDataType: typeof esopData,
                             esopDataValue: esopData,
                             esopDataEsopReservedShares: esopData?.esopReservedShares,
                             esopDataEsopReservedSharesType: typeof esopData?.esopReservedShares
                         });
                         
                         // Debug logging
                         console.log('🔍 RECREATED Total Shares Calculation:', {
                             totalFounderShares,
                             totalInvestorShares,
                             esopReservedShares,
                             totalRecognitionShares,
                             calculatedTotalShares,
                             esopData: esopData,
                             esopDataEsopReservedShares: esopData?.esopReservedShares
                         });
                         
                         if (calculatedTotalShares > 0) {
                             return (
                                 <div className="mt-3 pt-3 border-t border-slate-200">
                                     <p className="text-xs font-medium text-slate-600 mb-2">Shares Allocation</p>
                                     <div className="space-y-1 text-xs">
                                         <div className="flex justify-between">
                                             <span className="text-slate-500">Founders:</span>
                                             <span className="text-slate-700">{totalFounderShares.toLocaleString()}</span>
                                         </div>
                                         <div className="flex justify-between">
                                             <span className="text-slate-500">Investors:</span>
                                             <span className="text-slate-700">{totalInvestorShares.toLocaleString()}</span>
                                         </div>
                                         <div className="flex justify-between">
                                             <span className="text-slate-500">ESOP Reserved:</span>
                                             <span className="text-slate-700">{esopReservedShares.toLocaleString()}</span>
                                         </div>
                                         {totalRecognitionShares > 0 && (
                                             <div className="flex justify-between items-center">
                                                 <div className="flex items-center space-x-2">
                                                     <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                     <span className="text-slate-500 font-medium">Incubation Center</span>
                                                 </div>
                                                 <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm font-medium">
                                                     {totalRecognitionShares.toLocaleString()} shares
                                                 </div>
                                             </div>
                                         )}
                                         <div className="flex justify-between font-medium pt-1 border-t border-slate-100">
                                             <span className="text-slate-600">Total:</span>
                                             <span className="text-slate-900 font-bold">{calculatedTotalShares.toLocaleString()}</span>
                                         </div>
                                     </div>
                                 </div>
                             );
                         }
                         return null;
                     })()}
                 </Card>
                                 <Card>
                     <p className="text-sm font-medium text-slate-500">Total Funding</p>
                     <p className="text-2xl font-bold">
                        {(() => {
                            const totalEquity = investmentRecords.filter(inv => inv.investmentType === InvestmentRoundType.Equity).reduce((sum, inv) => sum + (inv.amount || 0), 0);
                            const totalDebt = investmentRecords.filter(inv => inv.investmentType === InvestmentRoundType. Debt).reduce((sum, inv) => sum + (inv.amount || 0), 0);
                            const totalGrant = investmentRecords.filter(inv => inv.investmentType === InvestmentRoundType.Grant).reduce((sum, inv) => sum + (inv.amount || 0), 0);
                            return formatCurrency(totalEquity + totalDebt + totalGrant, startupCurrency);
                        })()}
                     </p>
                 </Card>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                 <Card>
                     <p className="text-sm font-medium text-slate-500">Total Investments</p>
                     <p className="text-xl font-bold">{investmentRecords.length}</p>
                 </Card>
                 <Card>
                     <p className="text-sm font-medium text-slate-500">Total Equity Funding</p>
                    <p className="text-xl font-bold">{formatCurrencyCompactLocal(investmentRecords.filter(inv => inv.investmentType === InvestmentRoundType.Equity).reduce((sum, inv) => sum + (inv.amount || 0), 0), startupCurrency)}</p>
                 </Card>
                 <Card>
                    <p className="text-sm font-medium text-slate-500">Total Debt Funding</p>
                    <p className="text-xl font-bold">{formatCurrencyCompactLocal(investmentRecords.filter(inv => inv.investmentType === InvestmentRoundType.Debt).reduce((sum, inv) => sum + (inv.amount || 0), 0), startupCurrency)}</p>
                 </Card>
                 <Card>
                    <p className="text-sm font-medium text-slate-500">Total Grant Funding</p>
                    <p className="text-xl font-bold">{formatCurrencyCompactLocal(investmentRecords.filter(inv => inv.investmentType === InvestmentRoundType.Grant).reduce((sum, inv) => sum + (inv.amount || 0), 0), startupCurrency)}</p>
                 </Card>
            </div>


            {/* Company Information card removed as requested */}

            {/* Charts & Founder Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                                         <Card>
                         <div className="flex justify-between items-center mb-4">
                             <h3 className="text-lg font-semibold text-slate-700">Valuation History</h3>
                             <Button 
                                 variant="outline" 
                                 size="sm" 
                                 onClick={async () => {
                                     console.log('🔄 Manual refresh of investment data...');
                                     try {
                                         const records = await capTableService.getInvestmentRecords(startup.id);
                                         setInvestmentRecords(records);
                                         console.log('✅ Investment records manually refreshed');
                                     } catch (err) {
                                         console.error('Error refreshing investment records:', err);
                                     }
                                 }}
                                 title="Refresh chart data"
                             >
                                 <TrendingUp className="h-4 w-4" />
                             </Button>
                         </div>
                         {valuationData.length > 0 ? (
                             <div style={{ width: '100%', height: 300 }}>
                                 <ResponsiveContainer width="100%" height="100%">
                                     <BarChart data={valuationData}>
                                         <CartesianGrid strokeDasharray="3 3" />
                                         <XAxis dataKey="name" fontSize={12} />
                                         <YAxis yAxisId="left" orientation="left" stroke="#16a34a" fontSize={12} tickFormatter={(val) => formatCurrencyCompact(val, startupCurrency)}/>
                                         <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={12} tickFormatter={(val) => formatCurrencyCompact(val, startupCurrency)}/>
                                         <Tooltip formatter={(value: number) => formatCurrency(value, startupCurrency)} />
                                         <Legend />
                                         <Bar yAxisId="left" dataKey="valuation" fill="#16a34a" name="Valuation" />
                                         <Bar yAxisId="right" dataKey="investment" fill="#3b82f6" name="Investment" />
                                     </BarChart>
                                 </ResponsiveContainer>
                             </div>
                         ) : (
                            <div className="flex items-center justify-center h-64 text-center">
                                <div>
                                    <TrendingUp className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                    <p className="text-slate-500 mb-2">No valuation history available</p>
                                    <p className="text-sm text-slate-400">Add investment records to see valuation trends</p>
                                </div>
                            </div>
                        )}
                    </Card>
                                         <Card>
                         <div className="flex justify-between items-center mb-4">
                             <h3 className="text-lg font-semibold text-slate-700">Equity Holdings</h3>
                             <Button 
                                 variant="outline" 
                                 size="sm" 
                                 onClick={async () => {
                                     console.log('🔄 Manual refresh of investment and founder data...');
                                     try {
                                         const [records, foundersData] = await Promise.all([
                                             capTableService.getInvestmentRecords(startup.id),
                                             capTableService.getFounders(startup.id)
                                         ]);
                                         setInvestmentRecords(records);
                                         setFounders(foundersData);
                                         console.log('✅ Investment and founder data manually refreshed');
                                     } catch (err) {
                                         console.error('Error refreshing investment and founder data:', err);
                                     }
                                 }}
                                 title="Refresh chart data"
                             >
                                 <PieChartIcon className="h-4 w-4" />
                             </Button>
                         </div>
                         
                         {/* Equity Calculation Warning */}
                         {(() => {
                             const totalFounderShares = founders.reduce((sum, founder) => sum + (founder.shares || 0), 0);
                             const totalInvestorShares = investmentRecords.reduce((sum, inv) => sum + (inv.shares || 0), 0);
                             const esopReservedShares = startup.esopReservedShares || 0;
                             const totalAllocatedShares = totalFounderShares + totalInvestorShares + esopReservedShares;
                             // No over-allocation warning needed since total shares are calculated automatically
                             return null;
                         })()}
                         
                         {equityData.length > 0 ? (
                             <div style={{ width: '100%', height: 350 }}>
                                 <ResponsiveContainer width="100%" height="100%">
                                     <PieChart>
                                         <Pie 
                                             data={equityData} 
                                             cx="50%" 
                                             cy="50%" 
                                             labelLine={false} 
                                             outerRadius={100} 
                                             fill="#8884d8" 
                                             dataKey="value" 
                                             nameKey="name"
                                             label={({ name, percent }) => {
                                                 // Only show labels for segments > 5%
                                                 if (percent < 0.05) return '';
                                                 // Shorten long names
                                                 const shortName = name.length > 15 ? name.substring(0, 15) + '...' : name;
                                                 return shortName + ' ' + (percent * 100).toFixed(0) + '%';
                                             }}
                                         >
                                             {equityData.map((entry, index) => <Cell key={'cell-' + index} fill={COLORS[index % COLORS.length]} />)}
                                         </Pie>
                                         <Tooltip 
                                             formatter={(value: number) => value.toFixed(1) + '%'}
                                             labelFormatter={(label) => label}
                                             contentStyle={{
                                                 backgroundColor: 'white',
                                                 border: '1px solid #e2e8f0',
                                                 borderRadius: '8px',
                                                 boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                             }}
                                         />
                                         <Legend 
                                             verticalAlign="bottom" 
                                             height={36}
                                             iconType="circle"
                                             wrapperStyle={{
                                                 fontSize: '12px',
                                                 paddingTop: '10px'
                                             }}
                                         />
                                     </PieChart>
                                 </ResponsiveContainer>
                             </div>
                         ) : (
                            <div className="flex items-center justify-center h-64 text-center">
                                <div>
                                    <PieChartIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                    <p className="text-slate-500 mb-2">No equity distribution available</p>
                                    <p className="text-sm text-slate-400">Add founders and investments to see equity breakdown</p>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
                <div className="space-y-6">
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-slate-700">Founder Information</h3>
                            <Button variant="outline" size="sm" onClick={handleEditFoundersClick} disabled={!canEdit}>
                                <Edit3 className="h-4 w-4 mr-2" />Edit
                            </Button>
                        </div>
                                <div className="space-y-4">
                            {founders && founders.length > 0 ? (
                                founders.map((founder, index) => (
                                    <div key={index} className="border-b border-slate-200 pb-3 last:border-b-0">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold">{founder.name}</p>
                                                <p className="text-sm text-slate-500">{founder.email}</p>
                                            </div>
                                            <div className="text-right">
                                                {(() => {
                                                    // Calculate actual equity percentage based on shares
                                                    const totalFounderShares = founders.reduce((sum, f) => sum + (f.shares || 0), 0);
                                                    const totalInvestorShares = investmentRecords.reduce((sum, inv) => sum + (inv.shares || 0), 0);
                                                    const esopReservedShares = startup.esopReservedShares || 0;
                                                    const calculatedTotalShares = totalFounderShares + totalInvestorShares + esopReservedShares;
                                                    
                                                    console.log('🔍 Founder equity check:', {
                                                        name: founder.name,
                                                        equityPercentage: founder.equityPercentage,
                                                        equityType: typeof founder.equityPercentage,
                                                        shares: founder.shares,
                                                        sharesType: typeof founder.shares,
                                                        calculatedTotalShares: calculatedTotalShares
                                                    });
                                                    
                                                    const actualEquityPercentage = founder.shares && calculatedTotalShares > 0 
                                                        ? (founder.shares / calculatedTotalShares) * 100 
                                                        : (founder.equityPercentage || 0);
                                                    
                                                    if (founder.shares && founder.shares > 0) {
                                                        return (
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-700">
                                                                    {actualEquityPercentage.toFixed(1)}% Equity
                                                                </p>
                                                                <p className="text-xs text-slate-500">
                                                                    {founder.shares.toLocaleString()} shares
                                                                </p>
                                                                {actualEquityPercentage > 100 && (
                                                                    <p className="text-xs text-red-500 font-medium">
                                                                        ⚠️ Exceeds total shares
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    } else if (founder.equityPercentage && founder.equityPercentage > 0) {
                                                        return (
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-700">
                                                                    {founder.equityPercentage.toFixed(1)}% Equity
                                                                </p>
                                                                <p className="text-xs text-slate-500">
                                                                    No shares specified
                                                                </p>
                                                            </div>
                                                        );
                                                    } else {
                                                        return <p className="text-sm text-slate-400">No equity data</p>;
                                                    }
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500">No founder information available.</p>
                            )}
                        </div>
                    </Card>
                                         <Card>
                         <div className="flex justify-between items-center mb-4">
                             <div className="flex items-center gap-2">
                                 <h3 className="text-lg font-semibold text-slate-700">Fundraising</h3>
                                 {fundraising.active && (
                                     <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                         Active
                                     </span>
                                 )}
                             </div>
                             {!isEditingFundraising ? (
                                 <Button variant="outline" size="sm" onClick={() => {
                                     setIsEditingFundraising(true);
                                     setPitchDeckFile(null); // Reset file when entering edit mode
                                 }} disabled={!canEdit}>
                                     <Edit3 className="h-4 w-4 mr-2" />Edit
                                 </Button>
                             ) : (
                                 <div className="flex gap-2">
                                     <Button variant="secondary" size="sm" onClick={() => {
                                         setIsEditingFundraising(false);
                                         setPitchDeckFile(null); // Clear file when cancelling edit
                                     }}>
                                         <X className="h-4 w-4"/>
                                     </Button>
                                     <Button size="sm" onClick={handleFundraisingSave} disabled={isLoading}>
                                         {isLoading ? (
                                             <>
                                                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                 Saving...
                                             </>
                                         ) : (
                                             <>
                                                 <Save className="h-4 w-4 mr-2"/>Save
                                             </>
                                         )}
                                     </Button>
                                 </div>
                             )}
                         </div>
                                                 {!isEditingFundraising ? (
                             // Display mode - show current fundraising details
                             <div className="space-y-4">
                                 {fundraisingDetails.length > 0 ? (
                                     <>
                                         <div className="grid grid-cols-2 gap-4 text-sm">
                                             <div>
                                                 <p className="font-medium text-slate-700">Round Type</p>
                                                 <p className="text-slate-600">{fundraising.type}</p>
                                             </div>
                                             <div>
                                                 <p className="font-medium text-slate-700">Target Value</p>
                                                 <p className="text-slate-600">{formatCurrency(fundraising.value, startupCurrency)}</p>
                                             </div>
                                             <div>
                                                 <p className="font-medium text-slate-700">Equity Offered</p>
                                                 <p className="text-slate-600">{fundraising.equity}%</p>
                                             </div>
                                             <div>
                                                 <p className="font-medium text-slate-700">Status</p>
                                                 <p className="text-slate-600">
                                                     {fundraising.active ? 'Active' : 'Inactive'}
                                                 </p>
                                             </div>
                                         </div>
                                         
                                         {fundraising.pitchDeckUrl && (
                                             <div>
                                                 <p className="font-medium text-slate-700 mb-2">Pitch Deck</p>
                                                 <Button 
                                                     size="sm" 
                                                     variant="outline" 
                                                     onClick={() => window.open(fundraising.pitchDeckUrl, '_blank')}
                                                 >
                                                     <Download className="h-4 w-4 mr-2" />
                                                     View Pitch Deck
                                                 </Button>
                                             </div>
                                         )}
                                         
                                         {fundraising.pitchVideoUrl && (
                                             <div>
                                                 <p className="font-medium text-slate-700 mb-2">Pitch Video</p>
                                                 <Button 
                                                     size="sm" 
                                                     variant="outline" 
                                                     onClick={() => window.open(fundraising.pitchVideoUrl, '_blank')}
                                                 >
                                                     <Download className="h-4 w-4 mr-2" />
                                                     Watch Video
                                                 </Button>
                                             </div>
                                         )}
                                         
                                         {fundraising.validationRequested && (
                                             <div className="p-3 bg-blue-50 border-l-4 border-brand-accent text-sm text-slate-600">
                                                 <p className="font-medium">Startup Nation Validation Requested</p>
                                                 <p>3% of fund raised or 4% of total equity raised as fees for validation, documentation and connection.</p>
                                             </div>
                                         )}
                                     </>
                                 ) : (
                                     <div className="text-center py-6">
                                         <p className="text-slate-500 mb-2">No fundraising details configured</p>
                                         <p className="text-sm text-slate-400">Click Edit to set up your fundraising round</p>
                                     </div>
                                 )}
                             </div>
                         ) : (
                             // Edit mode - show form
                             <fieldset disabled={!isEditingFundraising}>
                                 <div className="space-y-4">
                                     <div className="flex items-center">
                                         <input 
                                             type="checkbox" 
                                             id="fundraising-active" 
                                             className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary" 
                                             checked={fundraising.active} 
                                             onChange={(e) => setFundraising({...fundraising, active: e.target.checked})} 
                                         />
                                         <label htmlFor="fundraising-active" className="ml-2 block text-sm text-gray-900">Activate Fundraising Round</label>
                                     </div>
                                                         <Select label="Type" id="fr-type" value={fundraising.type} onChange={e => setFundraising({...fundraising, type: e.target.value as InvestmentType})}>
                        {Object.values(InvestmentType).map(t => <option key={t} value={t}>{t}</option>)}
                    </Select>
                                    <Input label="Value" id="fr-value" type="number" value={fundraising.value} onChange={e => setFundraising({...fundraising, value: Number(e.target.value)})} />
                                    <Input label="Equity" id="fr-equity" type="number" value={fundraising.equity} onChange={e => setFundraising({...fundraising, equity: Number(e.target.value)})} />
                                    {/* New dropdowns for Domain and Stage */}
                                    <Select label="Domain" id="fr-domain" value={(fundraising as any).domain || ''} onChange={e => setFundraising({ ...fundraising, domain: e.target.value as any })}>
                                        <option value="">Select your startup sector</option>
                                        {Object.values(StartupDomain).map(d => <option key={d} value={d}>{d}</option>)}
                                    </Select>
                                    <Select label="Stage" id="fr-stage" value={(fundraising as any).stage || ''} onChange={e => setFundraising({ ...fundraising, stage: e.target.value as any })}>
                                        {Object.values(StartupStage).map(s => <option key={s} value={s}>{s}</option>)}
                                    </Select>
                                     <CloudDriveInput
                                         value={fundraising.pitchDeckUrl || ''}
                                         onChange={(url) => {
                                             // If URL is provided, clear the file and update URL
                                             setPitchDeckFile(null);
                                             setFundraising({...fundraising, pitchDeckUrl: url});
                                         }}
                                         onFileSelect={(file) => {
                                             console.log('📥 Pitch deck file selected:', file?.name);
                                             if (file) {
                                                 setPitchDeckFile(file);
                                                 // Clear URL when file is selected
                                                 setFundraising({...fundraising, pitchDeckUrl: ''});
                                             }
                                         }}
                                         placeholder="Paste your cloud drive link here..."
                                         label="Pitch Deck"
                                         accept=".pdf"
                                         maxSize={10}
                                         documentType="pitch deck"
                                         showPrivacyMessage={false}
                                     />
                                     {pitchDeckFile && (
                                         <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                                             📄 File selected: {pitchDeckFile.name} ({(pitchDeckFile.size / 1024 / 1024).toFixed(2)} MB)
                                         </div>
                                     )}
                                     <input type="hidden" id="pitch-deck-url" name="pitch-deck-url" />
                                     <Input 
                                         label="Pitch Video (YouTube Link)" 
                                         id="fr-video" 
                                         type="url" 
                                         placeholder="https://www.youtube.com/watch?v=..."
                                         value={fundraising.pitchVideoUrl || ''}
                                         onChange={e => setFundraising({...fundraising, pitchVideoUrl: e.target.value})}
                                     />
                                    {/* Startup Nation validation removed as per requirement */}
                                 </div>
                             </fieldset>
                         )}
                    </Card>
                </div>
            </div>
            
            
            <Modal isOpen={isFounderModalOpen} onClose={() => setIsFounderModalOpen(false)} title="Edit Founder Information">
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {editingFounders.map((founder, index) => (
                        <div key={founder.id} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 relative border p-4 rounded-lg bg-slate-50/50">
                            <Input 
                                label={'Founder ' + (index + 1) + ' Name'}
                                id={'founder-name-' + founder.id}
                                type="text"
                                value={founder.name}
                                onChange={e => handleFounderChange(founder.id, 'name', e.target.value)}
                                required
                            />
                            <Input 
                                label={'Founder ' + (index + 1) + ' Email'}
                                id={'founder-email-' + founder.id}
                                type="email"
                                value={founder.email}
                                onChange={e => handleFounderChange(founder.id, 'email', e.target.value)}
                                required
                            />
                            <Input 
                                label={'Equity Percentage (%)'}
                                id={'founder-equity-' + founder.id}
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={founder.equityPercentage || ''}
                                onChange={e => handleFounderChange(founder.id, 'equityPercentage', e.target.value)}
                                placeholder="e.g., 25.5"
                            />
                            <Input 
                                label={'Shares'}
                                id={'founder-shares-' + founder.id}
                                type="number"
                                min="0"
                                value={founder.shares || ''}
                                onChange={e => handleFounderChange(founder.id, 'shares', e.target.value)}
                                placeholder="e.g., 1000000"
                            />
                            {editingFounders.length > 1 && (
                                <Button 
                                    type="button" 
                                    onClick={() => handleRemoveFounder(founder.id)}
                                    className="absolute top-2 right-2 p-1.5 h-auto bg-transparent hover:bg-red-100 text-slate-400 hover:text-red-500 shadow-none border-none"
                                    variant="secondary"
                                    size="sm"
                                    aria-label="Remove founder"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={handleAddFounder}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Another Founder
                    </Button>
                    
                    {/* Shares Allocation Summary */}
                    {editingFounders.length > 0 && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-lg border">
                            <h4 className="text-sm font-medium text-slate-700 mb-3">Shares Allocation Summary</h4>
                            {(() => {
                                const totalFounderShares = editingFounders.reduce((sum, founder) => sum + (founder.shares || 0), 0);
                                const totalInvestorShares = investmentRecords.reduce((sum, inv) => sum + (inv.shares || 0), 0);
                                const esopReservedShares = startup.esopReservedShares || 0;
                                const calculatedTotalShares = totalFounderShares + totalInvestorShares + esopReservedShares;
                                
                                return (
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Founder Shares:</span>
                                            <span className="text-slate-700">
                                                {totalFounderShares.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Investor Shares:</span>
                                            <span className="text-slate-700">{totalInvestorShares.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">ESOP Reserved:</span>
                                            <span className="text-slate-700">{esopReservedShares.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between font-medium pt-2 border-t border-slate-200">
                                            <span className="text-slate-600">Total Shares:</span>
                                            <span className="text-slate-900 font-bold">
                                                {calculatedTotalShares.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t mt-4">
                    <Button type="button" variant="secondary" onClick={() => setIsFounderModalOpen(false)}>Cancel</Button>
                    <Button type="button" onClick={handleFounderSave}>Save Changes</Button>
                </div>
                         </Modal>

             {/* Delete Confirmation Modal */}
             <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Investment">
                 <div className="space-y-4">
                     <p className="text-slate-600">
                         Are you sure you want to delete the investment from{' '}
                         <span className="font-semibold">{investmentToDelete?.investorName}</span>?
                     </p>
                     <p className="text-sm text-slate-500">
                         This action cannot be undone. The investment record will be permanently removed.
                     </p>
                 </div>
                 <div className="flex justify-end gap-3 pt-6 border-t mt-4">
                     <Button type="button" variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
                         Cancel
                     </Button>
                     <Button 
                         type="button" 
                         variant="destructive" 
                         onClick={() => investmentToDelete && handleDeleteInvestment(investmentToDelete)}
                     >
                         Delete Investment
                     </Button>
                 </div>
             </Modal>

            {/* Edit Recognition Modal */}
            <Modal isOpen={isEditRecognitionModalOpen} onClose={() => setIsEditRecognitionModalOpen(false)} title="Edit Recognition Record" size="2xl">
                <div className="max-h-[80vh] overflow-y-auto pr-2">
                <form onSubmit={handleUpdateRecognition} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                                label="Program Name" 
                                name="rec-program-name"
                                id="rec-program-name" 
                                defaultValue={editingRecognition?.programName || ''}
                                required
                                containerClassName="md:col-span-2"
                            />
                            <Input 
                                label="Facilitator Name" 
                                name="rec-facilitator-name"
                                id="rec-facilitator-name" 
                                defaultValue={editingRecognition?.facilitatorName || ''}
                                required
                            />
                            <Input 
                                label="Facilitator Code" 
                                name="rec-facilitator-code"
                                id="rec-facilitator-code" 
                                defaultValue={editingRecognition?.facilitatorCode || ''}
                                placeholder="e.g., FAC-D4E5F6" 
                                required
                            />
                            <Select 
                                label="Incubation Type" 
                                name="rec-incubation-type"
                                id="rec-incubation-type" 
                                defaultValue={editingRecognition?.incubationType || ''}
                                required
                            >
                                {Object.values(IncubationType).map(t => <option key={t} value={t}>{t}</option>)}
                            </Select>
                            <Select 
                                label="Fee Type" 
                                name="rec-fee-type"
                                id="rec-fee-type" 
                                defaultValue={editingRecognition?.feeType || ''}
                                required
                            >
                                {Object.values(FeeType).map(t => <option key={t} value={t}>{t}</option>)}
                            </Select>
                            <Input 
                                label="Fee Amount" 
                                name="rec-fee-amount"
                                id="rec-fee-amount" 
                                type="number" 
                                defaultValue={editingRecognition?.feeAmount || ''}
                                step="0.01"
                            />
                            <Input 
                                label="Number of Shares" 
                                name="rec-shares"
                                id="rec-shares" 
                                type="number"
                                value={editRecSharesDraft || editingRecognition?.shares || ''}
                                onChange={(e) => setEditRecSharesDraft(e.target.value)}
                                placeholder="e.g., 10000"
                            />
                            <Input 
                                label={'Price per Share (' + startupCurrency + ')'} 
                                name="rec-price-per-share" 
                                id="rec-price-per-share" 
                                type="number"
                                step="0.01"
                                value={editRecPricePerShareDraft || editingRecognition?.pricePerShare || ''}
                                onChange={(e) => setEditRecPricePerShareDraft(e.target.value)}
                                placeholder="e.g., 1.50"
                            />
                            <Input 
                                label="Investment Amount (auto)" 
                                name="rec-amount" 
                                id="rec-amount" 
                                type="number"
                                value={editRecAmountDraft || editingRecognition?.investmentAmount || ''}
                                readOnly 
                            />
                            <Input 
                                label="Equity Allocated (%) (auto)" 
                                name="rec-equity" 
                                id="rec-equity" 
                                type="number"
                                value={editRecEquityDraft || editingRecognition?.equityAllocated || ''}
                                readOnly 
                            />
                            <Input 
                                label="Post-Money Valuation (auto)" 
                                name="rec-postmoney"
                                id="rec-postmoney" 
                                type="number" 
                                value={editRecPostMoneyDraft || editingRecognition?.postMoneyValuation || ''}
                                readOnly 
                            />
                                <CloudDriveInput
                                value=""
                                onChange={(url) => {
                                    const hiddenInput = document.getElementById('rec-agreement-url') as HTMLInputElement;
                                    if (hiddenInput) hiddenInput.value = url;
                                    const fileInput = document.getElementById('rec-agreement') as HTMLInputElement;
                                    if (fileInput) {
                                        fileInput.value = '';
                                        const emptyTransfer = new DataTransfer();
                                        fileInput.files = emptyTransfer.files;
                                    }
                                }}
                                onFileSelect={(file) => {
                                    const fileInput = document.getElementById('rec-agreement') as HTMLInputElement;
                                    if (fileInput) {
                                        const dataTransfer = new DataTransfer();
                                        dataTransfer.items.add(file);
                                        fileInput.files = dataTransfer.files;
                                    }
                                    const hiddenInput = document.getElementById('rec-agreement-url') as HTMLInputElement;
                                    if (hiddenInput) hiddenInput.value = '';
                                }}
                                placeholder="Paste your cloud drive link here..."
                                label="Upload Signed Agreement"
                                accept=".pdf,.doc,.docx"
                                maxSize={10}
                                documentType="signed agreement"
                                showPrivacyMessage={false}
                                className="md:col-span-2"
                            />
                            <input type="hidden" id="rec-agreement-url" name="rec-agreement-url" />
                            <input
                                type="file"
                                id="rec-agreement"
                                name="rec-agreement"
                                className="hidden"
                                accept=".pdf,.doc,.docx"
                            />
                        {editingRecognition?.signedAgreementUrl && (
                                <div className="md:col-span-2">
                            <p className="text-sm text-slate-500 mt-1">
                                Current file: <a href={editingRecognition.signedAgreementUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View current agreement</a>
                            </p>
                                </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-3 pt-6 border-t mt-4">
                        <Button type="button" variant="secondary" onClick={() => setIsEditRecognitionModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Updating...' : 'Update Recognition Record'}
                        </Button>
                    </div>
                </form>
                </div>
            </Modal>

            {/* Delete Recognition Confirmation Modal */}
            <Modal isOpen={isDeleteRecognitionModalOpen} onClose={() => setIsDeleteRecognitionModalOpen(false)} title="Delete Recognition Record">
                <div className="space-y-4">
                    <p className="text-slate-600">
                        Are you sure you want to delete the recognition record for{' '}
                        <span className="font-semibold">{recognitionToDelete?.programName}</span>?
                    </p>
                    <p className="text-sm text-slate-500">
                        This action cannot be undone. The recognition record will be permanently removed.
                    </p>
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t mt-4">
                    <Button type="button" variant="secondary" onClick={() => setIsDeleteRecognitionModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button 
                        type="button" 
                        variant="destructive" 
                        onClick={() => recognitionToDelete && handleDeleteRecognitionRecord(recognitionToDelete.id)}
                    >
                        Delete Recognition Record
                    </Button>
                </div>
            </Modal>
 
            {/* Recognition and Incubation */}
            <Card>
                <h3 className="text-lg font-semibold mb-4 text-slate-700">Recognition and Incubation</h3>
                <div className="overflow-x-auto">
                     <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium text-slate-500">Program Name</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500">Facilitator</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500">Fee Type</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500">Fee Amount</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500">Shares</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500">Price per Share</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500">Investment Amount</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500">Equity (%)</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500">Date Added</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500">Signed Agreement</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {recognitionRecords.map(rec => (
                                <tr key={rec.id}>
                                    <td className="px-4 py-2 font-medium text-slate-900">{rec.programName}</td>
                                    <td className="px-4 py-2 text-slate-500">{rec.facilitatorName}</td>
                                    <td className="px-4 py-2 text-slate-500">
                                        <span className={'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ' + (
                                            rec.feeType === 'Equity' ? 'bg-green-100 text-green-800' :
                                            rec.feeType === 'Hybrid' ? 'bg-blue-100 text-blue-800' :
                                            rec.feeType === 'Fees' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-800'
                                        )}>
                                            {rec.feeType}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-slate-500">
                                        {rec.feeAmount ? 
                                            startupCurrency + ' ' + rec.feeAmount.toLocaleString() : '—'
                                        }
                                    </td>
                                    <td className="px-4 py-2 text-slate-500">
                                        {(rec.feeType === 'Equity' || rec.feeType === 'Hybrid') && rec.shares ? 
                                            rec.shares.toLocaleString() : '—'
                                        }
                                    </td>
                                    <td className="px-4 py-2 text-slate-500">
                                        {(rec.feeType === 'Equity' || rec.feeType === 'Hybrid') && rec.pricePerShare ? 
                                            startupCurrency + ' ' + rec.pricePerShare.toFixed(2) : '—'
                                        }
                                    </td>
                                    <td className="px-4 py-2 text-slate-500">
                                        {(rec.feeType === 'Equity' || rec.feeType === 'Hybrid') && rec.investmentAmount ? 
                                            startupCurrency + ' ' + rec.investmentAmount.toLocaleString() : '—'
                                        }
                                    </td>
                                    <td className="px-4 py-2 text-slate-500">
                                        {(rec.feeType === 'Equity' || rec.feeType === 'Hybrid') && rec.equityAllocated ? 
                                            rec.equityAllocated.toFixed(2) + '%' : '—'
                                        }
                                    </td>
                                    <td className="px-4 py-2 text-slate-500">{rec.dateAdded}</td>
                                    <td className="px-4 py-2 text-slate-500">
                                        <a href={rec.signedAgreementUrl} className="flex items-center text-brand-primary hover:underline">
                                            <Download className="h-4 w-4 mr-1"/> View Document
                                        </a>
                                    </td>
                                    <td className="px-4 py-2 text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleEditRecognition(rec)}
                                                className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                                title="Edit recognition record"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDeleteRecognition(rec)}
                                                className="text-red-600 border-red-600 hover:bg-red-50"
                                                title="Delete recognition record"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                             {recognitionRecords.length === 0 && (
                                <tr><td colSpan={11} className="text-center py-6 text-slate-500">No recognitions added yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                        </div>
            </Card>

            {/* Investor List */}
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-slate-700">Investor List</h3>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDownloadFundUtilizationReport}
                        className="flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download Fund Utilization Report (PDF)
                    </Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium text-slate-500">Date</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500">Investor Name</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500">Investor Code</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500">Amount</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500">Price/Share</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500">Equity</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500">Post-Money</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500">Fund Utilization</th>
                                <th className="px-4 py-2 text-right font-medium text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {[...investmentRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(inv => (
                                    <tr key={inv.id}>
                                        <td className="px-4 py-2 text-slate-500">{new Date(inv.date).toLocaleDateString()}</td>
                                        <td className="px-4 py-2 font-medium text-slate-900">{inv.investorName}</td>
                                        <td className="px-4 py-2 text-slate-500 font-mono text-xs">
                                            {inv.investorCode ? (
                                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
                                                    {inv.investorCode}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">No code</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-slate-500">{formatCurrency(inv.amount, startupCurrency)}</td>
                                        <td className="px-4 py-2 text-slate-500">{formatCurrency(inv.pricePerShare || 0, startupCurrency)}</td>
                                        <td className="px-4 py-2 text-slate-500">{inv.equityAllocated}%</td>
                                        <td className="px-4 py-2 text-slate-500">{formatCurrency(inv.postMoneyValuation || ((inv.equityAllocated && inv.equityAllocated > 0) ? (inv.amount * 100) / inv.equityAllocated : 0), startupCurrency)}</td>
                                        <td className="px-4 py-2 text-slate-500">
                                            {(() => {
                                                const utilization = calculateInvestorUtilization(inv.investorName, inv.amount);
                                                return (
                                                    <UtilizationProgressBar 
                                                        utilized={utilization.utilized} 
                                                        total={inv.amount} 
                                                        percentage={utilization.percentage} 
                                                    />
                                                );
                                            })()}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    onClick={() => handleDownloadIndividualFundReport(inv)}
                                                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                                    title="Download Fund Utilization Report (PDF)"
                                                >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    disabled={!canEdit}
                                                    onClick={() => handleEditInvestment(inv)}
                                                >
                                                    <Edit3 className="h-4 w-4" />
                                                </Button>
                                                {canEdit && (
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="text-red-600 border-red-300 hover:bg-red-50"
                                                        onClick={() => {
                                                            setInvestmentToDelete(inv);
                                                            setIsDeleteModalOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                            ))}
                            {investmentRecords.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-6 text-slate-500">No investments added yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>


            {/* Add Entry Form (Unified) */}
            <Card>
                <h3 className="text-lg font-semibold mb-4 text-slate-700">Add New Equity Allocation Entry</h3>
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
                        <div className="flex items-center">
                            <span className="text-red-500 mr-2">⚠️</span>
                            <div>
                                <p className="font-medium">Form Error</p>
                                <p className="text-sm">{error}</p>
                            </div>
                        </div>
                    </div>
                )}
                <fieldset disabled={!canEdit}>
                    <form onSubmit={handleEntrySubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">Entry Type</label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={entryType === 'investment' ? 'default' : 'outline'}
                                    onClick={() => setEntryType('investment')}
                                    className={'flex-1 border-2 ' + (entryType === 'investment' ? 'border-blue-600' : 'border-slate-300')}
                                >
                                    Investment
                                </Button>
                                <Button
                                    type="button"
                                    variant={entryType === 'recognition' ? 'default' : 'outline'}
                                    onClick={() => setEntryType('recognition')}
                                    className={'flex-1 border-2 ' + (entryType === 'recognition' ? 'border-blue-600' : 'border-slate-300')}
                                >
                                    Recognition / Incubation
                                </Button>
                            </div>
                        </div>

                        {entryType === 'investment' && (
                            <div className="space-y-4 pt-4 border-t">
                                {/* Shares Allocation Summary */}
                                {(() => {
                                    const totalFounderShares = founders.reduce((sum, founder) => sum + (founder.shares || 0), 0);
                                    const totalInvestorShares = investmentRecords.reduce((sum, inv) => sum + (inv.shares || 0), 0);
                                    const esopReservedShares = startup.esopReservedShares || 0;
                                    const calculatedTotalShares = totalFounderShares + totalInvestorShares + esopReservedShares;
                                    
                                    if (calculatedTotalShares > 0) {
                                        return (
                                            <div className="p-3 bg-slate-50 rounded-lg border">
                                                <h4 className="text-sm font-medium text-slate-700 mb-2">Shares Allocation Summary</h4>
                                                <div className="space-y-1 text-sm">
                                                    <div className="flex justify-between">
                                                        <span>Total Shares:</span>
                                                        <span className="font-medium">{calculatedTotalShares.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Founder Shares:</span>
                                                        <span>{totalFounderShares.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Investor Shares:</span>
                                                        <span>{totalInvestorShares.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>ESOP Reserved:</span>
                                                        <span>{esopReservedShares.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Input 
                                    label="Investment Date" 
                                    name="inv-date" 
                                    id="inv-date" 
                                    type="date" 
                                    max={new Date().toISOString().split('T')[0]}
                                    required 
                                />
                                <Select label="Investor Type" name="inv-investor-type" id="inv-investor-type" required>
                                    {Object.values(InvestorType).map(t => <option key={t} value={t}>{t}</option>)}
                                </Select>
                                <Select label="Investment Type" name="inv-type" id="inv-type" required>
                                    {Object.values(InvestmentRoundType).map(t => <option key={t} value={t}>{t}</option>)}
                                </Select>
                                <Input label="Investor Name" name="inv-name" id="inv-name" required />
                                <Input label="Investor Code" name="inv-code" id="inv-code" placeholder="e.g., INV-A7B3C9"/>
                                <Input 
                                    label="Number of Shares" 
                                    name="inv-shares" 
                                    id="inv-shares" 
                                    type="number" 
                                    required 
                                    value={invSharesDraft} 
                                    onChange={(e) => setInvSharesDraft(e.target.value)}
                                    placeholder="e.g., 10000"
                                />
                                <Input 
                                    label={'Price per Share (' + startupCurrency + ')'} 
                                    name="inv-price-per-share" 
                                    id="inv-price-per-share" 
                                    type="number" 
                                    step="0.01"
                                    required 
                                    value={invPricePerShareDraft} 
                                    onChange={(e) => setInvPricePerShareDraft(e.target.value)}
                                    placeholder="e.g., 1.50"
                                />
                                <Input label="Investment Amount (auto)" name="inv-amount" id="inv-amount" type="number" readOnly value={invAmountDraft} />
                                <Input label="Equity Allocated (%) (auto)" name="inv-equity" id="inv-equity" type="number" readOnly value={invEquityDraft} />
                                <Input label="Post-Money Valuation (auto)" name="inv-postmoney" id="inv-postmoney" type="number" readOnly value={invPostMoneyDraft} />
                                <CloudDriveInput
                                    value=""
                                    onChange={(url) => {
                                        const hiddenInput = document.getElementById('inv-proof-url') as HTMLInputElement;
                                        if (hiddenInput) hiddenInput.value = url;
                                    }}
                                    onFileSelect={(file) => {
                                        const fileInput = document.getElementById('inv-proof') as HTMLInputElement;
                                        if (fileInput) {
                                            const dataTransfer = new DataTransfer();
                                            dataTransfer.items.add(file);
                                            fileInput.files = dataTransfer.files;
                                        }
                                    }}
                                    placeholder="Paste your cloud drive link here..."
                                    label="Proof of Investment"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    maxSize={10}
                                    documentType="investment proof"
                                    showPrivacyMessage={false}
                                />
                                <input type="hidden" id="inv-proof-url" name="inv-proof-url" />
                                <input
                                    type="file"
                                    id="inv-proof"
                                    name="inv-proof"
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                />
                                </div>
                            </div>
                        )}

                        {entryType === 'recognition' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                                <Input label="Program Name" name="rec-program-name" id="rec-program-name" required containerClassName="md:col-span-2"/>
                                <Input label="Facilitator Name" name="rec-facilitator-name" id="rec-facilitator-name" required />
                                <Input label="Facilitator Code" name="rec-facilitator-code" id="rec-facilitator-code" placeholder="e.g., FAC-D4E5F6" required />
                                <Select label="Incubation Type" name="rec-incubation-type" id="rec-incubation-type" required>
                                    {Object.values(IncubationType).map(t => <option key={t} value={t}>{t}</option>)}
                                </Select>
                                <Select label="Fee Type" name="rec-fee-type" id="rec-fee-type" value={feeType} onChange={e => setFeeType(e.target.value as FeeType)} required>
                                   {Object.values(FeeType).map(t => <option key={t} value={t}>{t}</option>)}
                                </Select>
                                {(feeType === FeeType.Fees || feeType === FeeType.Hybrid) && (
                                    <Input label="Fee Amount" name="rec-fee-amount" id="rec-fee-amount" type="number" required />
                                )}
                                {(feeType === FeeType.Equity || feeType === FeeType.Hybrid) && (
                                    <>
                                        <Input 
                                            label="Number of Shares" 
                                            name="rec-shares" 
                                            id="rec-shares" 
                                            type="number" 
                                            required
                                            value={recSharesDraft}
                                            onChange={(e) => setRecSharesDraft(e.target.value)}
                                            placeholder="e.g., 10000"
                                        />
                                        <Input 
                                            label={'Price per Share (' + startupCurrency + ')'} 
                                            name="rec-price-per-share" 
                                            id="rec-price-per-share" 
                                            type="number" 
                                            step="0.01"
                                            required
                                            value={recPricePerShareDraft}
                                            onChange={(e) => setRecPricePerShareDraft(e.target.value)}
                                            placeholder="e.g., 1.50"
                                        />
                                        <Input 
                                            label="Investment Amount (auto)" 
                                            name="rec-amount" 
                                            id="rec-amount" 
                                            type="number" 
                                            readOnly 
                                            value={recAmountDraft}
                                        />
                                        <Input 
                                            label="Equity Allocated (%) (auto)" 
                                            name="rec-equity" 
                                            id="rec-equity" 
                                            type="number" 
                                            readOnly 
                                            value={recEquityDraft}
                                        />
                                        <Input 
                                            label="Post-Money Valuation (auto)" 
                                            name="rec-postmoney" 
                                            id="rec-postmoney" 
                                            type="number" 
                                            readOnly 
                                            value={recPostMoneyDraft}
                                        />
                                    </>
                                )}
                                <CloudDriveInput
                                    value=""
                                    onChange={(url) => {
                                        const hiddenInput = document.getElementById('rec-agreement-url-new') as HTMLInputElement;
                                        if (hiddenInput) hiddenInput.value = url;
                                        const fileInput = document.getElementById('rec-agreement-new') as HTMLInputElement;
                                        if (fileInput) {
                                            fileInput.value = '';
                                            const emptyTransfer = new DataTransfer();
                                            fileInput.files = emptyTransfer.files;
                                        }
                                    }}
                                    onFileSelect={(file) => {
                                        const fileInput = document.getElementById('rec-agreement-new') as HTMLInputElement;
                                        if (fileInput) {
                                            const dataTransfer = new DataTransfer();
                                            dataTransfer.items.add(file);
                                            fileInput.files = dataTransfer.files;
                                        }
                                        const hiddenInput = document.getElementById('rec-agreement-url-new') as HTMLInputElement;
                                        if (hiddenInput) hiddenInput.value = '';
                                    }}
                                    placeholder="Paste your cloud drive link here..."
                                    label="Upload Signed Agreement"
                                    accept=".pdf,.doc,.docx"
                                    maxSize={10}
                                    documentType="signed agreement"
                                    showPrivacyMessage={false}
                                    className="md:col-span-2"
                                />
                                <input type="hidden" id="rec-agreement-url-new" name="rec-agreement-url-new" />
                                <input
                                    type="file"
                                    id="rec-agreement-new"
                                    name="rec-agreement"
                                    className="hidden"
                                    accept=".pdf,.doc,.docx"
                                />
                            </div>
                        )}
                        
                        <div className="flex items-end pt-4 border-t">
                            <Button type="submit"><Plus className="h-4 w-4 mr-2" />Add Entry</Button>
                        </div>
                    </form>
                </fieldset>
            </Card>


            {/* Delete Program Confirmation Modal */}
            <Modal 
                isOpen={isDeleteProgramModalOpen} 
                onClose={() => setIsDeleteProgramModalOpen(false)}
                title="Delete Program"
            >
                <div className="space-y-4">
                    <p>Are you sure you want to delete the program "{programToDelete?.programName}"?</p>
                    <p className="text-sm text-slate-500">This action cannot be undone.</p>
                    <div className="flex gap-3 justify-end">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsDeleteProgramModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="button" 
                            variant="destructive" 
                            onClick={() => programToDelete && handleDeleteProgram(programToDelete.id)}
                        >
                            Delete Program
                        </Button>
                    </div>
                </div>
            </Modal>
            {/* Total Shares Modal removed - total shares are now calculated automatically */}

            {/* Edit Investment Modal */}
            <Modal 
                isOpen={isEditInvestmentModalOpen} 
                onClose={() => setIsEditInvestmentModalOpen(false)} 
                title="Edit Investment"
            >
                {editingInvestment && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Investment Date
                                </label>
                                <input
                                    type="date"
                                    value={editingInvestment.investmentDate}
                                    onChange={(e) => setEditingInvestment({
                                        ...editingInvestment,
                                        investmentDate: e.target.value
                                    })}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            {/* Investor Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Investor Type
                                </label>
                                <select
                                    value={editingInvestment.investorType || 'Individual'}
                                    onChange={(e) => setEditingInvestment({
                                        ...editingInvestment,
                                        investorType: e.target.value as InvestorType
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    {Object.values(InvestorType).map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Investment Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Investment Type
                                </label>
                                <select
                                    value={editingInvestment.investmentType}
                                    onChange={(e) => setEditingInvestment({
                                        ...editingInvestment,
                                        investmentType: e.target.value as InvestmentRoundType
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    {Object.values(InvestmentRoundType).map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Investor Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Investor Name
                                </label>
                                <input
                                    type="text"
                                    value={editingInvestment.investorName}
                                    onChange={(e) => setEditingInvestment({
                                        ...editingInvestment,
                                        investorName: e.target.value
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            {/* Investor Code */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Investor Code
                                </label>
                                <input
                                    type="text"
                                    value={editingInvestment.investorCode || ''}
                                    onChange={(e) => setEditingInvestment({
                                        ...editingInvestment,
                                        investorCode: e.target.value
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., INV-A7B3C9"
                                />
                            </div>

                            {/* Number of Shares */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Number of Shares
                                </label>
                                <input
                                    type="number"
                                    value={editingInvestment.shares || 0}
                                    onChange={(e) => setEditingInvestment({
                                        ...editingInvestment,
                                        shares: parseInt(e.target.value) || 0
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., 10000"
                                    required
                                />
                            </div>

                            {/* Price per Share */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Price per Share ({startupCurrency})
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editingInvestment.pricePerShare || 0}
                                    onChange={(e) => setEditingInvestment({
                                        ...editingInvestment,
                                        pricePerShare: parseFloat(e.target.value) || 0
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., 1.50"
                                    required
                                />
                            </div>

                            {/* Investment Amount (auto-calculated) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Investment Amount (auto)
                                </label>
                                <input
                                    type="number"
                                    value={((editingInvestment.shares || 0) * (editingInvestment.pricePerShare || 0)).toFixed(2)}
                                    readOnly
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                                />
                            </div>

                            {/* Equity Allocated (auto-calculated) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Equity Allocated (%) (auto)
                                </label>
                                <input
                                    type="number"
                                    value={editingInvestment.equityAllocated || 0}
                                    readOnly
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                                />
                            </div>

                            {/* Post-Money Valuation (auto-calculated) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Post-Money Valuation (auto)
                                </label>
                                <input
                                    type="number"
                                    value={editingInvestment.postMoneyValuation || 0}
                                    readOnly
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                                />
                            </div>

                            {/* Proof of Investment */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Proof of Investment
                                </label>
                                <input
                                    type="file"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                />
                                {editingInvestment.proofOfInvestment && (
                                    <p className="text-sm text-gray-500 mt-1">
                                        Current file: {editingInvestment.proofOfInvestment}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes
                            </label>
                            <textarea
                                value={editingInvestment.notes || ''}
                                onChange={(e) => setEditingInvestment({
                                    ...editingInvestment,
                                    notes: e.target.value
                                })}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Additional notes about this investment..."
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button
                                variant="outline"
                                onClick={() => setIsEditInvestmentModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={async () => {
                                    try {
                                        if (!editingInvestment) return;
                                        // Persist changes
                                        const updated = await capTableService.updateInvestmentRecord(String(editingInvestment.id), {
                                            date: (editingInvestment as any).investmentDate || editingInvestment.date,
                                            investorType: editingInvestment.investorType,
                                            investmentType: editingInvestment.investmentType,
                                            investorName: editingInvestment.investorName,
                                            investorCode: editingInvestment.investorCode,
                                            amount: (editingInvestment.shares || 0) * (editingInvestment.pricePerShare || 0),
                                            equityAllocated: editingInvestment.equityAllocated,
                                            shares: editingInvestment.shares,
                                            pricePerShare: editingInvestment.pricePerShare,
                                            postMoneyValuation: editingInvestment.postMoneyValuation,
                                            preMoneyValuation: editingInvestment.preMoneyValuation,
                                            proofUrl: editingInvestment.proofOfInvestment
                                        } as any);

                                        // Recompute and persist price per share based on latest post-money
                                        try {
                                            const latestList = [...investmentRecords.map(i => ({...i})), updated].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                            const latest = latestList[0];
                                            const totalSharesNow = calculateTotalShares();
                                            const nextPricePerShare = (latest?.postMoneyValuation && totalSharesNow > 0) ? (latest.postMoneyValuation / totalSharesNow) : 0;
                                            if (nextPricePerShare > 0) {
                                                await capTableService.upsertPricePerShare(startup.id, nextPricePerShare);
                                                setPricePerShare(nextPricePerShare);
                                                if (startup) startup.pricePerShare = nextPricePerShare;
                                            }
                                        } catch (ppsErr) {
                                            console.warn('Failed to recompute price per share after edit:', ppsErr);
                                        }

                                        messageService.success('Investment Updated', 'Investment updated successfully!', 3000);
                                        setIsEditInvestmentModalOpen(false);
                                        await loadCapTableData();
                                    } catch (error) {
                                        console.error('Error updating investment:', error);
                                        messageService.error('Update Failed', 'Failed to update investment');
                                    }
                                }}
                            >
                                Save Changes
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

        </div>
        );
    } catch (error) {
        console.error('CapTableTab render error:', error);
        return (
            <div className="text-center py-8">
                <p className="text-red-600 mb-4">An error occurred while loading the equity allocation data.</p>
                <Button onClick={() => window.location.reload()}>Reload Page</Button>
            </div>
        );
    }
};

export default CapTableTab;
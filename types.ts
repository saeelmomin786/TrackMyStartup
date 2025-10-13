export enum ComplianceStatus {
  Compliant = 'Compliant',
  Pending = 'Pending',
  NonCompliant = 'Non-Compliant',
  Verified = 'Verified',
  Rejected = 'Rejected',
  NotRequired = 'Not Required',
}

export enum InvestmentType {
    PreSeed = 'Pre-Seed',
    Seed = 'Seed',
    SeriesA = 'Series A',
    SeriesB = 'Series B',
    Bridge = 'Bridge',
}

// Startup domains for fundraising filtering/labeling
export enum StartupDomain {
    Agriculture = 'Agriculture',
    AI = 'AI',
    Climate = 'Climate',
    ConsumerGoods = 'Consumer Goods',
    Defence = 'Defence',
    Ecommerce = 'E-commerce',
    Education = 'Education',
    EV = 'EV',
    Finance = 'Finance',
    FoodAndBeverage = 'Food & Beverage',
    Healthcare = 'Healthcare',
    Manufacturing = 'Manufacturing',
    MediaAndEntertainment = 'Media & Entertainment',
    Others = 'Others',
    PaaS = 'PaaS',
    RenewableEnergy = 'Renewable Energy',
    Retail = 'Retail',
    SaaS = 'SaaS',
    SocialImpact = 'Social Impact',
    Space = 'Space',
    TransportationAndLogistics = 'Transportation and Logistics',
    WasteManagement = 'Waste Management',
    Web3 = 'Web 3.0'
}

export enum StartupStage {
    Ideation = 'Ideation',
    ProofOfConcept = 'Proof of Concept',
    MVP = 'Minimum viable product',
    PMF = 'Product market fit',
    Scaling = 'Scaling'
}

export enum IncubationType {
    IncubationCenter = 'Incubation Center',
    Accelerator = 'Accelerator',
    InnovationHub = 'Innovation Hub',
    TechnologyPark = 'Technology Park',
    ResearchInstitute = 'Research Institute',
}

export enum FeeType {
    Free = 'Free',
    Fees = 'Fees',
    Equity = 'Equity',
    Hybrid = 'Hybrid',
}

export type UserRole = 'Investor' | 'Startup' | 'CA' | 'CS' | 'Admin' | 'Startup Facilitation Center' | 'Investment Advisor';

export interface Founder {
  name: string;
  email: string;
  shares?: number;
  equityPercentage?: number; // Direct equity percentage
}

export interface Startup {
  id: number;
  name:string;
  investmentType: InvestmentType;
  investmentValue: number;
  equityAllocation: number;
  currentValuation: number;
  complianceStatus: ComplianceStatus;
  sector: string;
  totalFunding: number;
  totalRevenue: number;
  registrationDate: string; // YYYY-MM-DD
  currency?: string; // User preferred currency (USD, EUR, GBP, INR, etc.)
  founders: Founder[];
  profile?: ProfileData;
  complianceChecks?: ComplianceCheck[];
  financials?: FinancialRecord[];
  investments?: InvestmentRecord[];
  esopReservedShares?: number; // Number of shares reserved for ESOP
  totalShares?: number; // Total number of shares issued
  pricePerShare?: number; // Current price per share
}

export interface NewInvestment {
  id: number;
  name: string;
  investmentType: InvestmentType;
  investmentValue: number;
  equityAllocation: number;
  sector: string;
  totalFunding: number;
  totalRevenue: number;
  registrationDate: string; // YYYY-MM-DD
  pitchDeckUrl?: string;
  pitchVideoUrl?: string;
  complianceStatus: ComplianceStatus;
}

export interface StartupAdditionRequest {
  id: number;
  name: string;
  investmentType: InvestmentType;
  investmentValue: number;
  equityAllocation: number;
  sector: string;
  totalFunding: number;
  totalRevenue: number;
  registrationDate: string;
  investorCode?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

// New types for Startup Health View

export interface ServiceProvider {
  name: string;
  code: string;
  licenseUrl: string;
}

export interface Subsidiary {
  id: number;
  country: string;
  companyType: string;
  registrationDate: string;
  caCode?: string;
  csCode?: string;
  ca?: ServiceProvider;
  cs?: ServiceProvider;
}

export interface InternationalOp {
  id: number;
  country: string;
  companyType: string;
  startDate: string;
}

export interface ProfileData {
  country: string;
  companyType: string;
  registrationDate: string;
  currency?: string;
  subsidiaries: Subsidiary[];
  internationalOps: InternationalOp[];
  caServiceCode?: string;
  csServiceCode?: string;
  ca?: ServiceProvider;
  cs?: ServiceProvider;
  investmentAdvisorCode?: string;
}

// New compliance task interface for dynamic generation
export interface ComplianceTaskGenerated {
  task_id: string;
  entity_identifier: string;
  entity_display_name: string;
  year: number;
  task_name: string;
  ca_required: boolean;
  cs_required: boolean;
  task_type: string;
}


export interface FinancialRecord {
    id: string;
    startup_id: number;
    record_type: 'expense' | 'revenue';
    date: string;
    entity: string;
    description: string;
    vertical: string;
    amount: number;
    funding_source?: string; // For expenses
    cogs?: number; // For revenue
    attachment_url?: string;
}

// Add missing interfaces for FinancialsTab
export interface Expense {
    id: string;
    date: string;
    entity: string;
    description: string;
    vertical: string;
    amount: number;
    fundingSource: string;
    attachmentUrl?: string;
}

export interface Revenue {
    id: string;
    date: string;
    entity: string;
    vertical: string;
    earnings: number;
    cogs: number;
    attachmentUrl?: string;
}

export interface Employee {
    id: string;
    name: string;
    joiningDate: string;
    entity: string;
    department: string;
    salary: number;
    esopAllocation: number; // Represents currency value
    allocationType: 'one-time' | 'annually' | 'quarterly' | 'monthly';
    esopPerAllocation: number;
    pricePerShare?: number; // Price per share at time of allocation
    numberOfShares?: number; // Number of shares allocated (auto-calculated)
    contractUrl?: string;
    terminationDate?: string;
}

export interface EmployeeLedgerEntry {
    id: string;
    employee_id: string;
    ledger_date: string;
    salary: number;
    esop_allocated: number;
    price_per_share: number;
    number_of_shares: number;
    created_at: string;
    updated_at: string;
}

export enum InvestorType {
    Angel = 'Angel',
    VC = 'VC Firm',
    Corporate = 'Corporate',
    Government = 'Government'
}

export enum InvestmentRoundType {
    Equity = 'Equity',
    Debt = 'Debt',
    Grant = 'Grant'
}

// Missing shared types referenced across services
export type EsopAllocationType = 'one-time' | 'annually' | 'quarterly' | 'monthly';
export type OfferStatus = 'pending' | 'approved' | 'rejected' | 'accepted' | 'completed';

export interface InvestmentRecord {
    id: string;
    date: string;
    investorType: InvestorType;
    investmentType: InvestmentRoundType;
    investorName: string;
    investorCode?: string;
    amount: number;
    equityAllocated: number;
    preMoneyValuation: number;
    shares?: number; // Number of shares issued to investor
    pricePerShare?: number; // Price per share for this investment
    postMoneyValuation?: number; // Auto-calculated post-money valuation
    proofUrl?: string;
}

export interface RecognitionRecord {
    id: string;
    startupId: number;
    programName: string;
    facilitatorName: string;
    facilitatorCode: string;
    incubationType: IncubationType;
    feeType: FeeType;
    feeAmount?: number;
    shares?: number;
    pricePerShare?: number;
    investmentAmount?: number;
    equityAllocated?: number;
    postMoneyValuation?: number;
    signedAgreementUrl: string;
    status?: string;
    dateAdded: string;
    startup?: {
        id: number;
        name: string;
        sector: string;
        current_valuation: number;
        compliance_status: string;
        total_funding: number;
        total_revenue: number;
        registration_date: string;
    };
}

export interface FundraisingDetails {
    active: boolean;
    type: InvestmentType;
    value: number;
    equity: number;
    // newly added classification fields
    domain?: StartupDomain;
    stage?: StartupStage;
    validationRequested: boolean;
    pitchDeckUrl?: string;
    pitchVideoUrl?: string;
}

// Admin Panel Types
export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    registrationDate: string; // YYYY-MM-DD
    serviceCode?: string;
    investorCode?: string; // Unique investor code for investors
    caCode?: string; // Unique CA code for CA users
}

export interface VerificationRequest {
    id: number;
    startupId: number;
    startupName: string;
    requestDate: string; // YYYY-MM-DD
}

export interface InvestmentOffer {
    id: number;
    investorEmail: string;
    investorName?: string;
    startupName: string;
    startup?: {
        id: number;
        name: string;
        sector: string;
        complianceStatus: ComplianceStatus;
        startupNationValidated?: boolean;
        validationDate?: string;
        createdAt: string;
    };
    offerAmount: number;
    equityPercentage: number;
    status: 'pending' | 'approved' | 'rejected' | 'accepted' | 'completed';
    createdAt: string;
}

// Incubation & Acceleration Programs
export interface IncubationProgram {
    id: string;
    programName: string;
    programType: 'Incubation' | 'Acceleration' | 'Mentorship' | 'Bootcamp';
    startDate: string;
    endDate: string;
    status: 'Active' | 'Completed' | 'Dropped';
    description?: string;
    mentorName?: string;
    mentorEmail?: string;
    programUrl?: string;
    createdAt: string;
}

export interface AddIncubationProgramData {
    programName: string;
    programType: 'Incubation' | 'Acceleration' | 'Mentorship' | 'Bootcamp';
    startDate: string;
    endDate: string;
    description?: string;
    mentorName?: string;
    mentorEmail?: string;
    programUrl?: string;
}

// Compliance related interfaces
export interface ComplianceCheck {
    taskId: string;
    caStatus: ComplianceStatus;
    csStatus: ComplianceStatus;
    documentUrl?: string;
}

// Extend application item shape used in startup components if referenced
export interface ApplicationItem {
    id: string;
    startupId: number;
    opportunityId: string;
    status: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | string;
    pitchDeckUrl?: string;
    pitchVideoUrl?: string;
    created_at?: string;
    diligence_status?: 'requested' | 'approved' | 'rejected' | null | string;
    diligence_urls?: string[]; // array of uploaded diligence document URLs
}

export enum FinancialVertical {
    Saas = 'SaaS',
    Ecommerce = 'E-commerce',
    Fintech = 'FinTech',
    Healthtech = 'HealthTech',
    Edtech = 'EdTech',
    Other = 'Other'
}

// IP/Trademark related interfaces
export enum IPType {
    Trademark = 'Trademark',
    Patent = 'Patent',
    Copyright = 'Copyright',
    TradeSecret = 'Trade Secret',
    DomainName = 'Domain Name',
    Other = 'Other'
}

export enum IPStatus {
    Active = 'Active',
    Pending = 'Pending',
    Expired = 'Expired',
    Abandoned = 'Abandoned',
    Cancelled = 'Cancelled'
}

export enum IPDocumentType {
    RegistrationCertificate = 'Registration Certificate',
    ApplicationForm = 'Application Form',
    RenewalDocument = 'Renewal Document',
    AssignmentAgreement = 'Assignment Agreement',
    LicenseAgreement = 'License Agreement',
    Other = 'Other'
}

// Document verification related interfaces
export enum DocumentVerificationStatus {
    Pending = 'pending',
    Verified = 'verified',
    Rejected = 'rejected',
    Expired = 'expired',
    UnderReview = 'under_review'
}

export interface DocumentVerification {
    id: string;
    documentId: string;
    documentType: string;
    verificationStatus: DocumentVerificationStatus;
    verifiedBy?: string;
    verifiedAt?: string;
    verificationNotes?: string;
    rejectionReason?: string;
    expiryDate?: string;
    verificationMethod?: string;
    confidenceScore?: number;
    createdAt: string;
    updatedAt: string;
}

export interface DocumentVerificationRule {
    id: string;
    documentType: string;
    verificationRequired: boolean;
    autoVerification: boolean;
    verificationExpiryDays: number;
    requiredVerifierRole?: string;
    verificationCriteria: any;
    createdAt: string;
    updatedAt: string;
}

export interface DocumentVerificationHistory {
    id: string;
    documentVerificationId: string;
    previousStatus?: DocumentVerificationStatus;
    newStatus: DocumentVerificationStatus;
    changedBy: string;
    changeReason?: string;
    changedAt: string;
}

export interface VerifyDocumentData {
    documentId: string;
    verifierEmail: string;
    verificationStatus: DocumentVerificationStatus;
    verificationNotes?: string;
    confidenceScore?: number;
}

export interface IPTrademarkRecord {
    id: string;
    startupId: number;
    type: IPType;
    name: string;
    description?: string;
    registrationNumber?: string;
    registrationDate?: string; // YYYY-MM-DD
    expiryDate?: string; // YYYY-MM-DD
    jurisdiction: string; // Country or region where registered
    status: IPStatus;
    owner?: string; // Who owns the IP (company name or individual)
    filingDate?: string; // YYYY-MM-DD
    priorityDate?: string; // YYYY-MM-DD
    renewalDate?: string; // YYYY-MM-DD
    estimatedValue?: number; // Estimated monetary value
    notes?: string;
    createdAt: string;
    updatedAt: string;
    documents?: IPTrademarkDocument[];
}

export interface IPTrademarkDocument {
    id: string;
    ipRecordId: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    documentType: IPDocumentType;
    uploadedBy: string;
    uploadedAt: string;
    createdAt: string;
}

export interface CreateIPTrademarkRecordData {
    type: IPType;
    name: string;
    description?: string;
    registrationNumber?: string;
    registrationDate?: string;
    expiryDate?: string;
    jurisdiction: string;
    status?: IPStatus;
    owner?: string;
    filingDate?: string;
    priorityDate?: string;
    renewalDate?: string;
    estimatedValue?: number;
    notes?: string;
}

export interface UpdateIPTrademarkRecordData {
    type?: IPType;
    name?: string;
    description?: string;
    registrationNumber?: string;
    registrationDate?: string;
    expiryDate?: string;
    jurisdiction?: string;
    status?: IPStatus;
    owner?: string;
    filingDate?: string;
    priorityDate?: string;
    renewalDate?: string;
    estimatedValue?: number;
    notes?: string;
}

// Company Documents Types
export interface CompanyDocument {
    id: string;
    startupId: number;
    documentName: string;
    description?: string;
    documentUrl: string;
    documentType?: string;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCompanyDocumentData {
    documentName: string;
    description?: string;
    documentUrl: string;
    documentType?: string;
}

export interface UpdateCompanyDocumentData {
    documentName?: string;
    description?: string;
    documentUrl?: string;
    documentType?: string;
}
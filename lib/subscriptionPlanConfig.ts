/**
 * Subscription Plan Configuration
 * Defines plan features, storage limits, and restrictions
 */

export interface PlanConfig {
  id: 'free' | 'basic' | 'premium';
  name: string;
  price_eur: number;
  storage_mb: number;
  features: string[];
  restrictedFeatures: string[];
}

export const PLAN_CONFIGS: Record<'free' | 'basic' | 'premium', PlanConfig> = {
  free: {
    id: 'free',
    name: 'Basic Plan',
    price_eur: 0,
    storage_mb: 100,
    features: [
      'Financial Tracking',
      'Compliance Management',
      'ESOP and employee Management',
      'Equity Allocation/Cap table Management'
    ],
    restrictedFeatures: [
      'Auto-Generated Grant & Investment Utilization Report',
      'Portfolio Fundraising',
      'Grants Draft Assistant',
      'Grant CRM',
      'AI Investor Matching',
      'Investor CRM',
      'Fundraising Portfolio',
      'Portfolio promotion to investors',
      'Portfolio promotion through angel network',
      'Part of Investments by Track My Startup Program'
    ]
  },
  basic: {
    id: 'basic',
    name: 'Standard Plan',
    price_eur: 5,
    storage_mb: 1024, // 1 GB
    features: [
      'Financial Tracking',
      'Compliance Management',
      'ESOP and employee Management',
      'Equity Allocation/Cap table Management',
      'Portfolio Fundraising',
      'Grants Draft Assistant',
      'Auto-Generated Grant & Investment Utilization Report',
      'Grant CRM'
    ],
    restrictedFeatures: [
      'AI Investor Matching',
      'Investor CRM',
      'Fundraising Portfolio',
      'Portfolio promotion to investors',
      'Portfolio promotion through angel network',
      'Part of Investments by Track My Startup Program'
    ]
  },
  premium: {
    id: 'premium',
    name: 'Premium Plan',
    price_eur: 20,
    storage_mb: 10240, // 10 GB
    features: [
      'Financial Tracking',
      'Compliance Management',
      'ESOP and employee Management',
      'Equity Allocation/Cap table Management',
      'Portfolio Fundraising',
      'Grants Draft Assistant',
      'Auto-Generated Grant & Investment Utilization Report',
      'Grant CRM',
      'AI Investor Matching',
      'Investor CRM',
      'Fundraising Portfolio',
      'Portfolio promotion to investors',
      'Portfolio promotion through angel network',
      'Part of Investments by Track My Startup Program'
    ],
    restrictedFeatures: []
  }
};

export function getPlanConfig(planTier: 'free' | 'basic' | 'premium'): PlanConfig {
  return PLAN_CONFIGS[planTier];
}

export function formatStorage(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(0)} GB`;
  }
  return `${mb} MB`;
}

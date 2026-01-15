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
    name: 'Free Plan',
    price_eur: 0,
    storage_mb: 100,
    features: [
      'Dashboard Access',
      'Financial Tracking',
      'Compliance Management',
      'Profile Management'
    ],
    restrictedFeatures: [
      'Portfolio Fundraising',
      'Grants Draft + CRM',
      'AI Investor Matching',
      'CRM Access',
      'Active Fundraising'
    ]
  },
  basic: {
    id: 'basic',
    name: 'Basic Plan',
    price_eur: 5,
    storage_mb: 1024, // 1 GB
    features: [
      'Dashboard Access',
      'Financial Tracking',
      'Compliance Management',
      'Profile Management',
      'Grants Draft + CRM',
      'AI Investor Matching',
      'CRM Access'
    ],
    restrictedFeatures: [
      'Portfolio Fundraising', // NOT in Basic, only Premium
      'Active Fundraising' // NOT in Basic, only Premium
    ]
  },
  premium: {
    id: 'premium',
    name: 'Premium Plan',
    price_eur: 20,
    storage_mb: 10240, // 10 GB
    features: [
      'All Features Included',
      'Portfolio Fundraising', // Included in Premium
      'Grants Draft + CRM',
      'AI Investor Matching',
      'CRM Access',
      'Active Fundraising' // Included in Premium
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

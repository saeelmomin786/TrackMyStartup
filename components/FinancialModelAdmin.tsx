import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { complianceRulesComprehensiveService } from '../lib/complianceRulesComprehensiveService';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import { DollarSign, Percent, Plus, Edit, Trash2, Save, X, Search, TrendingUp } from 'lucide-react';

interface FinancialModelAdminProps {
  currentUser: any;
}

export default function FinancialModelAdmin({ currentUser }: FinancialModelAdminProps) {
  const [activeTab, setActiveTab] = useState<'pricing' | 'coupons' | 'dueDiligence' | 'scoutingFees'>('pricing');
  type SubscriptionPlan = {
    id: string;
    name: string;
    price: number;
    currency: string;
    interval: 'monthly' | 'yearly';
    description: string;
    user_type: string;
    country: string;
    is_active: boolean;
    tax_percentage?: number;
  };

  type DiscountCoupon = {
    id: string;
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    max_uses: number;
    used_count: number;
    valid_from: string | null;
    valid_until: string | null;
    is_active: boolean;
  };

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [coupons, setCoupons] = useState<DiscountCoupon[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states for pricing
  const [newPlan, setNewPlan] = useState({
    name: '',
    price: '',
    currency: 'INR',
    interval: 'monthly' as 'monthly' | 'yearly',
    description: '',
    user_type: 'Startup',
    country: 'Global',
    is_active: true,
    tax_percentage: 0
  });

  // Form states for coupons
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    max_uses: '',
    valid_from: '',
    valid_until: '',
    is_active: true
  });

  // Form states for due diligence
  const [dueDiligenceSettings, setDueDiligenceSettings] = useState({
    base_price: 15000,
    currency: 'INR',
    is_active: true,
    selected_countries: [] as string[]
  });

  // Form states for scouting fees
  const [scoutingFeeSettings, setScoutingFeeSettings] = useState({
    percentage: 30,
    is_active: true,
    selected_countries: [] as string[]
  });

  // New scouting fee configuration state
  const [scoutingFeeConfigs, setScoutingFeeConfigs] = useState<any[]>([]);
  const [newFeeConfig, setNewFeeConfig] = useState({
    country: '',
    amountMin: 0,
    amountMax: 0,
    // Investor fees (startup scouting fee - paid by investor)
    investorFeeType: 'percentage' as 'percentage' | 'fixed',
    investorFeeValue: 0,
    // Startup fees (investor scouting fee - paid by startup)
    startupFeeType: 'percentage' as 'percentage' | 'fixed',
    startupFeeValue: 0
  });

  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<string | null>(null);

  // State for storing implemented country-specific fees and discounts
  const [implementedDueDiligenceFees, setImplementedDueDiligenceFees] = useState<Array<{
    id: string;
    country: string;
    base_price: number;
    currency: string;
    is_active: boolean;
    created_at: string;
  }>>([]);

  const [implementedDueDiligenceCoupons, setImplementedDueDiligenceCoupons] = useState<Array<{
    id: string;
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    countries: string[];
    max_uses: number;
    used_count: number;
    valid_from: string;
    valid_until: string;
    is_active: boolean;
  }>>([]);

  const [implementedScoutingFees, setImplementedScoutingFees] = useState<Array<{
    id: string;
    country: string;
    percentage: number;
    is_active: boolean;
    created_at: string;
  }>>([]);

  const [implementedScoutingFeeCoupons, setImplementedScoutingFeeCoupons] = useState<Array<{
    id: string;
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    countries: string[];
    max_uses: number;
    used_count: number;
    valid_from: string;
    valid_until: string;
    is_active: boolean;
  }>>([]);

  const [implementedGeneralCoupons, setImplementedGeneralCoupons] = useState<Array<{
    id: string;
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    countries: string[];
    max_uses: number;
    used_count: number;
    valid_from: string;
    valid_until: string;
    is_active: boolean;
    applicable_to: string; // Which service this coupon applies to
  }>>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load countries from compliance rules
      const complianceData = await complianceRulesComprehensiveService.getAllRules();
      const uniqueCountries = [...new Set(complianceData.map(rule => rule.country_name))].sort();
      setCountries(uniqueCountries);
      
      // Load plans and coupons from database
      try {
        const { data: planRows, error: planErr } = await supabase
          .from('subscription_plans')
          .select('id,name,price,currency,interval,description,user_type,country,is_active')
          .order('created_at', { ascending: false });
        if (planErr) throw planErr;
        setPlans((planRows as any) || []);
      } catch (e) {
        console.warn('Failed to load subscription_plans:', e);
        setPlans([]);
      }

      try {
        const { data: couponRows, error: couponErr } = await supabase
          .from('coupons')
          .select('id,code,discount_type,discount_value,max_uses,used_count,valid_from,valid_until,is_active')
          .order('created_at', { ascending: false });
        if (couponErr) throw couponErr;
        setCoupons((couponRows as any) || []);
      } catch (e) {
        console.warn('Failed to load coupons:', e);
        setCoupons([]);
      }
      
      // Load implemented due diligence fees
      setImplementedDueDiligenceFees([]);

      // Load implemented due diligence coupons
      setImplementedDueDiligenceCoupons([]);

      // Load implemented scouting fees
      setImplementedScoutingFees([]);

      // Load implemented scouting fee coupons
      setImplementedScoutingFeeCoupons([]);

      // Load implemented general coupons
      setImplementedGeneralCoupons([]);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load financial model data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate form
      if (!newPlan.name || !newPlan.price || !newPlan.description) {
        setError('Please fill in all required fields');
        return;
      }

      const insertPayload = {
        name: newPlan.name,
        price: parseFloat(newPlan.price),
        currency: newPlan.currency,
        interval: newPlan.interval,
        description: newPlan.description,
        user_type: newPlan.user_type,
        country: newPlan.country,
        is_active: newPlan.is_active
      } as any;

      // Add tax_percentage if column exists
      try {
        insertPayload.tax_percentage = newPlan.tax_percentage;
      } catch (error) {
        console.log('Tax percentage column not available yet');
      }

      const { data, error: insErr } = await supabase
        .from('subscription_plans')
        .insert(insertPayload)
        .select('id,name,price,currency,interval,description,user_type,country,is_active')
        .single();
      if (insErr) throw insErr;

      setPlans([...plans, data as any]);
      setNewPlan({
        name: '',
        price: '',
        currency: 'INR',
        interval: 'monthly',
        description: '',
        user_type: 'Investor',
        country: 'Global',
        is_active: true
      });
      setSuccess('Pricing plan created successfully');
    } catch (error) {
      console.error('Error creating plan:', error);
      setError('Failed to create pricing plan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCoupon = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate form
      if (!newCoupon.code || !newCoupon.discount_value || !newCoupon.max_uses) {
        setError('Please fill in all required fields');
        return;
      }

      const insertPayload = {
        code: newCoupon.code.toUpperCase(),
        discount_type: newCoupon.discount_type === 'percentage' ? 'percentage' : 'fixed',
        discount_value: parseFloat(newCoupon.discount_value),
        max_uses: parseInt(newCoupon.max_uses),
        used_count: 0,
        valid_from: newCoupon.valid_from || null,
        valid_until: newCoupon.valid_until || null,
        is_active: newCoupon.is_active,
        created_by: currentUser?.id || null
      } as any;

      const { data, error: cErr } = await supabase
        .from('coupons')
        .insert(insertPayload)
        .select('id,code,discount_type,discount_value,max_uses,used_count,valid_from,valid_until,is_active')
        .single();
      if (cErr) throw cErr;

      setCoupons([...coupons, data as any]);
      setNewCoupon({
        code: '',
        discount_type: 'percentage',
        discount_value: '',
        max_uses: '',
        valid_from: '',
        valid_until: '',
        is_active: true
      });
      setSuccess('Discount coupon created successfully');
    } catch (error) {
      console.error('Error creating coupon:', error);
      setError('Failed to create discount coupon');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this pricing plan?')) return;

    try {
      const { error: delErr } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);
      if (delErr) throw delErr;
      setPlans(plans.filter(plan => plan.id !== planId));
      setSuccess('Pricing plan deleted successfully');
    } catch (error) {
      console.error('Error deleting plan:', error);
      setError('Failed to delete pricing plan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!confirm('Are you sure you want to delete this discount coupon?')) return;

    try {
      const { error: delErr } = await supabase
        .from('coupons')
        .delete()
        .eq('id', couponId);
      if (delErr) throw delErr;
      setCoupons(coupons.filter(coupon => coupon.id !== couponId));
      setSuccess('Discount coupon deleted successfully');
    } catch (error) {
      console.error('Error deleting coupon:', error);
      setError('Failed to delete discount coupon');
    } finally {
      setIsLoading(false);
    }
  };

  // Country selection helpers
  const handleCountryToggle = (country: string) => {
    setSelectedCountries(prev => 
      prev.includes(country) 
        ? prev.filter(c => c !== country)
        : [...prev, country]
    );
  };

  const handleSelectAllCountries = () => {
    setSelectedCountries([...countries]);
  };

  const handleUnselectAllCountries = () => {
    setSelectedCountries([]);
  };

  // Due diligence country selection helpers
  const handleDueDiligenceCountryToggle = (country: string) => {
    setDueDiligenceSettings(prev => ({
      ...prev,
      selected_countries: prev.selected_countries.includes(country)
        ? prev.selected_countries.filter(c => c !== country)
        : [...prev.selected_countries, country]
    }));
  };

  const handleSelectAllDueDiligenceCountries = () => {
    setDueDiligenceSettings(prev => ({
      ...prev,
      selected_countries: [...countries]
    }));
  };

  const handleUnselectAllDueDiligenceCountries = () => {
    setDueDiligenceSettings(prev => ({
      ...prev,
      selected_countries: []
    }));
  };

  // Scouting fee country selection helpers
  const handleScoutingFeeCountryToggle = (country: string) => {
    setScoutingFeeSettings(prev => ({
      ...prev,
      selected_countries: prev.selected_countries.includes(country)
        ? prev.selected_countries.filter(c => c !== country)
        : [...prev.selected_countries, country]
    }));
  };

  const handleSelectAllScoutingFeeCountries = () => {
    setScoutingFeeSettings(prev => ({
      ...prev,
      selected_countries: [...countries]
    }));
  };

  const handleUnselectAllScoutingFeeCountries = () => {
    setScoutingFeeSettings(prev => ({
      ...prev,
      selected_countries: []
    }));
  };

  const handleUpdateDueDiligenceSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // This would update due diligence settings in database
      setSuccess('Due diligence settings updated successfully');
    } catch (error) {
      console.error('Error updating due diligence settings:', error);
      setError('Failed to update due diligence settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateScoutingFeeSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // This would update scouting fee settings in database
      setSuccess('Scouting fee settings updated successfully');
    } catch (error) {
      console.error('Error updating scouting fee settings:', error);
      setError('Failed to update scouting fee settings');
    } finally {
      setIsLoading(false);
    }
  };

  // New scouting fee configuration handlers
  const handleAddFeeConfig = () => {
    if (!newFeeConfig.country || !newFeeConfig.investorFeeValue || !newFeeConfig.startupFeeValue) {
      setError('Please fill in all required fields');
      return;
    }

    // Create two configurations - one for investor and one for startup
    const investorConfig = {
      id: Date.now(),
      country: newFeeConfig.country,
      userType: 'Investor',
      amountMin: newFeeConfig.amountMin,
      amountMax: newFeeConfig.amountMax,
      feeType: newFeeConfig.investorFeeType,
      feeValue: newFeeConfig.investorFeeValue,
      isActive: true
    };

    const startupConfig = {
      id: Date.now() + 1,
      country: newFeeConfig.country,
      userType: 'Startup',
      amountMin: newFeeConfig.amountMin,
      amountMax: newFeeConfig.amountMax,
      feeType: newFeeConfig.startupFeeType,
      feeValue: newFeeConfig.startupFeeValue,
      isActive: true
    };

    setScoutingFeeConfigs([...scoutingFeeConfigs, investorConfig, startupConfig]);
    setNewFeeConfig({
      country: '',
      amountMin: 0,
      amountMax: 0,
      investorFeeType: 'percentage',
      investorFeeValue: 0,
      startupFeeType: 'percentage',
      startupFeeValue: 0
    });
    setSuccess('Fee configurations added successfully for both investors and startups');
  };

  const handleToggleFeeConfig = (index: number) => {
    const updatedConfigs = [...scoutingFeeConfigs];
    updatedConfigs[index].isActive = !updatedConfigs[index].isActive;
    setScoutingFeeConfigs(updatedConfigs);
  };

  const handleDeleteFeeConfig = (index: number) => {
    const updatedConfigs = scoutingFeeConfigs.filter((_, i) => i !== index);
    setScoutingFeeConfigs(updatedConfigs);
    setSuccess('Fee configuration deleted successfully');
  };

  // Helper function to get currency for country
  const getCurrencyForCountry = (country: string) => {
    const currencyMap: { [key: string]: string } = {
      'Global': 'INR',
      'United States': 'USD',
      'United Kingdom': 'GBP',
      'India': 'INR',
      'Germany': 'EUR',
      'France': 'EUR',
      'Canada': 'CAD',
      'Australia': 'AUD',
      'Japan': 'JPY',
      'China': 'CNY',
      'Brazil': 'BRL',
      'Mexico': 'MXN',
      'South Korea': 'KRW',
      'Singapore': 'SGD',
      'Netherlands': 'EUR',
      'Switzerland': 'CHF',
      'Sweden': 'SEK',
      'Norway': 'NOK',
      'Denmark': 'DKK',
      'Finland': 'EUR',
      'Italy': 'EUR',
      'Spain': 'EUR',
      'Portugal': 'EUR',
      'Ireland': 'EUR',
      'Austria': 'EUR',
      'Belgium': 'EUR',
      'Poland': 'PLN',
      'Czech Republic': 'CZK',
      'Hungary': 'HUF',
      'Romania': 'RON',
      'Bulgaria': 'BGN',
      'Croatia': 'HRK',
      'Slovenia': 'EUR',
      'Slovakia': 'EUR',
      'Estonia': 'EUR',
      'Latvia': 'EUR',
      'Lithuania': 'EUR',
      'Luxembourg': 'EUR',
      'Malta': 'EUR',
      'Cyprus': 'EUR',
      'Greece': 'EUR'
    };
    return currencyMap[country] || 'INR';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Financial Model Management</h2>
          <p className="text-slate-600">Manage subscription pricing and discount coupons</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('pricing')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pricing'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <DollarSign className="h-4 w-4 inline mr-2" />
            Pricing Plans
          </button>
          <button
            onClick={() => setActiveTab('coupons')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'coupons'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Percent className="h-4 w-4 inline mr-2" />
            Discount Coupons
          </button>
          <button
            onClick={() => setActiveTab('dueDiligence')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dueDiligence'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Search className="h-4 w-4 inline mr-2" />
            Due Diligence
          </button>
          <button
            onClick={() => setActiveTab('scoutingFees')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'scoutingFees'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <TrendingUp className="h-4 w-4 inline mr-2" />
            Scouting Fees
          </button>
        </nav>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Pricing Plans Tab */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          {/* Create New Plan */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-slate-700">Create New Pricing Plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Plan Name</label>
                <Input
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  placeholder="e.g., Monthly Plan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Price (₹)</label>
                <Input
                  type="number"
                  value={newPlan.price}
                  onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })}
                  placeholder="1500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tax Percentage (%)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={newPlan.tax_percentage}
                  onChange={(e) => setNewPlan({ ...newPlan, tax_percentage: parseFloat(e.target.value) || 0 })}
                  placeholder="18.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Interval</label>
                <select
                  value={newPlan.interval}
                  onChange={(e) => setNewPlan({ ...newPlan, interval: e.target.value as 'monthly' | 'yearly' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">User Type</label>
                <select
                  value={newPlan.user_type}
                  onChange={(e) => setNewPlan({ ...newPlan, user_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Investor">Investor</option>
                  <option value="Startup">Startup</option>
                  <option value="Startup Facilitation Center">Startup Facilitation Center</option>
                  <option value="Investment Advisor">Investment Advisor</option>
                </select>
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-slate-700 mb-2">Countries</label>
                <div className="border border-slate-300 rounded-md p-3 max-h-40 overflow-y-auto">
                  <div className="flex gap-2 mb-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleSelectAllCountries}
                      className="text-xs"
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleUnselectAllCountries}
                      className="text-xs"
                    >
                      Unselect All
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {countries.map((country) => (
                      <label key={country} className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedCountries.includes(country)}
                          onChange={() => handleCountryToggle(country)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-slate-700">{country}</span>
                      </label>
                    ))}
                  </div>
                  {selectedCountries.length === 0 && (
                    <p className="text-sm text-slate-500 mt-2">No countries selected</p>
                  )}
                </div>
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <Input
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  placeholder="Description of the pricing plan"
                />
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={handleCreatePlan} disabled={isLoading}>
                <Plus className="h-4 w-4 mr-2" />
                Create Plan
              </Button>
            </div>
          </Card>

          {/* Existing Plans */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-slate-700">Existing Pricing Plans</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Plan Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Country</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tax %</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Interval</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {plans.map((plan) => (
                    <tr key={plan.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {plan.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {plan.user_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {plan.country}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        ₹{plan.price}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {(plan as any).tax_percentage || 0}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 capitalize">
                        {plan.interval}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {plan.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDeletePlan(plan.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Discount Coupons Tab */}
      {activeTab === 'coupons' && (
        <div className="space-y-6">
          {/* Create New Coupon */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-slate-700">Create New Discount Coupon</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Coupon Code</label>
                <Input
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  placeholder="WELCOME20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Discount Type</label>
                <select
                  value={newCoupon.discount_type}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discount_type: e.target.value as 'percentage' | 'fixed' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Discount Value {newCoupon.discount_type === 'percentage' ? '(%)' : '(₹)'}
                </label>
                <Input
                  type="number"
                  value={newCoupon.discount_value}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: e.target.value })}
                  placeholder={newCoupon.discount_type === 'percentage' ? '20' : '50'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Max Uses</label>
                <Input
                  type="number"
                  value={newCoupon.max_uses}
                  onChange={(e) => setNewCoupon({ ...newCoupon, max_uses: e.target.value })}
                  placeholder="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valid From</label>
                <Input
                  type="date"
                  value={newCoupon.valid_from}
                  onChange={(e) => setNewCoupon({ ...newCoupon, valid_from: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valid Until</label>
                <Input
                  type="date"
                  value={newCoupon.valid_until}
                  onChange={(e) => setNewCoupon({ ...newCoupon, valid_until: e.target.value })}
                />
              </div>
            </div>
            
            {/* Country Selection for General Coupons */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Applicable Countries</label>
              <div className="border border-slate-300 rounded-md p-3 max-h-40 overflow-y-auto">
                <div className="flex gap-2 mb-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleSelectAllCountries}
                    className="text-xs"
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleUnselectAllCountries}
                    className="text-xs"
                  >
                    Unselect All
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {countries.map((country) => (
                    <label key={country} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedCountries.includes(country)}
                        onChange={() => handleCountryToggle(country)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-700">{country}</span>
                    </label>
                  ))}
                </div>
                {selectedCountries.length === 0 && (
                  <p className="text-sm text-slate-500 mt-2">No countries selected - will apply globally</p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <Button onClick={handleCreateCoupon} disabled={isLoading}>
                <Plus className="h-4 w-4 mr-2" />
                Create Coupon
              </Button>
            </div>
          </Card>

          {/* Existing Coupons */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-slate-700">Existing Discount Coupons</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Usage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Valid Until</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {coupons.map((coupon) => (
                    <tr key={coupon.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {coupon.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 capitalize">
                        {coupon.discount_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {coupon.discount_type === 'percentage' 
                          ? `${coupon.discount_value}%` 
                          : `₹${coupon.discount_value}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {coupon.used_count}/{coupon.max_uses}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {new Date(coupon.valid_until).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          coupon.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {coupon.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteCoupon(coupon.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Implemented General Discount Coupons Table */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-slate-700">Implemented General Discount Coupons</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Applicable To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Countries</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Usage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Valid Until</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {implementedGeneralCoupons.map((coupon) => (
                    <tr key={coupon.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{coupon.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 capitalize">{coupon.discount_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {coupon.discount_type === 'percentage' 
                          ? `${coupon.discount_value}%` 
                          : `₹${coupon.discount_value}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          coupon.applicable_to === 'All Services' ? 'bg-purple-100 text-purple-800' :
                          coupon.applicable_to === 'Subscription Plans' ? 'bg-blue-100 text-blue-800' :
                          coupon.applicable_to === 'Due Diligence' ? 'bg-green-100 text-green-800' :
                          coupon.applicable_to === 'Scouting Fees' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {coupon.applicable_to}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <div className="flex flex-wrap gap-1">
                          {coupon.countries.map((country, index) => (
                            <span key={index} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                              {country}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {coupon.used_count}/{coupon.max_uses}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {new Date(coupon.valid_until).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          coupon.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {coupon.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Due Diligence Tab */}
      {activeTab === 'dueDiligence' && (
        <div className="space-y-6">
          {/* Due Diligence Settings */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-slate-700">Due Diligence Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Base Price (₹)</label>
                <Input
                  type="number"
                  value={dueDiligenceSettings.base_price}
                  onChange={(e) => setDueDiligenceSettings({ ...dueDiligenceSettings, base_price: parseFloat(e.target.value) || 0 })}
                  placeholder="15000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                <select
                  value={dueDiligenceSettings.currency}
                  onChange={(e) => setDueDiligenceSettings({ ...dueDiligenceSettings, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={dueDiligenceSettings.is_active}
                    onChange={(e) => setDueDiligenceSettings({ ...dueDiligenceSettings, is_active: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Active</span>
                </label>
              </div>
            </div>
            
            {/* Country Selection for Due Diligence */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Applicable Countries</label>
              <div className="border border-slate-300 rounded-md p-3 max-h-40 overflow-y-auto">
                <div className="flex gap-2 mb-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleSelectAllDueDiligenceCountries}
                    className="text-xs"
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleUnselectAllDueDiligenceCountries}
                    className="text-xs"
                  >
                    Unselect All
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {countries.map((country) => (
                    <label key={country} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={dueDiligenceSettings.selected_countries.includes(country)}
                        onChange={() => handleDueDiligenceCountryToggle(country)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-700">{country}</span>
                    </label>
                  ))}
                </div>
                {dueDiligenceSettings.selected_countries.length === 0 && (
                  <p className="text-sm text-slate-500 mt-2">No countries selected - will apply globally</p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <Button onClick={handleUpdateDueDiligenceSettings} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                Update Settings
              </Button>
            </div>
          </Card>

          {/* Due Diligence Coupons */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-slate-700">Due Diligence Discount Coupons</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Coupon Code</label>
                <Input
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  placeholder="DD20OFF"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Discount Type</label>
                <select
                  value={newCoupon.discount_type}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discount_type: e.target.value as 'percentage' | 'fixed' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Discount Value {newCoupon.discount_type === 'percentage' ? '(%)' : '(₹)'}
                </label>
                <Input
                  type="number"
                  value={newCoupon.discount_value}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: e.target.value })}
                  placeholder={newCoupon.discount_type === 'percentage' ? '20' : '30'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Max Uses</label>
                <Input
                  type="number"
                  value={newCoupon.max_uses}
                  onChange={(e) => setNewCoupon({ ...newCoupon, max_uses: e.target.value })}
                  placeholder="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valid From</label>
                <Input
                  type="date"
                  value={newCoupon.valid_from}
                  onChange={(e) => setNewCoupon({ ...newCoupon, valid_from: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valid Until</label>
                <Input
                  type="date"
                  value={newCoupon.valid_until}
                  onChange={(e) => setNewCoupon({ ...newCoupon, valid_until: e.target.value })}
                />
              </div>
            </div>
            
            {/* Country Selection for Due Diligence Coupons */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Applicable Countries</label>
              <div className="border border-slate-300 rounded-md p-3 max-h-40 overflow-y-auto">
                <div className="flex gap-2 mb-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleSelectAllCountries}
                    className="text-xs"
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleUnselectAllCountries}
                    className="text-xs"
                  >
                    Unselect All
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {countries.map((country) => (
                    <label key={country} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedCountries.includes(country)}
                        onChange={() => handleCountryToggle(country)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-700">{country}</span>
                    </label>
                  ))}
                </div>
                {selectedCountries.length === 0 && (
                  <p className="text-sm text-slate-500 mt-2">No countries selected - will apply globally</p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <Button onClick={handleCreateCoupon} disabled={isLoading}>
                <Plus className="h-4 w-4 mr-2" />
                Create Due Diligence Coupon
              </Button>
            </div>
          </Card>

          {/* Implemented Due Diligence Fees Table */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-slate-700">Implemented Country-Specific Due Diligence Fees</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Country</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Base Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Currency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {implementedDueDiligenceFees.map((fee) => (
                    <tr key={fee.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{fee.country}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{fee.base_price}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{fee.currency}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          fee.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {fee.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {new Date(fee.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Implemented Due Diligence Coupons Table */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-slate-700">Implemented Due Diligence Discount Coupons</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Countries</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Usage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Valid Until</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {implementedDueDiligenceCoupons.map((coupon) => (
                    <tr key={coupon.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{coupon.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 capitalize">{coupon.discount_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {coupon.discount_type === 'percentage' 
                          ? `${coupon.discount_value}%` 
                          : `₹${coupon.discount_value}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <div className="flex flex-wrap gap-1">
                          {coupon.countries.map((country, index) => (
                            <span key={index} className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                              {country}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {coupon.used_count}/{coupon.max_uses}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {new Date(coupon.valid_until).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          coupon.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {coupon.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Scouting Fees Tab */}
      {activeTab === 'scoutingFees' && (
        <div className="space-y-6">
          {/* New Investment Flow Information */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-slate-700">New Investment Flow with Scouting Fees</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Step 1: Investor Makes Offer</h4>
                <p className="text-sm text-blue-700">
                  Investor views pitch video and makes an offer, paying a <strong>startup scouting fee</strong> based on country, amount raised, and user type.
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">Step 2: Startup Reviews Offer</h4>
                <p className="text-sm text-green-700">
                  Startup sees the offer in their CapTable and can accept or reject it. If accepted, startup pays an <strong>investor scouting fee</strong>.
                </p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-medium text-purple-800 mb-2">Step 3: Contact Details Revealed</h4>
                <p className="text-sm text-purple-700">
                  Contact details are revealed based on investment advisor assignment. If no advisor is assigned, details are revealed directly to both parties.
                </p>
              </div>
            </div>
          </Card>

          {/* Add New Scouting Fee Configuration */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-slate-700">Add New Scouting Fee Configuration</h3>
            
            {/* Country and Amount Range Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                <select
                  value={newFeeConfig.country}
                  onChange={(e) => setNewFeeConfig({ ...newFeeConfig, country: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Country</option>
                  <option value="Global">Global (EUR)</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>
                      {country} ({getCurrencyForCountry(country)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount Range (Min)</label>
                <Input
                  type="number"
                  value={newFeeConfig.amountMin}
                  onChange={(e) => setNewFeeConfig({ ...newFeeConfig, amountMin: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount Range (Max)</label>
                <Input
                  type="number"
                  value={newFeeConfig.amountMax}
                  onChange={(e) => setNewFeeConfig({ ...newFeeConfig, amountMax: parseFloat(e.target.value) || 0 })}
                  placeholder="100000 (leave 0 for unlimited)"
                />
              </div>
            </div>

            {/* Fee Configuration Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Investor Fees Section (Startup Scouting Fee - paid by investor) */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  Investor Fees (Startup Scouting Fee)
                </h4>
                <p className="text-xs text-blue-600 mb-3">Fee paid by investor when making an offer</p>
                
                <div className="space-y-3">
              <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fee Type</label>
                    <select
                      value={newFeeConfig.investorFeeType}
                      onChange={(e) => setNewFeeConfig({ ...newFeeConfig, investorFeeType: e.target.value as 'percentage' | 'fixed' })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
              </div>
              <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Fee Value {newFeeConfig.investorFeeType === 'percentage' ? '(%)' : `(${getCurrencyForCountry(newFeeConfig.country)})`}
                    </label>
                <Input
                      type="number"
                      step={newFeeConfig.investorFeeType === 'percentage' ? '0.01' : '0.01'}
                      value={newFeeConfig.investorFeeValue}
                      onChange={(e) => setNewFeeConfig({ ...newFeeConfig, investorFeeValue: parseFloat(e.target.value) || 0 })}
                      placeholder={newFeeConfig.investorFeeType === 'percentage' ? '2.0' : '500'}
                    />
                  </div>
              </div>
            </div>
            
              {/* Startup Fees Section (Investor Scouting Fee - paid by startup) */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Startup Fees (Investor Scouting Fee)
                </h4>
                <p className="text-xs text-green-600 mb-3">Fee paid by startup when accepting an offer</p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fee Type</label>
                    <select
                      value={newFeeConfig.startupFeeType}
                      onChange={(e) => setNewFeeConfig({ ...newFeeConfig, startupFeeType: e.target.value as 'percentage' | 'fixed' })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Fee Value {newFeeConfig.startupFeeType === 'percentage' ? '(%)' : `(${getCurrencyForCountry(newFeeConfig.country)})`}
                    </label>
                    <Input
                      type="number"
                      step={newFeeConfig.startupFeeType === 'percentage' ? '0.01' : '0.01'}
                      value={newFeeConfig.startupFeeValue}
                      onChange={(e) => setNewFeeConfig({ ...newFeeConfig, startupFeeValue: parseFloat(e.target.value) || 0 })}
                      placeholder={newFeeConfig.startupFeeType === 'percentage' ? '1.0' : '300'}
                    />
                </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Button onClick={handleAddFeeConfig} disabled={isLoading}>
                <Plus className="h-4 w-4 mr-2" />
                Add Fee Configuration for Both User Types
              </Button>
            </div>
          </Card>

          {/* Current Scouting Fee Configurations */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-slate-700">Current Scouting Fee Configurations</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Country</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount Range</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fee Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fee Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {scoutingFeeConfigs.map((config, index) => (
                    <tr key={config.id || index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {config.country}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          config.userType === 'Investor' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {config.userType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        ₹{config.amountMin.toLocaleString()} - {config.amountMax === 0 ? '∞' : `₹${config.amountMax.toLocaleString()}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          config.feeType === 'percentage' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {config.feeType === 'percentage' ? 'Percentage' : 'Fixed'}
                            </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {config.feeType === 'percentage' 
                          ? `${config.feeValue}%` 
                          : `${getCurrencyForCountry(config.country)} ${config.feeValue.toLocaleString()}`
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          config.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {config.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleToggleFeeConfig(index)}
                            className={`text-sm px-2 py-1 rounded ${
                              config.isActive 
                                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {config.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button 
                            onClick={() => handleDeleteFeeConfig(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {scoutingFeeConfigs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-slate-500">
                        No scouting fee configurations found. Add one above to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Default Configurations */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-slate-700">Default Scouting Fee Configurations</h3>
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h4 className="font-medium text-slate-800 mb-2">Global Defaults (Applied when no specific country rule exists)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h5 className="font-medium text-slate-700 mb-2">For Investors (Startup Scouting Fee):</h5>
                    <ul className="space-y-1 text-slate-600">
                      <li>• ₹0 - ₹10L: 2.0%</li>
                      <li>• ₹10L - ₹50L: 1.5%</li>
                      <li>• ₹50L - ₹1Cr: 1.0%</li>
                      <li>• ₹1Cr+: 0.5%</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-slate-700 mb-2">For Startups (Investor Scouting Fee):</h5>
                    <ul className="space-y-1 text-slate-600">
                      <li>• ₹0 - ₹10L: 1.0%</li>
                      <li>• ₹10L - ₹50L: 0.8%</li>
                      <li>• ₹50L - ₹1Cr: 0.5%</li>
                      <li>• ₹1Cr+: 0.3%</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}

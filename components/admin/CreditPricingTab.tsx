import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { IndianRupee, Euro, Save, RefreshCw } from 'lucide-react';

interface CreditPricing {
  id: string;
  country: string;
  price_per_credit: number;
  currency: string;
  is_active: boolean;
}

interface SubscriptionPlan {
  id: string;
  credits_per_month: number;
  plan_name: string;
  country: string;
  price_per_month: number;
  currency: string;
  is_active: boolean;
}

const CreditPricingTab: React.FC = () => {
  const [creditPricing, setCreditPricing] = useState<CreditPricing[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingPrices, setEditingPrices] = useState<{ [key: string]: number }>({});
  const [editingSubscriptionPrices, setEditingSubscriptionPrices] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load credit pricing
      const { data: pricingData, error: pricingError } = await supabase
        .from('credit_pricing_config')
        .select('*')
        .order('country', { ascending: true });

      if (pricingError) throw pricingError;

      // Load subscription plans
      const { data: plansData, error: plansError } = await supabase
        .from('credit_subscription_plans')
        .select('*')
        .order('country', { ascending: true })
        .order('credits_per_month', { ascending: true });

      if (plansError) throw plansError;

      setCreditPricing(pricingData || []);
      setSubscriptionPlans(plansData || []);

      // Initialize editing prices
      const initialPricing: { [key: string]: number } = {};
      (pricingData || []).forEach(price => {
        initialPricing[`pricing_${price.id}`] = price.price_per_credit;
      });
      setEditingPrices(initialPricing);

      const initialSubscription: { [key: string]: number } = {};
      (plansData || []).forEach(plan => {
        initialSubscription[`plan_${plan.id}`] = plan.price_per_month;
      });
      setEditingSubscriptionPrices(initialSubscription);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Failed to load pricing data' });
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (id: string, value: string, type: 'pricing' | 'subscription') => {
    const numValue = parseFloat(value) || 0;
    if (type === 'pricing') {
      setEditingPrices({ ...editingPrices, [`pricing_${id}`]: numValue });
    } else {
      setEditingSubscriptionPrices({ ...editingSubscriptionPrices, [`plan_${id}`]: numValue });
    }
  };

  const saveCreditPricing = async () => {
    try {
      setSaving(true);
      setMessage(null);

      // Update credit pricing
      for (const price of creditPricing) {
        const newPrice = editingPrices[`pricing_${price.id}`];
        if (newPrice !== undefined && newPrice !== price.price_per_credit) {
          const { data, error } = await supabase
            .from('credit_pricing_config')
            .update({ 
              price_per_credit: newPrice,
              updated_at: new Date().toISOString()
            })
            .eq('id', price.id)
            .select();

          if (error) {
            console.error(`Error updating pricing ${price.id} (${price.country}):`, error);
            throw new Error(`Failed to update ${price.country} pricing: ${error.message}`);
          }
          
          if (data && data.length > 0) {
            console.log(`Successfully updated ${price.country} pricing to ${newPrice} ${price.currency}:`, data[0]);
          } else {
            console.warn(`No rows updated for pricing ${price.id} (${price.country})`);
          }
        }
      }

      // Update subscription plans
      for (const plan of subscriptionPlans) {
        const newPrice = editingSubscriptionPrices[`plan_${plan.id}`];
        if (newPrice !== undefined && newPrice !== plan.price_per_month) {
          const { data, error } = await supabase
            .from('credit_subscription_plans')
            .update({ 
              price_per_month: newPrice,
              updated_at: new Date().toISOString()
            })
            .eq('id', plan.id)
            .select();

          if (error) {
            console.error(`Error updating plan ${plan.id} (${plan.plan_name}):`, error);
            throw new Error(`Failed to update ${plan.plan_name}: ${error.message}`);
          }
          
          if (data && data.length > 0) {
            console.log(`Successfully updated ${plan.plan_name} to ${newPrice} ${plan.currency}:`, data[0]);
          } else {
            console.warn(`No rows updated for plan ${plan.id} (${plan.plan_name})`);
          }
        }
      }

      setMessage({ type: 'success', text: 'Pricing updated successfully!' });
      
      // Wait a moment for database to commit, then reload
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadData(); // Reload to get updated values
    } catch (error) {
      console.error('Error saving pricing:', error);
      setMessage({ type: 'error', text: 'Failed to save pricing' });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <div className="p-6 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading pricing data...</p>
        </div>
      </Card>
    );
  }

  const indiaPricing = creditPricing.find(p => p.country === 'India');
  const globalPricing = creditPricing.find(p => p.country === 'Global');
  const indiaPlans = subscriptionPlans.filter(p => p.country === 'India');
  const globalPlans = subscriptionPlans.filter(p => p.country === 'Global');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Credit Pricing Management</h2>
          <p className="text-sm text-slate-600 mt-1">
            Set prices for one-time credit purchases and monthly subscription plans
          </p>
        </div>
        <Button
          onClick={saveCreditPricing}
          disabled={saving}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* One-Time Credit Pricing */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold text-slate-800 mb-6">One-Time Credit Pricing</h3>
        <p className="text-sm text-slate-600 mb-6">
          Set the price per credit for one-time purchases. Each credit provides 1 month of Premium subscription.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* India Pricing */}
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <IndianRupee className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">India (INR)</h4>
                <p className="text-xs text-slate-500">Razorpay</p>
              </div>
            </div>
            {indiaPricing ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Price per Credit (INR)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingPrices[`pricing_${indiaPricing.id}`] || 0}
                  onChange={(e) => handlePriceChange(indiaPricing.id, e.target.value, 'pricing')}
                  className="w-full"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Current: {formatCurrency(indiaPricing.price_per_credit, 'INR')} per credit
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">India pricing not configured</p>
            )}
          </div>

          {/* Global Pricing */}
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Euro className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">Global (EUR)</h4>
                <p className="text-xs text-slate-500">PayPal</p>
              </div>
            </div>
            {globalPricing ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Price per Credit (EUR)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingPrices[`pricing_${globalPricing.id}`] || 0}
                  onChange={(e) => handlePriceChange(globalPricing.id, e.target.value, 'pricing')}
                  className="w-full"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Current: {formatCurrency(globalPricing.price_per_credit, 'EUR')} per credit
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Global pricing not configured</p>
            )}
          </div>
        </div>
      </Card>

      {/* Monthly Subscription Plans */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold text-slate-800 mb-6">Monthly Subscription Plans</h3>
        <p className="text-sm text-slate-600 mb-6">
          Set monthly prices for subscription plans. Credits are automatically added each month.
        </p>

        <div className="space-y-6">
          {/* India Subscription Plans */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <IndianRupee className="h-5 w-5 text-orange-600" />
              </div>
              <h4 className="font-semibold text-slate-800">India (INR) - Razorpay</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {indiaPlans.map((plan) => (
                <div key={plan.id} className="border border-slate-200 rounded-lg p-4">
                  <h5 className="font-semibold text-slate-800 mb-2">{plan.plan_name}</h5>
                  <p className="text-xs text-slate-500 mb-3">{plan.credits_per_month} credits/month</p>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Monthly Price (INR)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingSubscriptionPrices[`plan_${plan.id}`] || 0}
                    onChange={(e) => handlePriceChange(plan.id, e.target.value, 'subscription')}
                    className="w-full text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Current: {formatCurrency(plan.price_per_month, 'INR')}/month
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Global Subscription Plans */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Euro className="h-5 w-5 text-blue-600" />
              </div>
              <h4 className="font-semibold text-slate-800">Global (EUR) - PayPal</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {globalPlans.map((plan) => (
                <div key={plan.id} className="border border-slate-200 rounded-lg p-4">
                  <h5 className="font-semibold text-slate-800 mb-2">{plan.plan_name}</h5>
                  <p className="text-xs text-slate-500 mb-3">{plan.credits_per_month} credits/month</p>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Monthly Price (EUR)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingSubscriptionPrices[`plan_${plan.id}`] || 0}
                    onChange={(e) => handlePriceChange(plan.id, e.target.value, 'subscription')}
                    className="w-full text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Current: {formatCurrency(plan.price_per_month, 'EUR')}/month
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CreditPricingTab;

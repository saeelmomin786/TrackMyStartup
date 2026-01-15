import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { CreditCard, Save, AlertCircle, CheckCircle2, Loader2, IndianRupee, Euro } from 'lucide-react';

interface CountryPrice {
  id: string;
  country: string;
  plan_tier: 'free' | 'basic' | 'premium';
  base_price_eur: number;
  price_inr: number | null;
  currency: string;
  payment_gateway: string;
  is_admin_configurable: boolean;
  is_active: boolean;
}

const FinancialTab: React.FC = () => {
  const [indiaPrices, setIndiaPrices] = useState<CountryPrice[]>([]);
  const [internationalPrices, setInternationalPrices] = useState<CountryPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingPrices, setEditingPrices] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadPrices();
  }, []);

  const loadPrices = async () => {
    try {
      setLoading(true);
      
      // Load India prices
      const { data: indiaData, error: indiaError } = await supabase
        .from('country_plan_prices')
        .select('*')
        .eq('country', 'India')
        .eq('is_active', true)
        .order('plan_tier', { ascending: true });

      if (indiaError) throw indiaError;

      // Load International prices
      const { data: intlData, error: intlError } = await supabase
        .from('country_plan_prices')
        .select('*')
        .eq('country', 'International')
        .eq('is_active', true)
        .order('plan_tier', { ascending: true });

      if (intlError) throw intlError;

      setIndiaPrices(indiaData || []);
      setInternationalPrices(intlData || []);
      
      // Initialize editing prices with current values
      const initialEditing: { [key: string]: number } = {};
      (indiaData || []).forEach(price => {
        initialEditing[price.plan_tier] = price.price_inr || 0;
      });
      setEditingPrices(initialEditing);
    } catch (error) {
      console.error('Error loading prices:', error);
      setMessage({ type: 'error', text: 'Failed to load prices' });
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (planTier: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditingPrices(prev => ({
      ...prev,
      [planTier]: numValue
    }));
  };

  const saveIndiaPrices = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const errors: string[] = [];

      // Update each India price
      for (const [planTier, priceInr] of Object.entries(editingPrices)) {
        if (planTier === 'free') continue; // Skip free plan
        
        const { data, error } = await supabase
          .from('country_plan_prices')
          .update({ 
            price_inr: priceInr,
            updated_at: new Date().toISOString()
          })
          .eq('country', 'India')
          .eq('plan_tier', planTier)
          .select();

        if (error) {
          console.error(`Error updating ${planTier}:`, error);
          errors.push(`${planTier}: ${error.message}`);
        } else {
          console.log(`Successfully updated ${planTier} to ₹${priceInr}:`, data);
        }
      }

      if (errors.length > 0) {
        throw new Error(`Failed to update some prices: ${errors.join(', ')}`);
      }

      setMessage({ type: 'success', text: 'India prices updated successfully!' });
      
      // Wait a moment for database to commit, then reload
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadPrices(); // Reload to show updated values
    } catch (error: any) {
      console.error('Error saving prices:', error);
      setMessage({ 
        type: 'error', 
        text: error?.message || 'Failed to save prices. Please check if you have admin permissions.' 
      });
    } finally {
      setSaving(false);
    }
  };

  const getPlanDisplayName = (tier: string) => {
    switch (tier) {
      case 'free': return 'Free Plan';
      case 'basic': return 'Basic Plan';
      case 'premium': return 'Premium Plan';
      default: return tier;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Financial Management</h2>
          <p className="text-sm text-slate-500 mt-1">Manage subscription pricing for India and International markets</p>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* India Pricing Section */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-100 rounded-lg">
            <IndianRupee className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-800">India Pricing (Razorpay)</h3>
            <p className="text-sm text-slate-500">Set INR prices for Indian customers. Base EUR prices are fixed.</p>
          </div>
        </div>

        <div className="space-y-4">
          {indiaPrices.map((price) => (
            <div key={price.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-slate-800">{getPlanDisplayName(price.plan_tier)}</h4>
                  <p className="text-sm text-slate-500">Base Price: €{price.base_price_eur.toFixed(2)}</p>
                </div>
                {price.is_admin_configurable && (
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                    Admin Configurable
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    EUR Base Price (Fixed)
                  </label>
                  <div className="flex items-center gap-2">
                    <Euro className="h-5 w-5 text-slate-400" />
                    <input
                      type="number"
                      value={price.base_price_eur}
                      disabled
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">This price is fixed and cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    INR Price (Admin Sets)
                  </label>
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-5 w-5 text-slate-400" />
                    <input
                      type="number"
                      value={price.plan_tier === 'free' ? 0 : (editingPrices[price.plan_tier] !== undefined ? editingPrices[price.plan_tier] : (price.price_inr || 0))}
                      onChange={(e) => handlePriceChange(price.plan_tier, e.target.value)}
                      disabled={price.plan_tier === 'free' || !price.is_admin_configurable}
                      min="0"
                      step="1"
                      className={`flex-1 px-3 py-2 border border-slate-300 rounded-lg ${
                        price.plan_tier === 'free' || !price.is_admin_configurable
                          ? 'bg-slate-50 text-slate-500 cursor-not-allowed'
                          : 'bg-white text-slate-800 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary'
                      }`}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {price.plan_tier === 'free' 
                      ? 'Free plan has no charge'
                      : 'Amount charged to Indian customers via Razorpay'
                    }
                  </p>
                </div>
              </div>

              {price.plan_tier !== 'free' && price.is_admin_configurable && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Users will see "€{price.base_price_eur}/month" but Razorpay will charge ₹{editingPrices[price.plan_tier] !== undefined ? editingPrices[price.plan_tier] : (price.price_inr || 0)} (the amount you set above).
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Current database value: ₹{price.price_inr || 0}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={saveIndiaPrices}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save India Prices
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* International Pricing Section */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Euro className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-800">International Pricing (Stripe/PayPal)</h3>
            <p className="text-sm text-slate-500">Fixed EUR prices for all non-India countries. These prices cannot be changed.</p>
          </div>
        </div>

        <div className="space-y-4">
          {internationalPrices.map((price) => (
            <div key={price.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-slate-800">{getPlanDisplayName(price.plan_tier)}</h4>
                  <p className="text-sm text-slate-500">Fixed Price (Cannot be changed)</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-slate-200 text-slate-600 rounded">
                  Read Only
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    EUR Price
                  </label>
                  <div className="flex items-center gap-2">
                    <Euro className="h-5 w-5 text-slate-400" />
                    <input
                      type="number"
                      value={price.base_price_eur}
                      disabled
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={price.currency}
                    disabled
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Payment Gateway
                  </label>
                  <input
                    type="text"
                    value={price.payment_gateway}
                    disabled
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="mt-3 p-3 bg-slate-100 rounded-lg">
                <p className="text-sm text-slate-600">
                  <strong>Note:</strong> All international customers will be charged €{price.base_price_eur} via {price.payment_gateway}. This price is fixed and cannot be modified.
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Information Card */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">How Pricing Works</h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• <strong>India:</strong> Users see EUR prices (€5, €20) but Razorpay charges the INR amount you set above.</li>
              <li>• <strong>International:</strong> Users see and pay EUR prices (€5, €20) via Stripe/PayPal.</li>
              <li>• <strong>Price Locking:</strong> When a user subscribes, the amount is locked. Changing prices only affects new subscriptions.</li>
              <li>• <strong>Autopay:</strong> Both gateways support automatic monthly billing using the locked amount.</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default FinancialTab;

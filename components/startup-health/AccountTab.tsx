import React, { useState, useEffect } from 'react';
// ⚠️ CRITICAL: This AccountTab component is STARTUP-SPECIFIC
// It should ONLY be shown for Startup users in StartupHealthView
// Subscription/Billing information is RESTRICTED to Startup role ONLY
// This component should NEVER be accessible to Mentor, Admin, Investor, or other roles

import Card from '../ui/Card';
import Button from '../ui/Button';
import { 
  CreditCard, 
  Calendar, 
  Download, 
  Settings, 
  TrendingUp, 
  TrendingDown,
  CheckCircle,
  XCircle,
  FileText,
  HardDrive,
  DollarSign,
  Clock,
  AlertCircle,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { subscriptionService, type UserSubscription } from '../../lib/subscriptionService';
import { paymentHistoryService, type PaymentTransaction, type BillingCycle } from '../../lib/paymentHistoryService';
import { storageUsageService, type StorageUsage } from '../../lib/storageUsageService';
import SubscriptionPlansPage from '../SubscriptionPlansPage';
import { messageService } from '../../lib/messageService';

interface AccountTabProps {
  userId: string;
  startupId?: string;
}

// Types are imported from services
type Subscription = UserSubscription;

export default function AccountTab({ userId, startupId }: AccountTabProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [billingCycles, setBillingCycles] = useState<BillingCycle[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentTransaction[]>([]);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [authUserId, setAuthUserId] = useState<string>('');
  const [showPlansPage, setShowPlansPage] = useState(false);

  // Get auth_user_id (UUID from auth.users) - this is what storage tracking uses
  useEffect(() => {
    const getAuthUserId = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.id) {
          setAuthUserId(authUser.id);
          console.log('✅ Got auth_user_id:', authUser.id);
        } else {
          console.warn('⚠️ No auth user found, falling back to userId prop');
          setAuthUserId(userId);
        }
      } catch (error) {
        console.error('Error getting auth user ID:', error);
        setAuthUserId(userId); // Fallback to userId prop
      }
    };
    getAuthUserId();
  }, [userId]);

  useEffect(() => {
    if (authUserId) {
      loadAccountData();
    }
  }, [authUserId]);

  // Refresh data when tab/window becomes visible (after payment completion)
  useEffect(() => {
    if (!authUserId) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab/window became visible, refresh data after a short delay
        console.log('🔄 Tab became visible, refreshing account data...');
        setTimeout(() => {
          loadAccountData();
        }, 500);
      }
    };

    const handleFocus = () => {
      // Window gained focus, refresh data
      console.log('🔄 Window gained focus, refreshing account data...');
      setTimeout(() => {
        loadAccountData();
      }, 500);
    };

    // Listen for custom payment success event
    const handlePaymentSuccess = (event: Event) => {
      console.log('🎉 Payment success event received, refreshing account data...');
      // Wait a bit for database to update
      setTimeout(() => {
        loadAccountData();
      }, 1500);
    };

    // Listen for visibility changes and focus
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('payment-success', handlePaymentSuccess);

    // Refresh on mount (in case user navigated here after payment)
    const mountTimer = setTimeout(() => {
      loadAccountData();
    }, 1000);

    return () => {
      clearTimeout(mountTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('payment-success', handlePaymentSuccess);
    };
  }, [authUserId]);

  const loadAccountData = async () => {
    if (!authUserId) return;
    
    try {
      setLoading(true);
      
      // Load subscription from Supabase (uses auth_user_id)
      const userSubscription = await subscriptionService.getUserSubscription(authUserId);
      console.log('📊 AccountTab - Loaded subscription:', userSubscription);
      
      if (userSubscription) {
        setSubscription(userSubscription);
        
        // Load ALL billing cycles for user (including from old subscriptions after upgrade/downgrade)
        const cycles = await paymentHistoryService.getAllBillingCyclesForUser(authUserId);
        console.log('📊 AccountTab - Loaded billing cycles:', cycles.length, cycles);
        setBillingCycles(cycles);
      } else {
        // No subscription found - user is on free plan
        setSubscription(null);
        setBillingCycles([]);
      }

      // Load payment history (uses auth_user_id)
      const payments = await paymentHistoryService.getPaymentHistory(authUserId);
      console.log('📊 AccountTab - Loaded payment history:', payments.length, payments);
      setPaymentHistory(payments);

      // Load storage usage - Direct database query (no API calls)
      // CRITICAL: Use auth_user_id (UUID from auth.users), not profile ID
      const planTier = userSubscription?.plan_tier || 'free';
      
      // Get storage directly from database
      // For free users: Uses get_user_storage_total() RPC function
      // For paid users: Reads storage_used_mb from user_subscriptions (updated by trigger)
      console.log('🔍 Loading storage for auth_user_id:', authUserId, 'plan tier:', planTier);
      const storage = await storageUsageService.getStorageUsage(authUserId, planTier);
      console.log('📦 Storage result:', storage);
      setStorageUsage(storage);

    } catch (error) {
      console.error('Error loading account data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    if (!amount || amount === 0) return '₹0';
    
    // Get currency symbol
    const getCurrencySymbol = (curr: string): string => {
      const symbols: Record<string, string> = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'INR': '₹',
        'CAD': 'C$',
        'AUD': 'A$',
        'JPY': '¥',
        'CHF': 'CHF',
        'SGD': 'S$',
        'CNY': '¥',
      };
      return symbols[curr] || curr;
    };

    // Get locale for formatting
    const getLocale = (curr: string): string => {
      const localeMap: Record<string, string> = {
        'USD': 'en-US',
        'EUR': 'en-EU',
        'GBP': 'en-GB',
        'INR': 'en-IN',
        'CAD': 'en-CA',
        'AUD': 'en-AU',
        'JPY': 'ja-JP',
        'CHF': 'de-CH',
        'SGD': 'en-SG',
        'CNY': 'zh-CN',
      };
      return localeMap[curr] || 'en-IN';
    };

    const symbol = getCurrencySymbol(currency);
    const locale = getLocale(currency);
    
    // Format number with locale
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
    
    // For INR, symbol comes before. For others, check currency
    if (currency === 'INR') {
      return `${symbol}${formatted}`;
    } else if (currency === 'USD' || currency === 'EUR' || currency === 'GBP') {
      return `${symbol}${formatted}`;
    } else {
      return `${formatted} ${symbol}`;
    }
  };

  const handlePlanSelected = async (planTier: 'free' | 'basic' | 'premium') => {
    // Reload account data after plan selection
    await loadAccountData();
    setShowPlansPage(false);
    messageService.success('Plan Updated', `Your plan has been updated to ${planTier}.`, 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading account information...</p>
        </div>
      </div>
    );
  }

  // Show subscription plans page if requested
  if (showPlansPage) {
    return (
      <div>
        <Button
          variant="secondary"
          onClick={() => setShowPlansPage(false)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Account
        </Button>
        <SubscriptionPlansPage
          userId={authUserId}
          onPlanSelected={handlePlanSelected}
          onBack={() => setShowPlansPage(false)}
        />
      </div>
    );
  }

  // Check if subscription is advisor-paid and if we should disable payment options
  const isAdvisorPaid = subscription?.paid_by_advisor_id !== null && subscription?.paid_by_advisor_id !== undefined;
  const isSubscriptionActive = subscription?.status === 'active' && new Date(subscription.current_period_end) > new Date();
  const isAdvisorPaidActive = isAdvisorPaid && isSubscriptionActive;
  
  // Check 24-hour grace period after advisor-paid subscription expires
  const isInGracePeriod = (): boolean => {
    if (!subscription || !isAdvisorPaid) return false;
    if (isSubscriptionActive) return false; // Still active, no grace period needed
    
    const periodEnd = new Date(subscription.current_period_end);
    const now = new Date();
    const hoursSinceExpiry = (now.getTime() - periodEnd.getTime()) / (1000 * 60 * 60);
    
    // Grace period: 24 hours after expiry
    return hoursSinceExpiry <= 24 && hoursSinceExpiry >= 0;
  };
  
  // Show payment options if: not advisor-paid OR (advisor-paid but expired and past grace period)
  const canManagePayments = !isAdvisorPaidActive && (!isAdvisorPaid || !isInGracePeriod());

  // Determine display currency based on country: India → INR, Others → EUR
  const getDisplayCurrency = (): string => {
    if (!subscription) return 'INR'; // Default to INR if no subscription
    const country = subscription.country?.toLowerCase() || '';
    // Check if country is India (case-insensitive)
    if (country === 'india' || country === 'indian') {
      return 'INR';
    }
    // For all other countries, use EUR
    return 'EUR';
  };

  const displayCurrency = getDisplayCurrency();

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Account & Billing</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            console.log('🔄 Manual refresh triggered');
            loadAccountData();
          }}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Current Subscription Card */}
      <CurrentSubscriptionCard 
        subscription={subscription} 
        formatDate={formatDate} 
        formatCurrency={formatCurrency}
        displayCurrency={displayCurrency}
        onViewPlans={() => setShowPlansPage(true)}
        isAdvisorPaid={isAdvisorPaid}
        canManagePayments={canManagePayments}
      />

      {/* Billing Cycles Section */}
      <BillingCyclesSection 
        billingCycles={billingCycles}
        paymentHistory={paymentHistory}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
        subscriptionCurrency={displayCurrency}
        startupId={startupId}
      />

      {/* Payment History Section */}
      <PaymentHistorySection 
        payments={paymentHistory}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
        subscriptionCurrency={displayCurrency}
        startupId={startupId}
      />

      {/* Auto-Pay Management */}
      {subscription && canManagePayments && (
        <AutopayManagementCard 
          subscription={subscription}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
          displayCurrency={displayCurrency}
        />
      )}

      {/* Plan Management */}
      <PlanManagementCard 
        subscription={subscription}
        formatCurrency={formatCurrency}
        displayCurrency={displayCurrency}
        authUserId={authUserId}
        onViewPlans={() => setShowPlansPage(true)}
        canManagePayments={canManagePayments}
      />

      {/* Storage Usage */}
      {storageUsage && (
        <StorageUsageCard storageUsage={storageUsage} />
      )}

      {/* Invoice Downloads */}
      <InvoiceDownloadsSection 
        payments={paymentHistory} 
        formatDate={formatDate}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

// Current Subscription Card Component
function CurrentSubscriptionCard({ 
  subscription, 
  formatDate, 
  formatCurrency,
  displayCurrency,
  onViewPlans,
  isAdvisorPaid,
  canManagePayments
}: { 
  subscription: Subscription | null;
  formatDate: (date: string) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  displayCurrency: string;
  onViewPlans?: () => void;
  isAdvisorPaid?: boolean;
  canManagePayments?: boolean;
}) {
  if (!subscription) {
    return (
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Current Subscription</h2>
          <p className="text-gray-600 mb-4">You're currently on the Basic Plan.</p>
          <Button onClick={onViewPlans} className="flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            View Plans & Subscribe
          </Button>
        </div>
      </Card>
    );
  }

  const planNames = {
    free: 'Basic Plan',
    basic: 'Standard Plan',
    premium: 'Premium Plan'
  };

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Current Subscription</h2>
          {canManagePayments && (
            <Button variant="outline" size="sm" onClick={onViewPlans}>
              <Settings className="h-4 w-4 mr-2" />
              Change Plan
            </Button>
          )}
        </div>
        
        {/* Advisor Paid Badge */}
        {isAdvisorPaid && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-blue-900">Paid by Advisor</p>
                <p className="text-xs text-blue-700 mt-1">
                  Your premium subscription is managed by your investment advisor. Payment options are not available.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Plan</p>
            <p className="text-lg font-semibold">{planNames[subscription.plan_tier]}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Status</p>
            <div className="flex items-center">
              {subscription.status === 'active' ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-green-600 font-medium">Active</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-600 mr-2" />
                  <span className="text-red-600 font-medium capitalize">{subscription.status}</span>
                </>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Amount</p>
            <p className="text-lg font-semibold">
              {formatCurrency(
                subscription.amount || subscription.locked_amount_inr || 0,
                displayCurrency
              )}/month
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Country</p>
            <p className="text-lg font-semibold">{subscription.country || 'Not set'}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Payment Gateway</p>
            <p className="text-lg font-semibold capitalize">{subscription.payment_gateway || 'N/A'}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Auto-Pay</p>
            <div className="flex items-center">
              {subscription.autopay_enabled ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-green-600 font-medium">Enabled</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Disabled</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Current Period</p>
              <p className="text-sm font-medium">
                {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Next Billing</p>
              <p className="text-sm font-medium">{subscription.next_billing_date ? formatDate(subscription.next_billing_date) : 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Billing Cycles</p>
              <p className="text-sm font-medium">{subscription.billing_cycle_count || 0} cycles completed</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Billing Cycles Section Component
function BillingCyclesSection({
  billingCycles,
  paymentHistory,
  formatDate,
  formatCurrency,
  subscriptionCurrency,
  startupId
}: {
  billingCycles: BillingCycle[];
  paymentHistory: PaymentTransaction[];
  formatDate: (date: string) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  subscriptionCurrency?: string;
  startupId?: string;
}) {
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);

  const handleDownloadCycleInvoice = async (cycle: BillingCycle) => {
    try {
      setDownloadingInvoice(cycle.id);
      
      // Find the payment transaction for this billing cycle
      const payment = paymentHistory.find(p => p.id === cycle.payment_transaction_id);
      
      if (!payment) {
        alert('Payment transaction not found for this billing cycle.');
        return;
      }

      // Import PDF generator dynamically
      const { generateInvoicePDF, downloadBlob } = await import('../../lib/pdfGenerator');
      
      // Get user details for invoice
      const { data: { user } } = await supabase.auth.getUser();
      const userName = user?.user_metadata?.name || user?.email || 'Customer';
      const userEmail = user?.email || '';
      
      // Get startup name if startupId is provided
      let startupName: string | undefined = undefined;
      if (startupId) {
        try {
          const { data: startup } = await supabase
            .from('startups')
            .select('name')
            .eq('id', parseInt(startupId))
            .single();
          
          if (startup && startup.name) {
            startupName = startup.name;
          }
        } catch (error) {
          console.warn('Could not fetch startup name for invoice:', error);
        }
      }
      
      // Get subscription details if available
      let planName = 'Subscription Plan';
      let planTier = cycle.plan_tier || 'basic';
      
      // Format billing period
      const billingPeriod = `${formatDate(cycle.period_start)} - ${formatDate(cycle.period_end)}`;
      
      // Handle payment gateway type
      let paymentGateway: 'razorpay' | 'paypal' = 'razorpay';
      if (payment.payment_gateway === 'paypal') {
        paymentGateway = 'paypal';
      } else if (payment.payment_gateway === 'razorpay' || payment.payment_gateway === 'payaid') {
        paymentGateway = 'razorpay';
      }

      // Extract tax info from metadata if available
      let taxAmount: number | undefined = undefined;
      let totalAmount = payment.amount || 0;
      
      // Check if metadata exists (it's optional in PaymentTransaction)
      const paymentWithMetadata = payment as any;
      if (paymentWithMetadata.metadata && typeof paymentWithMetadata.metadata === 'object') {
        const metadata = paymentWithMetadata.metadata;
        if (metadata.tax_amount) {
          taxAmount = parseFloat(metadata.tax_amount);
        }
        if (metadata.total_amount_with_tax) {
          totalAmount = parseFloat(metadata.total_amount_with_tax);
        }
      }

      // Prepare invoice data
      const invoiceData = {
        invoiceNumber: `INV-${payment.id.slice(-8).toUpperCase()}`,
        invoiceDate: formatDate(payment.created_at),
        paymentDate: payment.paid_at ? formatDate(payment.paid_at) : formatDate(payment.created_at),
        customerName: userName,
        customerEmail: userEmail,
        startupName: startupName,
        amount: payment.amount || 0,
        currency: payment.currency || (paymentGateway === 'paypal' ? 'EUR' : 'INR'),
        taxAmount: taxAmount,
        totalAmount: totalAmount,
        planName: planName,
        planTier: planTier,
        billingPeriod: billingPeriod,
        paymentGateway: paymentGateway,
        gatewayPaymentId: payment.gateway_payment_id || undefined,
        gatewayOrderId: payment.gateway_order_id || undefined,
        transactionId: payment.id,
        status: payment.status,
        country: payment.country || undefined
      };
      
      // Generate and download PDF
      const pdfBlob = await generateInvoicePDF(invoiceData);
      const filename = `Invoice-${invoiceData.invoiceNumber}-Cycle-${cycle.cycle_number}-${new Date().toISOString().split('T')[0]}.pdf`;
      downloadBlob(pdfBlob, filename);
      
    } catch (error) {
      console.error('Error generating invoice for billing cycle:', error);
      alert('Failed to generate invoice. Please try again.');
    } finally {
      setDownloadingInvoice(null);
    }
  };
  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Billing Cycles</h2>
        
        {billingCycles.length === 0 ? (
          <p className="text-gray-600">No billing cycles found.</p>
        ) : (
          <div className="space-y-4">
            {billingCycles.map((cycle) => (
              <div 
                key={cycle.id} 
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-slate-900">
                        Cycle #{cycle.cycle_number}
                        {cycle.status === 'paid' && cycle.cycle_number === billingCycles[0]?.cycle_number && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Current</span>
                        )}
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Period</p>
                        <p className="font-medium">
                          {formatDate(cycle.period_start)} - {formatDate(cycle.period_end)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Amount</p>
                        <p className="font-medium">{formatCurrency(cycle.amount, subscriptionCurrency || cycle.currency)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Status</p>
                        <div className="flex items-center">
                          {cycle.status === 'paid' ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                              <span className="text-green-600 font-medium">Paid</span>
                              {cycle.is_autopay && (
                                <span className="ml-2 text-xs text-gray-500">(Auto-Pay)</span>
                              )}
                            </>
                          ) : cycle.status === 'failed' ? (
                            <>
                              <XCircle className="h-4 w-4 text-red-600 mr-2" />
                              <span className="text-red-600 font-medium">Failed</span>
                            </>
                          ) : (
                            <>
                              <Clock className="h-4 w-4 text-yellow-600 mr-2" />
                              <span className="text-yellow-600 font-medium capitalize">{cycle.status}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownloadCycleInvoice(cycle)}
                      disabled={downloadingInvoice === cycle.id || !cycle.payment_transaction_id}
                    >
                      <Download className={`h-4 w-4 mr-2 ${downloadingInvoice === cycle.id ? 'animate-spin' : ''}`} />
                      {downloadingInvoice === cycle.id ? 'Generating...' : 'Invoice'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// Payment History Section Component
function PaymentHistorySection({
  payments,
  formatDate,
  formatCurrency,
  subscriptionCurrency
}: {
  payments: PaymentTransaction[];
  formatDate: (date: string) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  subscriptionCurrency?: string;
}) {
  const totalPaid = payments
    .filter(p => p.status === 'success')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Payment History</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {payments.length === 0 ? (
          <p className="text-gray-600">No payment history found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Cycle</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">{formatDate(payment.created_at)}</td>
                      <td className="py-3 px-4 text-sm font-medium">
                        {formatCurrency(payment.amount, subscriptionCurrency || payment.currency)}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex items-center">
                          {payment.is_autopay ? (
                            <>
                              <CreditCard className="h-4 w-4 text-blue-600 mr-2" />
                              <span>Auto-Pay</span>
                            </>
                          ) : (
                            <span className="capitalize">{payment.payment_type}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {payment.billing_cycle_number ? `#${payment.billing_cycle_number}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {payment.status === 'success' ? (
                          <span className="flex items-center text-green-600">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Success
                          </span>
                        ) : payment.status === 'failed' ? (
                          <span className="flex items-center text-red-600">
                            <XCircle className="h-4 w-4 mr-1" />
                            Failed
                          </span>
                        ) : (
                          <span className="flex items-center text-yellow-600">
                            <Clock className="h-4 w-4 mr-1" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(totalPaid, subscriptionCurrency)}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

// Auto-Pay Management Card Component
function AutopayManagementCard({
  subscription,
  formatDate,
  formatCurrency,
  displayCurrency
}: {
  subscription: Subscription;
  formatDate: (date: string) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  displayCurrency: string;
}) {
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleAutopay = async () => {
    if (subscription.autopay_enabled) {
      // Disable autopay
      const confirmed = window.confirm(
        'Are you sure you want to stop Auto-Pay?\n\n' +
        'Your subscription will continue until ' + formatDate(subscription.current_period_end) + 
        '. After that, your subscription will expire and features will be locked.\n\n' +
        'You can reactivate by making a manual payment before the period ends.'
      );
      if (!confirmed) return;

      setIsToggling(true);
      try {
        // Use appropriate endpoint based on payment gateway
        const endpoint = subscription.payment_gateway === 'paypal' 
          ? '/api/paypal/stop-autopay'
          : '/api/razorpay/stop-autopay';
          
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscription_id: subscription.id,
            user_id: subscription.user_id
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to stop autopay');
        }

        if (result.already_disabled) {
          alert('Auto-Pay is already disabled.');
        } else {
          alert('✅ Auto-Pay has been stopped.\n\n' +
                'Your subscription will continue until ' + formatDate(subscription.current_period_end) + 
                '. After that, features will be locked.');
          
          // Reload subscription data
          window.location.reload(); // Or call loadAccountData() if available
        }
      } catch (error: any) {
        console.error('Error disabling autopay:', error);
        alert('Failed to stop Auto-Pay: ' + (error.message || 'Please try again.'));
      } finally {
        setIsToggling(false);
      }
    } else {
      // Enable autopay - redirect to subscription page
      alert('To enable Auto-Pay, please subscribe to a plan with autopay enabled.');
      // You can redirect to subscription page here
      // window.location.href = '/subscription';
    }
  };

  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Auto-Pay Settings</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-slate-900">Auto-Pay Status</p>
              <div className="flex items-center mt-1">
                {subscription.autopay_enabled ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-green-600 font-medium">Enabled</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-600">Disabled</span>
                  </>
                )}
              </div>
            </div>
            <Button
              onClick={handleToggleAutopay}
              disabled={isToggling}
              variant={subscription.autopay_enabled ? "outline" : "default"}
              size="sm"
            >
              {isToggling ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : subscription.autopay_enabled ? (
                'Stop Auto-Pay'
              ) : (
                'Enable Auto-Pay'
              )}
            </Button>
          </div>

          {subscription.autopay_enabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subscription.payment_gateway === 'razorpay' && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Mandate ID</p>
                    <p className="text-sm font-mono">{subscription.razorpay_mandate_id || 'N/A'}</p>
                  </div>
                )}
                {subscription.payment_gateway === 'paypal' && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">PayPal Subscription ID</p>
                    <p className="text-sm font-mono">{subscription.paypal_subscription_id || 'N/A'}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600 mb-1">Next Charge</p>
                  <p className="text-sm font-medium">{subscription.next_billing_date ? formatDate(subscription.next_billing_date) : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Amount</p>
                  <p className="text-sm font-medium">
                    {formatCurrency(
                      subscription.amount || subscription.locked_amount_inr || 0,
                      displayCurrency
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <p className="text-sm font-medium capitalize">{subscription.mandate_status || 'active'}</p>
                </div>
              </div>

            </>
          )}
        </div>
      </div>
    </Card>
  );
}

// Plan Management Card Component
function PlanManagementCard({
  subscription,
  formatCurrency,
  displayCurrency,
  authUserId,
  onViewPlans,
  canManagePayments
}: {
  subscription: Subscription | null;
  formatCurrency: (amount: number, currency?: string) => string;
  displayCurrency: string;
  authUserId?: string;
  onViewPlans?: () => void;
  canManagePayments?: boolean;
}) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);

  // If no subscription, show "View Plans" button
  if (!subscription) {
    return (
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Plan Management</h2>
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">You're currently on the Basic Plan.</p>
            {canManagePayments && (
              <Button onClick={onViewPlans} className="flex items-center mx-auto">
                <TrendingUp className="h-4 w-4 mr-2" />
                View All Plans
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  const planNames = {
    free: 'Basic Plan',
    basic: 'Standard Plan',
    premium: 'Premium Plan'
  };

  const availableUpgrades = subscription.plan_tier === 'free' 
    ? ['basic', 'premium']
    : subscription.plan_tier === 'basic'
    ? ['premium']
    : [];

  const canDowngrade = subscription.plan_tier !== 'free';

  // If advisor-paid, show read-only info
  if (!canManagePayments) {
    return (
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Plan Management</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Current Plan</p>
              <p className="text-lg font-semibold">{planNames[subscription.plan_tier]}</p>
              <p className="text-sm text-gray-600 mt-1">
                {formatCurrency(
                  subscription.amount || subscription.locked_amount_inr || 0,
                  displayCurrency
                )}/month
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Plan management is not available. Your subscription is managed by your investment advisor.
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Plan Management</h2>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Current Plan</p>
            <p className="text-lg font-semibold">{planNames[subscription.plan_tier]}</p>
            <p className="text-sm text-gray-600 mt-1">
              {formatCurrency(
                subscription.amount || subscription.locked_amount_inr || 0,
                displayCurrency
              )}/month
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={onViewPlans}
              className="flex items-center"
            >
              <Settings className="h-4 w-4 mr-2" />
              View All Plans
            </Button>
            
            {availableUpgrades.length > 0 && (
              <Button
                onClick={() => {
                  if (onViewPlans) {
                    onViewPlans();
                  } else {
                    setShowUpgradeModal(true);
                  }
                }}
                className="flex items-center"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Upgrade Plan
              </Button>
            )}
            
            {canDowngrade && (
              <Button
                onClick={() => {
                  if (onViewPlans) {
                    onViewPlans();
                  } else {
                    setShowDowngradeModal(true);
                  }
                }}
                variant="outline"
                className="flex items-center"
              >
                <TrendingDown className="h-4 w-4 mr-2" />
                Downgrade Plan
              </Button>
            )}
          </div>

          <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Plan Change Notice</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Changing your plan will affect your billing cycle, features, and auto-pay settings.
                  Your current plan's auto-pay will be stopped and new auto-pay will be set up for the new plan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Modal - TODO: Implement */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Upgrade Plan</h3>
            <p className="text-gray-600 mb-4">Upgrade modal will be implemented here.</p>
            <Button onClick={() => setShowUpgradeModal(false)}>Close</Button>
          </div>
        </div>
      )}

      {/* Downgrade Modal - TODO: Implement */}
      {showDowngradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Downgrade Plan</h3>
            <p className="text-gray-600 mb-4">Downgrade modal will be implemented here.</p>
            <Button onClick={() => setShowDowngradeModal(false)}>Close</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// Storage Usage Card Component
function StorageUsageCard({ storageUsage }: { storageUsage: StorageUsage }) {
  const formatStorage = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb} MB`;
  };

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Storage Usage</h2>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Used</span>
              <span className="font-medium">
                {formatStorage(storageUsage.used_mb)} / {formatStorage(storageUsage.limit_mb)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  storageUsage.percentage >= 90
                    ? 'bg-red-500'
                    : storageUsage.percentage >= 70
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(storageUsage.percentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {storageUsage.remaining_mb > 0 
                ? `${formatStorage(storageUsage.remaining_mb)} remaining`
                : 'Storage limit reached'}
            </p>
          </div>

          {storageUsage.percentage >= 80 && (
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ You're using {storageUsage.percentage.toFixed(0)}% of your storage. 
                Consider upgrading to Premium for more storage.
              </p>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Storage Source</p>
                <p className="text-xs text-gray-500 mt-1">
                  Calculated from database tracking (updated automatically on file upload/delete)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Invoice Downloads Section Component
function InvoiceDownloadsSection({
  payments,
  formatDate,
  formatCurrency,
  startupId
}: {
  payments: PaymentTransaction[];
  formatDate: (date: string) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  startupId?: string;
}) {
  const successfulPayments = payments.filter(p => p.status === 'success');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const handleDownloadInvoice = async (payment: PaymentTransaction) => {
    try {
      setDownloading(payment.id);
      
      // Import PDF generator dynamically
      const { generateInvoicePDF, downloadBlob } = await import('../../lib/pdfGenerator');
      
      // Get user details for invoice
      const { data: { user } } = await supabase.auth.getUser();
      const userName = user?.user_metadata?.name || user?.email || 'Customer';
      const userEmail = user?.email || '';
      
      // Get startup name if startupId is provided
      let startupName: string | undefined = undefined;
      if (startupId) {
        try {
          const { data: startup } = await supabase
            .from('startups')
            .select('name')
            .eq('id', parseInt(startupId))
            .single();
          
          if (startup && startup.name) {
            startupName = startup.name;
          }
        } catch (error) {
          console.warn('Could not fetch startup name for invoice:', error);
        }
      }
      
      // Get subscription details if available
      let planName = 'Subscription Plan';
      let planTier = payment.plan_tier || 'basic';
      if (payment.subscription_id) {
        try {
          const { data: subscription } = await supabase
            .from('user_subscriptions')
            .select('plan_id, plan_tier')
            .eq('id', payment.subscription_id)
            .single();
          
          if (subscription && subscription.plan_tier) {
            planTier = subscription.plan_tier;
          }
          
          // Try to get plan name from subscription_plans if plan_id exists
          if (subscription && subscription.plan_id) {
            const { data: plan } = await supabase
              .from('subscription_plans')
              .select('name')
              .eq('id', subscription.plan_id)
              .single();
            
            if (plan && plan.name) {
              planName = plan.name;
            }
          }
        } catch (error) {
          console.warn('Could not fetch subscription details for invoice:', error);
        }
      }
      
      // Format billing period if available
      let billingPeriod = '';
      if (payment.billing_period_start && payment.billing_period_end) {
        billingPeriod = `${formatDate(payment.billing_period_start)} - ${formatDate(payment.billing_period_end)}`;
      }
      
      // Prepare invoice data
      // Handle payment gateway type - ensure it's 'razorpay' or 'paypal'
      let paymentGateway: 'razorpay' | 'paypal' = 'razorpay';
      if (payment.payment_gateway === 'paypal') {
        paymentGateway = 'paypal';
      } else if (payment.payment_gateway === 'razorpay' || payment.payment_gateway === 'payaid') {
        paymentGateway = 'razorpay';
      }

      // Extract tax info from metadata if available
      let taxAmount: number | undefined = undefined;
      let totalAmount = payment.amount || 0;
      
      // Check if metadata exists (it's optional in PaymentTransaction)
      const paymentWithMetadata = payment as any;
      if (paymentWithMetadata.metadata && typeof paymentWithMetadata.metadata === 'object') {
        const metadata = paymentWithMetadata.metadata;
        if (metadata.tax_amount) {
          taxAmount = parseFloat(metadata.tax_amount);
        }
        if (metadata.total_amount_with_tax) {
          totalAmount = parseFloat(metadata.total_amount_with_tax);
        }
      }

      const invoiceData = {
        invoiceNumber: `INV-${payment.id.slice(-8).toUpperCase()}`,
        invoiceDate: formatDate(payment.created_at),
        paymentDate: payment.paid_at ? formatDate(payment.paid_at) : formatDate(payment.created_at),
        customerName: userName,
        customerEmail: userEmail,
        startupName: startupName,
        amount: payment.amount || 0,
        currency: payment.currency || (paymentGateway === 'paypal' ? 'EUR' : 'INR'),
        taxAmount: taxAmount,
        totalAmount: totalAmount,
        planName: planName,
        planTier: planTier,
        billingPeriod: billingPeriod || undefined,
        paymentGateway: paymentGateway,
        gatewayPaymentId: payment.gateway_payment_id || undefined,
        gatewayOrderId: payment.gateway_order_id || undefined,
        transactionId: payment.id,
        status: payment.status,
        country: payment.country || undefined
      };
      
      // Generate and download PDF
      const pdfBlob = await generateInvoicePDF(invoiceData);
      const filename = `Invoice-${invoiceData.invoiceNumber}-${new Date().toISOString().split('T')[0]}.pdf`;
      downloadBlob(pdfBlob, filename);
      
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAll = async () => {
    try {
      setDownloadingAll(true);
      
      // Download each invoice sequentially to avoid browser blocking
      for (const payment of successfulPayments) {
        await handleDownloadInvoice(payment);
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } catch (error) {
      console.error('Error downloading all invoices:', error);
      alert('Failed to download some invoices. Please try again.');
    } finally {
      setDownloadingAll(false);
    }
  };

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Invoices</h2>
          {successfulPayments.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDownloadAll}
              disabled={downloadingAll}
            >
              <Download className="h-4 w-4 mr-2" />
              {downloadingAll ? 'Downloading...' : 'Download All'}
            </Button>
          )}
        </div>

        {successfulPayments.length === 0 ? (
          <p className="text-gray-600">No invoices available.</p>
        ) : (
          <div className="space-y-3">
            {successfulPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium">Invoice #{payment.id.slice(-8).toUpperCase()}</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(payment.created_at)} • {formatCurrency(payment.amount || 0, payment.currency)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {payment.payment_gateway === 'paypal' ? 'PayPal' : 'Razorpay'} • {payment.payment_type}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDownloadInvoice(payment)}
                  disabled={downloading === payment.id || downloadingAll}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {downloading === payment.id ? 'Generating...' : 'Download PDF'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

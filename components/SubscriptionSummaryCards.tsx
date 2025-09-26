import React, { useState, useEffect } from 'react';
import { paymentService, SubscriptionSummary } from '../lib/paymentService';
import Card from './ui/Card';
import { Euro, CreditCard, Calendar, TrendingUp, DollarSign, IndianRupee, PoundSterling } from 'lucide-react';
import { getCurrencyForCountry } from '../lib/utils';
import { formatCurrencyFromEUR } from '../lib/currencyUtils';

interface SubscriptionSummaryCardsProps {
  userId: string;
  userType: string;
  userCountry?: string;
}

export default function SubscriptionSummaryCards({ userId, userType, userCountry }: SubscriptionSummaryCardsProps) {
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptionSummary();
  }, [userId]);

  const loadSubscriptionSummary = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const summaryData = await paymentService.getSubscriptionSummary(userId);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading subscription summary:', error);
      setError('Failed to load subscription summary. Please try again or contact support.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="text-center py-8">
            <p className="text-red-600">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const formatCurrency = (eurAmount: number) => {
    // Get currency based on user's country
    const userCurrency = userCountry ? getCurrencyForCountry(userCountry) : 'EUR';
    return formatCurrencyFromEUR(eurAmount, userCurrency);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-EU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Total Due Card */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Total Due</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(summary.totalDue)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {summary.totalSubscriptions} active subscription{summary.totalSubscriptions !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
            {userCountry && getCurrencyForCountry(userCountry) === 'INR' ? (
              <IndianRupee className="h-6 w-6 text-red-600" />
            ) : userCountry && getCurrencyForCountry(userCountry) === 'USD' ? (
              <DollarSign className="h-6 w-6 text-red-600" />
            ) : userCountry && getCurrencyForCountry(userCountry) === 'GBP' ? (
              <PoundSterling className="h-6 w-6 text-red-600" />
            ) : (
              <Euro className="h-6 w-6 text-red-600" />
            )}
          </div>
        </div>
        {summary.totalDue > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 mb-2">Upcoming Payments:</p>
            <div className="space-y-1">
              {summary.upcomingPayments.slice(0, 2).map((payment, index) => (
                <div key={index} className="flex justify-between text-xs">
                  <span className="text-slate-600">{payment.plan.name}</span>
                  <span className="font-medium">{formatCurrency(payment.amount)}</span>
                </div>
              ))}
              {summary.upcomingPayments.length > 2 && (
                <p className="text-xs text-slate-500">
                  +{summary.upcomingPayments.length - 2} more payment{summary.upcomingPayments.length - 2 !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Total Subscriptions Card */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Active Subscriptions</p>
            <p className="text-2xl font-bold text-slate-900">
              {summary.totalSubscriptions}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {summary.activeSubscriptions.reduce((total, sub) => total + sub.startup_count, 0)} total startup{summary.activeSubscriptions.reduce((total, sub) => total + sub.startup_count, 0) !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-green-600" />
          </div>
        </div>
        {summary.activeSubscriptions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 mb-2">Subscription Details:</p>
            <div className="space-y-1">
              {summary.activeSubscriptions.slice(0, 2).map((subscription, index) => (
                <div key={index} className="flex justify-between text-xs">
                  <span className="text-slate-600">
                    {subscription.startup_count} startup{subscription.startup_count !== 1 ? 's' : ''}
                  </span>
                  <span className="text-slate-500">
                    Due {formatDate(subscription.current_period_end)}
                  </span>
                </div>
              ))}
              {summary.activeSubscriptions.length > 2 && (
                <p className="text-xs text-slate-500">
                  +{summary.activeSubscriptions.length - 2} more subscription{summary.activeSubscriptions.length - 2 !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

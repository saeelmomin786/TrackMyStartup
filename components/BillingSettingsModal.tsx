import React, { useState, useEffect } from 'react';
import { X, CreditCard, Calendar, DollarSign, RefreshCw, AlertCircle } from 'lucide-react';
import { paymentService } from '../lib/paymentService';
import Button from './ui/Button';

interface BillingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface BillingInfo {
  subscription: any;
  plan: any;
  nextBillingDate: string;
  amount: number;
  currency: string;
  interval: string;
}

export default function BillingSettingsModal({
  isOpen,
  onClose,
  userId
}: BillingSettingsModalProps) {
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadBillingInfo();
    }
  }, [isOpen, userId]);

  const loadBillingInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const info = await paymentService.getBillingInfo(userId);
      setBillingInfo(info);
    } catch (error) {
      console.error('Error loading billing info:', error);
      setError('Failed to load billing information');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: currency || 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-EU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Billing Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          ) : billingInfo ? (
            <div className="space-y-6">
              {/* Current Plan */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Current Plan
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Plan Name:</span>
                    <span className="font-medium">{billingInfo.plan.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Billing Interval:</span>
                    <span className="font-medium capitalize">{billingInfo.interval}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Amount:</span>
                    <span className="font-medium">
                      {formatCurrency(billingInfo.amount, billingInfo.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Billing Information */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Billing Information
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Next Billing Date:</span>
                    <span className="font-medium">{formatDate(billingInfo.nextBillingDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subscription Status:</span>
                    <span className="font-medium capitalize text-green-600">
                      {billingInfo.subscription.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Startup Count:</span>
                    <span className="font-medium">{billingInfo.subscription.startup_count}</span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Methods
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-slate-500" />
                      <div>
                        <p className="font-medium text-slate-900">Credit/Debit Card</p>
                        <p className="text-sm text-slate-600">**** **** **** 1234</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Update
                    </Button>
                  </div>
                  
                  <div className="text-sm text-slate-600">
                    <p>• Secure payment processing</p>
                    <p>• Automatic billing on due date</p>
                    <p>• Update payment methods anytime</p>
                  </div>
                </div>
              </div>

              {/* Billing History */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Recent Billing
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-white rounded border border-slate-200">
                    <div>
                      <p className="font-medium text-slate-900">Monthly Subscription</p>
                      <p className="text-sm text-slate-600">{formatDate(billingInfo.subscription.current_period_start)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(billingInfo.amount, billingInfo.currency)}</p>
                      <p className="text-sm text-green-600">Paid</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={loadBillingInfo} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
}



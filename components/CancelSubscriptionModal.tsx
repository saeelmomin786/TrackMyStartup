import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import { paymentService } from '../lib/paymentService';
import Button from './ui/Button';

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancelled: () => void;
  userId: string;
  planName?: string;
  nextBillingDate?: string;
}

export default function CancelSubscriptionModal({
  isOpen,
  onClose,
  onCancelled,
  userId,
  planName,
  nextBillingDate
}: CancelSubscriptionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleCancel = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await paymentService.cancelSubscription(userId);
      onCancelled();
      onClose();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      setError('Failed to cancel subscription. Please try again or contact support.');
    } finally {
      setIsLoading(false);
    }
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
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Cancel Subscription</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {/* Warning */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-800">Are you sure you want to cancel?</h3>
                  <p className="text-sm text-red-700 mt-1">
                    This action will immediately cancel your subscription and you'll lose access to premium features.
                  </p>
                </div>
              </div>
            </div>

            {/* Subscription Details */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="font-medium text-slate-900 mb-2">Current Subscription</h3>
              <div className="space-y-1 text-sm text-slate-600">
                <p><span className="font-medium">Plan:</span> {planName || 'Current Plan'}</p>
                {nextBillingDate && (
                  <p><span className="font-medium">Next Billing:</span> {formatDate(nextBillingDate)}</p>
                )}
              </div>
            </div>

            {/* Cancellation Reason */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Why are you cancelling? (Optional)
              </label>
              <select
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a reason...</option>
                <option value="too-expensive">Too expensive</option>
                <option value="not-using">Not using the service</option>
                <option value="found-alternative">Found a better alternative</option>
                <option value="technical-issues">Technical issues</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Confirmation Checkbox */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="confirm-cancellation"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-slate-300 rounded"
              />
              <label htmlFor="confirm-cancellation" className="text-sm text-slate-700">
                I understand that cancelling my subscription will immediately revoke access to premium features and this action cannot be undone.
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Alternative Options */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 mb-2">Before you go...</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• Consider pausing your subscription instead</p>
                <p>• Contact support if you're experiencing issues</p>
                <p>• You can always resubscribe later</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <Button variant="outline" onClick={onClose}>
            Keep Subscription
          </Button>
          <Button
            onClick={handleCancel}
            disabled={!isConfirmed || isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Cancelling...
              </div>
            ) : (
              'Cancel Subscription'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}



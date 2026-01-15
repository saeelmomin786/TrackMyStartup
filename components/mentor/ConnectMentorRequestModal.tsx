import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { mentorService, MentorRequest } from '../../lib/mentorService';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';

interface ConnectMentorRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentorId: string;
  mentorName: string;
  mentorFeeType?: string;
  mentorFeeAmount?: number;
  mentorFeeAmountMin?: number;
  mentorFeeAmountMax?: number;
  mentorEquityPercentage?: number;
  mentorCurrency?: string; // Mentor's currency (for display only)
  startupCurrency?: string; // Startup's currency (for payment)
  startupId: number | null;
  requesterId: string;
  onRequestSent: () => void;
}

const ConnectMentorRequestModal: React.FC<ConnectMentorRequestModalProps> = ({
  isOpen,
  onClose,
  mentorId,
  mentorName,
  mentorFeeType,
  mentorFeeAmount,
  mentorFeeAmountMin,
  mentorFeeAmountMax,
  mentorEquityPercentage,
  mentorCurrency = 'USD',
  startupCurrency = 'USD', // Default to USD if not provided
  startupId,
  requesterId,
  onRequestSent
}) => {
  const [message, setMessage] = useState('');
  const [proposedFeeAmount, setProposedFeeAmount] = useState<number | undefined>();
  const [proposedEquityAmount, setProposedEquityAmount] = useState<number | undefined>();
  const [proposedEsopPercentage, setProposedEsopPercentage] = useState<number | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const MAX_MESSAGE_LENGTH = 500; // Character limit
  const messageLength = message.length;
  const remainingChars = MAX_MESSAGE_LENGTH - messageLength;

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setMessage('');
      setProposedFeeAmount(undefined);
      setProposedEquityAmount(undefined);
      setProposedEsopPercentage(undefined);
      setError(null);
      
      // Check for existing request
      checkExistingRequest();
    }
  }, [isOpen, mentorId, startupId, requesterId]);

  const checkExistingRequest = async () => {
    if (!mentorId || !startupId || !requesterId) return;

    try {
      const { mentorService } = await import('../../lib/mentorService');
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Check if request already exists
      const existing = await mentorService.checkExistingRequest(
        mentorId,
        authUser.id,
        startupId
      );

      if (existing.exists && existing.request) {
        let errorMessage = '';
        if (existing.request.status === 'accepted') {
          errorMessage = 'You already have an accepted request with this mentor. Please check your dashboard.';
        } else if (existing.request.status === 'negotiating') {
          errorMessage = 'You already have a request under negotiation with this mentor. Please wait for their response or cancel the existing request.';
        } else if (existing.request.status === 'pending') {
          errorMessage = 'You already have a pending request with this mentor. Please wait for their response or cancel the existing request.';
        }
        
        if (errorMessage) {
          setError(errorMessage);
        }
      }
    } catch (err) {
      console.error('Error checking existing request:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await mentorService.sendConnectRequest(
        mentorId,
        requesterId,
        startupId,
        message || undefined,
        proposedFeeAmount,
        proposedEquityAmount,
        proposedEsopPercentage,
        startupCurrency // Use startup's currency for the request
      );

      if (result.success) {
        onRequestSent();
        onClose();
      } else {
        setError(result.error || 'Failed to send request. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showFeeField = mentorFeeType === 'Fees' || mentorFeeType === 'Hybrid';
  const showEquityField = mentorFeeType === 'Equity' || mentorFeeType === 'Stock Options' || mentorFeeType === 'Hybrid';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Connect with ${mentorName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Message (Optional)
            <span className="text-xs text-slate-500 ml-2">
              {messageLength}/{MAX_MESSAGE_LENGTH} characters
            </span>
          </label>
          <textarea
            value={message}
            onChange={(e) => {
              if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
                setMessage(e.target.value);
              }
            }}
            rows={4}
            maxLength={MAX_MESSAGE_LENGTH}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add a personal message to your request..."
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-slate-500">
              {remainingChars > 0 ? `${remainingChars} characters remaining` : 'Character limit reached'}
            </p>
            {remainingChars < 50 && remainingChars > 0 && (
              <p className="text-xs text-amber-600">
                {remainingChars} characters left
              </p>
            )}
            {remainingChars === 0 && (
              <p className="text-xs text-red-600">
                Maximum character limit reached
              </p>
            )}
          </div>
        </div>

        {mentorFeeType && mentorFeeType !== 'Free' && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Proposed Terms
            </h3>
            <div className="p-3 bg-blue-50 rounded-md mb-3">
              <p className="text-xs font-medium text-slate-700 mb-2">Mentor's Fee Structure:</p>
              <div className="space-y-1">
                <p className="text-xs text-slate-600">
                  <span className="font-medium">Type:</span> {mentorFeeType}
                </p>
                {mentorFeeAmountMin && mentorFeeAmountMax && mentorFeeAmountMin !== mentorFeeAmountMax ? (
                  <p className="text-xs text-slate-600">
                    <span className="font-medium">Fee Range:</span> {mentorFeeAmountMin.toLocaleString()} - {mentorFeeAmountMax.toLocaleString()} {mentorCurrency}
                  </p>
                ) : mentorFeeAmountMin ? (
                  <p className="text-xs text-slate-600">
                    <span className="font-medium">Fee:</span> {mentorFeeAmountMin.toLocaleString()} {mentorCurrency}
                  </p>
                ) : mentorFeeAmountMax ? (
                  <p className="text-xs text-slate-600">
                    <span className="font-medium">Fee:</span> {mentorFeeAmountMax.toLocaleString()} {mentorCurrency}
                  </p>
                ) : mentorFeeAmount ? (
                  <p className="text-xs text-slate-600">
                    <span className="font-medium">Fee:</span> {mentorFeeAmount.toLocaleString()} {mentorCurrency}
                  </p>
                ) : null}
                {mentorEquityPercentage && (
                  <p className="text-xs text-slate-600">
                    <span className="font-medium">Equity:</span> {mentorEquityPercentage}%
                  </p>
                )}
              </div>
            </div>

            {showFeeField && (
              <div className="mb-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Proposed Fee Amount ({startupCurrency})
                </label>
                <p className="text-xs text-slate-500 mb-1">Amount in your currency ({startupCurrency})</p>
                <Input
                  type="number"
                  value={proposedFeeAmount || ''}
                  onChange={(e) => setProposedFeeAmount(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="Enter fee amount"
                  min="0"
                  step="0.01"
                />
              </div>
            )}

            {showEquityField && (
              <>
                {mentorFeeType === 'Stock Options' ? (
                  // For Stock Options, show only ESOP Amount
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Proposed ESOP Amount ({startupCurrency})
                    </label>
                    <p className="text-xs text-slate-500 mb-1">Amount in your currency ({startupCurrency})</p>
                    <Input
                      type="number"
                      value={proposedEquityAmount || ''}
                      onChange={(e) => setProposedEquityAmount(e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="Enter ESOP amount"
                      min="0"
                      step="0.01"
                    />
                  </div>
                ) : (
                  // For Equity or Hybrid, show Equity Amount and ESOP Percentage
                  <>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Proposed Equity Amount ({startupCurrency})
                      </label>
                      <p className="text-xs text-slate-500 mb-1">Amount in your currency ({startupCurrency})</p>
                      <Input
                        type="number"
                        value={proposedEquityAmount || ''}
                        onChange={(e) => setProposedEquityAmount(e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="Enter equity amount"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Proposed ESOP Percentage (%)
                      </label>
                      <Input
                        type="number"
                        value={proposedEsopPercentage || ''}
                        onChange={(e) => setProposedEsopPercentage(e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="Enter ESOP percentage"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Request'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ConnectMentorRequestModal;


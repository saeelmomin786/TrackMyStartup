import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { mentorService, MentorRequest } from '../../lib/mentorService';
import { X } from 'lucide-react';

interface ConnectMentorRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentorId: string;
  mentorName: string;
  mentorFeeType?: string;
  mentorFeeAmount?: number;
  mentorEquityPercentage?: number;
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
  mentorEquityPercentage,
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

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setMessage('');
      setProposedFeeAmount(undefined);
      setProposedEquityAmount(undefined);
      setProposedEsopPercentage(undefined);
      setError(null);
    }
  }, [isOpen]);

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
        proposedEsopPercentage
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
  const showEquityField = mentorFeeType === 'Equity' || mentorFeeType === 'Hybrid';

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
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add a personal message to your request..."
          />
        </div>

        {mentorFeeType && mentorFeeType !== 'Free' && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Proposed Terms
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Mentor's fee structure: {mentorFeeType}
              {mentorFeeAmount && ` - ${mentorFeeAmount} USD`}
              {mentorEquityPercentage && ` - ${mentorEquityPercentage}%`}
            </p>

            {showFeeField && (
              <div className="mb-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Proposed Fee Amount (USD)
                </label>
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
                <div className="mb-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Proposed Equity Amount (USD)
                  </label>
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


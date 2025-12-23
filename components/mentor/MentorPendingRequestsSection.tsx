import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import { MentorRequest } from '../../lib/mentorService';
import { CheckCircle, XCircle, MessageSquare, DollarSign, TrendingUp, ExternalLink } from 'lucide-react';
import { formatDateDDMMYYYY } from '../../lib/dateTimeUtils';

// Helper function to format currency
const formatCurrency = (value: number, currency: string = 'USD'): string => {
  const currencySymbols: { [key: string]: string } = {
    'USD': '$',
    'INR': '₹',
    'EUR': '€',
    'GBP': '£',
    'SGD': 'S$',
    'AED': 'AED '
  };
  const symbol = currencySymbols[currency] || currency || '$';
  return `${symbol}${value.toLocaleString()}`;
};

interface MentorPendingRequestsSectionProps {
  requests: MentorRequest[];
  onRequestAction: () => void;
}

const MentorPendingRequestsSection: React.FC<MentorPendingRequestsSectionProps> = ({
  requests,
  onRequestAction
}) => {
  const [selectedRequest, setSelectedRequest] = useState<MentorRequest | null>(null);
  const [actionType, setActionType] = useState<'accept' | 'reject' | 'negotiate' | null>(null);
  const [negotiatedFeeAmount, setNegotiatedFeeAmount] = useState<number | undefined>();
  const [negotiatedEquityAmount, setNegotiatedEquityAmount] = useState<number | undefined>();
  const [negotiatedEsopPercentage, setNegotiatedEsopPercentage] = useState<number | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (request: MentorRequest, action: 'accept' | 'reject' | 'negotiate') => {
    setSelectedRequest(request);
    setActionType(action);
    setError(null);
    
    // Pre-fill negotiation fields with proposed amounts
    if (action === 'negotiate') {
      setNegotiatedFeeAmount(request.proposed_fee_amount);
      setNegotiatedEquityAmount(request.proposed_equity_amount);
      setNegotiatedEsopPercentage(request.proposed_esop_percentage);
    }
  };

  const handleAccept = async () => {
    if (!selectedRequest) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const { mentorService } = await import('../../lib/mentorService');
      const success = await mentorService.acceptMentorRequest(selectedRequest.id);
      
      if (success) {
        onRequestAction();
        setSelectedRequest(null);
        setActionType(null);
      } else {
        setError('Failed to accept request. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const { mentorService } = await import('../../lib/mentorService');
      const success = await mentorService.rejectMentorRequest(selectedRequest.id);
      
      if (success) {
        onRequestAction();
        setSelectedRequest(null);
        setActionType(null);
      } else {
        setError('Failed to reject request. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNegotiate = async () => {
    if (!selectedRequest) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const { mentorService } = await import('../../lib/mentorService');
      const success = await mentorService.sendNegotiation(
        selectedRequest.id,
        negotiatedFeeAmount,
        negotiatedEquityAmount,
        negotiatedEsopPercentage
      );
      
      if (success) {
        onRequestAction();
        setSelectedRequest(null);
        setActionType(null);
      } else {
        setError('Failed to send negotiation. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const negotiatingRequests = requests.filter(r => r.status === 'negotiating');

  // Generate startup card link
  const getStartupCardLink = async (startupId: number | undefined, startupName: string | undefined): Promise<string | null> => {
    if (!startupId || !startupName) return null;
    
    try {
      const { createSlug, createProfileUrl } = await import('../../lib/slugUtils');
      const slug = createSlug(startupName);
      const baseUrl = window.location.origin;
      const startupProfileUrl = createProfileUrl(baseUrl, 'startup', slug, String(startupId));
      return startupProfileUrl;
    } catch (error) {
      console.error('Error generating startup link:', error);
      // Fallback to query param URL
      return `${window.location.origin}/startup?startupId=${startupId}`;
    }
  };

  const handleViewStartupCard = async (request: MentorRequest) => {
    const link = await getStartupCardLink(request.startup_id, request.startup_name);
    if (link) {
      window.open(link, '_blank');
    } else {
      // Fallback if link generation fails
      if (request.startup_id) {
        window.open(`${window.location.origin}/startup?startupId=${request.startup_id}`, '_blank');
      }
    }
  };

  return (
    <>
      <Card>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Pending Request</h3>
        {pendingRequests.length > 0 ? (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div key={request.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-slate-900">{request.startup_name || 'Unknown Startup'}</h4>
                    {request.startup_website && (
                      <p className="text-sm text-slate-500">{request.startup_website}</p>
                    )}
                    {request.startup_sector && (
                      <p className="text-xs text-slate-400 mt-1">{request.startup_sector}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {formatDateDDMMYYYY(request.requested_at)}
                  </span>
                </div>

                {request.message && (
                  <div className="mb-3 p-3 bg-slate-50 rounded-md">
                    <p className="text-sm text-slate-700">{request.message}</p>
                  </div>
                )}

                {(request.proposed_fee_amount || request.proposed_equity_amount || request.proposed_esop_percentage) && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-md">
                    <p className="text-xs font-medium text-slate-700 mb-2">Proposed Terms:</p>
                    <div className="space-y-1">
                      {request.proposed_fee_amount && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <DollarSign className="h-4 w-4" />
                          <span>Fee: {formatCurrency(request.proposed_fee_amount, request.fee_currency || 'USD')}</span>
                        </div>
                      )}
                      {request.proposed_equity_amount && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <TrendingUp className="h-4 w-4" />
                          <span>Equity: {formatCurrency(request.proposed_equity_amount, request.fee_currency || 'USD')}</span>
                        </div>
                      )}
                      {request.proposed_esop_percentage && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <TrendingUp className="h-4 w-4" />
                          <span>ESOP: {request.proposed_esop_percentage}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-4">
                  {request.startup_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-purple-600 border-purple-300 hover:bg-purple-50"
                      onClick={() => handleViewStartupCard(request)}
                    >
                      <ExternalLink className="mr-1 h-3 w-3" /> View Startup Card
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-300 hover:bg-green-50"
                    onClick={() => handleAction(request, 'accept')}
                  >
                    <CheckCircle className="mr-1 h-3 w-3" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => handleAction(request, 'reject')}
                  >
                    <XCircle className="mr-1 h-3 w-3" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    onClick={() => handleAction(request, 'negotiate')}
                  >
                    <MessageSquare className="mr-1 h-3 w-3" /> Negotiate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">No pending requests.</p>
          </div>
        )}
      </Card>

      {negotiatingRequests.length > 0 && (
        <Card className="mt-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Negotiating Requests</h3>
          <div className="space-y-4">
            {negotiatingRequests.map((request) => (
              <div key={request.id} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-slate-900">{request.startup_name || 'Unknown Startup'}</h4>
                    <p className="text-xs text-blue-600 mt-1">Awaiting startup response</p>
                  </div>
                </div>

                {request.startup_id && (
                  <div className="mb-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-purple-600 border-purple-300 hover:bg-purple-50"
                      onClick={() => handleViewStartupCard(request)}
                    >
                      <ExternalLink className="mr-1 h-3 w-3" /> View Startup Card
                    </Button>
                  </div>
                )}

                {request.negotiated_fee_amount || request.negotiated_equity_amount || request.negotiated_esop_percentage ? (
                  <div className="p-3 bg-white rounded-md mb-3">
                    <p className="text-xs font-medium text-slate-700 mb-2">Your Counter-Proposal:</p>
                    <div className="space-y-1">
                      {request.negotiated_fee_amount && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <DollarSign className="h-4 w-4" />
                          <span>Fee: {formatCurrency(request.negotiated_fee_amount, request.fee_currency || 'USD')}</span>
                        </div>
                      )}
                      {request.negotiated_equity_amount && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <TrendingUp className="h-4 w-4" />
                          <span>Equity: {formatCurrency(request.negotiated_equity_amount, request.fee_currency || 'USD')}</span>
                        </div>
                      )}
                      {request.negotiated_esop_percentage && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <TrendingUp className="h-4 w-4" />
                          <span>ESOP: {request.negotiated_esop_percentage}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Action Modals */}
      {selectedRequest && actionType === 'accept' && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedRequest(null);
            setActionType(null);
          }}
          title="Accept Request"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to accept the connection request from{' '}
              <strong>{selectedRequest.startup_name || 'this startup'}</strong>?
            </p>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedRequest(null);
                  setActionType(null);
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button onClick={handleAccept} disabled={isProcessing}>
                {isProcessing ? 'Accepting...' : 'Accept Request'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {selectedRequest && actionType === 'reject' && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedRequest(null);
            setActionType(null);
          }}
          title="Reject Request"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to reject the connection request from{' '}
              <strong>{selectedRequest.startup_name || 'this startup'}</strong>?
            </p>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedRequest(null);
                  setActionType(null);
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={handleReject}
                disabled={isProcessing}
              >
                {isProcessing ? 'Rejecting...' : 'Reject Request'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {selectedRequest && actionType === 'negotiate' && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedRequest(null);
            setActionType(null);
          }}
          title="Send Negotiation"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 mb-4">
              Propose your terms for <strong>{selectedRequest.startup_name || 'this startup'}</strong>:
            </p>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Negotiated Fee Amount ({selectedRequest.fee_currency || 'USD'})
              </label>
              <Input
                type="number"
                value={negotiatedFeeAmount || ''}
                onChange={(e) => setNegotiatedFeeAmount(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="Enter fee amount"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Negotiated Equity Amount ({selectedRequest.fee_currency || 'USD'})
              </label>
              <Input
                type="number"
                value={negotiatedEquityAmount || ''}
                onChange={(e) => setNegotiatedEquityAmount(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="Enter equity amount"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Negotiated ESOP Percentage (%)
              </label>
              <Input
                type="number"
                value={negotiatedEsopPercentage || ''}
                onChange={(e) => setNegotiatedEsopPercentage(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="Enter ESOP percentage"
                min="0"
                max="100"
                step="0.01"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedRequest(null);
                  setActionType(null);
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button onClick={handleNegotiate} disabled={isProcessing}>
                {isProcessing ? 'Sending...' : 'Send Negotiation'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default MentorPendingRequestsSection;


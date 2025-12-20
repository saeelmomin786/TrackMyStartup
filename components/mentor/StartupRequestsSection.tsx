import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { MentorRequest } from '../../lib/mentorService';
import { CheckCircle, XCircle, Clock, MessageSquare, DollarSign, TrendingUp } from 'lucide-react';

interface StartupRequestsSectionProps {
  requests: MentorRequest[];
  onRequestAction: () => void;
}

const StartupRequestsSection: React.FC<StartupRequestsSectionProps> = ({
  requests,
  onRequestAction
}) => {
  const [selectedRequest, setSelectedRequest] = useState<MentorRequest | null>(null);
  const [actionType, setActionType] = useState<'accept' | 'reject' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAcceptNegotiation = async () => {
    if (!selectedRequest) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const { mentorService } = await import('../../lib/mentorService');
      // Accepting a negotiation means accepting the request with negotiated terms
      const success = await mentorService.acceptMentorRequest(selectedRequest.id);
      
      if (success) {
        onRequestAction();
        setSelectedRequest(null);
        setActionType(null);
      } else {
        setError('Failed to accept negotiation. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectNegotiation = async () => {
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
        setError('Failed to reject negotiation. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const negotiatingRequests = requests.filter(r => r.status === 'negotiating');
  const acceptedRequests = requests.filter(r => r.status === 'accepted');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  return (
    <div className="space-y-4">
      {pendingRequests.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            Pending Requests
          </h3>
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div key={request.id} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-slate-900">Waiting for mentor response</h4>
                    <p className="text-sm text-slate-600 mt-1">
                      Request sent on {new Date(request.requested_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                    Pending
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {negotiatingRequests.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Negotiating Requests
          </h3>
          <div className="space-y-4">
            {negotiatingRequests.map((request) => (
              <div key={request.id} className="border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-slate-900">Mentor Counter-Proposal</h4>
                    <p className="text-sm text-slate-600 mt-1">
                      Received on {new Date(request.responded_at || request.requested_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {request.negotiated_fee_amount || request.negotiated_equity_amount || request.negotiated_esop_percentage ? (
                  <div className="p-3 bg-blue-50 rounded-md mb-3">
                    <p className="text-xs font-medium text-slate-700 mb-2">Mentor's Proposed Terms:</p>
                    <div className="space-y-1">
                      {request.negotiated_fee_amount && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <DollarSign className="h-4 w-4" />
                          <span>Fee: ${request.negotiated_fee_amount.toLocaleString()}</span>
                        </div>
                      )}
                      {request.negotiated_equity_amount && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <TrendingUp className="h-4 w-4" />
                          <span>Equity: ${request.negotiated_equity_amount.toLocaleString()}</span>
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

                {(request.proposed_fee_amount || request.proposed_equity_amount || request.proposed_esop_percentage) && (
                  <div className="p-3 bg-slate-50 rounded-md mb-3">
                    <p className="text-xs font-medium text-slate-700 mb-2">Your Original Proposal:</p>
                    <div className="space-y-1">
                      {request.proposed_fee_amount && (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <DollarSign className="h-4 w-4" />
                          <span>Fee: ${request.proposed_fee_amount.toLocaleString()}</span>
                        </div>
                      )}
                      {request.proposed_equity_amount && (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <TrendingUp className="h-4 w-4" />
                          <span>Equity: ${request.proposed_equity_amount.toLocaleString()}</span>
                        </div>
                      )}
                      {request.proposed_esop_percentage && (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <TrendingUp className="h-4 w-4" />
                          <span>ESOP: {request.proposed_esop_percentage}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setSelectedRequest(request);
                      setActionType('accept');
                    }}
                  >
                    <CheckCircle className="mr-1 h-3 w-3" /> Accept Negotiation
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => {
                      setSelectedRequest(request);
                      setActionType('reject');
                    }}
                  >
                    <XCircle className="mr-1 h-3 w-3" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {acceptedRequests.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Accepted Requests
          </h3>
          <div className="space-y-4">
            {acceptedRequests.map((request) => (
              <div key={request.id} className="border border-green-200 rounded-lg p-4 bg-green-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-slate-900">Connection Accepted</h4>
                    <p className="text-sm text-slate-600 mt-1">
                      Accepted on {new Date(request.responded_at || request.requested_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {rejectedRequests.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            Rejected Requests
          </h3>
          <div className="space-y-4">
            {rejectedRequests.map((request) => (
              <div key={request.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-slate-900">Request Rejected</h4>
                    <p className="text-sm text-slate-600 mt-1">
                      Rejected on {new Date(request.responded_at || request.requested_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                    Rejected
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {pendingRequests.length === 0 && negotiatingRequests.length === 0 && acceptedRequests.length === 0 && rejectedRequests.length === 0 && (
        <Card>
          <div className="text-center py-8 text-slate-600">
            <p className="text-sm">No requests found.</p>
          </div>
        </Card>
      )}

      {/* Accept Negotiation Modal */}
      {selectedRequest && actionType === 'accept' && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedRequest(null);
            setActionType(null);
          }}
          title="Accept Negotiation"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to accept the mentor's counter-proposal?
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
              <Button onClick={handleAcceptNegotiation} disabled={isProcessing}>
                {isProcessing ? 'Accepting...' : 'Accept Negotiation'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Negotiation Modal */}
      {selectedRequest && actionType === 'reject' && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedRequest(null);
            setActionType(null);
          }}
          title="Reject Negotiation"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to reject the mentor's counter-proposal? This will close the request.
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
                onClick={handleRejectNegotiation}
                disabled={isProcessing}
              >
                {isProcessing ? 'Rejecting...' : 'Reject Negotiation'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StartupRequestsSection;


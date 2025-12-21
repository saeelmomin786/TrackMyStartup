import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { MentorRequest } from '../../lib/mentorService';
import { CheckCircle, XCircle, Clock, MessageSquare, DollarSign, TrendingUp, Eye, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import MentorCard from './MentorCard';
import { formatDateDDMMYYYY, formatTimeAMPM } from '../../lib/dateTimeUtils';

interface StartupRequestsSectionProps {
  requests: MentorRequest[];
  onRequestAction: () => void;
  onRequestAccepted?: () => void; // Callback when request is accepted
}

interface MentorProfile {
  mentor_name?: string;
  location?: string;
  mentor_type?: string;
  expertise_areas?: string[];
  sectors?: string[];
  fee_type?: string;
  fee_amount_min?: number;
  fee_amount_max?: number;
  fee_currency?: string;
  logo_url?: string;
  video_url?: string;
  user?: {
    name?: string;
    email?: string;
  };
}

const StartupRequestsSection: React.FC<StartupRequestsSectionProps> = ({
  requests,
  onRequestAction,
  onRequestAccepted
}) => {
  const [selectedRequest, setSelectedRequest] = useState<MentorRequest | null>(null);
  const [viewType, setViewType] = useState<'mentor' | 'offer' | null>(null);
  const [mentorProfiles, setMentorProfiles] = useState<Map<string, MentorProfile>>(new Map());
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [actionType, setActionType] = useState<'accept' | 'reject' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load mentor profiles for all requests
  useEffect(() => {
    const loadMentorProfiles = async () => {
      if (requests.length === 0) return;

      setLoadingProfiles(true);
      const profilesMap = new Map<string, MentorProfile>();

      try {
        const mentorIds = [...new Set(requests.map(r => r.mentor_id).filter(Boolean))];
        
        for (const mentorId of mentorIds) {
          try {
            // Get mentor profile
            const { data: mentorProfile, error: profileError } = await supabase
              .from('mentor_profiles')
              .select('*')
              .eq('user_id', mentorId)
              .maybeSingle();

            if (!profileError && mentorProfile) {
              // Get user data
              const { data: userData } = await supabase
                .from('user_profiles')
                .select('name, email')
                .eq('auth_user_id', mentorId)
                .maybeSingle();

              profilesMap.set(mentorId, {
                ...mentorProfile,
                user: userData ? { name: userData.name, email: userData.email } : undefined
              });
            }
          } catch (err) {
            console.warn(`Error loading mentor profile for ${mentorId}:`, err);
          }
        }
      } catch (err) {
        console.error('Error loading mentor profiles:', err);
      } finally {
        setMentorProfiles(profilesMap);
        setLoadingProfiles(false);
      }
    };

    loadMentorProfiles();
  }, [requests]);

  const handleAcceptNegotiation = async () => {
    if (!selectedRequest) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const { mentorService } = await import('../../lib/mentorService');
      const success = await mentorService.acceptMentorRequest(selectedRequest.id);
      
      if (success) {
        onRequestAction();
        if (onRequestAccepted) {
          onRequestAccepted(); // Switch to My Services tab
        }
        setSelectedRequest(null);
        setActionType(null);
        setViewType(null);
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
        setViewType(null);
      } else {
        setError('Failed to reject negotiation. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    const symbols: { [key: string]: string } = { 'USD': '$', 'INR': '₹', 'EUR': '€', 'GBP': '£', 'SGD': 'S$', 'AED': 'AED ' };
    return `${symbols[currency] || currency} ${amount.toLocaleString()}`;
  };

  const formatOffer = (request: MentorRequest) => {
    const parts: string[] = [];
    const currency = request.fee_currency || 'USD';
    
    if (request.proposed_fee_amount) {
      parts.push(`Fee: ${formatCurrency(request.proposed_fee_amount, currency)}`);
    }
    if (request.proposed_equity_amount) {
      parts.push(`Equity: ${formatCurrency(request.proposed_equity_amount, currency)}`);
    }
    if (request.proposed_esop_percentage) {
      parts.push(`ESOP: ${request.proposed_esop_percentage}%`);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'No terms specified';
  };

  const formatNegotiatedOffer = (request: MentorRequest) => {
    const parts: string[] = [];
    const currency = request.fee_currency || 'USD';
    
    if (request.negotiated_fee_amount) {
      parts.push(`Fee: ${formatCurrency(request.negotiated_fee_amount, currency)}`);
    }
    if (request.negotiated_equity_amount) {
      parts.push(`Equity: ${formatCurrency(request.negotiated_equity_amount, currency)}`);
    }
    if (request.negotiated_esop_percentage) {
      parts.push(`ESOP: ${request.negotiated_esop_percentage}%`);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'No terms specified';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Pending</span>;
      case 'negotiating':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Offer Received</span>;
      case 'accepted':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Accepted</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Rejected</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-800 rounded-full">{status}</span>;
    }
  };

  if (requests.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 text-slate-600">
          <p className="text-sm">No requests found.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Offer</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const mentorProfile = mentorProfiles.get(request.mentor_id);
                const mentorName = mentorProfile?.mentor_name || mentorProfile?.user?.name || 'Unknown Mentor';
                const requestDate = formatDateDDMMYYYY(request.requested_at);
                // Show original offer, not negotiated offer in the table
                const offerText = formatOffer(request);

                return (
                  <tr key={request.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{mentorName}</div>
                      {loadingProfiles && !mentorProfile && (
                        <div className="text-xs text-slate-400">Loading...</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{requestDate}</td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-slate-700 max-w-xs truncate" title={offerText}>
                        {offerText}
                      </div>
                      {request.status === 'negotiating' && (
                        <div className="text-xs text-blue-600 mt-1 font-medium">
                          New offer received - Click "View Offer" to see details
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        {/* View Profile Button - Always available */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRequest(request);
                            setViewType('mentor');
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Profile
                        </Button>
                        
                        {/* View Offer Button - Available for negotiating status */}
                        {request.status === 'negotiating' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(request);
                              setViewType('offer');
                            }}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            View Offer
                          </Button>
                        )}
                        
                        {/* Accept/Reject buttons - Only for negotiating status */}
                        {request.status === 'negotiating' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setSelectedRequest(request);
                                setActionType('accept');
                              }}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Accept
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
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        
                        {/* Accepted status - No actions */}
                        {request.status === 'accepted' && (
                          <span className="text-xs text-green-600 font-medium">Moved to My Services</span>
                        )}
                        
                        {/* Rejected status - No actions */}
                        {request.status === 'rejected' && (
                          <span className="text-xs text-red-600 font-medium">Rejected</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* View Mentor Modal */}
      {selectedRequest && viewType === 'mentor' && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedRequest(null);
            setViewType(null);
          }}
          title="Mentor Profile"
          size="large"
        >
          <div className="space-y-4">
            {mentorProfiles.get(selectedRequest.mentor_id) ? (
              <MentorCard
                mentor={mentorProfiles.get(selectedRequest.mentor_id)!}
                onView={undefined}
              />
            ) : (
              <div className="text-center py-8 text-slate-600">
                <p>Loading mentor profile...</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* View Offer Modal */}
      {selectedRequest && viewType === 'offer' && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedRequest(null);
            setViewType(null);
          }}
          title="Offer Details"
        >
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Your Original Proposal</h3>
              <div className="p-3 bg-slate-50 rounded-md">
                <div className="space-y-2 text-sm">
                  {selectedRequest.proposed_fee_amount && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-slate-500" />
                      <span>Fee: {formatCurrency(selectedRequest.proposed_fee_amount, selectedRequest.fee_currency || 'USD')}</span>
                    </div>
                  )}
                  {selectedRequest.proposed_equity_amount && (
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-slate-500" />
                      <span>Equity: {formatCurrency(selectedRequest.proposed_equity_amount, selectedRequest.fee_currency || 'USD')}</span>
                    </div>
                  )}
                  {selectedRequest.proposed_esop_percentage && (
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-slate-500" />
                      <span>ESOP: {selectedRequest.proposed_esop_percentage}%</span>
                    </div>
                  )}
                  {!selectedRequest.proposed_fee_amount && !selectedRequest.proposed_equity_amount && !selectedRequest.proposed_esop_percentage && (
                    <span className="text-slate-500">No terms specified</span>
                  )}
                </div>
              </div>
            </div>

            {selectedRequest.status === 'negotiating' && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Mentor's Counter-Proposal</h3>
                <div className="p-3 bg-blue-50 rounded-md">
                  <div className="space-y-2 text-sm">
                    {selectedRequest.negotiated_fee_amount && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-blue-600" />
                        <span>Fee: {formatCurrency(selectedRequest.negotiated_fee_amount, selectedRequest.fee_currency || 'USD')}</span>
                      </div>
                    )}
                    {selectedRequest.negotiated_equity_amount && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <span>Equity: {formatCurrency(selectedRequest.negotiated_equity_amount, selectedRequest.fee_currency || 'USD')}</span>
                      </div>
                    )}
                    {selectedRequest.negotiated_esop_percentage && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <span>ESOP: {selectedRequest.negotiated_esop_percentage}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {selectedRequest.message && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Your Message</h3>
                <div className="p-3 bg-slate-50 rounded-md">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedRequest.message}</p>
                </div>
              </div>
            )}

            <div className="text-xs text-slate-500">
              Request sent on {formatDateDDMMYYYY(selectedRequest.requested_at)}
              {selectedRequest.responded_at && (
                <> • Responded on {formatDateDDMMYYYY(selectedRequest.responded_at)}</>
              )}
            </div>
          </div>
        </Modal>
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
              Are you sure you want to accept the mentor's counter-proposal? This will move the connection to "My Services".
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

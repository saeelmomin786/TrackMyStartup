import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { MentorRequest, mentorService } from '../../lib/mentorService';
import { CheckCircle, XCircle, Clock, MessageSquare, DollarSign, TrendingUp, Eye, FileText, CreditCard, Upload, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import MentorCard from './MentorCard';
import AgreementUploadModal from './AgreementUploadModal';
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
  const [assignments, setAssignments] = useState<Map<number, any>>(new Map());
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [agreementModalOpen, setAgreementModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);

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

  // Load assignments for accepted requests
  useEffect(() => {
    const loadAssignments = async () => {
      const acceptedRequests = requests.filter(r => r.status === 'accepted' && r.startup_id);
      if (acceptedRequests.length === 0) return;

      setLoadingAssignments(true);
      const assignmentsMap = new Map<number, any>();

      try {
        for (const request of acceptedRequests) {
          const { data: assignment, error } = await supabase
            .from('mentor_startup_assignments')
            .select('*')
            .eq('mentor_id', request.mentor_id)
            .eq('startup_id', request.startup_id)
            .maybeSingle();

          if (!error && assignment) {
            assignmentsMap.set(request.id, assignment);
          }
        }
      } catch (err) {
        console.error('Error loading assignments:', err);
      } finally {
        setAssignments(assignmentsMap);
        setLoadingAssignments(false);
      }
    };

    loadAssignments();
  }, [requests]);

  const handleAcceptRequest = async () => {
    if (!selectedRequest) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const { mentorService } = await import('../../lib/mentorService');
      const success = await mentorService.acceptMentorRequest(selectedRequest.id);
      
      if (success) {
        // Show success message
        alert('✅ Request accepted successfully! The startup will be notified and can proceed with payment/agreement as needed.');
        onRequestAction();
        if (onRequestAccepted) {
          onRequestAccepted(); // Switch to My Services tab
        }
        setSelectedRequest(null);
        setActionType(null);
        setViewType(null);
      } else {
        setError('Failed to accept request. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectRequest = async () => {
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
        setError('Failed to reject request. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelRequest = async (request: MentorRequest) => {
    if (!confirm('Are you sure you want to cancel this request? This action cannot be undone.')) {
      return;
    }

    console.log('🔄 handleCancelRequest called for request:', request.id, request.status);
    setIsProcessing(true);
    setError(null);

    try {
      const { mentorService } = await import('../../lib/mentorService');
      console.log('📞 Calling cancelMentorRequest with ID:', request.id);
      const result = await mentorService.cancelMentorRequest(request.id);
      
      console.log('📥 cancelMentorRequest result:', result);
      
      if (result.success) {
        console.log('✅ Cancellation successful, refreshing requests...');
        alert('✅ Request cancelled successfully.');
        // Force refresh by calling onRequestAction
        onRequestAction();
        // Also wait a bit and refresh again to ensure UI updates
        setTimeout(() => {
          onRequestAction();
        }, 500);
      } else {
        const errorMsg = result.error || 'Failed to cancel request. Please try again.';
        console.error('❌ Cancellation failed:', errorMsg);
        setError(errorMsg);
        alert(errorMsg);
      }
    } catch (err: any) {
      console.error('❌ Exception in handleCancelRequest:', err);
      const errorMsg = err.message || 'An error occurred.';
      setError(errorMsg);
      alert(errorMsg);
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


  const getStatusBadge = (status: string, assignment?: any) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Pending</span>;
      case 'accepted':
        // Show different badge based on assignment status
        if (assignment) {
          if (assignment.status === 'pending_payment') {
            return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Accepted - Fees in process</span>;
          } else if (assignment.status === 'pending_agreement') {
            return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Accepted - Agreement in process</span>;
          } else if (assignment.status === 'pending_payment_and_agreement') {
            return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Accepted - Fees & Agreement in process</span>;
          } else if (assignment.status === 'active') {
            return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>;
          }
        }
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Accepted</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Rejected</span>;
      case 'cancelled':
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Cancelled</span>;
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
                      {getStatusBadge(request.status, assignments.get(request.id))}
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
                        
                        {/* Cancel Button - Only for pending or negotiating requests (before mentor accepts) */}
                        {/* Don't show cancel button for cancelled, rejected, or accepted requests */}
                        {(request.status === 'pending' || request.status === 'negotiating') && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => handleCancelRequest(request)}
                            disabled={isProcessing}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel Request
                          </Button>
                        )}
                        
                        {/* Cancelled status - Show message only */}
                        {request.status === 'cancelled' && (
                          <span className="text-xs text-gray-600 font-medium">Request Cancelled</span>
                        )}
                        
                        {/* Accepted status - Show payment/agreement actions */}
                        {request.status === 'accepted' && (() => {
                          const assignment = assignments.get(request.id);
                          if (!assignment) {
                            return <span className="text-xs text-slate-500">Loading...</span>;
                          }

                          const needsPayment = assignment.status === 'pending_payment' || assignment.status === 'pending_payment_and_agreement';
                          const needsAgreement = assignment.status === 'pending_agreement' || assignment.status === 'pending_payment_and_agreement';
                          const isActive = assignment.status === 'active';

                          return (
                            <div className="flex flex-col gap-2">
                              {/* Status message */}
                              {needsPayment && !needsAgreement && (
                                <span className="text-xs text-orange-600 font-medium">Fees in process</span>
                              )}
                              {needsAgreement && !needsPayment && (
                                <span className="text-xs text-orange-600 font-medium">Agreement in process</span>
                              )}
                              {needsPayment && needsAgreement && (
                                <span className="text-xs text-orange-600 font-medium">Fees & Agreement in process</span>
                              )}
                              {isActive && (
                                <span className="text-xs text-green-600 font-medium">Active</span>
                              )}
                              
                              {/* Action buttons */}
                              <div className="flex gap-2">
                                {needsPayment && (
                                  <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700"
                                    onClick={() => window.location.href = `/mentor-payment?assignmentId=${assignment.id}`}
                                  >
                                    <CreditCard className="h-3 w-3 mr-1" />
                                    Pay Now
                                  </Button>
                                )}
                                {needsAgreement && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedAssignment(assignment);
                                      setAgreementModalOpen(true);
                                    }}
                                  >
                                    <Upload className="h-3 w-3 mr-1" />
                                    Upload Agreement
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                        
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

      {/* Reject Request Modal */}
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
              Are you sure you want to reject this request? This will close the request.
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
                onClick={handleRejectRequest}
                disabled={isProcessing}
              >
                {isProcessing ? 'Rejecting...' : 'Reject Request'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Agreement Upload Modal */}
      {selectedAssignment && (
        <AgreementUploadModal
          isOpen={agreementModalOpen}
          onClose={() => {
            setAgreementModalOpen(false);
            setSelectedAssignment(null);
          }}
          assignmentId={selectedAssignment.id}
          assignment={selectedAssignment}
          mentorName={mentorProfiles.get(selectedAssignment.mentor_id)?.mentor_name}
          startupName={requests.find(r => r.startup_id === selectedAssignment.startup_id)?.startup_name}
          onUploadSuccess={() => {
            onRequestAction();
            setAgreementModalOpen(false);
            setSelectedAssignment(null);
          }}
        />
      )}
    </div>
  );
};

export default StartupRequestsSection;

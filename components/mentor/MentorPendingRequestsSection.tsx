import React, { useState, useEffect, useRef } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import { MentorRequest } from '../../lib/mentorService';
import { CheckCircle, XCircle, DollarSign, TrendingUp, ExternalLink, Trash2, Upload, Loader, Download } from 'lucide-react';
import { formatDateDDMMYYYY } from '../../lib/dateTimeUtils';
import { supabase } from '../../lib/supabase';

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
  const [actionType, setActionType] = useState<'accept' | 'reject' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Map<number, any>>(new Map());
  const [uploadingSignedAgreement, setUploadingSignedAgreement] = useState<Map<number, boolean>>(new Map());
  const [signedFiles, setSignedFiles] = useState<Map<number, File | null>>(new Map());
  const fileInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  // Fetch assignments for accepted requests
  useEffect(() => {
    const fetchAssignments = async () => {
      const acceptedRequests = requests.filter(r => r.status === 'accepted' && r.startup_id);
      if (acceptedRequests.length === 0) return;

      try {
        // Get mentor_id from first request
        const mentorId = requests[0]?.mentor_id;
        if (!mentorId) return;

        const startupIds = acceptedRequests.map(r => r.startup_id!);
        const { data, error } = await supabase
          .from('mentor_startup_assignments')
          .select('*')
          .eq('mentor_id', mentorId)
          .in('startup_id', startupIds);

        if (error) {
          console.error('Error fetching assignments:', error);
          return;
        }

        // Map assignments by request.id (using startup_id match)
        const assignmentMap = new Map();
        if (data) {
          requests.forEach(request => {
            if (request.startup_id) {
              const assignment = data.find(a => a.startup_id === request.startup_id);
              if (assignment) {
                assignmentMap.set(request.id, assignment);
              }
            }
          });
        }
        setAssignments(assignmentMap);
      } catch (err) {
        console.error('Error fetching assignments:', err);
      }
    };

    fetchAssignments();
  }, [requests]);

  const handleAction = async (request: MentorRequest, action: 'accept' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setError(null);
  };

  const handleAccept = async () => {
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
        setSelectedRequest(null);
        setActionType(null);
      } else {
        setError('Failed to accept request. Please try again.');
      }
    } catch (err: any) {
      console.error('Error accepting request:', err);
      setError(err.message || 'An error occurred while accepting the request.');
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

  const handleDeleteRequest = async (request: MentorRequest) => {
    if (!confirm(`Are you sure you want to delete this cancelled request from ${request.startup_name || 'this startup'}? This action cannot be undone.`)) {
      return;
    }

    console.log('🔄 handleDeleteRequest called for request:', request.id, request.status);
    setIsProcessing(true);
    setError(null);

    try {
      const { mentorService } = await import('../../lib/mentorService');
      console.log('📞 Calling deleteMentorRequest with ID:', request.id);
      const result = await mentorService.deleteMentorRequest(request.id);
      
      console.log('📥 deleteMentorRequest result:', result);
      
      if (result.success) {
        console.log('✅ Deletion successful, refreshing requests...');
        alert('✅ Request deleted successfully.');
        // Force refresh by calling onRequestAction
        onRequestAction();
        // Also wait a bit and refresh again to ensure UI updates
        setTimeout(() => {
          onRequestAction();
        }, 500);
      } else {
        const errorMsg = result.error || 'Failed to delete request. Please try again.';
        console.error('❌ Deletion failed:', errorMsg);
        setError(errorMsg);
        alert(errorMsg);
      }
    } catch (err: any) {
      console.error('❌ Exception in handleDeleteRequest:', err);
      const errorMsg = err.message || 'An error occurred.';
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Show pending, accepted, and cancelled requests
  // Exclude requests that have active assignments (final accepted)
  const visibleRequests = requests.filter(r => {
    // Always show pending requests
    if (r.status === 'pending') return true;
    
    // Show cancelled requests (mentor can delete them)
    if (r.status === 'cancelled') return true;
    
    // For accepted requests, check if assignment is active
    if (r.status === 'accepted') {
      const assignment = assignments.get(r.id);
      // If assignment exists and is active, don't show in pending requests
      if (assignment && assignment.status === 'active') {
        return false;
      }
      // Show if assignment doesn't exist yet or is not active
      return true;
    }
    
    return false;
  });

  const getStatusBadge = (request: MentorRequest) => {
    if (request.status === 'pending') {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Pending</span>;
    }
    
    if (request.status === 'cancelled') {
      return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Cancelled by Startup</span>;
    }
    
    if (request.status === 'accepted') {
      const assignment = assignments.get(request.id);
      if (assignment) {
        // Check agreement_status first to show if agreement is pending approval or signature
        if (assignment.agreement_status === 'pending_mentor_approval' || assignment.agreement_status === 'pending_mentor_signature') {
          return <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">Agreement Pending Approval</span>;
        }
        
        if (assignment.status === 'pending_payment') {
          return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Fees in process</span>;
        } else if (assignment.status === 'pending_agreement') {
          return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Agreement in process</span>;
        } else if (assignment.status === 'pending_payment_and_agreement') {
          // Check if agreement is uploaded but payment is pending
          if (assignment.agreement_status === 'pending_mentor_approval' || assignment.agreement_status === 'pending_mentor_signature') {
            return <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">Agreement Pending Approval</span>;
          }
          return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Fees & Agreement in process</span>;
        } else if (assignment.status === 'ready_for_activation') {
          return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Ready for Final Acceptance</span>;
        } else if (assignment.status === 'active') {
          return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>;
        }
      }
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Accepted</span>;
    }
    
    return null;
  };

  const handleFinalAccept = async (request: MentorRequest) => {
    const assignment = assignments.get(request.id);
    if (!assignment) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const { mentorService } = await import('../../lib/mentorService');
      const success = await mentorService.finalAcceptAssignment(assignment.id);
      
      if (success) {
        alert('✅ Startup added to mentoring successfully!');
        onRequestAction();
      } else {
        setError('Failed to activate assignment. Please try again.');
      }
    } catch (err: any) {
      console.error('Error in final acceptance:', err);
      setError(err.message || 'An error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, assignmentId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'].includes(fileExt || '')) {
      setError('Please upload a PDF, DOC, DOCX, or image file');
      return;
    }

    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }

    setSignedFiles(prev => new Map(prev).set(assignmentId, file));
    setError(null);
  };

  const handleUploadSignedAgreement = async (assignmentId: number, agreementUrl: string) => {
    const file = signedFiles.get(assignmentId);
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploadingSignedAgreement(prev => new Map(prev).set(assignmentId, true));
      setError(null);

      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const fileName = `mentor-signed-${assignmentId}-${Date.now()}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('mentor-agreements')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('mentor-agreements')
        .getPublicUrl(fileName);

      // Update assignment with signed agreement URL and auto-approve
      const { mentorService } = await import('../../lib/mentorService');
      const uploadSuccess = await mentorService.uploadSignedAgreement(assignmentId, publicUrl);

      if (uploadSuccess) {
        // Automatically approve the agreement after upload
        const approveSuccess = await mentorService.approveAgreement(assignmentId);
        
        if (approveSuccess) {
          setSignedFiles(prev => {
            const newMap = new Map(prev);
            newMap.delete(assignmentId);
            return newMap;
          });
          const input = fileInputRefs.current.get(assignmentId);
          if (input) {
            input.value = '';
          }
          // Refresh assignments
          onRequestAction();
        } else {
          throw new Error('Failed to approve agreement after upload');
        }
      } else {
        throw new Error('Failed to save signed agreement');
      }
    } catch (err: any) {
      console.error('Error uploading signed agreement:', err);
      setError(err.message || 'Failed to upload signed agreement');
    } finally {
      setUploadingSignedAgreement(prev => {
        const newMap = new Map(prev);
        newMap.delete(assignmentId);
        return newMap;
      });
    }
  };

  return (
    <>
      <Card>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Pending Requests</h3>
        {visibleRequests.length > 0 ? (
          <div className="space-y-4">
            {visibleRequests.map((request) => (
              <div key={request.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-slate-900">{request.startup_name || 'Unknown Startup'}</h4>
                      {getStatusBadge(request)}
                    </div>
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
                          <span>Fee: {formatCurrency(request.proposed_fee_amount, request.fee_currency || 'USD')} ({request.fee_currency || 'USD'})</span>
                          <span className="text-xs text-slate-500">- Proposed by startup</span>
                        </div>
                      )}
                      {request.proposed_equity_amount && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <TrendingUp className="h-4 w-4" />
                          <span>Equity: {formatCurrency(request.proposed_equity_amount, request.fee_currency || 'USD')} ({request.fee_currency || 'USD'})</span>
                          <span className="text-xs text-slate-500">- Proposed by startup</span>
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
                  {request.status === 'pending' && (
                    <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-300 hover:bg-green-50"
                    onClick={() => handleAction(request, 'accept')}
                  >
                        <CheckCircle className="mr-1 h-3 w-3" /> Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => handleAction(request, 'reject')}
                  >
                    <XCircle className="mr-1 h-3 w-3" /> Reject
                  </Button>
                    </>
                  )}
                  {request.status === 'accepted' && (() => {
                    const assignment = assignments.get(request.id);
                    if (!assignment) return null;
                    
                    // For hybrid: Show both payment status and agreement section
                    const isHybrid = assignment.status === 'pending_payment_and_agreement';
                    const paymentCompleted = assignment.payment_status === 'completed';
                    const agreementPending = (assignment.agreement_status === 'pending_mentor_approval' || assignment.agreement_status === 'pending_mentor_signature') && assignment.agreement_url;
                    const agreementUploaded = assignment.agreement_url && (assignment.agreement_status === 'pending_mentor_approval' || assignment.agreement_status === 'pending_mentor_signature' || assignment.agreement_status === 'approved');
                    
                    // Show payment received message for hybrid when payment is completed but agreement not uploaded yet
                    if (isHybrid && paymentCompleted && !agreementUploaded) {
                      return (
                        <div className="w-full space-y-3">
                          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-sm text-green-800 font-medium mb-1">
                              💰 Payment Received
                            </p>
                            <p className="text-xs text-green-700">
                              We have received payment from the startup. Please wait for the agreement to be uploaded by the startup.
                            </p>
                          </div>
                        </div>
                      );
                    }
                    
                    // Show agreement approval section if agreement is pending approval or signature
                    if (agreementPending) {
                      const hasSignedAgreement = assignment.mentor_signed_agreement_url;
                      const isUploading = uploadingSignedAgreement.get(assignment.id) || false;
                      const selectedFile = signedFiles.get(assignment.id);
                      
                      return (
                        <div className="w-full space-y-3">
                          {/* Show payment received message for hybrid when payment is completed */}
                          {isHybrid && paymentCompleted && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                              <p className="text-sm text-green-800 font-medium mb-1">
                                💰 Payment Received
                              </p>
                              <p className="text-xs text-green-700">
                                We have received payment from the startup. Please review and sign the agreement below. After signing, you can final accept.
                              </p>
                            </div>
                          )}
                          
                          <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                            <p className="text-sm text-purple-800 font-medium mb-2">
                              📄 Agreement Uploaded - Please Review & Sign
                            </p>
                            
                            {/* Download and View buttons */}
                            <div className="flex gap-2 mb-3">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-purple-600 border-purple-300 hover:bg-purple-50"
                                onClick={() => window.open(assignment.agreement_url, '_blank')}
                              >
                                <ExternalLink className="mr-1 h-3 w-3" /> View Agreement
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-purple-600 border-purple-300 hover:bg-purple-50"
                                onClick={() => {
                                  // Create a download link
                                  const link = document.createElement('a');
                                  link.href = assignment.agreement_url;
                                  link.download = `agreement-${request.startup_name || 'startup'}.pdf`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                              >
                                <Download className="mr-1 h-3 w-3" /> Download
                              </Button>
                            </div>

                            {/* Upload signed agreement section */}
                            {!hasSignedAgreement ? (
                              <div className="space-y-2">
                                <p className="text-xs text-purple-700 mb-2">
                                  Please download the agreement, sign it, and upload the signed version below.
                                </p>
                                <div className="flex gap-2 items-center">
                                  <input
                                    ref={(el) => {
                                      if (el) fileInputRefs.current.set(assignment.id, el);
                                    }}
                                    type="file"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    onChange={(e) => handleFileSelect(e, assignment.id)}
                                    className="hidden"
                                    id={`signed-agreement-${assignment.id}`}
                                  />
                                  <label
                                    htmlFor={`signed-agreement-${assignment.id}`}
                                    className="cursor-pointer"
                                  >
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      type="button"
                                      className="text-purple-600 border-purple-300 hover:bg-purple-50"
                                      onClick={() => document.getElementById(`signed-agreement-${assignment.id}`)?.click()}
                                    >
                                      <Upload className="h-3 w-3 mr-1" />
                                      {selectedFile ? selectedFile.name : 'Select Signed File'}
                                    </Button>
                                  </label>
                                  {selectedFile && (
                                    <Button
                                      size="sm"
                                      className="bg-purple-600 hover:bg-purple-700"
                                      onClick={() => handleUploadSignedAgreement(assignment.id, assignment.agreement_url)}
                                      disabled={isUploading}
                                    >
                                      {isUploading ? (
                                        <>
                                          <Loader className="h-3 w-3 mr-1 animate-spin" />
                                          Uploading...
                                        </>
                                      ) : (
                                        <>
                                          <Upload className="h-3 w-3 mr-1" />
                                          Upload
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="p-2 bg-green-50 border border-green-200 rounded-md">
                                <p className="text-xs text-green-800 font-medium mb-1">
                                  ✅ Signed Agreement Uploaded
                                </p>
                                <p className="text-xs text-green-700 mb-2">
                                  Uploaded on: {assignment.mentor_signed_agreement_uploaded_at ? formatDateDDMMYYYY(assignment.mentor_signed_agreement_uploaded_at) : 'N/A'}
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-300 hover:bg-green-50"
                                  onClick={() => window.open(assignment.mentor_signed_agreement_url, '_blank')}
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" /> View Signed Agreement
                                </Button>
                              </div>
                            )}

                            {/* Show error if any */}
                            {error && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs">
                                {error}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    
                    // For hybrid: Show payment status if payment completed but agreement not uploaded yet
                    if (isHybrid && paymentCompleted && !agreementUploaded) {
                      return (
                        <div className="w-full space-y-3">
                          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-sm text-green-800 font-medium mb-1">
                              💰 Payment Received
                            </p>
                            <p className="text-xs text-green-700">
                              We have received payment from the startup. Please wait for the agreement to be uploaded by the startup.
                            </p>
                          </div>
                        </div>
                      );
                    }
                    
                    // Show final accept button if ready for activation (after both payment and agreement are completed)
                    if (assignment.status === 'ready_for_activation') {
                      // Check if payment was required (payment_status exists and is completed)
                      // This means the fee_type was 'Fees' or 'Hybrid'
                      const hasFeePayment = assignment.payment_status !== null && assignment.payment_status !== undefined;
                      const isHybridFlow = assignment.status === 'ready_for_activation' && hasFeePayment && assignment.agreement_status === 'approved';
                      
                      return (
                        <div className="w-full space-y-3">
                          {hasFeePayment && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                              <p className="text-sm text-green-800 font-medium mb-1">
                                💰 Payment Received
                              </p>
                              <p className="text-xs text-green-700">
                                {isHybridFlow 
                                  ? 'Payment and agreement are both completed. You can accept now. Very soon our team will contact you and we will transfer the amount to your account. Please make sure your account is linked.'
                                  : 'We have received payment from the startup. You can accept now. Very soon our team will contact you and we will transfer the amount to your account. Please make sure your account is linked.'
                                }
                              </p>
                            </div>
                          )}
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleFinalAccept(request)}
                            disabled={isProcessing}
                          >
                            <CheckCircle className="mr-1 h-3 w-3" /> 
                            {isProcessing ? 'Activating...' : 'Final Accept'}
                          </Button>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  {request.status === 'cancelled' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => handleDeleteRequest(request)}
                      disabled={isProcessing}
                    >
                      <Trash2 className="mr-1 h-3 w-3" /> 
                      Delete
                    </Button>
                  )}
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

      {/* Action Modals */}
      {selectedRequest && actionType === 'accept' && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedRequest(null);
            setActionType(null);
          }}
          title="Confirm Request"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Confirm the connection request from{' '}
              <strong>{selectedRequest.startup_name || 'this startup'}</strong>?
            </p>
            
            {/* Show proposed terms with currency */}
            {(selectedRequest.proposed_fee_amount || selectedRequest.proposed_equity_amount || selectedRequest.proposed_esop_percentage) && (
              <div className="p-3 bg-slate-50 rounded-md">
                <p className="text-xs font-medium text-slate-700 mb-2">Proposed Terms:</p>
                <div className="space-y-1">
                  {selectedRequest.proposed_fee_amount && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <DollarSign className="h-4 w-4" />
                      <span>Fee: {formatCurrency(selectedRequest.proposed_fee_amount, selectedRequest.fee_currency || 'USD')} ({selectedRequest.fee_currency || 'USD'})</span>
                      <span className="text-xs text-slate-500">- Startup's currency</span>
                    </div>
                  )}
                  {selectedRequest.proposed_equity_amount && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <TrendingUp className="h-4 w-4" />
                      <span>Equity: {formatCurrency(selectedRequest.proposed_equity_amount, selectedRequest.fee_currency || 'USD')} ({selectedRequest.fee_currency || 'USD'})</span>
                      <span className="text-xs text-slate-500">- Startup's currency</span>
                    </div>
                  )}
                  {selectedRequest.proposed_esop_percentage && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <TrendingUp className="h-4 w-4" />
                      <span>ESOP: {selectedRequest.proposed_esop_percentage}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}
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
                {isProcessing ? 'Confirming...' : 'Confirm Request'}
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

    </>
  );
};

export default MentorPendingRequestsSection;


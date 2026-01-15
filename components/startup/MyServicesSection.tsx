import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { CheckCircle, Clock, CreditCard, FileText, Eye, Send, Loader, Download } from 'lucide-react';
import AgreementUploadModal from '../mentor/AgreementUploadModal';
import { mentorService } from '../../lib/mentorService';
import { supabase } from '../../lib/supabase';

interface MyServicesSectionProps {
  assignments: any[];
  onRefresh: () => void;
  onViewSchedule?: (assignment: any) => void;
  startupName?: string;
}

const MyServicesSection: React.FC<MyServicesSectionProps> = ({ assignments, onRefresh, onViewSchedule, startupName }) => {
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const formatCurrency = (amount: number, currency: string): string => {
    const currencySymbols: { [key: string]: string } = {
      'USD': '$',
      'INR': '₹',
      'EUR': '€',
      'GBP': '£',
      'SGD': 'S$',
      'AED': 'AED '
    };
    const symbol = currencySymbols[currency] || currency || '$';
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (assignment: any) => {
    if (assignment.status === 'active') {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
          Active
        </span>
      );
    } else if (assignment.status === 'ready_for_activation') {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
          Ready for Activation
        </span>
      );
    } else if (assignment.status === 'pending_payment' || assignment.status === 'pending_agreement' || assignment.status === 'pending_payment_and_agreement') {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
          Reviewing
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
          {assignment.status}
        </span>
      );
    }
  };

  const handlePayment = (assignment: any) => {
    // Redirect to payment page
    window.location.href = `/mentor-payment?assignmentId=${assignment.assignment_id}`;
  };

  const handleAgreement = (assignment: any) => {
    setSelectedAssignment(assignment);
    setShowAgreementModal(true);
  };

  const handleSendToMentor = async (assignment: any) => {
    if (!assignment.assignment_id) return;
    
    setProcessing(true);
    try {
      // The assignment is already in ready_for_activation status
      // We just need to notify that it's ready (mentor will do final acceptance)
      alert('✅ Your payment/agreement has been completed. The mentor will review and finalize the connection.');
      onRefresh();
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getActionButtons = (assignment: any) => {
    const buttons = [];

    // If active, show View button and download signed agreement button
    if (assignment.status === 'active') {
      // Add download button for mentor's signed agreement if available
      if (assignment.mentor_signed_agreement_url) {
        buttons.push(
          <Button
            key="download-signed-agreement"
            size="sm"
            variant="outline"
            className="text-purple-600 border-purple-300 hover:bg-purple-50"
            onClick={async () => {
              try {
                const url = assignment.mentor_signed_agreement_url;
                
                if (!url) {
                  alert('Signed agreement URL not found. Please contact support.');
                  return;
                }

                // Extract file path from URL
                // URL format: https://...supabase.co/storage/v1/object/public/mentor-agreements/mentor-signed-36-1768330653074.pdf
                const urlParts = url.split('/mentor-agreements/');
                const filePath = urlParts.length > 1 ? urlParts[1] : url.split('/').pop() || '';
                
                if (!filePath) {
                  console.error('Could not extract file path from URL:', url);
                  // Try direct download
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `agreement-signed-${assignment.mentor_name || 'mentor'}.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  return;
                }

                // Get signed URL (works even if bucket is private)
                const { data: signedData, error: signedError } = await supabase.storage
                  .from('mentor-agreements')
                  .createSignedUrl(filePath, 3600); // 1 hour expiry
                
                if (signedError) {
                  console.error('Error creating signed URL:', signedError);
                  // Fallback to direct download
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `agreement-signed-${assignment.mentor_name || 'mentor'}.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } else if (signedData?.signedUrl) {
                  // Download using signed URL
                  const link = document.createElement('a');
                  link.href = signedData.signedUrl;
                  link.download = `agreement-signed-${assignment.mentor_name || 'mentor'}.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } else {
                  // Fallback to direct download
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `agreement-signed-${assignment.mentor_name || 'mentor'}.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              } catch (error) {
                console.error('Error downloading signed agreement:', error);
                // Last resort: try direct download
                if (assignment.mentor_signed_agreement_url) {
                  const link = document.createElement('a');
                  link.href = assignment.mentor_signed_agreement_url;
                  link.download = `agreement-signed-${assignment.mentor_name || 'mentor'}.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } else {
                  alert('Unable to download signed agreement. Please contact support.');
                }
              }
            }}
            title="Download Mentor's Signed Agreement"
          >
            <Download className="mr-1 h-3 w-3" /> Signed Agreement
          </Button>
        );
      }
      
      buttons.push(
        <Button
          key="view"
          size="sm"
          variant="outline"
          className="text-blue-600 border-blue-300 hover:bg-blue-50"
          onClick={() => {
            // Open Schedule Management modal
            if (onViewSchedule) {
              onViewSchedule(assignment);
            }
          }}
        >
          <Eye className="mr-1 h-3 w-3" /> View
        </Button>
      );
      return buttons;
    }

    // If ready for activation, show "Send to Mentor" button
    if (assignment.status === 'ready_for_activation') {
      buttons.push(
        <Button
          key="send"
          size="sm"
          variant="primary"
          className="bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => handleSendToMentor(assignment)}
          disabled={processing}
        >
          {processing ? (
            <>
              <Loader className="mr-1 h-3 w-3 animate-spin" /> Processing...
            </>
          ) : (
            <>
              <Send className="mr-1 h-3 w-3" /> Send to Mentor
            </>
          )}
        </Button>
      );
      return buttons;
    }

    // Show payment/agreement buttons based on status
    if (assignment.status === 'pending_payment' || assignment.status === 'pending_payment_and_agreement') {
      buttons.push(
        <Button
          key="payment"
          size="sm"
          variant="primary"
          className="bg-green-600 text-white hover:bg-green-700 mr-2"
          onClick={() => handlePayment(assignment)}
        >
          <CreditCard className="mr-1 h-3 w-3" /> Payment
        </Button>
      );
    }

    if (assignment.status === 'pending_agreement' || assignment.status === 'pending_payment_and_agreement') {
      // Check if agreement has been uploaded
      // Check both agreement_status and agreement_url to be safe
      const hasAgreementUploaded = (assignment.agreement_status === 'pending_mentor_approval' || 
                                     assignment.agreement_status === 'approved') && 
                                     assignment.agreement_url;
      
      console.log('🔍 Agreement button check:', {
        assignmentId: assignment.assignment_id,
        status: assignment.status,
        agreement_status: assignment.agreement_status,
        agreement_url: assignment.agreement_url,
        hasAgreementUploaded
      });
      
      if (hasAgreementUploaded) {
        // Agreement uploaded - show View/Download button
        buttons.push(
          <Button
            key="view-agreement"
            size="sm"
            variant="outline"
            className="text-purple-600 border-purple-300 hover:bg-purple-50"
            onClick={async () => {
              try {
                const url = assignment.agreement_url;
                
                if (!url) {
                  alert('Agreement URL not found. Please contact support.');
                  return;
                }

                // Extract file path from URL
                // URL format: https://...supabase.co/storage/v1/object/public/mentor-agreements/36-1768330653074.doc
                const urlParts = url.split('/mentor-agreements/');
                const filePath = urlParts.length > 1 ? urlParts[1] : url.split('/').pop() || '';
                
                if (!filePath) {
                  console.error('Could not extract file path from URL:', url);
                  // Try public URL as fallback
                  window.open(url, '_blank');
                  return;
                }

                // Get signed URL (works even if bucket is private)
                const { data: signedData, error: signedError } = await supabase.storage
                  .from('mentor-agreements')
                  .createSignedUrl(filePath, 3600); // 1 hour expiry
                
                if (signedError) {
                  console.error('Error creating signed URL:', signedError);
                  // Fallback to public URL
                  window.open(url, '_blank');
                } else if (signedData?.signedUrl) {
                  window.open(signedData.signedUrl, '_blank');
                } else {
                  // Fallback to public URL
                  window.open(url, '_blank');
                }
              } catch (error) {
                console.error('Error opening agreement:', error);
                // Last resort: try public URL
                if (assignment.agreement_url) {
                  window.open(assignment.agreement_url, '_blank');
                } else {
                  alert('Unable to open agreement. Please contact support.');
                }
              }
            }}
          >
            <Download className="mr-1 h-3 w-3" /> View Agreement
          </Button>
        );
      } else {
        // Agreement not uploaded yet - show Upload button
        buttons.push(
          <Button
            key="agreement"
            size="sm"
            variant="primary"
            className="bg-purple-600 text-white hover:bg-purple-700"
            onClick={() => handleAgreement(assignment)}
          >
            <FileText className="mr-1 h-3 w-3" /> Agreement
          </Button>
        );
      }
    }

    return buttons;
  };

  if (assignments.length === 0) {
    return (
      <div className="text-center py-8 text-slate-600">
        <p className="text-sm">
          Accepted services and ongoing relationships will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <Card>
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          My Mentor Services
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Mentor</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Fee Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.assignment_id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{assignment.mentor_name || 'Unknown Mentor'}</div>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {assignment.fee_type || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {assignment.fee_amount && assignment.fee_currency
                      ? formatCurrency(assignment.fee_amount, assignment.fee_currency)
                      : assignment.esop_value && assignment.fee_currency
                      ? formatCurrency(assignment.esop_value, assignment.fee_currency)
                      : 'Free'}
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(assignment)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      {getActionButtons(assignment)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showAgreementModal && selectedAssignment && (
        <AgreementUploadModal
          isOpen={showAgreementModal}
          onClose={() => {
            setShowAgreementModal(false);
            setSelectedAssignment(null);
          }}
          assignmentId={selectedAssignment.assignment_id}
          assignment={{
            fee_amount: selectedAssignment.fee_amount,
            fee_currency: selectedAssignment.fee_currency,
            esop_value: selectedAssignment.esop_value,
            mentor_id: selectedAssignment.mentor_id,
            startup_id: selectedAssignment.startup_id,
            fee_type: selectedAssignment.fee_type
          }}
          mentorName={selectedAssignment.mentor_name}
          startupName={startupName}
          onUploadSuccess={() => {
            setShowAgreementModal(false);
            setSelectedAssignment(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
};

export default MyServicesSection;

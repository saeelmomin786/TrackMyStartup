import React, { useState, useEffect, useRef } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import { FileText, CheckCircle, XCircle, Download, Eye, Loader, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { mentorService } from '../../lib/mentorService';
import { formatDateDDMMYYYY } from '../../lib/dateTimeUtils';

interface PendingAgreement {
  id: number;
  mentor_id: string;
  startup_id: number;
  agreement_url: string;
  agreement_uploaded_at: string;
  agreement_status: string;
  fee_amount?: number;
  fee_currency?: string;
  esop_value?: number;
  startup?: {
    name: string;
    website?: string;
    sector?: string;
  };
}

interface PendingAgreementsSectionProps {
  mentorId: string;
  onAgreementAction: () => void;
}

const PendingAgreementsSection: React.FC<PendingAgreementsSectionProps> = ({
  mentorId,
  onAgreementAction
}) => {
  const [agreements, setAgreements] = useState<PendingAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgreement, setSelectedAgreement] = useState<PendingAgreement | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingSigned, setUploadingSigned] = useState(false);
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAgreements();
  }, [mentorId]);

  const loadAgreements = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('mentor_startup_assignments')
        .select(`
          *,
          startup:startup_id (
            name,
            sector
          )
        `)
        .eq('mentor_id', mentorId)
        .in('agreement_status', ['pending_mentor_approval', 'pending_mentor_signature'])
        .order('agreement_uploaded_at', { ascending: false });

      if (error) throw error;

      setAgreements((data || []) as PendingAgreement[]);
    } catch (err: any) {
      console.error('Error loading agreements:', err);
      setError(err.message || 'Failed to load agreements');
    } finally {
      setLoading(false);
    }
  };

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

  const handleApprove = async (agreement: PendingAgreement) => {
    try {
      setProcessing(true);
      setError(null);

      const success = await mentorService.approveAgreement(agreement.id);

      if (success) {
        onAgreementAction();
        loadAgreements();
      } else {
        setError('Failed to approve agreement');
      }
    } catch (err: any) {
      console.error('Error approving agreement:', err);
      setError(err.message || 'Failed to approve agreement');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (agreement: PendingAgreement) => {
    try {
      setProcessing(true);
      setError(null);

      const success = await mentorService.rejectAgreement(agreement.id);

      if (success) {
        onAgreementAction();
        loadAgreements();
      } else {
        setError('Failed to reject agreement');
      }
    } catch (err: any) {
      console.error('Error rejecting agreement:', err);
      setError(err.message || 'Failed to reject agreement');
    } finally {
      setProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, agreement: PendingAgreement) => {
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

    setSignedFile(file);
    setError(null);
  };

  const handleUploadSignedAgreement = async (agreement: PendingAgreement) => {
    if (!signedFile) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploadingSigned(true);
      setError(null);

      const fileExt = signedFile.name.split('.').pop()?.toLowerCase() || 'pdf';
      const fileName = `mentor-signed-${agreement.id}-${Date.now()}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('mentor-agreements')
        .upload(fileName, signedFile, {
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

      // Update assignment with signed agreement URL
      const success = await mentorService.uploadSignedAgreement(agreement.id, publicUrl);

      if (success) {
        setSignedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        loadAgreements();
        onAgreementAction();
      } else {
        throw new Error('Failed to save signed agreement');
      }
    } catch (err: any) {
      console.error('Error uploading signed agreement:', err);
      setError(err.message || 'Failed to upload signed agreement');
    } finally {
      setUploadingSigned(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="text-center py-8">
          <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-slate-600">Loading agreements...</p>
        </div>
      </Card>
    );
  }

  if (agreements.length === 0) {
    return null; // Don't show section if no agreements
  }

  return (
    <>
      <Card>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Pending Agreement Approvals</h3>
        <div className="space-y-4">
          {agreements.map((agreement) => (
            <div key={agreement.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium text-slate-900">
                    {agreement.startup?.name || 'Unknown Startup'}
                  </h4>
                  {agreement.startup?.website && (
                    <p className="text-sm text-slate-500">{agreement.startup.website}</p>
                  )}
                  {agreement.startup?.sector && (
                    <p className="text-xs text-slate-400 mt-1">{agreement.startup.sector}</p>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  Uploaded: {formatDateDDMMYYYY(agreement.agreement_uploaded_at)}
                </span>
              </div>

              <div className="mb-3 p-3 bg-blue-50 rounded-md">
                <p className="text-xs font-medium text-slate-700 mb-2">Agreement Details:</p>
                <div className="space-y-1 text-sm text-slate-600">
                  {agreement.fee_amount && agreement.fee_currency && (
                    <p>Fee: {formatCurrency(agreement.fee_amount, agreement.fee_currency)}</p>
                  )}
                  {agreement.esop_value && agreement.fee_currency && (
                    <p>Stock Options: {formatCurrency(agreement.esop_value, agreement.fee_currency)}</p>
                  )}
                </div>
              </div>

              {/* Show signed agreement status if uploaded */}
              {agreement.mentor_signed_agreement_url && (
                <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800 font-medium mb-1">
                    ✅ Signed Agreement Uploaded
                  </p>
                  <p className="text-xs text-green-700 mb-2">
                    Uploaded on: {agreement.mentor_signed_agreement_uploaded_at ? formatDateDDMMYYYY(agreement.mentor_signed_agreement_uploaded_at) : 'N/A'}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-300 hover:bg-green-50"
                    onClick={() => window.open(agreement.mentor_signed_agreement_url, '_blank')}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View Signed Agreement
                  </Button>
                </div>
              )}

              {/* Upload signed agreement section */}
              {!agreement.mentor_signed_agreement_url && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800 font-medium mb-2">
                    📝 Upload Signed Agreement
                  </p>
                  <p className="text-xs text-blue-700 mb-3">
                    Please download the agreement, sign it, and upload the signed version here.
                  </p>
                  <div className="flex gap-2 items-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileSelect(e, agreement)}
                      className="hidden"
                      id={`signed-agreement-${agreement.id}`}
                    />
                    <label
                      htmlFor={`signed-agreement-${agreement.id}`}
                      className="cursor-pointer"
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                        onClick={() => document.getElementById(`signed-agreement-${agreement.id}`)?.click()}
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        {signedFile ? signedFile.name : 'Select File'}
                      </Button>
                    </label>
                    {signedFile && (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleUploadSignedAgreement(agreement)}
                        disabled={uploadingSigned}
                      >
                        {uploadingSigned ? (
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
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedAgreement(agreement);
                    setViewModalOpen(true);
                  }}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View Agreement
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(agreement.agreement_url, '_blank')}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleApprove(agreement)}
                  disabled={processing || !agreement.mentor_signed_agreement_url}
                  title={!agreement.mentor_signed_agreement_url ? 'Please upload signed agreement first' : ''}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Final Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => handleReject(agreement)}
                  disabled={processing}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* View Agreement Modal */}
      {selectedAgreement && (
        <Modal
          isOpen={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedAgreement(null);
          }}
          title="Agreement Preview"
          size="large"
        >
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-slate-700 mb-2">Startup Details</p>
              <div className="text-sm text-slate-600 space-y-1">
                <p><span className="font-medium">Name:</span> {selectedAgreement.startup?.name || 'Unknown'}</p>
                {selectedAgreement.startup?.website && (
                  <p><span className="font-medium">Website:</span> {selectedAgreement.startup.website}</p>
                )}
                {selectedAgreement.fee_amount && selectedAgreement.fee_currency && (
                  <p><span className="font-medium">Fee:</span> {formatCurrency(selectedAgreement.fee_amount, selectedAgreement.fee_currency)}</p>
                )}
                {selectedAgreement.esop_value && selectedAgreement.fee_currency && (
                  <p><span className="font-medium">Stock Options:</span> {formatCurrency(selectedAgreement.esop_value, selectedAgreement.fee_currency)}</p>
                )}
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <iframe
                src={selectedAgreement.agreement_url}
                className="w-full h-96 border-0"
                title="Agreement Preview"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => window.open(selectedAgreement.agreement_url, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  handleApprove(selectedAgreement);
                  setViewModalOpen(false);
                }}
                disabled={processing}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Agreement
              </Button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default PendingAgreementsSection;

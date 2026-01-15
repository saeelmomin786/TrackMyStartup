import React, { useState, useRef, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Upload, FileText, XCircle, CheckCircle, Loader, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { mentorService } from '../../lib/mentorService';
import { generateESOPAgreement, downloadAgreement } from '../../lib/esopAgreementTemplate';

interface AgreementUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: number;
  assignment: {
    fee_amount?: number;
    fee_currency?: string;
    esop_value?: number;
    mentor_id?: string;
    startup_id?: number;
    fee_type?: string;
  };
  mentorName?: string;
  startupName?: string;
  onUploadSuccess: () => void;
}

const AgreementUploadModal: React.FC<AgreementUploadModalProps> = ({
  isOpen,
  onClose,
  assignmentId,
  assignment,
  mentorName,
  startupName,
  onUploadSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [startupDetails, setStartupDetails] = useState<any>(null);
  const [mentorDetails, setMentorDetails] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch startup and mentor details when modal opens
  useEffect(() => {
    if (isOpen && assignment.startup_id && assignment.mentor_id) {
      fetchDetails();
    }
  }, [isOpen, assignment.startup_id, assignment.mentor_id]);

  const fetchDetails = async () => {
    try {
      // Fetch startup details
      if (assignment.startup_id) {
        const { data: startupData } = await supabase
          .from('startups')
          .select('id, name, sector, currency, registration_date')
          .eq('id', assignment.startup_id)
          .single();
        setStartupDetails(startupData);
      }

      // Fetch mentor details
      if (assignment.mentor_id) {
        const { data: mentorData } = await supabase
          .from('mentor_profiles')
          .select('user_id, mentor_name, fee_type, fee_amount_min, fee_amount_max')
          .eq('user_id', assignment.mentor_id)
          .single();
        setMentorDetails(mentorData);
      }
    } catch (err) {
      console.error('Error fetching details:', err);
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

  const handleDownloadTemplate = async () => {
    try {
      setDownloading(true);
      setError(null);

      // Calculate hourly rate from ESOP value
      // If ESOP value is provided, we can estimate hourly rate
      // Otherwise, use a default or calculate from fee_amount if available
      let hourlyRate = 0;
      if (assignment.esop_value) {
        // Estimate: if ESOP value is total, divide by estimated hours (e.g., 10 hours)
        // This is a placeholder - actual calculation should be based on agreed hours
        hourlyRate = assignment.esop_value / 10; // Default to 10 hours estimate
      } else if (assignment.fee_amount) {
        hourlyRate = assignment.fee_amount / 10; // Default to 10 hours estimate
      } else {
        // Use mentor's fee range if available
        if (mentorDetails?.fee_amount_min) {
          hourlyRate = mentorDetails.fee_amount_min / 10;
        } else {
          hourlyRate = 1000; // Default fallback
        }
      }

      // Get price per share from startup (if available)
      let pricePerShare = 0;
      if (startupDetails) {
        // Try to get from fundraising_details or use a default
        const { data: fundraisingData } = await supabase
          .from('fundraising_details')
          .select('price_per_share')
          .eq('startup_id', assignment.startup_id)
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (fundraisingData?.price_per_share) {
          pricePerShare = fundraisingData.price_per_share;
        }
      }

      const agreementData = {
        startupName: startupName || startupDetails?.name || 'Startup',
        startupLegalName: startupName || startupDetails?.name || 'Startup',
        startupAddress: startupDetails?.address || '',
        startupJurisdiction: 'India', // Default to India
        mentorName: mentorName || mentorDetails?.mentor_name || 'Mentor',
        mentorAddress: mentorDetails?.address || '',
        effectiveDate: new Date().toISOString(),
        currency: assignment.fee_currency || startupDetails?.currency || 'INR',
        hourlyRate: hourlyRate,
        pricePerShare: pricePerShare,
        esopPercentage: undefined, // Can be calculated if needed
        esopValue: assignment.esop_value
      };

      const blob = await generateESOPAgreement(agreementData);
      const filename = `ESOP_Agreement_${startupName || 'Startup'}_${mentorName || 'Mentor'}_${Date.now()}.doc`;
      downloadAgreement(blob, filename);
      
      setDownloading(false);
    } catch (err: any) {
      console.error('Error generating agreement:', err);
      setError(err.message || 'Failed to generate agreement template');
      setDownloading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Get file extension
      const fileName = selectedFile.name.toLowerCase();
      const fileExtension = fileName.split('.').pop();
      
      // Allow PDF and Word documents
      const allowedExtensions = ['pdf', 'doc', 'docx'];
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        setError('Please upload a PDF or Word document (.pdf, .doc, .docx)');
        return;
      }
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const fileName = `${assignmentId}-${Date.now()}.${fileExt}`;
      
      // Determine correct MIME type based on file extension
      // For .doc files, don't set contentType - let Supabase infer it or use generic binary
      let contentType: string | undefined = undefined;
      if (fileExt === 'pdf') {
        contentType = 'application/pdf';
      } else if (fileExt === 'docx') {
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (fileExt === 'doc') {
        // Don't set contentType for .doc files - Supabase will handle it
        // This avoids the "application/msword is not supported" error
        contentType = undefined;
      }
      
      const uploadOptions: any = {
        cacheControl: '3600',
        upsert: false
      };
      
      // Only set contentType if we have a valid one (skip for .doc files)
      if (contentType) {
        uploadOptions.contentType = contentType;
      }
      
      console.log('📤 Uploading file to storage:', {
        fileName,
        fileSize: file.size,
        fileType: file.type,
        contentType,
        bucket: 'mentor-agreements'
      });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('mentor-agreements')
        .upload(fileName, file, uploadOptions);

      if (uploadError) {
        console.error('❌ Storage upload error:', uploadError);
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      console.log('✅ File uploaded to storage:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('mentor-agreements')
        .getPublicUrl(fileName);

      console.log('🔗 Public URL generated:', publicUrl);

      // Update assignment with agreement URL
      console.log('💾 Updating assignment in database:', {
        assignmentId,
        agreementUrl: publicUrl
      });
      const success = await mentorService.uploadAgreement(assignmentId, publicUrl);

      if (success) {
        setSuccess(true);
        // Wait a moment for database to update, then refresh
        setTimeout(() => {
          onUploadSuccess();
        }, 500);
        // Close modal after showing success message
        setTimeout(() => {
          onClose();
          setFile(null);
          setSuccess(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }, 2000);
      } else {
        throw new Error('Failed to save agreement');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload agreement');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setError(null);
      setSuccess(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Agreement">
      <div className="space-y-4">
        {success ? (
          <div className="text-center py-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-800 mb-2">Agreement Uploaded!</p>
            <p className="text-slate-600">Your agreement has been uploaded successfully and is pending mentor approval.</p>
          </div>
        ) : (
          <>
            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-semibold text-slate-700">Agreement Details:</p>
              <div className="text-sm text-slate-600 space-y-1">
                <p><span className="font-medium">Mentor:</span> {mentorName || mentorDetails?.mentor_name || 'Mentor'}</p>
                <p><span className="font-medium">Startup:</span> {startupName || startupDetails?.name || 'Your Startup'}</p>
                {assignment.fee_amount != null && assignment.fee_amount > 0 && assignment.fee_currency && (
                  <p><span className="font-medium">Fee Amount:</span> {formatCurrency(assignment.fee_amount, assignment.fee_currency)}</p>
                )}
                {assignment.esop_value != null && assignment.esop_value > 0 && assignment.fee_currency && (
                  <p><span className="font-medium">Stock Options Amount:</span> {formatCurrency(assignment.esop_value, assignment.fee_currency)}</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">
                  Agreement Template
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  disabled={downloading}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  {downloading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download Template
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Download the agreement template, fill in the details, sign it, and upload the signed copy.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Upload Signed Agreement (PDF or Word)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:border-slate-400 transition-colors">
                <div className="space-y-1 text-center">
                  {file ? (
                    <div className="flex items-center justify-center space-x-2">
                      <FileText className="w-8 h-8 text-blue-600" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-slate-700">{file.name}</p>
                        <p className="text-xs text-slate-500">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-12 w-12 text-slate-400" />
                      <div className="flex text-sm text-slate-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                        >
                          <span>Upload a file</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            ref={fileInputRef}
                            className="sr-only"
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileSelect}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-slate-500">PDF or Word document (.pdf, .doc, .docx) up to 10MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
              >
                {uploading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload Agreement'
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default AgreementUploadModal;

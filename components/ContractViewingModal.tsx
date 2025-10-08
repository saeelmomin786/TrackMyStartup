import React, { useState, useRef, useEffect } from 'react';
import { X, Download, FileText, ExternalLink, Upload, AlertCircle } from 'lucide-react';
import Button from './ui/Button';

interface ContractViewingModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractData: {
    applicationId: string;
    contractUrl?: string;
    agreementUrl?: string;
    programName?: string;
    facilitatorName?: string;
    status?: string;
    createdAt?: string;
  } | null;
  onContractUpload?: (applicationId: string, file: File) => Promise<void>;
  onAgreementUpload?: (applicationId: string, file: File) => Promise<void>;
  onRefreshData?: (applicationId: string) => Promise<void>;
}

const ContractViewingModal: React.FC<ContractViewingModalProps> = ({
  isOpen,
  onClose,
  contractData,
  onContractUpload,
  onAgreementUpload,
  onRefreshData
}) => {
  const [isUploadingContract, setIsUploadingContract] = useState(false);
  const [isUploadingAgreement, setIsUploadingAgreement] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const contractFileRef = useRef<HTMLInputElement>(null);
  const agreementFileRef = useRef<HTMLInputElement>(null);

  // Refresh data when modal opens
  useEffect(() => {
    if (isOpen && contractData?.applicationId && onRefreshData) {
      console.log('🔄 Refreshing contract data for modal...');
      onRefreshData(contractData.applicationId);
    }
  }, [isOpen, contractData?.applicationId, onRefreshData]);

  if (!isOpen || !contractData) return null;

  const handleDownloadContract = () => {
    if (contractData.contractUrl) {
      window.open(contractData.contractUrl, '_blank');
    }
  };

  const handleDownloadAgreement = () => {
    if (contractData.agreementUrl) {
      window.open(contractData.agreementUrl, '_blank');
    }
  };

  const handleContractFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onContractUpload) {
      setIsUploadingContract(true);
      setUploadError(null);
      setUploadSuccess(null);
      
      onContractUpload(contractData.applicationId, file)
        .then((result) => {
          // Reset file input
          if (contractFileRef.current) {
            contractFileRef.current.value = '';
          }
          setUploadSuccess('Contract uploaded successfully!');
          // Clear success message after 3 seconds
          setTimeout(() => setUploadSuccess(null), 3000);
        })
        .catch((error) => {
          setUploadError(error.message || 'Failed to upload contract');
          // Clear error message after 5 seconds
          setTimeout(() => setUploadError(null), 5000);
        })
        .finally(() => {
          setIsUploadingContract(false);
        });
    }
  };

  const handleAgreementFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onAgreementUpload) {
      setIsUploadingAgreement(true);
      setUploadError(null);
      setUploadSuccess(null);
      
      onAgreementUpload(contractData.applicationId, file)
        .then((result) => {
          // Reset file input
          if (agreementFileRef.current) {
            agreementFileRef.current.value = '';
          }
          setUploadSuccess('Agreement uploaded successfully!');
          // Clear success message after 3 seconds
          setTimeout(() => setUploadSuccess(null), 3000);
        })
        .catch((error) => {
          setUploadError(error.message || 'Failed to upload agreement');
          // Clear error message after 5 seconds
          setTimeout(() => setUploadError(null), 5000);
        })
        .finally(() => {
          setIsUploadingAgreement(false);
        });
    }
  };

  const triggerContractUpload = () => {
    contractFileRef.current?.click();
  };

  const triggerAgreementUpload = () => {
    agreementFileRef.current?.click();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Hidden file inputs */}
        <input
          ref={contractFileRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleContractFileSelect}
          className="hidden"
        />
        <input
          ref={agreementFileRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleAgreementFileSelect}
          className="hidden"
        />
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Contract Details</h2>
              <p className="text-sm text-gray-500">Application ID: {contractData.applicationId}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Upload Error Display */}
          {uploadError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-sm text-red-800">{uploadError}</p>
              </div>
            </div>
          )}

          {/* Upload Success Display */}
          {uploadSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-green-800">{uploadSuccess}</p>
              </div>
            </div>
          )}
          {/* Application Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Application Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Program:</span>
                <p className="font-medium">{contractData.programName || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500">Facilitator:</span>
                <p className="font-medium">{contractData.facilitatorName || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <p className="font-medium capitalize">{contractData.status || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500">Created:</span>
                <p className="font-medium">
                  {contractData.createdAt ? new Date(contractData.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Contract Documents */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Contract Documents</h3>
            
            {/* Contract Document */}
            {contractData.contractUrl ? (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">Contract Document</p>
                      <p className="text-sm text-gray-500">Official contract document</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadContract}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(contractData.contractUrl, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View
                    </Button>
                    {onContractUpload && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={triggerContractUpload}
                        disabled={isUploadingContract}
                        className="flex items-center gap-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                      >
                        <Upload className="h-4 w-4" />
                        {isUploadingContract ? 'Uploading...' : 'Reupload'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-500">No Contract Document Available</p>
                      <p className="text-sm text-gray-400">Contract document has not been uploaded yet</p>
                    </div>
                  </div>
                  {onContractUpload && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={triggerContractUpload}
                      disabled={isUploadingContract}
                      className="flex items-center gap-2 text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <Upload className="h-4 w-4" />
                      {isUploadingContract ? 'Uploading...' : 'Upload Contract'}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Agreement Document */}
            {contractData.agreementUrl ? (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">Agreement Document</p>
                      <p className="text-sm text-gray-500">Signed agreement document</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadAgreement}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(contractData.agreementUrl, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View
                    </Button>
                    {onAgreementUpload && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={triggerAgreementUpload}
                        disabled={isUploadingAgreement}
                        className="flex items-center gap-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                      >
                        <Upload className="h-4 w-4" />
                        {isUploadingAgreement ? 'Uploading...' : 'Reupload'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-500">No Agreement Document Available</p>
                      <p className="text-sm text-gray-400">Agreement document has not been uploaded yet</p>
                    </div>
                  </div>
                  {onAgreementUpload && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={triggerAgreementUpload}
                      disabled={isUploadingAgreement}
                      className="flex items-center gap-2 text-green-600 border-green-300 hover:bg-green-50"
                    >
                      <Upload className="h-4 w-4" />
                      {isUploadingAgreement ? 'Uploading...' : 'Upload Agreement'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Status Information */}
          {contractData.status === 'accepted' && !contractData.contractUrl && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <p className="text-sm text-yellow-800">
                  <strong>Pending Contract:</strong> Your application has been accepted, but the contract document is still being prepared.
                </p>
              </div>
            </div>
          )}

          {contractData.status === 'pending' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <p className="text-sm text-blue-800">
                  <strong>Under Review:</strong> Your application is currently being reviewed. Contract documents will be available once approved.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ContractViewingModal;

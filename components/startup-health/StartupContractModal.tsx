import React, { useEffect, useState } from 'react';
import { X, Download, Upload, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { messageService } from '../../lib/messageService';
type IncubationContract = {
  id: string;
  application_id: string;
  contract_name: string;
  contract_url?: string;
  uploaded_at: string;
  is_signed?: boolean;
  signed_at?: string | null;
  uploader?: { name?: string } | null;
};
import { storageService } from '../../lib/storage';

interface StartupContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  facilitatorName: string;
  startupName: string;
}

const StartupContractModal: React.FC<StartupContractModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  facilitatorName,
  startupName
}) => {
  const [contracts, setContracts] = useState<IncubationContract[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (isOpen && applicationId) {
      loadContracts();
    }
  }, [isOpen, applicationId]);

  const loadContracts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('incubation_contracts')
        .select('*')
        .eq('application_id', applicationId)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      setContracts((data as any) || []);
    } catch (error) {
      console.error('Error loading contracts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Upload file to storage (bucket, path)
      const uploadResult = await storageService.uploadFile(
        selectedFile,
        'incubation-contracts',
        `${applicationId}/${Date.now()}_${selectedFile.name}`
      );

      if (uploadResult.success) {
        // Create contract record
        const { error } = await supabase.from('incubation_contracts').insert({
          application_id: applicationId,
          contract_name: selectedFile.name,
          contract_url: uploadResult.url || '',
          is_signed: false
        });
        if (error) throw error;

        // Reload contracts
        await loadContracts();
        setSelectedFile(null);
        setUploadProgress(0);
        messageService.success(
          'Contract Uploaded',
          'Contract uploaded successfully!',
          3000
        );
      } else {
        throw new Error('Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading contract:', error);
      messageService.error(
        'Upload Failed',
        'Failed to upload contract. Please try again.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = (contract: IncubationContract) => {
    if (contract.contract_url) {
      window.open(contract.contract_url, '_blank');
    }
  };

  const getStatusIcon = (isSigned: boolean) => {
    if (isSigned) return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <Clock className="w-5 h-5 text-yellow-500" />;
  };

  const getStatusColor = (isSigned: boolean) => {
    return isSigned ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Contract Management</h3>
              <p className="text-sm text-slate-600">
                {facilitatorName} • {startupName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : contracts.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No contracts available yet.</p>
              <p className="text-sm">The facilitator will upload contracts for you to review and sign.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {contracts.map((contract) => (
                <div key={contract.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-slate-500" />
                      <div>
                        <h4 className="font-medium text-slate-900">{contract.contract_name}</h4>
                        <p className="text-sm text-slate-500">
                          Uploaded by {contract.uploader?.name || 'Facilitator'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(!!contract.is_signed)}`}>
                        {contract.is_signed ? 'signed' : 'pending'}
                      </span>
                      {getStatusIcon(!!contract.is_signed)}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                      <p>Uploaded: {new Date(contract.uploaded_at).toLocaleDateString()}</p>
                      {contract.signed_at && (
                        <p>Signed: {new Date(contract.signed_at).toLocaleDateString()}</p>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDownload(contract)}
                        className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload Section */}
        <div className="border-t p-4">
          <h4 className="font-medium text-slate-900 mb-3">Upload Signed Contract</h4>
          
          {selectedFile && (
            <div className="mb-3 p-3 bg-slate-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-4 h-4 text-slate-500 mr-2" />
                <span className="text-sm text-slate-700">{selectedFile.name}</span>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <div className="flex space-x-3">
            <input
              type="file"
              id="contract-file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx"
            />
            <label
              htmlFor="contract-file"
              className="flex items-center px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose File
            </label>
            
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Signed Contract
                </>
              )}
            </button>
          </div>
          
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-3">
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-500 mt-1">Uploading... {uploadProgress}%</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StartupContractModal;











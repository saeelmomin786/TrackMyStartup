import React, { useEffect, useState } from 'react';
import { X, Upload, Download, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
type IncubationContract = {
  id: string;
  application_id: string;
  contract_name: string;
  contract_url: string;
  is_signed: boolean;
  uploaded_at: string;
  signed_at?: string | null;
  uploader?: { name?: string } | null;
  signer?: { name?: string } | null;
};
import { storageService } from '../lib/storage';

interface ContractManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  startupName: string;
  facilitatorName: string;
}

const ContractManagementModal: React.FC<ContractManagementModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  startupName,
  facilitatorName
}) => {
  const [contracts, setContracts] = useState<IncubationContract[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [contractName, setContractName] = useState('');

  useEffect(() => {
    if (isOpen) {
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
      setContractName(file.name.replace(/\.[^/.]+$/, "")); // Remove extension for name
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !contractName.trim()) {
      alert('Please select a file and enter a contract name');
      return;
    }

    setIsUploading(true);
    try {
      // Upload file to storage
      const uploadResult = await storageService.uploadFile(
        selectedFile,
        'incubation-contracts',
        `${applicationId}/${Date.now()}_${selectedFile.name}`
      );

      if (uploadResult.success) {
        // Save contract record
        const { error } = await supabase.from('incubation_contracts').insert({
          application_id: applicationId,
          contract_name: contractName,
          contract_url: uploadResult.url,
          is_signed: false
        });
        if (error) throw error;

        // Refresh contracts list
        await loadContracts();
        
        // Reset form
        setSelectedFile(null);
        setContractName('');
        alert('Contract uploaded successfully!');
      } else {
        throw new Error('Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading contract:', error);
      alert('Failed to upload contract. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = (contractUrl: string, contractName: string) => {
    const link = document.createElement('a');
    link.href = contractUrl;
    link.download = contractName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSignContract = async (contractId: string) => {
    try {
      const { error } = await supabase
        .from('incubation_contracts')
        .update({ is_signed: true, signed_at: new Date().toISOString() })
        .eq('id', contractId);
      if (error) throw error;
      await loadContracts();
      alert('Contract signed successfully!');
    } catch (error) {
      console.error('Error signing contract:', error);
      alert('Failed to sign contract. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Contract Management - {startupName}
            </h3>
            <p className="text-sm text-gray-500">
              Facilitator: {facilitatorName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Upload Section */}
          <div className="p-6 border-b bg-gray-50">
            <h4 className="text-md font-semibold text-gray-900 mb-4">Upload New Contract</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contract Name
                </label>
                <input
                  type="text"
                  value={contractName}
                  onChange={(e) => setContractName(e.target.value)}
                  placeholder="Enter contract name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contract File
                </label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.txt"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <button
                onClick={handleUpload}
                disabled={isUploading || !selectedFile || !contractName.trim()}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Contract
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Contracts List */}
          <div className="flex-1 overflow-y-auto p-6">
            <h4 className="text-md font-semibold text-gray-900 mb-4">Existing Contracts</h4>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : contracts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No contracts uploaded yet.</p>
                <p className="text-sm">Upload a contract to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {contracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <div>
                          <h5 className="font-medium text-gray-900">{contract.contract_name}</h5>
                          <p className="text-sm text-gray-500">
                            Uploaded by {contract.uploader?.name || 'Unknown'} on {formatDate(contract.uploaded_at)}
                          </p>
                          {contract.is_signed && (
                            <p className="text-sm text-green-600">
                              Signed by {contract.signer?.name || 'Unknown'} on {contract.signed_at ? formatDate(contract.signed_at) : 'Unknown date'}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {contract.is_signed ? (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="h-5 w-5 mr-1" />
                            <span className="text-sm font-medium">Signed</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleDownload(contract.contract_url, contract.contract_name)}
                              className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </button>
                            <button
                              onClick={() => handleSignContract(contract.id)}
                              className="flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Sign
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractManagementModal;













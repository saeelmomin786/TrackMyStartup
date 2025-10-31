import React, { useState, useId } from 'react';
import { Cloud, Link, Shield, Info, AlertCircle, CheckCircle } from 'lucide-react';
import Button from './Button';

interface CloudDriveInputProps {
  value?: string;
  onChange: (url: string) => void;
  onFileSelect?: (file: File) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
  showPrivacyMessage?: boolean;
  documentType?: string;
}

const CloudDriveInput: React.FC<CloudDriveInputProps> = ({
  value = '',
  onChange,
  onFileSelect,
  placeholder = 'Paste your cloud drive link here...',
  label = 'Document Link',
  required = false,
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png',
  maxSize = 10,
  className = '',
  showPrivacyMessage = true,
  documentType = 'document'
}) => {
  // Generate unique ID for this component instance
  const fileInputId = useId();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [inputMode, setInputMode] = useState<'url' | 'file'>('url');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isValidUrl, setIsValidUrl] = useState<boolean>(false);

  // Validate cloud drive URLs
  const validateCloudUrl = (url: string): boolean => {
    if (!url.trim()) return false;
    
    const cloudDrivePatterns = [
      /^https?:\/\/(drive\.google\.com|onedrive\.live\.com|dropbox\.com|box\.com|icloud\.com|mega\.nz|pcloud\.com|mediafire\.com)/i,
      /^https?:\/\/.*\.(googleapis\.com|microsoft\.com|dropboxusercontent\.com)/i,
      /^https?:\/\/.*\.(sharepoint\.com|office\.com)/i
    ];
    
    return cloudDrivePatterns.some(pattern => pattern.test(url));
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    onChange(url);
    
    if (url.trim()) {
      const isValid = validateCloudUrl(url);
      setIsValidUrl(isValid);
      setUrlError(isValid ? null : 'Please provide a valid cloud drive link (Google Drive, OneDrive, Dropbox, etc.)');
    } else {
      setIsValidUrl(false);
      setUrlError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileError(null);
      
      // Validate file size
      if (file.size > maxSize * 1024 * 1024) {
        setFileError(`File size must be less than ${maxSize}MB`);
        // Reset input to allow selecting a different file
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      // Validate file type - check both extension and MIME type
      const allowedTypes = accept.split(',').map(type => type.trim());
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const isValidExtension = allowedTypes.includes(fileExtension);
      
      // For PDF files, be more lenient - accept if extension is .pdf OR MIME type is correct
      let isValidFile = isValidExtension;
      
      if (fileExtension === '.pdf' || allowedTypes.includes('.pdf')) {
        // For PDF files, accept if extension is .pdf OR MIME type is application/pdf
        const isValidPdfMime = file.type === 'application/pdf' || file.type === 'application/x-pdf' || file.type === '' || !file.type;
        isValidFile = fileExtension === '.pdf' || isValidPdfMime;
      } else if (!isValidExtension && file.type) {
        // For other file types, check MIME type as fallback
        // This is a basic check - you might want to expand this for other file types
        isValidFile = false;
      }
      
      if (!isValidFile) {
        setFileError(`File type not allowed. Accepted types: ${accept}. Selected file: ${file.name} (type: ${file.type || 'unknown'})`);
        // Reset input to allow selecting a different file
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      // Log if PDF file has unusual MIME type but extension is correct
      if (fileExtension === '.pdf' && file.type && file.type !== 'application/pdf' && file.type !== 'application/x-pdf') {
        console.warn('PDF file with unusual MIME type:', file.type, 'File:', file.name, '- Allowing based on file extension');
      }
      
      console.log('📤 CloudDriveInput calling onFileSelect with file:', file);
      console.log('📤 File details:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      });
      
      if (onFileSelect) {
        console.log('📤 onFileSelect handler exists, calling it...');
        try {
          onFileSelect(file);
          console.log('✅ onFileSelect handler called successfully');
        } catch (error) {
          console.error('❌ Error in onFileSelect handler:', error);
        }
      } else {
        console.warn('⚠️ onFileSelect handler is not defined');
      }
      // Reset input value after successful selection to allow re-selecting the same file
      // This prevents the form from becoming unresponsive
      setTimeout(() => {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 100);
    }
  };

  const getCloudProvider = (url: string): string => {
    if (url.includes('drive.google.com')) return 'Google Drive';
    if (url.includes('onedrive.live.com') || url.includes('office.com')) return 'OneDrive';
    if (url.includes('dropbox.com')) return 'Dropbox';
    if (url.includes('box.com')) return 'Box';
    if (url.includes('icloud.com')) return 'iCloud';
    if (url.includes('mega.nz')) return 'MEGA';
    if (url.includes('pcloud.com')) return 'pCloud';
    if (url.includes('mediafire.com')) return 'MediaFire';
    return 'Cloud Drive';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Privacy Message */}
      {showPrivacyMessage && (
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 mb-1">Recommended: Use Your Cloud Drive</h4>
              <p className="text-sm text-blue-800 mb-2">
                <strong>Why choose cloud drive?</strong> Keep your documents private, reduce our storage costs, 
                and maintain full control over your files. You can still upload files if you prefer.
              </p>
              <div className="text-xs text-blue-700">
                <strong>Supported:</strong> Google Drive, OneDrive, Dropbox, Box, iCloud, MEGA, pCloud, MediaFire
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input Mode Toggle */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={inputMode === 'url' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setInputMode('url')}
          className="flex items-center gap-2"
        >
          <Link className="w-4 h-4" />
          Cloud Drive (Recommended)
        </Button>
        <span className="text-sm text-slate-500 font-medium">OR</span>
        <Button
          type="button"
          variant={inputMode === 'file' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setInputMode('file')}
          className="flex items-center gap-2"
        >
          <Cloud className="w-4 h-4" />
          Upload File
        </Button>
      </div>

      {/* URL Input Mode */}
      {inputMode === 'url' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            <input
              type="url"
              value={value}
              onChange={handleUrlChange}
              placeholder={placeholder}
              className={`block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm pr-10 ${urlError ? 'border-red-300 focus:border-red-500' : isValidUrl ? 'border-green-300 focus:border-green-500' : ''}`}
            />
            {isValidUrl && (
              <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500" />
            )}
            {urlError && (
              <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500" />
            )}
          </div>
          
          {urlError && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {urlError}
            </p>
          )}
          
          {isValidUrl && value && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Valid {getCloudProvider(value)} link
            </p>
          )}
        </div>
      )}

      {/* File Upload Mode */}
      {inputMode === 'file' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept={accept}
              className="hidden"
              id={fileInputId}
            />
            <label
              htmlFor={fileInputId}
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <Cloud className="w-8 h-8 text-gray-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">Click to upload {documentType}</p>
                <p className="text-xs text-gray-500">Max {maxSize}MB • {accept}</p>
              </div>
            </label>
          </div>
          
          {fileError && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {fileError}
            </p>
          )}
        </div>
      )}

    </div>
  );
};

export default CloudDriveInput;

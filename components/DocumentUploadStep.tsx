import React, { useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import { UserRole } from '../types';
import { Upload, FileText, Users, CheckCircle } from 'lucide-react';
import LogoTMS from './public/logoTMS.svg';

interface Founder {
  id: string;
  name: string;
  email: string;
  equity: number;
}

interface DocumentUploadStepProps {
  userData: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    startupName?: string;
  };
  onComplete: (userData: any, documents: any, founders: Founder[], country?: string) => void;
  onBack: () => void;
}

export const DocumentUploadStep: React.FC<DocumentUploadStepProps> = ({
  userData,
  onComplete,
  onBack
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<{
    govId: File | null;
    roleSpecific: File | null;
    license?: File | null;
    logo?: File | null;
  }>({
    govId: null,
    roleSpecific: null,
    license: null,
    logo: null
  });

  const [country, setCountry] = useState('');

  const [founders, setFounders] = useState<Founder[]>([
    { id: '1', name: '', email: '', equity: 0 }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug: Log the user role
  console.log('DocumentUploadStep - User role:', userData.role);
  console.log('DocumentUploadStep - Is Investment Advisor?', userData.role === 'Investment Advisor');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFiles(prev => ({ ...prev, [documentType]: file }));
    }
  };

  const addFounder = () => {
    const newId = (founders.length + 1).toString();
    setFounders(prev => [...prev, { id: newId, name: '', email: '' }]);
  };

  const removeFounder = (id: string) => {
    if (founders.length > 1) {
      setFounders(prev => prev.filter(founder => founder.id !== id));
    }
  };

  const updateFounder = (id: string, field: 'name' | 'email' | 'equity', value: string | number) => {
    setFounders(prev => prev.map(founder => 
      founder.id === id ? { ...founder, [field]: value } : founder
    ));
  };

  const getRoleSpecificDocumentType = (role: UserRole): string => {
    switch (role) {
      case 'Investor': return 'PAN Card';
      case 'Startup': return 'Proof of Company Registration';
      case 'CA': return 'Copy of CA License';
      case 'CS': return 'Copy of CS License';
      case 'Startup Facilitation Center': return 'Proof of Organization Registration';
      case 'Investment Advisor': return 'Proof of Firm Registration';
      default: return 'Document';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validation
    if (!country) {
      setError('Country selection is required');
      setIsLoading(false);
      return;
    }

    if (!uploadedFiles.govId) {
      setError('Government ID is required');
      setIsLoading(false);
      return;
    }

    if (!uploadedFiles.roleSpecific) {
      setError(`${getRoleSpecificDocumentType(userData.role)} is required`);
      setIsLoading(false);
      return;
    }

    // For Investment Advisors, license and logo are required
    if (userData.role === 'Investment Advisor' || userData.role?.trim() === 'Investment Advisor') {
      if (!uploadedFiles.license) {
        setError('License (As per country regulations) is required for Investment Advisors');
        setIsLoading(false);
        return;
      }
      if (!uploadedFiles.logo) {
        setError('Company logo is required for Investment Advisors');
        setIsLoading(false);
        return;
      }
    }

    if (userData.role === 'Startup') {
      const invalidFounders = founders.filter(f => !f.name.trim() || !f.email.trim());
      if (invalidFounders.length > 0) {
        setError('Please fill in all founder details');
        setIsLoading(false);
        return;
      }
    }

    try {
      // Call the completion handler with country data
      // The actual processing (file uploads, database operations) happens in TwoStepRegistration
      onComplete(userData, uploadedFiles, founders, country);
      
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <div className="text-center mb-8">
        <img src={LogoTMS} alt="TrackMyStartup" className="mx-auto h-40 w-40" />
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Complete Your Profile</h2>
        <p className="mt-2 text-sm text-slate-600">
          TrackMyStartup - Welcome, {userData.name}! Now let's upload your verification documents.
        </p>
        {/* Debug info */}
        <p className="mt-1 text-xs text-slate-400">Role: {userData.role}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Country Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Country Information
          </h3>
          <Select 
            label="Country" 
            id="country" 
            value={country} 
            onChange={(e) => setCountry(e.target.value)}
            required
          >
            <option value="">Select Country</option>
            <option value="United States">United States</option>
            <option value="India">India</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="Canada">Canada</option>
            <option value="Australia">Australia</option>
            <option value="Germany">Germany</option>
            <option value="France">France</option>
            <option value="Singapore">Singapore</option>
            <option value="Japan">Japan</option>
            <option value="China">China</option>
            <option value="Brazil">Brazil</option>
            <option value="Mexico">Mexico</option>
            <option value="South Africa">South Africa</option>
            <option value="Nigeria">Nigeria</option>
            <option value="Kenya">Kenya</option>
            <option value="Egypt">Egypt</option>
            <option value="UAE">UAE</option>
            <option value="Saudi Arabia">Saudi Arabia</option>
            <option value="Israel">Israel</option>
            <option value="Other">Other</option>
          </Select>
        </div>

        {/* Verification Documents */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Verification Documents
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Government ID (Passport, Driver's License, etc.)
              </label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(e, 'govId')}
                required
              />
              {uploadedFiles.govId && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ {uploadedFiles.govId.name} selected
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {getRoleSpecificDocumentType(userData.role)}
              </label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(e, 'roleSpecific')}
                required
              />
              {uploadedFiles.roleSpecific && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ {uploadedFiles.roleSpecific.name} selected
                </p>
              )}
            </div>

            {/* License Upload - Only for Investment Advisor */}
            {(userData.role === 'Investment Advisor' || userData.role?.trim() === 'Investment Advisor') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  License (As per country regulations)
                </label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'license')}
                  required
                />
                {uploadedFiles.license && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ {uploadedFiles.license.name} selected
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Upload your financial advisor license (if applicable)
                </p>
              </div>
            )}

            {/* Debug: Always show for testing */}
            {userData.role !== 'Investment Advisor' && (
              <div className="p-4 bg-yellow-100 border border-yellow-300 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Debug:</strong> Role is "{userData.role}" (length: {userData.role?.length})
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Expected: "Investment Advisor" (length: 18)
                </p>
              </div>
            )}

            {/* Logo Upload - Only for Investment Advisor */}
            {(userData.role === 'Investment Advisor' || userData.role?.trim() === 'Investment Advisor') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Upload Logo
                </label>
                <Input
                  type="file"
                  accept=".jpg,.jpeg,.png,.svg"
                  onChange={(e) => handleFileChange(e, 'logo')}
                  required
                />
                {uploadedFiles.logo && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ {uploadedFiles.logo.name} selected
                  </p>
                )}
                <div className="text-xs text-slate-500 mt-1 space-y-1">
                  <p>Upload your company logo (JPG, PNG, or SVG format)</p>
                  <div className="bg-blue-50 p-2 rounded border border-blue-200">
                    <p className="font-medium text-blue-800 mb-1">Logo Specifications:</p>
                    <ul className="text-blue-700 space-y-0.5">
                      <li>• Recommended size: 64x64 pixels (square format)</li>
                      <li>• Maximum file size: 2MB</li>
                      <li>• Supported formats: JPG, PNG, SVG</li>
                      <li>• Logo will be displayed as 64x64px with white background</li>
                      <li>• For best results, use a square logo or center your logo in a square canvas</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Founder Information - Only for Startup role */}
        {userData.role === 'Startup' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Founder Information
            </h3>
            <p className="text-sm text-slate-600">
              Please provide the details of all founders.
            </p>
            
            <div className="space-y-4">
              {founders.map((founder, index) => (
                <div key={founder.id} className="p-4 border border-slate-200 rounded-md">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-slate-900">Founder {index + 1}</h4>
                    {founders.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFounder(founder.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Name"
                      value={founder.name}
                      onChange={(e) => updateFounder(founder.id, 'name', e.target.value)}
                      required
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={founder.email}
                      onChange={(e) => updateFounder(founder.id, 'email', e.target.value)}
                      required
                    />
                    <Input
                      label="Equity (%)"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={founder.equity}
                      onChange={(e) => updateFounder(founder.id, 'equity', parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                </div>
              ))}
              
              <Button
                type="button"
                onClick={addFounder}
                variant="outline"
                className="w-full"
              >
                <Users className="h-4 w-4 mr-2" />
                Add Another Founder
              </Button>
            </div>
          </div>
        )}


        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-800">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            type="button"
            onClick={onBack}
            variant="outline"
            className="flex-1"
          >
            Back
          </Button>
          
          <Button
            type="submit"
            className="flex-1"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Profile...' : 'Complete Registration'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

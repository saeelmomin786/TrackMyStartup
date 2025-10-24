import React, { useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import CloudDriveInput from './ui/CloudDriveInput';
import Select from './ui/Select';
import { UserRole, InvestmentType, StartupDomain, StartupStage } from '../types';
import { Upload, FileText, Users, CheckCircle } from 'lucide-react';
import LogoTMS from './public/logoTMS.svg';

interface Founder {
  id: string;
  name: string;
  email: string;
  equity: number;
}

interface FundraisingFormData {
  active: boolean;
  type: InvestmentType | '';
  value: number | '';
  equity: number | '';
  domain?: StartupDomain | '';
  stage?: StartupStage | '';
  pitchDeckFile?: File | null;
  pitchVideoUrl?: string;
  validationRequested?: boolean;
}

interface DocumentUploadStepProps {
  userData: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    startupName?: string;
  };
  onComplete: (userData: any, documents: any, founders: Founder[], country?: string, fundraising?: FundraisingFormData) => void;
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

  // Fundraising state (only for Startup role)
  const [fundraising, setFundraising] = useState<FundraisingFormData>({
    active: false,
    type: '',
    value: '',
    equity: '',
    domain: '',
    stage: '',
    pitchDeckFile: null,
    pitchVideoUrl: '',
    validationRequested: false
  });

  // Debug: Log the user role
  console.log('DocumentUploadStep - User role:', userData.role);
  console.log('DocumentUploadStep - Is Investment Advisor?', userData.role === 'Investment Advisor');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFiles(prev => ({ ...prev, [documentType]: file }));
    }
  };

  const handleFundraisingDeckChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.type !== 'application/pdf') {
      setError('Please upload a PDF file for the pitch deck.');
      return;
    }
    if (file && file.size > 10 * 1024 * 1024) {
      setError('Pitch deck file size must be less than 10MB.');
      return;
    }
    setError(null);
    setFundraising(prev => ({ ...prev, pitchDeckFile: file }));
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

      // Basic fundraising validation at registration time (optional but recommended fields)
      if (fundraising.type && (fundraising.value === '' || Number(fundraising.value) <= 0)) {
        setError('Please enter a valid fundraising value.');
        setIsLoading(false);
        return;
      }
      if (fundraising.type && (fundraising.equity === '' || Number(fundraising.equity) <= 0 || Number(fundraising.equity) > 100)) {
        setError('Please enter a valid equity percentage (1-100).');
        setIsLoading(false);
        return;
      }
    }

    try {
      // Call the completion handler with country data
      // The actual processing (file uploads, database operations) happens in TwoStepRegistration
      onComplete(userData, uploadedFiles, founders, country, fundraising);
      
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
              <CloudDriveInput
                value=""
                onChange={(url) => {
                  const hiddenInput = document.getElementById('gov-id-url') as HTMLInputElement;
                  if (hiddenInput) hiddenInput.value = url;
                }}
                onFileSelect={(file) => handleFileChange({ target: { files: [file] } } as any, 'govId')}
                placeholder="Paste your cloud drive link here..."
                label=""
                accept=".pdf,.jpg,.jpeg,.png"
                maxSize={10}
                documentType="government ID"
                showPrivacyMessage={false}
                required
              />
              <input type="hidden" id="gov-id-url" name="gov-id-url" />
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
              <CloudDriveInput
                value=""
                onChange={(url) => {
                  const hiddenInput = document.getElementById('role-specific-url') as HTMLInputElement;
                  if (hiddenInput) hiddenInput.value = url;
                }}
                onFileSelect={(file) => handleFileChange({ target: { files: [file] } } as any, 'roleSpecific')}
                placeholder="Paste your cloud drive link here..."
                label=""
                accept=".pdf,.jpg,.jpeg,.png"
                maxSize={10}
                documentType="role-specific document"
                showPrivacyMessage={false}
                required
              />
              <input type="hidden" id="role-specific-url" name="role-specific-url" />
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
                <CloudDriveInput
                  value=""
                  onChange={(url) => {
                    const hiddenInput = document.getElementById('license-url') as HTMLInputElement;
                    if (hiddenInput) hiddenInput.value = url;
                  }}
                  onFileSelect={(file) => handleFileChange({ target: { files: [file] } } as any, 'license')}
                  placeholder="Paste your cloud drive link here..."
                  label=""
                  accept=".pdf,.jpg,.jpeg,.png"
                  maxSize={10}
                  documentType="license"
                  showPrivacyMessage={true}
                  required
                />
                <input type="hidden" id="license-url" name="license-url" />
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
                <CloudDriveInput
                  value=""
                  onChange={(url) => {
                    const hiddenInput = document.getElementById('logo-url') as HTMLInputElement;
                    if (hiddenInput) hiddenInput.value = url;
                  }}
                  onFileSelect={(file) => handleFileChange({ target: { files: [file] } } as any, 'logo')}
                  placeholder="Paste your cloud drive link here..."
                  label=""
                  accept=".jpg,.jpeg,.png,.svg"
                  maxSize={5}
                  documentType="company logo"
                  showPrivacyMessage={true}
                  required
                />
                <input type="hidden" id="logo-url" name="logo-url" />
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

            {/* Fundraising (Optional) */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Fundraising (Optional)</h3>
              <div className="flex items-center gap-2">
                <input
                  id="fr-active"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                  checked={fundraising.active}
                  onChange={(e) => setFundraising(prev => ({ ...prev, active: e.target.checked }))}
                />
                <label htmlFor="fr-active" className="text-sm text-slate-700">Activate Fundraising Round</label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Type"
                  id="fr-type"
                  value={fundraising.type as any}
                  onChange={(e) => setFundraising(prev => ({ ...prev, type: e.target.value as InvestmentType }))}
                >
                  <option value="">Select round type</option>
                  {Object.values(InvestmentType).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
                <Input
                  label="Value"
                  id="fr-value"
                  type="number"
                  value={fundraising.value as any}
                  onChange={(e) => setFundraising(prev => ({ ...prev, value: e.target.value === '' ? '' : Number(e.target.value) }))}
                />
                <Input
                  label="Equity (%)"
                  id="fr-equity"
                  type="number"
                  value={fundraising.equity as any}
                  onChange={(e) => setFundraising(prev => ({ ...prev, equity: e.target.value === '' ? '' : Number(e.target.value) }))}
                />
                <Select
                  label="Domain"
                  id="fr-domain"
                  value={(fundraising.domain || '') as any}
                  onChange={(e) => setFundraising(prev => ({ ...prev, domain: (e.target.value || '') as StartupDomain | '' }))}
                >
                  <option value="">Select domain</option>
                  {Object.values(StartupDomain).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </Select>
                <Select
                  label="Stage"
                  id="fr-stage"
                  value={(fundraising.stage || '') as any}
                  onChange={(e) => setFundraising(prev => ({ ...prev, stage: (e.target.value || '') as StartupStage | '' }))}
                >
                  <option value="">Select stage</option>
                  {Object.values(StartupStage).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
                <Input
                  label="Pitch Video URL"
                  id="fr-video"
                  type="url"
                  value={fundraising.pitchVideoUrl}
                  onChange={(e) => setFundraising(prev => ({ ...prev, pitchVideoUrl: e.target.value }))}
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Pitch Deck (PDF)</label>
                  <CloudDriveInput
                    value=""
                    onChange={(url) => {
                      const hiddenInput = document.getElementById('pitch-deck-url') as HTMLInputElement;
                      if (hiddenInput) hiddenInput.value = url;
                    }}
                    onFileSelect={(file) => handleFundraisingDeckChange({ target: { files: [file] } } as any)}
                    placeholder="Paste your cloud drive link here..."
                    label=""
                    accept=".pdf"
                    maxSize={10}
                    documentType="pitch deck"
                  showPrivacyMessage={false}
                  className="w-full text-sm"
                  />
                  <input type="hidden" id="pitch-deck-url" name="pitch-deck-url" />
                  <p className="text-xs text-slate-500 mt-1">Max 10MB</p>
                </div>
              </div>
              {/* Startup Nation validation removed as per requirement */}
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

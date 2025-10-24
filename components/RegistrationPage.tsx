import React, { useState } from 'react';
import { Founder, UserRole } from '../types';
import { authService, AuthUser } from '../lib/auth';
import { storageService } from '../lib/storage';
import Card from './ui/Card';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import CloudDriveInput from './ui/CloudDriveInput';
import { Briefcase, UserPlus, Trash2, Loader2, CheckCircle, Upload } from 'lucide-react';

interface RegistrationPageProps {
  onRegister: (user: AuthUser, founders: Founder[], startupName?: string, investmentAdvisorCode?: string) => void;
  onNavigateToLogin: () => void;
}

const allCountries = ['USA', 'UK', 'India', 'Singapore', 'Germany', 'Canada', 'Australia'];

// Define a type for a founder for better type safety
interface FounderStateItem {
    id: number;
    name: string;
    email: string;
}

// Define file upload state
interface FileUploadState {
    govId?: File;
    roleSpecific?: File;
}

const RegistrationPage: React.FC<RegistrationPageProps> = ({ onRegister, onNavigateToLogin }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [country, setCountry] = useState(allCountries[0]);
    const [role, setRole] = useState<UserRole>('Startup');
    const [startupName, setStartupName] = useState('');
    const [investmentAdvisorCode, setInvestmentAdvisorCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<{ [key: string]: File | string }>({});
    const [isRedirecting, setIsRedirecting] = useState(false);

    // State for founders, only relevant for 'Startup' role
    const [founders, setFounders] = useState<FounderStateItem[]>([{ id: Date.now(), name: '', email: '' }]);

    const handleFounderChange = (id: number, field: keyof Omit<FounderStateItem, 'id'>, value: string) => {
        setFounders(founders.map(f => f.id === id ? { ...f, [field]: value } : f));
    };

    const handleAddFounder = () => {
        setFounders([...founders, { id: Date.now(), name: '', email: '' }]);
    };
    
    const handleRemoveFounder = (id: number) => {
        if (founders.length > 1) {
            setFounders(founders.filter(f => f.id !== id));
        }
    };

    // Handle file upload
    const handleFileUpload = async (file: File, documentType: string): Promise<string | null> => {
        try {
            console.log(`Attempting to upload ${documentType} file:`, file.name);
            const result = await storageService.uploadVerificationDocument(file, email, documentType);
            if (result.success && result.url) {
                setUploadedFiles(prev => ({ ...prev, [documentType]: result.url! }));
                console.log(`${documentType} uploaded successfully:`, result.url);
                return result.url;
            } else {
                console.warn(`File upload failed for ${documentType}:`, result.error);
                // Don't throw error, just return null and continue
                return null;
            }
        } catch (error) {
            console.error('File upload error:', error);
            // Don't throw error, just return null and continue
            return null;
        }
    };

    // Handle file input changes
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
        const file = event.target.files?.[0];
        if (file) {
            console.log(`File selected for ${documentType}:`, file.name);
            // Store the file for later upload during registration
            setUploadedFiles(prev => ({ ...prev, [documentType]: file }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setIsRedirecting(false);

        // Set a timeout for the entire registration process
        const timeoutId = setTimeout(() => {
            setIsLoading(false);
            setError('Registration timed out. Please check your internet connection and try again.');
        }, 30000); // 30 second timeout for file uploads

        try {
            console.log('Starting registration process...');
            
            // Upload files first if they exist
            let governmentIdUrl = '';
            let roleSpecificUrl = '';
            
            if (uploadedFiles.govId) {
                console.log('Uploading government ID...');
                governmentIdUrl = await handleFileUpload(uploadedFiles.govId, 'government-id') || '';
            }
            
            if (uploadedFiles.roleSpecific) {
                console.log('Uploading role-specific document...');
                const roleDocType = getRoleSpecificDocumentType(role);
                roleSpecificUrl = await handleFileUpload(uploadedFiles.roleSpecific, roleDocType) || '';
            }
            
            console.log('File uploads completed. Government ID:', governmentIdUrl, 'Role Specific:', roleSpecificUrl);
            
            console.log('Proceeding with user registration...');
            const { user, error: signUpError, confirmationRequired } = await authService.signUp({
                email,
                password,
                name,
                role,
                startupName: role === 'Startup' ? startupName : undefined,
                founders: role === 'Startup' ? founders.map(({ id, ...rest }) => rest) : [],
                fileUrls: {
                    governmentId: governmentIdUrl,
                    roleSpecific: roleSpecificUrl
                }
            });
            
            clearTimeout(timeoutId); // Clear timeout if registration completes
            
            console.log('Registration result:', { user, error: signUpError, confirmationRequired });
            
            if (signUpError) {
                console.error('Registration error:', signUpError);
                
                // Check if user already exists
                if (signUpError.includes('already exists') || signUpError.includes('already registered')) {
                    setError('User with this email already exists. Please sign in instead.');
                    setIsRedirecting(true);
                    // Auto-redirect to login page after 3 seconds
                    setTimeout(() => {
                        onNavigateToLogin();
                    }, 3000);
                } else {
                    setError(signUpError);
                }
            } else if (user) {
                console.log('User registered successfully:', user);
                console.log('Verification documents uploaded:', { governmentIdUrl, roleSpecificUrl });

                // Prepare founder data by removing the temporary ID used for React keys
                const founderDataToSubmit = founders.map(({ id, ...rest }) => rest);
                onRegister(user, role === 'Startup' ? founderDataToSubmit : [], role === 'Startup' ? startupName : undefined, investmentAdvisorCode || undefined);
            } else if (confirmationRequired) {
                console.log('Email confirmation required');
                setShowConfirmation(true);
            } else {
                console.log('Unexpected registration result');
                setError('Registration completed but no user returned');
            }
        } catch (err: any) {
            clearTimeout(timeoutId); // Clear timeout on error
            console.error('Registration error:', err);
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const getRoleSpecificDocumentType = (role: UserRole): string => {
        switch (role) {
            case 'Investor': return 'pan-card';
            case 'Startup': return 'company-registration';
            case 'CA': return 'ca-license';
            case 'CS': return 'cs-license';
            case 'Startup Facilitation Center': return 'org-registration';
            default: return 'document';
        }
    };

    // Show confirmation message after successful registration
    if (showConfirmation) {
        return (
            <Card className="w-full max-w-md">
                <div className="text-center">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                    <h2 className="mt-4 text-2xl font-bold text-slate-900">Check Your Email</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        We've sent a confirmation link to <strong>{email}</strong>
                    </p>
                    <p className="mt-4 text-xs text-slate-500">
                        Note: You can upload your documents after confirming your email and logging in.
                    </p>
                    <div className="mt-6">
                        <Button onClick={onNavigateToLogin} className="w-full">
                            Go to Sign In
                        </Button>
                    </div>
                </div>
            </Card>
        );
    }
    
    const fileInputClassName = "block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-light file:text-brand-primary hover:file:bg-blue-200 cursor-pointer";

    const renderRoleSpecificDocs = () => {
        const commonProps = {
            value: "",
            onChange: (url: string) => {
                const hiddenInput = document.getElementById('role-specific-url') as HTMLInputElement;
                if (hiddenInput) hiddenInput.value = url;
            },
            onFileSelect: (file: File) => {
                handleFileChange({ target: { files: [file] } } as any, 'roleSpecific');
            },
            placeholder: "Paste your cloud drive link here...",
            accept: ".pdf,.jpg,.jpeg,.png",
            maxSize: 10,
            showPrivacyMessage: true
        };

        switch(role) {
            case 'Investor':
                return <CloudDriveInput {...commonProps} label="PAN Card" documentType="PAN card" />;
            case 'Startup':
                return <CloudDriveInput {...commonProps} label="Proof of Company Registration" documentType="company registration proof" />;
            case 'CA':
                return <CloudDriveInput {...commonProps} label="Copy of CA License" documentType="CA license" />;
            case 'CS':
                return <CloudDriveInput {...commonProps} label="Copy of CS License" documentType="CS license" />;
            case 'Startup Facilitation Center':
                return <CloudDriveInput {...commonProps} label="Proof of Organization Registration" documentType="organization registration proof" />;
            default:
                return null;
        }
    }

    return (
         <Card className="w-full max-w-2xl">
            <div className="text-center mb-8">
                <Briefcase className="mx-auto h-12 w-12 text-brand-primary" />
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Create a new account</h2>
                 <p className="mt-2 text-sm text-slate-600">
                    Or{' '}
                    <button onClick={onNavigateToLogin} className="font-medium text-brand-primary hover:text-brand-secondary">
                        sign in to your existing account
                    </button>
                </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                        label="Full Name"
                        id="name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    <Input 
                        label="Email address"
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="border-slate-300"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                        label="Password"
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <Input 
                        label="Confirm Password"
                        id="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Select
                        label="Country"
                        id="country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        required
                    >
                        {allCountries.map(country => (
                            <option key={country} value={country}>{country}</option>
                        ))}
                    </Select>
                    <Select
                        label="Role"
                        id="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                        required
                    >
                        <option value="Investor">Investor</option>
                        <option value="Startup">Startup</option>
                        <option value="CA">CA</option>
                        <option value="CS">CS</option>
                        <option value="Startup Facilitation Center">Startup Facilitation Center</option>
                        <option value="Investment Advisor">Investment Advisor</option>
                    </Select>
                </div>
                
                {/* Investment Advisor Code Field - Only show for Investor and Startup roles */}
                {(role === 'Investor' || role === 'Startup') && (
                    <Input 
                        label="Investment Advisor Code (Optional)"
                        id="investmentAdvisorCode"
                        type="text"
                        value={investmentAdvisorCode}
                        onChange={(e) => setInvestmentAdvisorCode(e.target.value)}
                        placeholder="IA-XXXXXX"
                        helpText="Enter your Investment Advisor's code if you have one"
                    />
                )}
                
                {/* Startup Name Field - Only show for Startup role */}
                {role === 'Startup' && (
                    <Input 
                        label="Startup Name"
                        id="startupName"
                        type="text"
                        value={startupName}
                        onChange={(e) => setStartupName(e.target.value)}
                        required
                        placeholder="Enter your startup name"
                    />
                )}
                
                {/* File Upload Section */}
                <div className="space-y-4">
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-medium text-slate-900 mb-4">Verification Documents (Optional)</h3>
                        <p className="text-sm text-slate-600 mb-4">
                            You can upload verification documents now or later. Registration will continue even if file upload fails.
                        </p>
                        
                        <div className="space-y-4">
                            <CloudDriveInput
                                value=""
                                onChange={(url) => {
                                    const hiddenInput = document.getElementById('gov-id-url') as HTMLInputElement;
                                    if (hiddenInput) hiddenInput.value = url;
                                }}
                                onFileSelect={(file) => {
                                    handleFileChange({ target: { files: [file] } } as any, 'govId');
                                }}
                                placeholder="Paste your cloud drive link here..."
                                label="Government ID (Passport, Driver's License, etc.)"
                                accept=".pdf,.jpg,.jpeg,.png"
                                maxSize={10}
                                documentType="government ID"
                                showPrivacyMessage={false}
                            />
                            <input type="hidden" id="gov-id-url" name="gov-id-url" />
                            {renderRoleSpecificDocs()}
                            <input type="hidden" id="role-specific-url" name="role-specific-url" />
                        </div>
                    </div>
                </div>

                {/* Founder Information for Startups */}
                {role === 'Startup' && (
                    <div className="border-t pt-6 space-y-4">
                        <h3 className="text-lg font-medium text-slate-900">Founder Information</h3>
                        <p className="text-sm text-slate-600">Please provide the details of all founders.</p>
                        {founders.map((founder, index) => (
                            <div key={founder.id} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 relative border p-4 rounded-lg bg-slate-50/50">
                                <Input 
                                    label={`Founder ${index + 1} Name`}
                                    id={`founder-name-${founder.id}`}
                                    type="text"
                                    value={founder.name}
                                    onChange={e => handleFounderChange(founder.id, 'name', e.target.value)}
                                    required
                                />
                                <Input 
                                    label={`Founder ${index + 1} Email`}
                                    id={`founder-email-${founder.id}`}
                                    type="email"
                                    value={founder.email}
                                    onChange={e => handleFounderChange(founder.id, 'email', e.target.value)}
                                    required
                                />
                                {founders.length > 1 && (
                                    <Button 
                                        type="button" 
                                        onClick={() => handleRemoveFounder(founder.id)}
                                        className="absolute top-2 right-2 p-1.5 h-auto bg-transparent hover:bg-red-100 text-slate-400 hover:text-red-500 shadow-none border-none"
                                        variant="secondary"
                                        size="sm"
                                        aria-label="Remove founder"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={handleAddFounder}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add Another Founder
                        </Button>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <p className="text-red-800 text-sm">{error}</p>
                        {isRedirecting && (
                            <div className="flex items-center gap-2 mt-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                <p className="text-red-600 text-xs">
                                    Redirecting to login page...
                                </p>
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <Button type="submit" className="w-full" disabled={isLoading || isRedirecting}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating Account...
                            </>
                        ) : isRedirecting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Redirecting...
                            </>
                        ) : (
                            'Create Account'
                        )}
                    </Button>
                </div>
            </form>
        </Card>
    );
};

export default RegistrationPage;
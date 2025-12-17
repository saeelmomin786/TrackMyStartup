import React, { useState } from 'react';
import ComplianceSubmissionForm from './ComplianceSubmissionForm';
import { Plus, FileText } from 'lucide-react';

interface ComplianceSubmissionButtonProps {
  currentUser: any;
  userRole: 'Startup' | 'CA' | 'CS';
  className?: string;
}

const ComplianceSubmissionButton: React.FC<ComplianceSubmissionButtonProps> = ({ 
  currentUser, 
  userRole, 
  className = '' 
}) => {
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);

  const getButtonText = () => {
    switch (userRole) {
      case 'Startup':
        return 'Submit New Compliance';
      case 'CA':
        return 'Add Compliance Rule';
      case 'CS':
        return 'Add Compliance Rule';
      default:
        return 'Submit Compliance';
    }
  };

  const getDescription = () => {
    switch (userRole) {
      case 'Startup':
        return 'Submit compliance requirements for your company\'s parent operations, subsidiaries, or international operations';
      case 'CA':
        return 'Add new compliance rules based on your professional expertise for parent companies, subsidiaries, or international operations';
      case 'CS':
        return 'Add new compliance rules based on your professional expertise for parent companies, subsidiaries, or international operations';
      default:
        return 'Submit new compliance requirements';
    }
  };

  if (showSubmissionForm) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-4 mx-auto p-5 w-full max-w-4xl">
          <div className="bg-white rounded-lg shadow-lg">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {getButtonText()}
              </h2>
              <button
                onClick={() => setShowSubmissionForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <ComplianceSubmissionForm
                currentUser={currentUser}
                onSuccess={() => {
                  setShowSubmissionForm(false);
                }}
                onCancel={() => setShowSubmissionForm(false)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${className}`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gray-100 rounded">
            <FileText className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{getButtonText()}</h3>
            <p className="text-gray-500 text-xs">{getDescription()}</p>
          </div>
        </div>
        <button
          onClick={() => setShowSubmissionForm(true)}
          className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 border border-blue-600 transition-all duration-200"
        >
          <Plus className="w-3 h-3 mr-1" />
          {getButtonText()}
        </button>
      </div>
    </div>
  );
};

export default ComplianceSubmissionButton;


import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { X, Mail, User, Building2, DollarSign, Percent, Briefcase, Copy } from 'lucide-react';

interface InvestorContactDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: {
    id: number;
    offerAmount: number;
    equityPercentage: number;
    currency: string;
    createdAt: string;
    stage: number;
    status: string;
    investorName?: string;
    investorEmail?: string;
    investorAdvisor?: {
      email: string;
      name?: string;
      code?: string;
    } | null;
  };
}

const InvestorContactDetailsModal: React.FC<InvestorContactDetailsModalProps> = ({ isOpen, onClose, offer }) => {
  const investorContact = offer.investorAdvisor || {
    email: offer.investorEmail || 'Not Available',
    name: offer.investorName || 'Investor'
  };
  
  const formatCurrency = (amount: number, currency: string) => {
    const symbols: { [key: string]: string } = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'INR': '₹',
      'JPY': '¥'
    };
    const symbol = symbols[currency] || currency;
    return `${symbol}${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStageInfo = (stage: number) => {
    const stages = {
      1: { text: 'Investor Advisor Approval', color: 'bg-blue-100 text-blue-800', icon: '🔵' },
      2: { text: 'Startup Advisor Approval', color: 'bg-purple-100 text-purple-800', icon: '🟣' },
      3: { text: 'Ready for Startup Review', color: 'bg-green-100 text-green-800', icon: '✅' },
      4: { text: 'Accepted by Startup', color: 'bg-green-100 text-green-800', icon: '🎉' }
    };
    return stages[stage as keyof typeof stages] || { text: 'Unknown Stage', color: 'bg-gray-100 text-gray-800', icon: '❓' };
  };

  const stageInfo = getStageInfo(offer.stage);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Briefcase className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Investor Contact Details</h2>
              <p className="text-sm text-slate-500">Investment offer contact information</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Offer Overview */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Investment Offer</h3>
              <p className="text-sm text-slate-600">Investment Proposal Details</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-slate-900">
                {formatCurrency(offer.offerAmount, offer.currency)}
              </div>
              <div className="text-sm text-slate-600">
                {offer.equityPercentage}% equity
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${stageInfo.color}`}>
              {stageInfo.icon} {stageInfo.text}
            </span>
            <span className="text-xs text-slate-500">
              Submitted on {formatDate(offer.createdAt)}
            </span>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h4 className="font-semibold text-slate-900 flex items-center gap-2">
            <User className="h-5 w-5 text-purple-600" />
            Investor Contact Information
          </h4>
          
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
            {/* Contact Person */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <User className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{investorContact.name || 'Investor'}</p>
                <p className="text-xs text-slate-500">
                  {offer.investorAdvisor ? 'Investment Advisor' : 'Investor'}
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{investorContact.email}</p>
                <p className="text-xs text-slate-500">Email Address</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (investorContact.email && investorContact.email !== 'Not Available') {
                    window.open(`mailto:${investorContact.email}`, '_blank');
                  }
                }}
                disabled={!investorContact.email || investorContact.email === 'Not Available'}
                className="text-blue-600 border-blue-200 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail className="h-4 w-4 mr-1" />
                Send Email
              </Button>
            </div>

            {/* Investment Advisor Code (if applicable) */}
            {offer.investorAdvisor?.code && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Investment Advisor Assigned</p>
                  <p className="text-xs text-slate-500">Code: {offer.investorAdvisor.code}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Next Steps */}
        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <h4 className="font-semibold text-slate-900 mb-2">Next Steps</h4>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>• Contact the investor directly using the provided email</li>
            <li>• Discuss investment terms and finalize the deal</li>
            <li>• Schedule meetings to complete the investment process</li>
            <li>• Prepare necessary documentation and agreements</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => {
              const email = investorContact.email;
              if (email && email !== 'Not Available') {
                window.open(`mailto:${email}`, '_blank');
              }
            }}
            disabled={!investorContact.email || investorContact.email === 'Not Available'}
            className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                // Copy contact details to clipboard
                const contactText = `Investor: ${investorContact.name || 'Investor'}
Email: ${investorContact.email}
Offer: ${formatCurrency(offer.offerAmount, offer.currency)} for ${offer.equityPercentage}% equity
Status: ${stageInfo.text}`;
                
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  await navigator.clipboard.writeText(contactText);
                  alert('Contact details copied to clipboard!');
                } else {
                  // Fallback for older browsers
                  const textarea = document.createElement('textarea');
                  textarea.value = contactText;
                  textarea.style.position = 'fixed';
                  textarea.style.opacity = '0';
                  document.body.appendChild(textarea);
                  textarea.select();
                  document.execCommand('copy');
                  document.body.removeChild(textarea);
                  alert('Contact details copied to clipboard!');
                }
              } catch (err) {
                console.error('Failed to copy to clipboard:', err);
                alert('Unable to copy. Please copy manually.');
              }
            }}
            className="flex-1"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Details
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default InvestorContactDetailsModal;


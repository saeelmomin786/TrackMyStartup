import React from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { X, Mail, User, Building2, Calendar, DollarSign, Percent, Phone, MapPin } from 'lucide-react';

interface ContactDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: {
    id: number;
    startupName: string;
    startupId: number;
    offerAmount: number;
    equityPercentage: number;
    currency: string;
    createdAt: string;
    stage: number;
    status: string;
    startup?: {
      id: number;
      name: string;
      sector: string;
      startup_user?: {
        id: string;
        email: string;
        name: string;
        investment_advisor_code?: string;
      } | null;
    } | null;
  };
}

const ContactDetailsModal: React.FC<ContactDetailsModalProps> = ({ isOpen, onClose, offer }) => {
  const startupContact = offer.startup?.startup_user;
  
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
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Contact Details</h2>
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
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">{offer.startupName}</h3>
              <p className="text-sm text-slate-600">{offer.startup?.sector || 'Unknown'}</p>
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
            <User className="h-5 w-5 text-blue-600" />
            Contact Information
          </h4>
          
          {startupContact ? (
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
              {/* Contact Person */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <User className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{startupContact.name}</p>
                  <p className="text-xs text-slate-500">Contact Person</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Mail className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{startupContact.email}</p>
                  <p className="text-xs text-slate-500">Email Address</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.open(`mailto:${startupContact.email}`, '_blank');
                  }}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  Send Email
                </Button>
              </div>

              {/* Investment Advisor (if applicable) */}
              {startupContact.investment_advisor_code && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Building2 className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Investment Advisor Assigned</p>
                    <p className="text-xs text-slate-500">Code: {startupContact.investment_advisor_code}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
              {/* Fallback: Show hardcoded contact details */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <User className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Sarvesh Gadkari</p>
                  <p className="text-xs text-slate-500">Contact Person</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Mail className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">sarveshgadkari1234@gmail.com</p>
                  <p className="text-xs text-slate-500">Email Address</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.open(`mailto:sarveshgadkari1234@gmail.com`, '_blank');
                  }}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  Send Email
                </Button>
              </div>

            </div>
          )}
        </div>

        {/* Next Steps */}
        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <h4 className="font-semibold text-slate-900 mb-2">Next Steps</h4>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>• Contact the startup directly using the provided email</li>
            <li>• Discuss investment terms and due diligence process</li>
            <li>• Schedule meetings to finalize the investment</li>
            <li>• Complete legal documentation and agreements</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => {
              const email = startupContact?.email || 'sarveshgadkari1234@gmail.com';
              window.open(`mailto:${email}`, '_blank');
            }}
            className="flex-1"
          >
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              // Copy contact details to clipboard
              const contactText = `Startup: ${offer.startupName}
Contact Person: ${startupContact?.name || 'Sarvesh Gadkari'}
Email: ${startupContact?.email || 'sarveshgadkari1234@gmail.com'}
Offer: ${formatCurrency(offer.offerAmount, offer.currency)} for ${offer.equityPercentage}% equity`;
              navigator.clipboard.writeText(contactText);
            }}
            className="flex-1"
          >
            Copy Details
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ContactDetailsModal;

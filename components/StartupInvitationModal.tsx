import React, { useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { X, Copy, Check, Share2, MessageCircle } from 'lucide-react';

interface StartupInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  startupData: {
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
  };
  facilitatorCode: string;
  facilitatorName: string;
}

const StartupInvitationModal: React.FC<StartupInvitationModalProps> = ({
  isOpen,
  onClose,
  startupData,
  facilitatorCode,
  facilitatorName
}) => {
  const [copied, setCopied] = useState(false);

  const invitationMessage = `Hello ${startupData.contactPerson},

I'm ${facilitatorName} from our facilitation center, and I'd like to invite ${startupData.name} to join TrackMyStartup - a comprehensive platform for startup growth and management.

Please make an account in TrackMyStartup and use this code to join our incubation center:

Your Facilitator Code: ${facilitatorCode}

With TrackMyStartup, you'll get access to:
• Complete startup health tracking
• Financial modeling and projections
• Compliance management
• Investor relations
• Team management
• And much more!

Please use the facilitator code above when registering on the platform to join our incubation center.

Best regards,
${facilitatorName}`;

  const handleCopyInvitation = async () => {
    try {
      await navigator.clipboard.writeText(invitationMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy invitation:', error);
    }
  };

  const handleSendInvitation = () => {
    // Open WhatsApp with the pre-drafted message
    const whatsappUrl = `https://wa.me/${startupData.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(invitationMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Share Invitation</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Startup Information */}
          <div className="bg-slate-50 rounded-lg p-3">
            <h3 className="font-medium text-slate-800 mb-2 text-sm">Startup Details</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">Startup:</span>
                <p className="font-medium text-slate-800">{startupData.name}</p>
              </div>
              <div>
                <span className="text-slate-500">Contact:</span>
                <p className="font-medium text-slate-800">{startupData.contactPerson}</p>
              </div>
            </div>
          </div>

          {/* Facilitator Code Display */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <h3 className="font-medium text-blue-800 mb-2 text-sm">Your Facilitator Code</h3>
            <div className="flex items-center gap-2">
              <span className="font-bold text-blue-900">{facilitatorCode}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyInvitation}
                className="text-blue-600 border-blue-600 hover:bg-blue-50 text-xs px-2 py-1"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Invitation Message */}
          <div>
            <h3 className="font-medium text-slate-800 mb-2 text-sm">Invitation Message</h3>
            <div className="bg-slate-50 rounded-lg p-3 max-h-32 overflow-y-auto">
              <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans">
                {invitationMessage}
              </pre>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              size="sm"
            >
              Close
            </Button>
            <Button
              onClick={handleCopyInvitation}
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-600 hover:bg-blue-50"
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy Message
            </Button>
            <Button
              onClick={handleSendInvitation}
              className="bg-green-600 hover:bg-green-700 text-white"
              size="sm"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Invite
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default StartupInvitationModal;

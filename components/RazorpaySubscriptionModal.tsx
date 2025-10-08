import React, { useEffect, useState } from 'react';
import { X, CheckCircle } from 'lucide-react';

interface RazorpaySubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscriptionSuccess: () => void;
  startupName: string;
}

const RazorpaySubscriptionModal: React.FC<RazorpaySubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSubscriptionSuccess,
  startupName
}) => {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load Razorpay script if not already loaded
      const existingScript = document.querySelector('script[src="https://cdn.razorpay.com/static/widget/subscription-button.js"]');
      
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://cdn.razorpay.com/static/widget/subscription-button.js';
        script.async = true;
        script.onload = () => setIsScriptLoaded(true);
        document.head.appendChild(script);
      } else {
        setIsScriptLoaded(true);
      }
    }
  }, [isOpen]);

  const handleSubscriptionSuccess = () => {
    setShowSuccessMessage(true);
    // Auto-close after 2 seconds and call the success callback
    setTimeout(() => {
      onSubscriptionSuccess();
      onClose();
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Subscribe to Track My Startup
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          {showSuccessMessage ? (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Subscription Successful!</h4>
              <p className="text-sm text-gray-600">
                Processing your request to approve <span className="font-semibold">{startupName}</span>...
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  To approve <span className="font-semibold text-gray-900">{startupName}</span> and add them to your portfolio, 
                  you need an active subscription.
                </p>
                <p className="text-sm text-gray-500">
                  Choose your subscription plan below:
                </p>
              </div>
              
              <div className="mb-6">
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">
                    This modal is for approving startup requests. 
                    <br />
                    Please use the "Start Your Free Trial" button for trial subscriptions.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubscriptionSuccess}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Continue After Payment
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RazorpaySubscriptionModal;

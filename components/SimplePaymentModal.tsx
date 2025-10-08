import React, { useState } from 'react';
import { X, CreditCard, CheckCircle, Loader2 } from 'lucide-react';

interface SimplePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  applicationId: string;
  amount: number;
  currency: string;
  startupName: string;
  programName: string;
}

const SimplePaymentModal: React.FC<SimplePaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
  applicationId,
  amount,
  currency,
  startupName,
  programName
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // Create Razorpay order
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          currency: currency,
          receipt: `simple_payment_${applicationId}_${Date.now()}`
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create payment order: ${response.status} ${errorText}`);
      }

      const order = await response.json();

      // Initialize Razorpay
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_RMzc3DoDdGLh9u',
        amount: order.amount,
        currency: order.currency,
        name: 'Track My Startup',
        description: `Payment - ${programName}`,
        order_id: order.id,
        handler: function (response: any) {
          console.log('Payment successful:', response);
          setIsSuccess(true);
          setTimeout(() => {
            onPaymentSuccess();
            onClose();
          }, 2000);
        },
        prefill: {
          name: startupName,
          email: '', // You can get this from user context
        },
        theme: {
          color: '#3B82F6'
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Payment error:', error);
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Payment Processing</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center">
          {!isSuccess ? (
            <>
              <div className="mb-4">
                <CreditCard className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-slate-900 mb-2">
                  Incubation Program Payment
                </h4>
                <p className="text-slate-600 mb-4">
                  {programName} - {startupName}
                </p>
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <div className="text-2xl font-bold text-slate-900">
                    {currency} {amount.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    Razorpay Payment Gateway
                  </div>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Processing Payment...
                  </div>
                ) : (
                  'Pay Now'
                )}
              </button>
            </>
          ) : (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h4 className="text-xl font-semibold text-green-900 mb-2">
                Payment Successful!
              </h4>
              <p className="text-green-600">
                Your payment has been processed successfully.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimplePaymentModal;













import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Loader2, CreditCard } from 'lucide-react';
import { incubationPaymentService } from '../lib/incubationPaymentService';

interface IncubationPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  applicationId: string;
  amount: number;
  currency?: string;
  startupName: string;
  programName: string;
}

const IncubationPaymentModal: React.FC<IncubationPaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
  applicationId,
  amount,
  currency = 'INR',
  startupName,
  programName
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    if (isOpen && !razorpayLoaded) {
      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => setRazorpayLoaded(true);
      script.onerror = () => setError('Failed to load Razorpay');
      document.head.appendChild(script);

      return () => {
        // Cleanup script on unmount
        const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
        if (existingScript) {
          existingScript.remove();
        }
      };
    }
  }, [isOpen, razorpayLoaded]);

  const handlePayment = async () => {
    setIsLoading(true);
    setError(null);
    setPaymentStatus('processing');
    
    try {
      // Create Razorpay order
      const orderData = await incubationPaymentService.createRazorpayOrder(
        applicationId,
        amount,
        currency
      );

      // Initialize Razorpay payment
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_RMzc3DoDdGLh9u',
        amount: orderData.amount,
        currency: currency,
        name: 'Track My Startup',
        description: `Incubation Program Payment - ${programName}`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          console.log('Payment successful:', response);
          setPaymentStatus('success');
          onPaymentSuccess();
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
            setIsLoading(false);
            setPaymentStatus('idle');
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Payment error:', error);
      setError('Payment failed. Please try again.');
      setPaymentStatus('failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Process Payment</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center">
          {paymentStatus === 'success' ? (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h4 className="text-xl font-semibold text-green-900 mb-2">
                Payment Successful!
              </h4>
              <p className="text-green-600">
                Your payment has been processed successfully.
              </p>
            </div>
          ) : paymentStatus === 'failed' ? (
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h4 className="text-xl font-semibold text-red-900 mb-2">
                Payment Failed
              </h4>
              <p className="text-red-600 mb-4">
                {error || 'Payment could not be processed. Please try again.'}
              </p>
              <button
                onClick={() => {
                  setPaymentStatus('idle');
                  setError(null);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h4 className="text-xl font-semibold text-slate-900 mb-2">
                  Payment Details
                </h4>
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <div className="text-2xl font-bold text-slate-900">
                    {currency} {amount.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    {programName} - {startupName}
                  </div>
                </div>
                <p className="text-slate-600 text-sm">
                  Secure payment powered by Razorpay
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handlePayment}
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay ${currency} ${amount.toLocaleString()}`
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      
    </div>
  );
};

export default IncubationPaymentModal;













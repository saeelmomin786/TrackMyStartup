import React, { useState } from 'react';
import { X, CreditCard, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { realRazorpayService } from '../lib/realRazorpayService';
import { mockPaymentService } from '../lib/mockPaymentService';

interface RealPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  applicationId: string;
  amount: number;
  currency: string;
  facilitatorName: string;
  programName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

const RealPaymentModal: React.FC<RealPaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
  applicationId,
  amount,
  currency,
  facilitatorName,
  programName,
  customerName,
  customerEmail,
  customerPhone
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Create Razorpay order
      const orderData = await realRazorpayService.createOrder(
        applicationId,
        amount,
        currency,
        `order_${applicationId}_${Date.now()}`
      );

      // Initialize Razorpay payment
      await realRazorpayService.initializePayment(
        orderData.orderId,
        orderData.amount,
        orderData.currency,
        'Incubation Program',
        `Payment for ${programName}`,
        customerName,
        customerEmail,
        customerPhone,
        // Success handler
        async (response) => {
          console.log('Payment successful:', response);
          
          // Verify payment signature
          const isVerified = await realRazorpayService.verifyPayment(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature
          );

          if (isVerified) {
            // Update payment status
            await realRazorpayService.updatePaymentStatus(
              applicationId,
              response.razorpay_payment_id,
              'paid',
              response.razorpay_payment_id
            );

            setIsSuccess(true);
            setTimeout(() => {
              onPaymentSuccess();
              onClose();
            }, 2000);
          } else {
            throw new Error('Payment verification failed');
          }
        },
        // Error handler
        (error) => {
          console.error('Payment error:', error);
          setError(error.message || 'Payment failed. Please try again.');
          setIsProcessing(false);
        }
      );
    } catch (error) {
      console.error('Payment error:', error);
      setError(error instanceof Error ? error.message : 'Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Payment Required</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center">
          {isSuccess ? (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h4 className="text-xl font-semibold text-green-900 mb-2">
                Payment Successful!
              </h4>
              <p className="text-green-600">
                Your payment has been processed successfully.
              </p>
            </div>
          ) : error ? (
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h4 className="text-xl font-semibold text-red-900 mb-2">
                Payment Failed
              </h4>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setIsProcessing(false);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <CreditCard className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-slate-900 mb-2">
                  Program Fee Payment
                </h4>
                <p className="text-slate-600 mb-4">
                  {programName} - {facilitatorName}
                </p>
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <div className="text-2xl font-bold text-slate-900">
                    {currency} {amount.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    Incubation Program Fee
                  </div>
                </div>
                <div className="text-sm text-slate-600 mb-4">
                  <p><strong>Customer:</strong> {customerName}</p>
                  <p><strong>Email:</strong> {customerEmail}</p>
                  <p><strong>Phone:</strong> {customerPhone}</p>
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
                  'Pay with Razorpay'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealPaymentModal;

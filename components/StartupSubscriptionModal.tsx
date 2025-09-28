import React, { useState, useEffect } from 'react';
import { X, CheckCircle, CreditCard, Calendar, Percent, Shield } from 'lucide-react';
import Button from './ui/Button';

interface StartupSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscriptionSuccess: () => void;
  startupName: string;
}

const StartupSubscriptionModal: React.FC<StartupSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSubscriptionSuccess,
  startupName
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Pricing configuration
  const pricing = {
    monthly: {
      base: 1500,
      gst: 270, // 18% GST
      total: 1770,
      discount: 1416, // 80% discount for first year
      final: 354
    },
    yearly: {
      base: 15000,
      gst: 2700, // 18% GST
      total: 17700,
      discount: 14160, // 80% discount for first year
      final: 3540
    }
  };

  const currentPricing = pricing[selectedPlan];

  useEffect(() => {
    if (isOpen) {
      // Load Razorpay script if not already loaded
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.head.appendChild(script);
      }
    }
  }, [isOpen]);

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // Create payment order
      const response = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: currentPricing.final * 100, // Convert to paise
          currency: 'INR',
          plan: selectedPlan,
          startupName: startupName
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment order');
      }

      const order = await response.json();

      // Initialize Razorpay
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_1234567890', // Replace with your Razorpay key
        amount: order.amount,
        currency: order.currency,
        name: 'Track My Startup',
        description: `Startup Subscription - ${selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'} Plan`,
        order_id: order.id,
        handler: function (response: any) {
          console.log('Payment successful:', response);
          handleSubscriptionSuccess();
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
      alert('Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleSubscriptionSuccess = () => {
    setShowSuccessMessage(true);
    setIsProcessing(false);
    // Auto-close after 3 seconds and call the success callback
    setTimeout(() => {
      onSubscriptionSuccess();
      onClose();
    }, 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Startup Subscription
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          {showSuccessMessage ? (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Subscription Successful!</h4>
              <p className="text-sm text-gray-600">
                Your {selectedPlan === 'monthly' ? 'monthly' : 'yearly'} subscription is now active.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  Choose your subscription plan for <span className="font-semibold text-gray-900">{startupName}</span>:
                </p>
                
                {/* Plan Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div 
                    className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                      selectedPlan === 'monthly' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPlan('monthly')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">Monthly Plan</h4>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">₹354</div>
                      <div className="text-sm text-gray-500">per month</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Base price:</span>
                      <span>₹1,500</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST (18%):</span>
                      <span>₹270</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>First year discount (80%):</span>
                      <span>-₹1,416</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <Percent className="h-3 w-3 mr-1" />
                      80% OFF First Year
                    </span>
                  </div>
                  </div>

                  <div 
                    className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                      selectedPlan === 'yearly' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPlan('yearly')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">Yearly Plan</h4>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">₹3,540</div>
                        <div className="text-sm text-gray-500">per year</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Base price:</span>
                        <span>₹15,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST (18%):</span>
                        <span>₹2,700</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>First year discount (80%):</span>
                        <span>-₹14,160</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Percent className="h-3 w-3 mr-1" />
                        80% OFF First Year
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pricing Breakdown */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Payment Summary
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Plan:</span>
                      <span className="font-medium">{selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Base amount:</span>
                      <span>₹{currentPricing.base.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST (18%):</span>
                      <span>₹{currentPricing.gst.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>First year discount (80%):</span>
                      <span>-₹{currentPricing.discount.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2">
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Total:</span>
                        <span>₹{currentPricing.final.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="mb-4">
                  <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    What's Included
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Full platform access</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Compliance tracking</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Investment management</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Financial reporting</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Team collaboration</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Priority support</span>
                    </div>
                  </div>
                </div>

                {/* Payment Button */}
                <Button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Pay ₹{currentPricing.final.toLocaleString()} {selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'}
                    </div>
                  )}
                </Button>

                {/* Security Notice */}
                <div className="text-xs text-gray-500 text-center mt-4">
                  <p>🔒 Secure payment processing • Cancel anytime • No setup fees</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StartupSubscriptionModal;

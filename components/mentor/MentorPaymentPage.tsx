import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { mentorService } from '../../lib/mentorService';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { ArrowLeft, CreditCard, CheckCircle, XCircle, Loader } from 'lucide-react';

// Declare PayPal types
declare global {
  interface Window {
    paypal?: {
      Buttons: (config: any) => {
        render: (container: string) => void;
      };
    };
  }
}

interface MentorPaymentPageProps {
  assignmentId?: number;
  onPaymentSuccess?: () => void;
}

const MentorPaymentPage: React.FC<MentorPaymentPageProps> = ({ 
  assignmentId: propAssignmentId,
  onPaymentSuccess 
}) => {
  // Get assignmentId from URL query params (works without React Router)
  const urlParams = new URLSearchParams(window.location.search);
  const assignmentIdParam = urlParams.get('assignmentId');
  const assignmentId = propAssignmentId || (assignmentIdParam ? parseInt(assignmentIdParam) : null);

  const [assignment, setAssignment] = useState<any>(null);
  const [mentor, setMentor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (assignmentId) {
      loadAssignmentData();
    } else {
      setError('Assignment ID is required');
      setLoading(false);
    }
  }, [assignmentId]);

  const loadAssignmentData = async () => {
    try {
      setLoading(true);
      
      // Get assignment details
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('mentor_startup_assignments')
        .select('*')
        .eq('id', assignmentId)
        .single();

      if (assignmentError || !assignmentData) {
        throw new Error('Assignment not found');
      }

      setAssignment(assignmentData);

      // Get mentor profile
      const { data: mentorProfile, error: mentorError } = await supabase
        .from('mentor_profiles')
        .select('mentor_name')
        .eq('user_id', assignmentData.mentor_id)
        .single();

      if (!mentorError && mentorProfile) {
        setMentor(mentorProfile);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Error loading assignment:', err);
      setError(err.message || 'Failed to load assignment details');
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string): string => {
    const currencySymbols: { [key: string]: string } = {
      'USD': '$',
      'INR': '₹',
      'EUR': '€',
      'GBP': '£',
      'SGD': 'S$',
      'AED': 'AED '
    };
    const symbol = currencySymbols[currency] || currency || '$';
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleRazorpayPayment = async () => {
    if (!assignment) return;

    try {
      setProcessing(true);
      setError(null);

      // Create Razorpay order
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: assignment.fee_amount,
          currency: 'INR',
          receipt: `mentor_payment_${assignmentId}_${Date.now()}`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create Razorpay order');
      }

      const order = await response.json();

      // Store order ID in payment record immediately
      const { error: orderIdError } = await supabase
        .from('mentor_payments')
        .update({ razorpay_order_id: order.id })
        .eq('assignment_id', assignmentId);

      if (orderIdError) {
        console.warn('Warning: Could not store order ID:', orderIdError);
      }

      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      
      script.onload = () => {
        if ((window as any).Razorpay) {
          const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID,
            amount: order.amount, // Amount in paise
            currency: 'INR',
            name: 'Track My Startup',
            description: `Payment for mentor: ${mentor?.mentor_name || 'Mentor'}`,
            order_id: order.id,
            handler: async (response: any) => {
              try {
                // Verify payment
                const verifyResponse = await fetch('/api/payment/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    assignment_id: assignmentId // Pass assignment_id for mentor payment lookup
                  }),
                });

                if (!verifyResponse.ok) {
                  throw new Error('Payment verification failed');
                }

                // Complete payment in database
                const success = await mentorService.completePayment(assignmentId!, response.razorpay_payment_id);
                
                if (success) {
                  setPaymentSuccess(true);
                  setProcessing(false);
                  
                  if (onPaymentSuccess) {
                    setTimeout(() => {
                      onPaymentSuccess();
                    }, 2000);
                  }
                } else {
                  throw new Error('Failed to complete payment');
                }
              } catch (err: any) {
                console.error('Payment error:', err);
                setError(err.message || 'Payment failed. Please try again.');
                setProcessing(false);
              }
            },
            prefill: {
              name: 'Startup User',
              email: '',
            },
            theme: {
              color: '#1e40af',
            },
            modal: {
              ondismiss: () => {
                setError('Payment was cancelled.');
                setProcessing(false);
              }
            }
          };

          const razorpay = new (window as any).Razorpay(options);
          razorpay.open();
        }
      };

      document.body.appendChild(script);
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Failed to initiate payment');
      setProcessing(false);
    }
  };

  const handlePayPalPayment = async () => {
    if (!assignment) return;

    try {
      setProcessing(true);
      setError(null);

      // Create PayPal order
      const response = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: assignment.fee_amount,
          currency: assignment.fee_currency || 'USD',
          description: `Payment for mentor: ${mentor?.mentor_name || 'Mentor'}`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create PayPal order');
      }

      const { orderId } = await response.json();

      // Store order ID in payment record immediately (for webhook matching)
      const { error: orderIdError } = await supabase
        .from('mentor_payments')
        .update({ paypal_order_id: orderId })
        .eq('assignment_id', assignmentId);

      if (orderIdError) {
        console.warn('Warning: Could not store order ID:', orderIdError);
      }

      // Load PayPal SDK
      const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || process.env.VITE_PAYPAL_CLIENT_ID;
      if (!paypalClientId) {
        throw new Error('PayPal client ID not configured');
      }
      
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=${assignment.fee_currency || 'USD'}`;
      script.async = true;
      
      script.onload = () => {
        if (window.paypal) {
          window.paypal.Buttons({
            createOrder: (data: any, actions: any) => {
              // Use the order ID we already created on server
              return orderId;
            },
            onApprove: async (data: any, actions: any) => {
              try {
                const order = await actions.order.capture();
                
                // Verify payment with backend to ensure proper database updates
                const verifyResponse = await fetch('/api/paypal/verify', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    paypal_order_id: order.id,
                    assignment_id: assignmentId
                  }),
                });

                if (!verifyResponse.ok) {
                  const errorData = await verifyResponse.json();
                  throw new Error(errorData.error || 'Payment verification failed');
                }

                const verifyResult = await verifyResponse.json();
                
                if (verifyResult.success) {
                  setPaymentSuccess(true);
                  setProcessing(false);
                  
                  // Call success callback
                  if (onPaymentSuccess) {
                    setTimeout(() => {
                      onPaymentSuccess();
                    }, 2000);
                  }
                } else {
                  throw new Error('Payment verification failed');
                }
              } catch (err: any) {
                console.error('Payment error:', err);
                setError(err.message || 'Payment failed. Please try again.');
                setProcessing(false);
              }
            },
            onError: (err: any) => {
              console.error('PayPal error:', err);
              setError('Payment failed. Please try again.');
              setProcessing(false);
            },
            onCancel: () => {
              setError('Payment was cancelled.');
              setProcessing(false);
            }
          }).render('#paypal-button-container');
        }
      };

      document.body.appendChild(script);
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Failed to initiate payment');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-slate-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error && !paymentSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Error</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <Button onClick={() => window.history.back()} variant="secondary">
              Go Back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Payment Successful!</h2>
            <p className="text-slate-600 mb-6">
              Your payment of {formatCurrency(assignment?.fee_amount || 0, assignment?.fee_currency || 'USD')} has been processed successfully.
            </p>
            <Button onClick={() => window.location.href = '/dashboard'}>
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => window.history.back()}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card>
          <div className="p-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Complete Payment</h1>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Mentor:</span>
                <span className="font-semibold text-slate-800">
                  {mentor?.mentor_name || 'Mentor'}
                </span>
              </div>

              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Amount:</span>
                <span className="text-2xl font-bold text-slate-800">
                  {formatCurrency(assignment?.fee_amount || 0, assignment?.fee_currency || 'USD')}
                </span>
              </div>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Payment Method
              </h2>

              <div className="mb-4">
                {assignment?.fee_currency === 'INR' ? (
                  <>
                    <p className="text-sm text-slate-600 mb-4">
                      Pay securely with Razorpay. Your payment will be processed in INR.
                    </p>
                    {!processing && (
                      <Button
                        onClick={handleRazorpayPayment}
                        className="w-full"
                        disabled={processing}
                      >
                        {processing ? 'Processing...' : 'Pay with Razorpay'}
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-600 mb-4">
                      Pay securely with PayPal. Your payment will be processed in {assignment?.fee_currency || 'USD'}.
                    </p>
                    
                    <div id="paypal-button-container" className="mb-4"></div>
                    
                    {!processing && (
                      <Button
                        onClick={handlePayPalPayment}
                        className="w-full"
                        disabled={processing}
                      >
                        {processing ? 'Processing...' : 'Pay with PayPal'}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MentorPaymentPage;

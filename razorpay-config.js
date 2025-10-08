// Razorpay Configuration
// SECURITY WARNING: Never put secret keys in this file!
// Use environment variables instead (.env.local)

export const RAZORPAY_CONFIG = {
  // Get keys from environment variables (secure)
  keyId: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_your_actual_key_here',
  keySecret: import.meta.env.VITE_RAZORPAY_KEY_SECRET || 'your_actual_secret_here',
  
  // Environment
  environment: import.meta.env.VITE_RAZORPAY_ENVIRONMENT || 'test',
  
  // Currency
  currency: 'INR',
  
  // Company details
  companyName: 'Track My Startup',
  companyDescription: 'Incubation Program Payment'
};

// Test card details for testing
export const TEST_CARD_DETAILS = {
  cardNumber: '4111 1111 1111 1111',
  expiryDate: '12/25',
  cvv: '123',
  name: 'Test User',
  email: 'test@example.com',
  phone: '9999999999'
};

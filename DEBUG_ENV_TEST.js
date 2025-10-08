// Debug Environment Variables Test
console.log('🔍 Environment Variables Debug:');
console.log('VITE_RAZORPAY_KEY_ID:', import.meta.env.VITE_RAZORPAY_KEY_ID);
console.log('VITE_RAZORPAY_KEY_SECRET:', import.meta.env.VITE_RAZORPAY_KEY_SECRET);
console.log('VITE_RAZORPAY_ENVIRONMENT:', import.meta.env.VITE_RAZORPAY_ENVIRONMENT);

// Check if keys are loaded
const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_1234567890abcdef';
const keySecret = import.meta.env.VITE_RAZORPAY_KEY_SECRET || 'mock_secret_for_testing';

console.log('🔑 Final Keys:');
console.log('Key ID:', keyId);
console.log('Key Secret:', keySecret);

// Check development mode logic
const isDevelopment = keyId.includes('your_actual_key_here') || 
                     keySecret.includes('your_actual_secret_here') ||
                     keyId.includes('rzp_test_1234567890abcdef') ||
                     keySecret.includes('mock_secret_for_testing');

console.log('🔧 Development Mode:', isDevelopment);
console.log('🎯 Will use:', isDevelopment ? 'MOCK PAYMENT' : 'REAL RAZORPAY');













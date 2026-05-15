import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Return public configuration (safe to expose)
    const config = {
      razorpayKeyId: process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || null,
      razorpayEnvironment: process.env.VITE_RAZORPAY_ENVIRONMENT || process.env.RAZORPAY_ENVIRONMENT || 'test',
      paypalClientId: process.env.VITE_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || null,
    };

    return res.status(200).json(config);
  } catch (error) {
    console.error('Config API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * REDIRECT: This endpoint is maintained for backward compatibility
 * The actual payment verification logic is in /api/payment/verify.ts
 * This just forwards requests to the consolidated payment endpoint
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Forward to the consolidated payment verification endpoint
  // This maintains backward compatibility for code calling /api/razorpay/verify
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Import the payment verify handler dynamically
    const paymentVerify = await import('../payment/verify');
    return paymentVerify.default(req, res);
  } catch (error) {
    console.error('Error forwarding to payment verify:', error);
    return res.status(500).json({
      error: 'Payment verification failed: ' + (error as Error).message,
    });
  }
}

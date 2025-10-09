export const config = { runtime: 'nodejs' } as const;

import crypto from 'crypto';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const payload = req.body.toString();
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    if (!webhookSecret) return res.status(500).json({ error: 'Webhook secret not configured' });

    const expected = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');
    if (expected !== signature) return res.status(401).json({ error: 'Invalid signature' });

    const event = JSON.parse(payload);
    console.log('Razorpay webhook event:', event?.event);

    // Handle subscription events
    if (event.event === 'subscription.activated') {
      console.log('Subscription activated:', event.payload.subscription.id);
      try {
        const sub = event.payload?.subscription;
        const customerId = sub?.customer_id;
        const userId = sub?.notes?.user_id;
        
        if (customerId && userId && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
          await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ 
              razorpay_customer_id: customerId, 
              updated_at: new Date().toISOString() 
            })
          });
        }
      } catch (e) {
        console.warn('Failed to persist razorpay_customer_id on subscription.activated:', e);
      }
    }

    if (event.event === 'subscription.charged') {
      console.log('Subscription charged:', event.payload.subscription.id);
      // Handle subscription charged event
    }

    if (event.event === 'subscription.paused') {
      console.log('Subscription paused:', event.payload.subscription.id);
    }

    if (event.event === 'subscription.cancelled') {
      console.log('Subscription cancelled:', event.payload.subscription.id);
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('Webhook error:', e);
    return res.status(500).json({ error: 'Server error', details: e?.message || String(e) });
  }
}
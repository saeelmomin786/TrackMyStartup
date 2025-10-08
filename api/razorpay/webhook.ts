// Webhook requires raw body for signature verification; use Node runtime and disable body parsing
export const config = { api: { bodyParser: false } } as const;

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      req.on('end', () => resolve());
      req.on('error', reject);
    });
    const raw = Buffer.concat(chunks);

    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(500).json({ error: 'Webhook secret not configured' });

    const expected = crypto.createHmac('sha256', webhookSecret).update(raw).digest('hex');
    if (!signature || expected !== signature) return res.status(401).json({ error: 'Invalid signature' });

    const event = JSON.parse(raw.toString('utf8'));
    console.log('Razorpay webhook event:', event?.event);

    // TODO: replicate server.js side-effects if needed (persist customer id, update subscription status)
    // For now, acknowledge
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(400).json({ error: 'Invalid payload', details: e?.message || String(e) });
  }
}



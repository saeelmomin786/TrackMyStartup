import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';
import { getKeys } from '../_utils/razorpay';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { amount, currency = 'INR', receipt } = req.body || {};
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const { keyId, keySecret } = getKeys();
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const r = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({ amount: Math.round(amount), currency, receipt, payment_capture: 1 })
    });
    if (!r.ok) return res.status(r.status).send(await r.text());
    const order = await r.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.json(order);
  } catch (e:any) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
}



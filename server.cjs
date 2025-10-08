// Lightweight local API server for Razorpay orders (CommonJS)
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const crypto = require('crypto');
// Load env with override, try .env.backend.local first, then .env.local
require('dotenv').config({ path: '.env.backend.local', override: true });
require('dotenv').config({ path: '.env.local', override: true });
require('dotenv').config({ path: '.env.development', override: true });

const app = express();
app.use(cors());
app.use(express.json());

// Log Razorpay key status at startup
const hasKeyId = Boolean(process.env.RAZORPAY_KEY_ID);
const hasKeySecret = Boolean(process.env.RAZORPAY_KEY_SECRET);
console.log(`Razorpay key present on server: ${hasKeyId && hasKeySecret ? 'FOUND' : 'MISSING'}`);

// Healthcheck
app.get('/', (_req, res) => res.send('OK'));
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/razorpay/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return res.status(500).json({ error: 'Razorpay keys not configured' });

    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const r = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({ amount: Math.round(amount * 100), currency, receipt, payment_capture: 1 })
    });
    if (!r.ok) {
      const txt = await r.text();
      console.error('Razorpay order error:', r.status, txt);
      return res.status(r.status).send(txt);
    }
    const order = await r.json();
    res.json(order);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify signature
app.post('/api/razorpay/verify', (req, res) => {
  try {
    const { order_id, payment_id, signature } = req.body || {};
    const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!order_id || !payment_id || !signature) return res.status(400).json({ verified: false, error: 'Missing fields' });
    if (!keySecret) return res.status(500).json({ verified: false, error: 'Server key missing' });
    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${order_id}|${payment_id}`);
    const digest = hmac.digest('hex');
    const verified = digest === signature;
    return res.json({ verified });
  } catch (e) {
    console.error('Verify error:', e);
    return res.status(500).json({ verified: false, error: 'Server error' });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  const kid = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '';
  console.log(`Local API running on http://localhost:${port}`);
  console.log('Razorpay key present on server:', kid ? kid.slice(0,8) + '…' : 'MISSING');
});



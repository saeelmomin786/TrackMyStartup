export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const body = await req.json();
    const amount = Number(body?.amount);
    const currency = typeof body?.currency === 'string' ? body.currency : 'INR';
    const receipt = typeof body?.receipt === 'string' ? body.receipt : undefined;

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return new Response(JSON.stringify({ error: 'Razorpay keys not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const authHeader = 'Basic ' + btoa(`${keyId}:${keySecret}`);

    const r = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({ amount: Math.round(amount * 100), currency, receipt, payment_capture: 1 })
    });

    if (!r.ok) {
      const text = await r.text();
      return new Response(text, { status: r.status });
    }
    const order = await r.json();
    return new Response(JSON.stringify(order), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Server error', details: e?.message || String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}



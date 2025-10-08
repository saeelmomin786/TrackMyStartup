export const config = { runtime: 'edge' };

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    const { customer_id } = await req.json() || {};
    if (!customer_id) return json(400, { error: 'customer_id is required' });

    const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return json(500, { error: 'Razorpay keys not configured' });

    const authHeader = 'Basic ' + btoa(`${keyId}:${keySecret}`);

    const cancelled: string[] = [];
    try {
      const listSubs = await fetch(`https://api.razorpay.com/v1/subscriptions?customer_id=${encodeURIComponent(customer_id)}&status=active`, {
        headers: { Authorization: authHeader }
      });
      if (listSubs.ok) {
        const data = await listSubs.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        for (const sub of items) {
          try {
            const r = await fetch(`https://api.razorpay.com/v1/subscriptions/${sub.id}/cancel`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: authHeader },
              body: JSON.stringify({ cancel_at_cycle_end: 0 })
            });
            if (r.ok) cancelled.push(sub.id);
          } catch {}
        }
      }
    } catch {}

    const deletedTokens: string[] = [];
    try {
      const listTokens = await fetch(`https://api.razorpay.com/v1/customers/${encodeURIComponent(customer_id)}/tokens`, {
        headers: { Authorization: authHeader }
      });
      if (listTokens.ok) {
        const data = await listTokens.json();
        const tokens = Array.isArray(data?.items) ? data.items : [];
        for (const token of tokens) {
          try {
            const r = await fetch(`https://api.razorpay.com/v1/customers/${encodeURIComponent(customer_id)}/tokens/${token.id}`, {
              method: 'DELETE',
              headers: { Authorization: authHeader }
            });
            if (r.ok) deletedTokens.push(token.id);
          } catch {}
        }
      }
    } catch {}

    return json(200, { ok: true, cancelled_subscriptions: cancelled, deleted_tokens: deletedTokens });
  } catch (e: any) {
    return json(500, { error: 'Server error', details: e?.message || String(e) });
  }
}



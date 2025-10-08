export const config = { runtime: 'edge' };

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const { user_id, plan_type = 'monthly', startup_count = 1 } = await req.json();
    if (!user_id) return json(400, { error: 'user_id is required' });

    const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return json(500, { error: 'Razorpay keys not configured' });

    let plan_id: string | undefined;
    if (plan_type === 'yearly') plan_id = process.env.RAZORPAY_STARTUP_PLAN_ID_YEARLY || process.env.RAZORPAY_STARTUP_PLAN_ID;
    else plan_id = process.env.RAZORPAY_STARTUP_PLAN_ID_MONTHLY || process.env.RAZORPAY_STARTUP_PLAN_ID;
    if (!plan_id) return json(400, { error: `Plan ID not configured for ${plan_type} plan` });

    const authHeader = 'Basic ' + btoa(`${keyId}:${keySecret}`);

    const r = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({
        plan_id,
        total_count: plan_type === 'yearly' ? 1 : 12,
        customer_notify: 1,
        notes: { user_id, startup_count, trial_startup: 'true', plan_type }
      })
    });

    if (!r.ok) return new Response(await r.text(), { status: r.status });
    const sub = await r.json();
    return json(200, sub);
  } catch (e: any) {
    return json(500, { error: 'Server error', details: e?.message || String(e) });
  }
}



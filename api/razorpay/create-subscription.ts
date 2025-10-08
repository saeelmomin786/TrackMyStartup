export const config = { runtime: 'edge' };

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const { plan_id: bodyPlanId, total_count = 12, customer_notify = 1, user_id, include_trial = false, trial_seconds, trial_days = 7 } = await req.json();

    const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return json(500, { error: 'Razorpay keys not configured' });

    const plan_id = bodyPlanId || process.env.RAZORPAY_STARTUP_PLAN_ID || process.env.RAZORPAY_STARTUP_PLAN_ID_MONTHLY;
    if (!plan_id) return json(400, { error: 'plan_id not provided and RAZORPAY_STARTUP_PLAN_ID(_MONTHLY) not set' });

    const authHeader = 'Basic ' + btoa(`${keyId}:${keySecret}`);

    const payload: any = {
      plan_id,
      total_count,
      customer_notify,
      notes: { user_id, trial_startup: 'true' }
    };
    if (include_trial === true) {
      const trialPeriod = typeof trial_seconds === 'number' ? Math.max(0, Math.floor(trial_seconds)) : (process.env.NODE_ENV === 'production' ? (trial_days * 24 * 60 * 60) : 120);
      (payload as any).trial_period = trialPeriod;
    }

    const r = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify(payload)
    });

    if (!r.ok) return new Response(await r.text(), { status: r.status });
    const sub = await r.json();
    return json(200, sub);
  } catch (e: any) {
    return json(500, { error: 'Server error', details: e?.message || String(e) });
  }
}



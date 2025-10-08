export const config = { runtime: 'edge' };

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    const { user_id, razorpay_subscription_id, plan_type = 'monthly', startup_count = 1 } = await req.json();
    if (!user_id) return json(400, { error: 'user_id is required' });
    if (!razorpay_subscription_id) return json(400, { error: 'razorpay_subscription_id is required' });

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return json(500, { error: 'Supabase service not configured' });

    // Resolve plan by plan_type
    const planResp = await fetch(`${supabaseUrl}/rest/v1/subscription_plans?user_type=eq.Startup&billing_interval=eq.${plan_type}&is_active=eq.true&select=id,price,billing_interval`, {
      headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey }
    });
    if (!planResp.ok) return new Response(await planResp.text(), { status: planResp.status });
    const plans = await planResp.json();
    const plan = Array.isArray(plans) && plans.length > 0 ? plans[0] : null;
    if (!plan) return json(400, { error: `No active Startup plan found for ${plan_type}` });

    const now = new Date();
    const periodMs = plan.billing_interval === 'yearly' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    const body = [{
      user_id,
      plan_id: plan.id,
      status: 'active',
      startup_count,
      amount: plan.price * startup_count,
      billing_interval: plan.billing_interval,
      interval: plan.billing_interval,
      is_in_trial: false,
      trial_start: null,
      trial_end: null,
      razorpay_subscription_id,
      current_period_start: now.toISOString(),
      current_period_end: new Date(now.getTime() + periodMs).toISOString(),
      updated_at: now.toISOString()
    }];

    const upsertResp = await fetch(`${supabaseUrl}/rest/v1/user_subscriptions?on_conflict=user_id,plan_id`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify(body)
    });
    if (!upsertResp.ok) return new Response(await upsertResp.text(), { status: upsertResp.status });
    const inserted = await upsertResp.json();
    return json(200, Array.isArray(inserted) ? inserted[0] : inserted);
  } catch (e: any) {
    return json(500, { error: 'Server error', details: e?.message || String(e) });
  }
}



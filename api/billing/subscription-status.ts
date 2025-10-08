export const config = { runtime: 'edge' };

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return json(405, { error: 'Method not allowed' });
  const url = new URL(req.url);
  const userId = url.searchParams.get('user_id');
  if (!userId) return json(400, { error: 'user_id is required' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return json(500, { error: 'Supabase service not configured' });

  const r = await fetch(`${supabaseUrl}/rest/v1/user_subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=status,is_in_trial,trial_end,current_period_end`, {
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey
    }
  });
  if (!r.ok) return new Response(await r.text(), { status: r.status });
  const rows = await r.json();
  const sub = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  return json(200, {
    status: sub?.status || null,
    is_in_trial: sub?.is_in_trial || false,
    trial_end: sub?.trial_end || null,
    current_period_end: sub?.current_period_end || null
  });
}



import type { VercelRequest, VercelResponse } from '@vercel/node';

/** Node serverless (merged into catch-all); same behaviour as previous Edge route. */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const raw = req.query.user_id;
  const userId = Array.isArray(raw) ? raw[0] : raw;
  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'user_id is required' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    res.status(500).json({ error: 'Supabase service not configured' });
    return;
  }

  const r = await fetch(
    `${supabaseUrl}/rest/v1/user_subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=status,is_in_trial,trial_end,current_period_end`,
    {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    }
  );

  if (!r.ok) {
    res.status(r.status).send(await r.text());
    return;
  }

  const rows = await r.json();
  const sub = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  res.status(200).json({
    status: sub?.status || null,
    is_in_trial: sub?.is_in_trial || false,
    trial_end: sub?.trial_end || null,
    current_period_end: sub?.current_period_end || null,
  });
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../_utils/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('subscription_plans').select('id,name').limit(1);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.json({ ok: true, sample: data || [], error: error?.message || null });
  } catch (e:any) {
    return res.status(500).json({ ok: false, error: e?.message || 'Server error' });
  }
}



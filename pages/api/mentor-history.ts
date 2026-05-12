import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mentorId } = req.query;

  if (!mentorId) {
    return res.status(400).json({ error: 'Mentor ID is required' });
  }

  try {
    const { data, error } = await supabase
      .from('mentor_assignment_history')
      .select('*')
      .eq('mentor_user_id', mentorId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.status(200).json(data || []);
  } catch (error) {
    console.error('Error fetching mentor history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
}

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
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mentorId, isActive } = req.body;

  if (!mentorId || isActive === undefined) {
    return res.status(400).json({ error: 'Mentor ID and isActive status are required' });
  }

  try {
    // Update mentor profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ is_active: isActive })
      .eq('auth_user_id', mentorId);

    if (updateError) throw updateError;

    // Log the action
    const { error: historyError } = await supabase
      .from('mentor_assignment_history')
      .insert([
        {
          mentor_user_id: mentorId,
          action: isActive ? 'activated' : 'deactivated',
          action_details: { status: isActive ? 'activated' : 'deactivated' },
          created_by: req.headers['x-user-id'] || null
        }
      ]);

    if (historyError) console.error('Error logging action:', historyError);

    res.status(200).json({ success: true, isActive });
  } catch (error) {
    console.error('Error updating mentor status:', error);
    res.status(500).json({ error: 'Failed to update mentor status' });
  }
}

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
    // Get total assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from('mentor_facilitator_assignments')
      .select('id, is_active')
      .eq('mentor_user_id', mentorId);

    if (assignmentsError) throw assignmentsError;

    const totalAssignments = assignments?.length || 0;
    const activeAssignments = assignments?.filter(a => a.is_active).length || 0;

    // Get completed sessions from history
    const { data: history, error: historyError } = await supabase
      .from('mentor_assignment_history')
      .select('id')
      .eq('mentor_user_id', mentorId)
      .eq('action', 'meeting_added');

    if (historyError) throw historyError;

    const completedSessions = history?.length || 0;

    res.status(200).json({
      totalAssignments,
      activeAssignments,
      completedSessions
    });
  } catch (error) {
    console.error('Error fetching mentor stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}

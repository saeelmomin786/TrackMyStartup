// api/mentor-stats.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { mentorId } = request.query;

  if (!mentorId || typeof mentorId !== 'string') {
    return response.status(400).json({ error: 'Missing or invalid mentorId parameter' });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
  );

  try {
    const { data: meetings, error: meetingsError } = await supabase
      .from('mentor_meeting_history')
      .select('id, meeting_status, attendance_status')
      .eq('mentor_user_id', mentorId);

    if (meetingsError) throw meetingsError;

    const { data: assignments, error: assignmentsError } = await supabase
      .from('mentor_startup_assignments')
      .select('startup_id')
      .eq('mentor_user_id', mentorId)
      .eq('status', 'active');

    if (assignmentsError) throw assignmentsError;

    const totalSessions = meetings?.length || 0;
    const completedSessions = meetings?.filter(m => m.meeting_status === 'completed').length || 0;
    const totalStartups = new Set(assignments?.map(a => a.startup_id)).size || 0;

    return response.status(200).json({
      totalSessions,
      completedSessions,
      avgRating: 4.5,
      totalStartups
    });
  } catch (error) {
    console.error('Error fetching mentor stats:', error);
    return response.status(500).json({ error: 'Failed to fetch mentor statistics' });
  }
}

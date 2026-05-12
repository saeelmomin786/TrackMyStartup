// api/mentor-history.ts
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
    const { data, error } = await supabase
      .from('mentor_meeting_history')
      .select(`
        id,
        meeting_date,
        meeting_duration_mins,
        google_meet_link,
        ai_notes,
        topics_discussed,
        action_items,
        attendance_status,
        meeting_status,
        startup_id
      `)
      .eq('mentor_user_id', mentorId)
      .order('meeting_date', { ascending: false });

    if (error) throw error;

    if (data && data.length > 0) {
      const startupIds = [...new Set(data.map(d => d.startup_id).filter(Boolean))];
      if (startupIds.length > 0) {
        const { data: startups, error: startupError } = await supabase
          .from('startups')
          .select('id, name')
          .in('id', startupIds);

        if (!startupError) {
          const startupMap = new Map(startups?.map(s => [s.id, s.name]) || []);
          const enrichedData = data.map(d => ({
            ...d,
            startup_name: startupMap.get(d.startup_id)
          }));
          return response.status(200).json(enrichedData);
        }
      }
    }

    return response.status(200).json(data || []);
  } catch (error) {
    console.error('Error fetching mentor history:', error);
    return response.status(500).json({ error: 'Failed to fetch mentor history' });
  }
}

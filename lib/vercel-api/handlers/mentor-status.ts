// api/mentor-status.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  if (request.method !== 'PUT') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { mentorId, isActive } = request.body;

  if (!mentorId || typeof isActive !== 'boolean') {
    return response.status(400).json({ error: 'Missing or invalid parameters' });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
  );

  try {
    const { error } = await supabase
      .from('mentor_startup_assignments')
      .update({ status: isActive ? 'active' : 'inactive' })
      .eq('mentor_user_id', mentorId);

    if (error) throw error;

    return response.status(200).json({ 
      success: true,
      message: `Mentor status updated to ${isActive ? 'active' : 'inactive'}` 
    });
  } catch (error) {
    console.error('Error updating mentor status:', error);
    return response.status(500).json({ error: 'Failed to update mentor status' });
  }
}

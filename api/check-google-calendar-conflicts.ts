import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accessToken, calendarId, startDateTime, endDateTime } = req.body as {
      accessToken: string;
      calendarId?: string;
      startDateTime: string;
      endDateTime: string;
    };

    if (!accessToken || !startDateTime || !endDateTime) {
      return res.status(400).json({ 
        error: 'Missing required fields: accessToken, startDateTime, and endDateTime' 
      });
    }

    // Validate date format
    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (startDate >= endDate) {
      return res.status(400).json({ error: 'startDateTime must be before endDateTime' });
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Check for existing events in the time range
    const response = await calendar.events.list({
      calendarId: calendarId || 'primary',
      timeMin: startDateTime,
      timeMax: endDateTime,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 10
    });

    // Check if there are any events (conflicts)
    const hasConflicts = response.data.items && response.data.items.length > 0;

    return res.status(200).json({ 
      hasConflicts,
      conflictingEvents: hasConflicts ? response.data.items?.map((e: any) => ({
        id: e.id,
        summary: e.summary,
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date
      })) : []
    });
  } catch (error: any) {
    console.error('Error checking calendar conflicts:', error);
    
    // Handle specific Google API errors
    if (error.code === 401) {
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }
    if (error.code === 403) {
      return res.status(403).json({ error: 'Insufficient permissions for calendar access' });
    }

    return res.status(500).json({ 
      error: error.message || 'Failed to check calendar conflicts',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}


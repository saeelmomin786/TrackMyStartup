import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accessToken, calendarId, event } = req.body as {
      accessToken: string;
      calendarId?: string;
      event: {
        summary: string;
        description?: string;
        start: { dateTime: string; timeZone: string };
        end: { dateTime: string; timeZone: string };
        attendees?: Array<{ email: string }>;
        conferenceData?: {
          createRequest: {
            requestId: string;
            conferenceSolutionKey: { type: 'hangoutsMeet' };
          };
        };
      };
    };

    if (!accessToken || !event) {
      return res.status(400).json({ error: 'Missing required fields: accessToken and event' });
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Ensure conference data is included if not provided
    const eventWithConference = {
      ...event,
      conferenceData: event.conferenceData || {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };

    // Create the event
    const response = await calendar.events.insert({
      calendarId: calendarId || 'primary',
      conferenceDataVersion: 1,
      requestBody: eventWithConference
    });

    // Extract Meet link
    const hangoutLink = response.data.hangoutLink || 
                        response.data.conferenceData?.entryPoints?.[0]?.uri ||
                        response.data.conferenceData?.entryPoints?.[0]?.link;

    return res.status(200).json({
      eventId: response.data.id,
      hangoutLink: hangoutLink || null,
      meetLink: hangoutLink || null // Alias for consistency
    });
  } catch (error: any) {
    console.error('Error creating Google Calendar event:', error);
    
    // Handle specific Google API errors
    if (error.code === 401) {
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }
    if (error.code === 403) {
      return res.status(403).json({ error: 'Insufficient permissions for calendar access' });
    }

    return res.status(500).json({ 
      error: error.message || 'Failed to create Google Calendar event',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}


import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check for service account key (for generating Meet links without user OAuth)
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    
    if (!serviceAccountKey) {
      return res.status(500).json({ 
        error: 'Google service account not configured. Please set GOOGLE_SERVICE_ACCOUNT_KEY environment variable.' 
      });
    }

    // Parse service account key (can be JSON string or path)
    let credentials;
    try {
      credentials = typeof serviceAccountKey === 'string' && serviceAccountKey.startsWith('{')
        ? JSON.parse(serviceAccountKey)
        : require(serviceAccountKey);
    } catch (parseError) {
      return res.status(500).json({ 
        error: 'Invalid service account key format. Must be JSON string or path to key file.' 
      });
    }

    // Authenticate with service account
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });

    const calendar = google.calendar({ version: 'v3', auth });

    // Create a temporary event to generate Meet link
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    const event = {
      summary: 'Mentoring Session',
      description: 'Temporary event to generate Google Meet link',
      start: {
        dateTime: now.toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: oneHourLater.toISOString(),
        timeZone: 'UTC'
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };

    // Create event with Meet link
    const response = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: event
    });

    // Extract Meet link
    const meetLink = response.data.hangoutLink || 
                     response.data.conferenceData?.entryPoints?.[0]?.uri ||
                     response.data.conferenceData?.entryPoints?.[0]?.link;

    if (!meetLink) {
      // Delete the event if we couldn't get the link
      if (response.data.id) {
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: response.data.id
        });
      }
      return res.status(500).json({ error: 'Failed to generate Google Meet link' });
    }

    // Delete the temporary event (we only needed it to generate the link)
    if (response.data.id) {
      try {
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: response.data.id
        });
      } catch (deleteError) {
        // Log but don't fail - the link is already generated
        console.warn('Failed to delete temporary event:', deleteError);
      }
    }

    return res.status(200).json({ meetLink });
  } catch (error: any) {
    console.error('Error generating Google Meet link:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to generate Google Meet link',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}


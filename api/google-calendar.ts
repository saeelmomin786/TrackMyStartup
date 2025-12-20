import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;

  try {
    switch (action) {
      case 'generate-meet-link':
        return await handleGenerateMeetLink(req, res);
      case 'create-event':
        return await handleCreateEvent(req, res);
      case 'check-conflicts':
        return await handleCheckConflicts(req, res);
      case 'refresh-token':
        return await handleRefreshToken(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action. Use: generate-meet-link, create-event, check-conflicts, or refresh-token' });
    }
  } catch (error: any) {
    console.error('Error in google-calendar API:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Generate Google Meet Link
async function handleGenerateMeetLink(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccountKey) {
    return res.status(500).json({ 
      error: 'Google service account not configured. Please set GOOGLE_SERVICE_ACCOUNT_KEY environment variable.' 
    });
  }

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

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar']
  });

  const calendar = google.calendar({ version: 'v3', auth });

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

  const response = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    requestBody: event
  });

  const meetLink = response.data.hangoutLink || 
                   response.data.conferenceData?.entryPoints?.[0]?.uri;

  if (!meetLink) {
    if (response.data.id) {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: response.data.id
      });
    }
    return res.status(500).json({ error: 'Failed to generate Google Meet link' });
  }

  if (response.data.id) {
    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: response.data.id
      });
    } catch (deleteError) {
      console.warn('Failed to delete temporary event:', deleteError);
    }
  }

  return res.status(200).json({ meetLink });
}

// Create Google Calendar Event
async function handleCreateEvent(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const eventWithConference = {
    ...event,
    conferenceData: event.conferenceData || {
      createRequest: {
        requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    }
  };

  const response = await calendar.events.insert({
    calendarId: calendarId || 'primary',
    conferenceDataVersion: 1,
    requestBody: eventWithConference
  });

  const hangoutLink = response.data.hangoutLink || 
                      response.data.conferenceData?.entryPoints?.[0]?.uri;

  return res.status(200).json({
    eventId: response.data.id,
    hangoutLink: hangoutLink || null,
    meetLink: hangoutLink || null
  });
}

// Check Calendar Conflicts
async function handleCheckConflicts(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  const startDate = new Date(startDateTime);
  const endDate = new Date(endDateTime);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  if (startDate >= endDate) {
    return res.status(400).json({ error: 'startDateTime must be before endDateTime' });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const response = await calendar.events.list({
    calendarId: calendarId || 'primary',
    timeMin: startDateTime,
    timeMax: endDateTime,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 10
  });

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
}

// Refresh Google Token
async function handleRefreshToken(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { refreshToken } = req.body as { refreshToken: string };

  if (!refreshToken) {
    return res.status(400).json({ error: 'Missing required field: refreshToken' });
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ 
      error: 'Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' 
    });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    return res.status(500).json({ error: 'Failed to refresh access token' });
  }

  return res.status(200).json({
    accessToken: credentials.access_token,
    expiresIn: credentials.expiry_date 
      ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
      : 3600,
    tokenType: credentials.token_type || 'Bearer'
  });
}


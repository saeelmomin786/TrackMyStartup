import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Handle action parameter - it can be a string or array
  const actionParam = req.query.action;
  const action = Array.isArray(actionParam) ? actionParam[0] : actionParam;

  // Log for debugging
  console.log('Google Calendar API called:', {
    method: req.method,
    action: action,
    query: req.query
  });

  if (!action) {
    return res.status(400).json({ 
      error: 'Missing action parameter. Use: generate-meet-link, create-event, create-event-service-account, check-conflicts, or refresh-token',
      received: { action: actionParam, query: req.query },
      method: req.method,
      hint: 'All actions require POST method'
    });
  }

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
      case 'create-event-service-account':
        return await handleCreateEventServiceAccount(req, res);
      default:
        return res.status(400).json({ 
          error: 'Invalid action. Use: generate-meet-link, create-event, create-event-service-account, check-conflicts, or refresh-token',
          received: action,
          method: req.method
        });
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
    return res.status(405).json({ 
      error: 'Method not allowed',
      received: req.method,
      required: 'POST',
      hint: 'Use: curl -X POST "https://your-domain.com/api/google-calendar?action=generate-meet-link" -H "Content-Type: application/json"'
    });
  }

  // Try to use App Account OAuth first (for Meet links)
  const appAccountRefreshToken = process.env.GOOGLE_APP_ACCOUNT_REFRESH_TOKEN;
  const useAppAccount = !!appAccountRefreshToken;

  console.log('Generating Meet link:', {
    hasAppAccountToken: !!appAccountRefreshToken,
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET
  });

  if (useAppAccount) {
    try {
      console.log('Attempting to use app account OAuth for Meet link generation...');
      // Use App Account OAuth - this CAN create Meet links!
      const accessToken = await getAppAccountAccessToken();
      console.log('Successfully got access token from app account');
      
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error('OAuth credentials not configured');
      }

      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({ access_token: accessToken });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

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
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        }
      };

      const response = await calendar.events.insert({
        calendarId: calendarId,
        conferenceDataVersion: 1,
        requestBody: event
      });

      const meetLink = response.data.hangoutLink || 
                       response.data.conferenceData?.entryPoints?.[0]?.uri;

      if (!meetLink) {
        if (response.data.id) {
          await calendar.events.delete({
            calendarId: calendarId,
            eventId: response.data.id
          });
        }
        return res.status(500).json({ error: 'Failed to generate Google Meet link' });
      }

      // IMPORTANT: Do NOT delete the temporary event!
      // When a Google Calendar event is deleted, the associated Meet link becomes invalid.
      // The Meet link is tied to the event, so we must keep the event for the link to work.
      // The temporary event will be cleaned up later or can be manually removed.
      
      const eventId = response.data.id;

      console.log('✅ Meet link generated successfully:', {
        eventId: eventId,
        meetLink: meetLink
      });

      return res.status(200).json({ 
        meetLink,
        eventId: eventId,
        method: 'app_account_oauth'
      });
    } catch (error: any) {
      console.error('Error generating Meet link with app account OAuth:', error);
      console.error('Error details:', {
        message: error.message,
        error: error.error,
        responseError: error.response?.data?.error,
        responseErrorDescription: error.response?.data?.error_description,
        stack: error.stack,
        hasRefreshToken: !!appAccountRefreshToken
      });
      
      // Check for invalid_grant in multiple places (message, error property, response data)
      const isInvalidGrant = error.message?.includes('invalid_grant') || 
                            error.message?.includes('expired') || 
                            error.message?.includes('revoked') ||
                            error.error === 'invalid_grant' ||
                            error.response?.data?.error === 'invalid_grant';
      
      // Check for unauthorized_client (OAuth credentials mismatch)
      const isUnauthorizedClient = error.message?.includes('unauthorized_client') || 
                                  error.error === 'unauthorized_client' ||
                                  error.response?.data?.error === 'unauthorized_client';
      
      // If it's a token/auth error, don't fall back - return error immediately
      // Service accounts can't create Meet links anyway
      if (isInvalidGrant) {
        const errorDescription = error.response?.data?.error_description || 
                                error.message || 
                                'Token has been expired or revoked';
        return res.status(500).json({ 
          error: 'Refresh token expired or revoked',
          details: errorDescription,
          hint: 'Please get a new refresh token from Google OAuth Playground and update GOOGLE_APP_ACCOUNT_REFRESH_TOKEN in Vercel environment variables. See SETUP_APP_ACCOUNT_FOR_MEET_LINKS.md for instructions.'
        });
      }
      
      if (isUnauthorizedClient) {
        const errorDescription = error.response?.data?.error_description || 
                                error.message || 
                                'OAuth client credentials do not match the refresh token';
        return res.status(500).json({ 
          error: 'OAuth client credentials mismatch',
          details: errorDescription,
          hint: 'The GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET don\'t match the refresh token. Ensure the refresh token was generated with the same OAuth credentials, or get a new refresh token using the current OAuth credentials.'
        });
      }
      
      if (error.message?.includes('token') ||
          error.message?.includes('authentication')) {
        const errorDescription = error.response?.data?.error_description || 
                                error.message || 
                                'Authentication error';
        return res.status(500).json({ 
          error: 'Failed to authenticate with Google Calendar',
          details: errorDescription,
          hint: 'Please check GOOGLE_APP_ACCOUNT_REFRESH_TOKEN, GOOGLE_CLIENT_ID, and GOOGLE_CLIENT_SECRET environment variables.'
        });
      }
      
      // For other errors, fall through to service account fallback (though it won't work for Meet links)
    }
  }

  // Fallback: Try Service Account (will likely fail for Meet links, but provide better error)
  // Note: Service accounts CANNOT create Meet links, so this is just for better error messaging
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccountKey) {
    return res.status(500).json({ 
      error: 'Unable to generate Google Meet link',
      details: 'GOOGLE_APP_ACCOUNT_REFRESH_TOKEN is required for Meet link generation, but authentication failed. Service accounts cannot create Meet links.',
      hint: 'Please get a new refresh token from Google OAuth Playground and update GOOGLE_APP_ACCOUNT_REFRESH_TOKEN in Vercel environment variables.'
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
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

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
        conferenceSolutionKey: {
          type: 'hangoutsMeet'
        }
      }
    }
  };

  try {
    const response = await calendar.events.insert({
      calendarId: calendarId,
      conferenceDataVersion: 1,
      requestBody: event
    });

    const meetLink = response.data.hangoutLink || 
                     response.data.conferenceData?.entryPoints?.[0]?.uri;

    if (!meetLink) {
      if (response.data.id) {
        await calendar.events.delete({
          calendarId: calendarId,
          eventId: response.data.id
        });
      }
      return res.status(500).json({ 
        error: 'Failed to generate Google Meet link',
        details: 'Service accounts cannot create Google Meet links. Please set GOOGLE_APP_ACCOUNT_REFRESH_TOKEN to enable Meet link generation.'
      });
    }

    const eventId = response.data.id;

    return res.status(200).json({ 
      meetLink,
      eventId: eventId,
      method: 'service_account'
    });
  } catch (error: any) {
    // Handle specific Google API errors
    if (error.message?.includes('Invalid conference type') || 
        error.message?.includes('conference type value')) {
      console.error('Google Meet link creation failed - service account may not support Meet links:', error);
      return res.status(500).json({ 
        error: 'Unable to generate Google Meet link with service account',
        details: 'Service accounts may not have permission to create Google Meet links. Please set GOOGLE_APP_ACCOUNT_REFRESH_TOKEN to enable Meet link generation.',
        hint: 'Use OAuth 2.0 with app account refresh token for Meet link generation'
      });
    }
    console.error('Error generating Meet link:', error);
    return res.status(500).json({ 
      error: 'Failed to generate Google Meet link',
      details: error.message || 'Unknown error'
    });
  }
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

// Get App Account Access Token (using refresh token)
async function getAppAccountAccessToken(): Promise<string> {
  const refreshToken = process.env.GOOGLE_APP_ACCOUNT_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!refreshToken) {
    throw new Error('GOOGLE_APP_ACCOUNT_REFRESH_TOKEN not configured. Please set it in Vercel environment variables.');
  }

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured.');
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    process.env.GOOGLE_REDIRECT_URI
  );

  try {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error('Failed to get access token from refresh token');
    }

    return credentials.access_token;
  } catch (error: any) {
    // Handle invalid_grant error specifically (expired/revoked token)
    const isInvalidGrant = error.message?.includes('invalid_grant') || 
                          error.error === 'invalid_grant' ||
                          error.response?.data?.error === 'invalid_grant';
    
    // Handle unauthorized_client error (OAuth credentials don't match refresh token)
    const isUnauthorizedClient = error.message?.includes('unauthorized_client') || 
                                 error.error === 'unauthorized_client' ||
                                 error.response?.data?.error === 'unauthorized_client';
    
    if (isInvalidGrant) {
      const errorDescription = error.response?.data?.error_description || 
                              error.message || 
                              'Token has been expired or revoked';
      throw new Error(`Refresh token expired or revoked: ${errorDescription}. Please get a new refresh token from Google OAuth Playground.`);
    }
    
    if (isUnauthorizedClient) {
      const errorDescription = error.response?.data?.error_description || 
                              error.message || 
                              'OAuth client credentials do not match the refresh token';
      throw new Error(`OAuth client mismatch: ${errorDescription}. The GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET don't match the refresh token. Please ensure the refresh token was generated with the same OAuth credentials, or get a new refresh token.`);
    }
    
    // Re-throw other errors
    throw error;
  }
}

// Create Google Calendar Event using App Account OAuth (with Meet Links!)
async function handleCreateEventServiceAccount(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { event, meetLink } = req.body as {
    event: {
      summary: string;
      description?: string;
      start: { dateTime: string; timeZone: string };
      end: { dateTime: string; timeZone: string };
      attendees?: Array<{ email: string }>;
    };
    meetLink?: string; // Legacy - not used anymore, we generate Meet link automatically
  };

  if (!event) {
    return res.status(400).json({ error: 'Missing required field: event' });
  }

  // Try to use App Account OAuth first (for Meet links)
  const appAccountRefreshToken = process.env.GOOGLE_APP_ACCOUNT_REFRESH_TOKEN;
  const useAppAccount = !!appAccountRefreshToken;

  // Debug logging
  console.log('Creating calendar event:', {
    hasAppAccountToken: !!appAccountRefreshToken,
    appAccountTokenLength: appAccountRefreshToken?.length || 0,
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET
  });

  if (useAppAccount) {
    try {
      console.log('Attempting to use app account OAuth for Meet link generation...');
      // Use App Account OAuth - this CAN create Meet links!
      const accessToken = await getAppAccountAccessToken();
      console.log('Successfully got access token from app account');
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error('OAuth credentials not configured');
      }

      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({ access_token: accessToken });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

      // Build event with Meet link generation
      // IMPORTANT: Get app account email to avoid adding it as attendee (it's the organizer)
      const appAccountEmail = process.env.GOOGLE_APP_ACCOUNT_EMAIL;
      
      // Filter out app account email from attendees (it's the organizer, not an attendee)
      const filteredAttendees = (event.attendees || []).filter((attendee: { email: string }) => {
        return attendee.email !== appAccountEmail;
      });
      
      console.log('📧 Calendar event attendees:', {
        original: event.attendees?.length || 0,
        filtered: filteredAttendees.length,
        appAccountEmail: appAccountEmail,
        attendees: filteredAttendees.map((a: { email: string }) => a.email)
      });
      
      const eventData: any = {
        summary: event.summary,
        description: event.description || 'Mentoring session scheduled through Track My Startup',
        start: event.start,
        end: event.end,
        attendees: filteredAttendees, // Use filtered attendees (exclude app account)
        // This will generate a Meet link automatically!
        // Note: By default, Google Meet allows anyone with the link to join automatically
        // The organizer's Google account settings may require admission, but the link itself
        // allows direct joining. If the organizer has "Quick access" enabled, guests join automatically.
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
            // Note: Google Meet settings (like requiring admission) are controlled by
            // the organizer's Google account settings, not the API. The link itself
            // allows joining - whether admission is required depends on account settings.
          }
        }
      };

      console.log('📅 Creating calendar event with:', {
        summary: eventData.summary,
        attendeesCount: filteredAttendees.length,
        hasConferenceData: !!eventData.conferenceData
      });

      const response = await calendar.events.insert({
        calendarId: calendarId,
        conferenceDataVersion: 1, // This enables Meet link generation
        sendUpdates: 'all', // Send invites to all attendees (mentor + startup)
        requestBody: eventData
      });
      
      console.log('✅ Calendar event created:', {
        eventId: response.data.id,
        organizer: response.data.organizer?.email,
        attendees: response.data.attendees?.map((a: any) => ({ email: a.email, responseStatus: a.responseStatus })),
        hangoutLink: response.data.hangoutLink
      });

      // Extract Meet link from response
      const hangoutLink = response.data.hangoutLink || 
                         response.data.conferenceData?.entryPoints?.[0]?.uri;

      // Log final event details for debugging
      console.log('✅ Calendar event created successfully:', {
        eventId: response.data.id,
        organizer: response.data.organizer?.email,
        attendeesCount: response.data.attendees?.length || 0,
        attendees: response.data.attendees?.map((a: any) => ({
          email: a.email,
          responseStatus: a.responseStatus,
          organizer: a.organizer
        })),
        hangoutLink: hangoutLink,
        meetLink: hangoutLink
      });

      return res.status(200).json({
        eventId: response.data.id,
        hangoutLink: hangoutLink || null,
        meetLink: hangoutLink || null, // Meet link generated automatically!
        calendarId: calendarId,
        method: 'app_account_oauth', // Indicates we used OAuth
        attendees: response.data.attendees || [] // Return attendees for debugging
      });
    } catch (error: any) {
      console.error('Error creating event with app account OAuth:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        hasRefreshToken: !!appAccountRefreshToken,
        refreshTokenStart: appAccountRefreshToken?.substring(0, 10),
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET
      });
      
      // Check for invalid_grant (expired/revoked token)
      const isInvalidGrant = error.message?.includes('invalid_grant') || 
                            error.message?.includes('expired') || 
                            error.message?.includes('revoked') ||
                            error.error === 'invalid_grant' ||
                            error.response?.data?.error === 'invalid_grant';
      
      // Check for unauthorized_client (OAuth credentials mismatch)
      const isUnauthorizedClient = error.message?.includes('unauthorized_client') || 
                                  error.error === 'unauthorized_client' ||
                                  error.response?.data?.error === 'unauthorized_client';
      
      // If it's a token-related error, don't fall back - return error immediately
      if (isInvalidGrant) {
        return res.status(500).json({ 
          error: 'Refresh token expired or revoked',
          details: error.message || 'The refresh token has been expired or revoked',
          hint: 'Please get a new refresh token from Google OAuth Playground and update GOOGLE_APP_ACCOUNT_REFRESH_TOKEN in Vercel environment variables. See SETUP_APP_ACCOUNT_FOR_MEET_LINKS.md for instructions.'
        });
      }
      
      if (isUnauthorizedClient) {
        const errorDescription = error.response?.data?.error_description || 
                                error.message || 
                                'OAuth client credentials do not match the refresh token';
        return res.status(500).json({ 
          error: 'OAuth client credentials mismatch',
          details: errorDescription,
          hint: 'The GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET don\'t match the refresh token. Ensure the refresh token was generated with the same OAuth credentials, or get a new refresh token using the current OAuth credentials.'
        });
      }
      
      if (error.message?.includes('token') || 
          error.message?.includes('authentication')) {
        return res.status(500).json({ 
          error: 'Failed to authenticate with Google Calendar',
          details: error.message || 'Authentication error',
          hint: 'Please check GOOGLE_APP_ACCOUNT_REFRESH_TOKEN, GOOGLE_CLIENT_ID, and GOOGLE_CLIENT_SECRET environment variables'
        });
      }
      
      // For other errors, fall through to service account fallback
      console.log('Falling back to service account...');
    }
  } else {
    console.log('App account refresh token not found, using service account fallback');
  }

  // Fallback: Use Service Account (no Meet links, but events still created)
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccountKey) {
    return res.status(500).json({ 
      error: 'Neither GOOGLE_APP_ACCOUNT_REFRESH_TOKEN nor GOOGLE_SERVICE_ACCOUNT_KEY is configured. Please set at least one.',
      hint: 'Set GOOGLE_APP_ACCOUNT_REFRESH_TOKEN for Meet link generation, or GOOGLE_SERVICE_ACCOUNT_KEY for basic event creation.'
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
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  const eventData: any = {
    summary: event.summary,
    description: event.description || 'Mentoring session scheduled through Track My Startup',
    start: event.start,
    end: event.end,
    attendees: event.attendees || []
    // No conferenceData - service accounts can't create Meet links
  };

  try {
    const response = await calendar.events.insert({
      calendarId: calendarId,
      sendUpdates: 'all',
      requestBody: eventData
    });

    return res.status(200).json({
      eventId: response.data.id,
      hangoutLink: null,
      meetLink: null,
      calendarId: calendarId,
      method: 'service_account',
      note: 'Service accounts cannot create Google Meet links. Set GOOGLE_APP_ACCOUNT_REFRESH_TOKEN to enable Meet link generation.'
    });
  } catch (error: any) {
    console.error('Error creating calendar event with service account:', error);
    console.error('Service account error details:', {
      message: error.message,
      stack: error.stack,
      hasServiceAccountKey: !!serviceAccountKey,
      calendarId: calendarId
    });
    
    // Provide more specific error messages
    if (error.message?.includes('permission') || error.message?.includes('forbidden')) {
      return res.status(500).json({ 
        error: 'Permission denied when creating calendar event',
        details: 'The service account may not have access to the calendar. Please check calendar sharing settings.',
        hint: error.message
      });
    }
    
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return res.status(500).json({ 
        error: 'Calendar not found',
        details: `Calendar ID "${calendarId}" not found or not accessible`,
        hint: 'Please check GOOGLE_CALENDAR_ID environment variable'
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to create calendar event',
      details: error.message || 'Unknown error',
      hint: 'Check server logs for more details'
    });
  }
}


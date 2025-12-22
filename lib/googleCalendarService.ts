import { supabase } from './supabase';

export interface GoogleCalendarIntegration {
  id?: number;
  user_id: string;
  user_type: 'Mentor' | 'Startup';
  google_calendar_id: string;
  google_email: string;
  access_token: string;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  calendar_sync_enabled?: boolean;
  auto_create_events?: boolean;
  auto_create_meet_links?: boolean;
}

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{ email: string }>;
  conferenceData?: {
    createRequest: {
      requestId: string;
      conferenceSolutionKey: { type: 'hangoutsMeet' };
    };
  };
  hangoutLink?: string;
}

class GoogleCalendarService {
  // Get Google Calendar integration for user
  async getIntegration(userId: string, userType: 'Mentor' | 'Startup'): Promise<GoogleCalendarIntegration | null> {
    try {
      const { data, error } = await supabase
        .from('google_calendar_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('user_type', userType)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No integration found
          return null;
        }
        console.error('Error fetching Google Calendar integration:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getIntegration:', error);
      return null;
    }
  }

  // Save Google Calendar integration
  async saveIntegration(integration: GoogleCalendarIntegration): Promise<GoogleCalendarIntegration> {
    try {
      const { data, error } = await supabase
        .from('google_calendar_integrations')
        .upsert(integration, {
          onConflict: 'user_id,user_type'
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving Google Calendar integration:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in saveIntegration:', error);
      throw error;
    }
  }

  // Delete Google Calendar integration
  async deleteIntegration(userId: string, userType: 'Mentor' | 'Startup'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('google_calendar_integrations')
        .delete()
        .eq('user_id', userId)
        .eq('user_type', userType);

      if (error) {
        console.error('Error deleting Google Calendar integration:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteIntegration:', error);
      return false;
    }
  }

  // Generate Google Meet link (using our API credentials)
  async generateGoogleMeetLink(): Promise<string> {
    try {
      const response = await fetch('/api/google-calendar?action=generate-meet-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate Google Meet link');
      }

      const data = await response.json();
      return data.meetLink;
    } catch (error) {
      console.error('Error generating Google Meet link:', error);
      // Fallback: Generate a basic meet link format
      const randomId = Math.random().toString(36).substring(2, 15);
      return `https://meet.google.com/${randomId}`;
    }
  }

  // Create Google Calendar event with Meet link
  async createCalendarEventWithMeet(
    integration: GoogleCalendarIntegration,
    event: GoogleCalendarEvent
  ): Promise<{ eventId: string; meetLink: string }> {
    try {
      const response = await fetch('/api/google-calendar?action=create-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessToken: integration.access_token,
          calendarId: integration.google_calendar_id,
          event: {
            ...event,
            conferenceData: {
              createRequest: {
                requestId: `meet-${Date.now()}`,
                conferenceSolutionKey: { type: 'hangoutsMeet' }
              }
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create Google Calendar event');
      }

      const data = await response.json();
      return {
        eventId: data.eventId,
        meetLink: data.hangoutLink || data.meetLink
      };
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      throw error;
    }
  }

  // Create calendar event using service account (centralized calendar)
  async createCalendarEventWithServiceAccount(
    event: GoogleCalendarEvent,
    attendees: Array<{ email: string }>,
    meetLink?: string
  ): Promise<{ eventId: string; meetLink: string; calendarId: string }> {
    try {
      const response = await fetch('/api/google-calendar?action=create-event-service-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event: {
            ...event,
            attendees: attendees
          },
          meetLink: meetLink // Pass existing Meet link if available
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to create calendar event');
      }

      const data = await response.json();
      return {
        eventId: data.eventId,
        meetLink: data.meetLink || data.hangoutLink || meetLink || '',
        calendarId: data.calendarId || 'primary'
      };
    } catch (error) {
      console.error('Error creating calendar event with service account:', error);
      throw error;
    }
  }

  // Check for conflicts in Google Calendar
  async checkConflicts(
    integration: GoogleCalendarIntegration,
    startDateTime: string,
    endDateTime: string
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/google-calendar?action=check-conflicts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessToken: integration.access_token,
          calendarId: integration.google_calendar_id,
          startDateTime,
          endDateTime
        })
      });

      if (!response.ok) {
        throw new Error('Failed to check calendar conflicts');
      }

      const data = await response.json();
      return data.hasConflicts;
    } catch (error) {
      console.error('Error checking calendar conflicts:', error);
      return false; // Assume no conflicts if check fails
    }
  }

  // Update Google Calendar event
  async updateCalendarEvent(
    integration: GoogleCalendarIntegration,
    eventId: string,
    updates: Partial<GoogleCalendarEvent>
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/update-google-calendar-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessToken: integration.access_token,
          calendarId: integration.google_calendar_id,
          eventId,
          updates
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update Google Calendar event');
      }

      return true;
    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      return false;
    }
  }

  // Delete Google Calendar event
  async deleteCalendarEvent(
    integration: GoogleCalendarIntegration,
    eventId: string
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/delete-google-calendar-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessToken: integration.access_token,
          calendarId: integration.google_calendar_id,
          eventId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete Google Calendar event');
      }

      return true;
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      return false;
    }
  }

  // Refresh access token
  async refreshAccessToken(integration: GoogleCalendarIntegration): Promise<string | null> {
    try {
      const response = await fetch('/api/google-calendar?action=refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: integration.refresh_token
        })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh access token');
      }

      const data = await response.json();
      return data.accessToken;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      return null;
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();


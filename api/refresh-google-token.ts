import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { refreshToken } = req.body as { refreshToken: string };

    if (!refreshToken) {
      return res.status(400).json({ error: 'Missing required field: refreshToken' });
    }

    // Validate environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({ 
        error: 'Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' 
      });
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Set the refresh token
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    // Refresh the access token
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      return res.status(500).json({ error: 'Failed to refresh access token' });
    }

    return res.status(200).json({
      accessToken: credentials.access_token,
      expiresIn: credentials.expiry_date 
        ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
        : 3600, // Default to 1 hour if expiry not provided
      tokenType: credentials.token_type || 'Bearer'
    });
  } catch (error: any) {
    console.error('Error refreshing Google token:', error);
    
    // Handle specific OAuth errors
    if (error.message?.includes('invalid_grant')) {
      return res.status(401).json({ 
        error: 'Invalid or expired refresh token. User needs to re-authenticate.' 
      });
    }

    return res.status(500).json({ 
      error: error.message || 'Failed to refresh access token',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}


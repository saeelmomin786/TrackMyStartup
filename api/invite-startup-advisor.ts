import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      startupId,
      advisorId,
      advisorCode,
      startupName,
      contactEmail,
      contactName,
      redirectUrl
    } = req.body as {
      startupId: number;
      advisorId: string;
      advisorCode: string;
      startupName: string;
      contactEmail: string;
      contactName: string;
      redirectUrl?: string;
    };

    if (!startupId || !advisorId || !advisorCode || !startupName || !contactEmail || !contactName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get Supabase service role key from environment
    // Note: VITE_ prefixed vars are client-only, API routes need non-prefixed vars
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlSource: process.env.SUPABASE_URL ? 'SUPABASE_URL' : (process.env.VITE_SUPABASE_URL ? 'VITE_SUPABASE_URL' : 'none'),
      keySource: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SUPABASE_SERVICE_ROLE_KEY' : (process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? 'VITE_SUPABASE_SERVICE_ROLE_KEY' : 'none')
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
      });
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. For API routes, use SUPABASE_URL (not VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.'
      });
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // First check if startup already exists on TMS
    const { data: existingStartupByEmail } = await supabaseAdmin
      .from('users')
      .select('id, role, startup_name, investment_advisor_code_entered')
      .eq('email', contactEmail.toLowerCase().trim())
      .eq('role', 'Startup')
      .maybeSingle();

    let existingStartupId: number | null = null;
    let userId: string;
    let isNewUser = false;
    let isExistingTMSStartup = false;

    if (existingStartupByEmail) {
      // User/Startup already exists on TMS - need permission
      userId = existingStartupByEmail.id;
      isExistingTMSStartup = true;
      console.log('Startup already exists on TMS, permission required:', userId);

      // Find startup record
      const { data: startupRecord } = await supabaseAdmin
        .from('startups')
        .select('id, investment_advisor_code')
        .eq('user_id', userId)
        .maybeSingle();

      if (startupRecord) {
        existingStartupId = startupRecord.id;

        // Check if advisor code is already set (already linked)
        if (existingStartupByEmail.investment_advisor_code_entered === advisorCode) {
          // Already linked to this advisor - can proceed
          console.log('Startup already linked to this advisor');
        } else if (existingStartupByEmail.investment_advisor_code_entered && existingStartupByEmail.investment_advisor_code_entered !== advisorCode) {
          // Startup is already linked to a different advisor
          const { data: existingAdvisorData } = await supabaseAdmin
            .from('users')
            .select('name, email, investment_advisor_code')
            .eq('investment_advisor_code', existingStartupByEmail.investment_advisor_code_entered)
            .eq('role', 'Investment Advisor')
            .maybeSingle();

          // Update advisor_added_startups record to show conflict
          await supabaseAdmin
            .from('advisor_added_startups')
            .update({
              is_on_tms: false,
              tms_startup_id: startupRecord.id,
              invite_status: 'not_sent'
              // Note: invited_user_id and invited_email columns don't exist in the table
            })
            .eq('id', startupId);

          return res.status(200).json({
            success: false,
            requiresPermission: false,
            alreadyHasAdvisor: true,
            existingAdvisorName: existingAdvisorData?.name || 'Another Investment Advisor',
            existingAdvisorCode: existingStartupByEmail.investment_advisor_code_entered,
            userId,
            isExistingTMSStartup: true,
            tmsStartupId: startupRecord.id,
            message: `This startup is already linked with another Investment Advisor (${existingAdvisorData?.name || 'Unknown'}). Please contact the startup directly to change their Investment Advisor code.`
          });
        } else {
          // Need permission - create link request
          const { data: advisorData } = await supabaseAdmin
            .from('users')
            .select('investment_advisor_code, name, email')
            .eq('id', advisorId)
            .maybeSingle();

          // Check if startup already has a different advisor
          const hasDifferentAdvisor = existingStartupByEmail.investment_advisor_code_entered && 
                                      existingStartupByEmail.investment_advisor_code_entered !== advisorCode;
          
          let requestMessage = `Investment Advisor "${advisorData?.name || 'Unknown'}" wants to link your startup "${startupName}" to their account.`;
          
          if (hasDifferentAdvisor) {
            const { data: existingAdvisorData } = await supabaseAdmin
              .from('users')
              .select('name')
              .eq('investment_advisor_code', existingStartupByEmail.investment_advisor_code_entered)
              .eq('role', 'Investment Advisor')
              .maybeSingle();
            
            requestMessage = `Investment Advisor "${advisorData?.name || 'Unknown'}" wants to link your startup "${startupName}" to their account. Note: You are currently managed by ${existingAdvisorData?.name || 'another Investment Advisor'}. Approving this request will switch your advisor.`;
          }

          try {
            const { data: requestData } = await supabaseAdmin
              .from('advisor_startup_link_requests')
              .insert({
                advisor_id: advisorId,
                advisor_code: advisorCode,
                advisor_name: advisorData?.name,
                advisor_email: advisorData?.email,
                startup_id: startupRecord.id,
                startup_name: startupName,
                startup_user_id: userId,
                startup_email: contactEmail,
                advisor_added_startup_id: startupId,
                status: 'pending',
                message: requestMessage
              })
              .select()
              .single();

            console.log('Permission request created:', requestData?.id);
          } catch (requestError: any) {
            console.error('Error creating permission request:', requestError);
            // Continue anyway - request might already exist
          }

          // Update advisor_added_startups record to show pending permission
          const { error: updateError } = await supabaseAdmin
            .from('advisor_added_startups')
            .update({
              is_on_tms: false, // Not linked yet, pending permission
              tms_startup_id: startupRecord.id,
              invite_status: 'not_sent' // Permission request sent instead
              // Note: invited_user_id and invited_email columns don't exist in the table
            })
            .eq('id', startupId);

          if (updateError) {
            console.error('Error updating advisor_added_startups:', updateError);
          }

          // Return indicating permission is needed
          return res.status(200).json({
            success: true, // Still success, request was created
            requiresPermission: true,
            userId,
            isExistingTMSStartup: true,
            tmsStartupId: startupRecord.id,
            message: 'Startup already exists on TMS. A permission request has been sent to the startup.'
          });
        }
      }
    } else {
      // Check if user exists in auth (but not in users table)
      let existingUser;
      try {
        // Use listUsers() instead of getUserByEmail (which doesn't exist)
        const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (!listError && usersData?.users) {
          existingUser = usersData.users.find(u => u.email?.toLowerCase() === contactEmail.toLowerCase());
        }
      } catch (authError: any) {
        console.log('No existing user in auth (this is OK for new users):', authError.message);
        existingUser = null;
      }

      if (existingUser) {
        // User exists in auth but might not be in users table
        userId = existingUser.id;
        console.log('User exists in auth:', userId);
      } else {
        // Create new user via admin invite
        // Use redirectUrl from client (which includes window.location.origin) for correct domain
        // Fallback to localhost for local development
        let siteUrl = redirectUrl;
        
        if (!siteUrl) {
          // Check if we're in development
          const isDevelopment = process.env.NODE_ENV === 'development' || 
                               !process.env.VERCEL_ENV ||
                               process.env.VITE_SITE_URL?.includes('localhost');
          siteUrl = isDevelopment 
            ? 'http://localhost:5173'
            : (process.env.VITE_SITE_URL || process.env.SITE_URL || 'https://www.trackmystartup.com');
        }
        
        // Format redirect URL - First go to password setup, then login, then Form 2
        const inviteRedirectUrl = `${siteUrl}/?page=reset-password&advisorCode=${advisorCode}`;

        console.log('Inviting new user with redirect URL:', inviteRedirectUrl);
        console.log('⚠️ IMPORTANT: Make sure this URL is added to Supabase Dashboard > Authentication > URL Configuration > Redirect URLs');
        console.log('Redirect URL details:', {
          redirectUrlFromClient: redirectUrl,
          finalSiteUrl: siteUrl,
          NODE_ENV: process.env.NODE_ENV,
          VERCEL_ENV: process.env.VERCEL_ENV
        });
        console.log('Email to send invite to:', contactEmail);

        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          contactEmail,
          {
            data: {
              name: contactName,
              role: 'Startup',
              startupName: startupName,
              source: 'advisor_invite',
              investment_advisor_code_entered: advisorCode,
              skip_form1: true
            },
            redirectTo: inviteRedirectUrl
          }
        );

        if (inviteError) {
          console.error('Error inviting user:', {
            error: inviteError,
            message: inviteError.message,
            details: inviteError.details,
            hint: inviteError.hint,
            code: inviteError.code
          });
          return res.status(500).json({ 
            error: inviteError.message || 'Failed to send invite',
            details: inviteError.details || 'No additional details',
            hint: inviteError.hint
          });
        }

        if (!inviteData?.user) {
          console.error('No user returned from invite:', inviteData);
          return res.status(500).json({ 
            error: 'Failed to create user via invite',
            details: 'No user data returned from Supabase'
          });
        }

        userId = inviteData.user.id;
        isNewUser = true;
        console.log('✅ User invited successfully:', userId);
        console.log('📧 Email should have been sent to:', contactEmail);
        console.log('📧 Check Supabase Dashboard > Authentication > Users to verify email was sent');
        console.log('📧 Note: Email might take a few minutes to arrive, check spam folder');
        
        // Try to get the invite link if available (for debugging)
        try {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
          if (userData?.user) {
            console.log('📋 User details:', {
              email: userData.user.email,
              email_confirmed_at: userData.user.email_confirmed_at,
              invited_at: userData.user.invited_at,
              confirmation_sent_at: userData.user.confirmation_sent_at
            });
          }
        } catch (debugError: any) {
          console.log('Could not fetch user details for debugging:', debugError.message);
        }
      }
    }

    // Create or update user record in users table
    // Note: Don't set created_at/updated_at - they're auto-generated by the database
    // Note: is_verified column may not exist in all schemas, so we'll omit it
    const userData = {
      id: userId,
      email: contactEmail.toLowerCase().trim(),
      name: contactName,
      role: 'Startup',
      startup_name: startupName,
      investment_advisor_code_entered: advisorCode
    };

    console.log('Creating/updating user record:', { userId, email: userData.email, isNewUser });

    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('users')
      .upsert(userData, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user record:', {
        error: userError,
        message: userError.message,
        details: userError.details,
        hint: userError.hint,
        code: userError.code,
        userData: { ...userData, id: userId }
      });
      return res.status(500).json({ 
        error: 'Failed to create user record',
        details: userError.message || userError.details || 'Unknown error',
        hint: userError.hint
      });
    }

    console.log('User record created/updated successfully:', userRecord?.id);

    // Create startup record if user is new (and doesn't already exist)
    if (isNewUser && !existingStartupId) {
      // Set default values for required fields (will be updated when user completes Form 2)
      const { data: startupRecord, error: startupError } = await supabaseAdmin
        .from('startups')
        .insert({
          name: startupName,
          user_id: userId,
          investment_advisor_code: advisorCode,
          investment_type: 'Pre-Seed', // Default, will be updated in Form 2
          investment_value: 0, // Default, will be updated in Form 2
          equity_allocation: 0, // Default, will be updated in Form 2
          current_valuation: 0, // Default, will be updated in Form 2
          sector: 'Technology', // Default, will be updated in Form 2
          registration_date: new Date().toISOString().split('T')[0], // Today's date
          compliance_status: 'Pending' // Default status
          // Note: Don't set created_at, updated_at - they're auto-generated
        })
        .select()
        .single();

      if (startupError) {
        console.error('Error creating startup record:', startupError);
        // Don't fail the whole operation, just log it
      } else {
        console.log('Startup record created:', startupRecord?.id);
        existingStartupId = startupRecord.id;
      }
    }

    // Update advisor_added_startups record
    const updateData: any = {
      invite_sent_at: new Date().toISOString()
      // Note: invited_user_id and invited_email columns don't exist in the table
    };

    if (isExistingTMSStartup) {
      // Startup already on TMS - mark as linked, not invited
      updateData.is_on_tms = true;
      updateData.tms_startup_id = existingStartupId;
      updateData.invite_status = 'accepted';
    } else {
      // New startup - send invite
      updateData.invite_status = 'sent';
    }

    const { error: updateError } = await supabaseAdmin
      .from('advisor_added_startups')
      .update(updateData)
      .eq('id', startupId);

    if (updateError) {
      console.error('Error updating advisor_added_startups:', updateError);
      return res.status(500).json({ error: 'Failed to update invite status' });
    }

    return res.status(200).json({
      success: true,
      userId,
      isNewUser,
      isExistingTMSStartup,
      requiresPermission: false, // Only set to true if permission request was created above
      tmsStartupId: existingStartupId,
      message: isExistingTMSStartup 
        ? 'Startup already exists on TMS and has been linked to your account' 
        : isNewUser 
          ? 'Invite sent successfully' 
          : 'User already exists, linked to advisor'
    });
  } catch (error: any) {
    console.error('Error in invite-startup-advisor:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: error.details || error.hint || 'No additional details available'
    });
  }
}


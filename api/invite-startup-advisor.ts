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
              invite_status: 'not_sent',
              invited_user_id: userId,
              invited_email: contactEmail
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
              invite_status: 'not_sent', // Permission request sent instead
              invited_user_id: userId,
              invited_email: contactEmail
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
        const userResult = await supabaseAdmin.auth.admin.getUserByEmail(contactEmail);
        existingUser = userResult?.data?.user;
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
        const siteUrl = redirectUrl || process.env.VITE_SITE_URL || process.env.SITE_URL || 'http://localhost:5173';
        // Redirect to complete-registration page with advisor code after password is set
        const inviteRedirectUrl = `${siteUrl}/?page=complete-registration&advisorCode=${advisorCode}`;

        console.log('Inviting new user with redirect URL:', inviteRedirectUrl);

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

        if (inviteError || !inviteData?.user) {
          console.error('Error inviting user:', inviteError);
          return res.status(500).json({ 
            error: inviteError?.message || 'Failed to send invite',
            details: inviteError?.details || 'No additional details'
          });
        }

        userId = inviteData.user.id;
        isNewUser = true;
        console.log('User invited successfully:', userId);
      }
    }

    // Create or update user record in users table
    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email: contactEmail,
        name: contactName,
        role: 'Startup',
        startup_name: startupName,
        investment_advisor_code_entered: advisorCode,
        is_verified: true, // Auto-verify since invited by advisor
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user record:', userError);
      return res.status(500).json({ error: 'Failed to create user record' });
    }

    // Create startup record if user is new (and doesn't already exist)
    if (isNewUser && !existingStartupId) {
      const { data: startupRecord, error: startupError } = await supabaseAdmin
        .from('startups')
        .insert({
          name: startupName,
          user_id: userId,
          investment_advisor_code: advisorCode,
          is_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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
      invite_sent_at: new Date().toISOString(),
      invited_user_id: userId,
      invited_email: contactEmail
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


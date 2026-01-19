import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { subscription_id, user_id } = req.body as {
      subscription_id?: string;
      user_id?: string;
    };
    
    if (!subscription_id || !user_id) {
      return res.status(400).json({ error: 'subscription_id and user_id are required' });
    }

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 🔐 Convert auth_user_id to profile_id if needed
    let finalUserId = user_id;
    const { data: directProfile } = await supabase
      .from('user_profiles')
      .select('id, auth_user_id')
      .eq('id', user_id)
      .maybeSingle();
    
    if (directProfile) {
      finalUserId = directProfile.id;
      console.log('✅ user_id is already profile_id:', finalUserId);
    } else {
      // Try to find by auth_user_id
      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_user_id', user_id)
        .maybeSingle();
      
      if (userProfiles) {
        finalUserId = userProfiles.id;
        console.log('✅ Converted auth_user_id to profile_id:', finalUserId);
      }
    }

    // Get subscription details
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('id, user_id, razorpay_subscription_id, razorpay_mandate_id, autopay_enabled')
      .eq('id', subscription_id)
      .eq('user_id', finalUserId)
      .single();

    if (subError || !subscription) {
      console.error('Subscription not found:', { subscription_id, finalUserId, error: subError });
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (!subscription.autopay_enabled) {
      return res.json({ 
        success: true, 
        message: 'Autopay is already disabled',
        already_disabled: true 
      });
    }

    // Cancel Razorpay mandate/subscription
    const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    
    if (!keyId || !keySecret) {
      return res.status(500).json({ error: 'Razorpay keys not configured' });
    }

    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    // Cancel Razorpay subscription
    let razorpayCancelled = false;
    if (subscription.razorpay_subscription_id) {
      try {
        const cancelResponse = await fetch(
          `https://api.razorpay.com/v1/subscriptions/${subscription.razorpay_subscription_id}/cancel`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': authHeader 
            },
            body: JSON.stringify({ cancel_at_cycle_end: false }) // Cancel immediately
          }
        );

        if (cancelResponse.ok) {
          razorpayCancelled = true;
          console.log('✅ Razorpay subscription cancelled');
        } else {
          const errorText = await cancelResponse.text();
          console.warn('⚠️ Razorpay cancellation response:', errorText);
        }
      } catch (razorpayError) {
        console.error('❌ Error cancelling Razorpay subscription:', razorpayError);
        // Continue anyway - we'll update database
      }
    }

    // Update database using RPC function
    const { error: updateError } = await supabase.rpc('handle_autopay_cancellation', {
      p_subscription_id: subscription.id,
      p_cancellation_reason: 'user_cancelled',
      p_initiated_by: 'user'
    });

    if (updateError) {
      console.error('❌ Error updating subscription:', updateError);
      return res.status(500).json({ error: 'Failed to update subscription' });
    }

    return res.json({
      success: true,
      message: 'Auto-pay has been stopped. Your subscription will continue until the current billing period ends.',
      razorpay_cancelled: razorpayCancelled,
      subscription_id: subscription.id
    });

  } catch (error: any) {
    console.error('❌ Error stopping autopay:', error);
    return res.status(500).json({ 
      error: 'Failed to stop autopay',
      message: error.message 
    });
  }
}

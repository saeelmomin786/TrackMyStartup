/**
 * UTILITY FUNCTION: Check if Startup has Bought Premium
 * 
 * This function safely checks whether a startup has purchased a premium subscription.
 * It handles both:
 * 1. Self-paid subscriptions (paid_by_advisor_id IS NULL)
 * 2. Advisor-paid subscriptions (paid_by_advisor_id IS NOT NULL)
 */

import { supabase } from './supabase';

/**
 * Check if a user/startup has an active premium subscription
 * @param userId - Can be either profile_id or auth_user_id
 * @param currentTime - Optional current date for checking expiry (defaults to now)
 * @returns { hasPremium: boolean, tier: string, expiryDate?: Date, source: 'self-paid' | 'advisor-paid' | 'none' }
 */
export async function hasUserBoughtPremium(
  userId: string,
  currentTime: Date = new Date()
): Promise<{
  hasPremium: boolean;
  tier: 'free' | 'premium';
  expiryDate?: Date;
  source?: 'self-paid' | 'advisor-paid';
  subscription?: {
    id: string;
    plan_tier: string;
    status: string;
    current_period_end: string;
    paid_by_advisor_id: string | null;
  };
}> {
  try {
    console.log('🔍 hasUserBoughtPremium: Checking for userId:', userId);
    
    if (!userId) {
      console.log('❌ No userId provided');
      return { hasPremium: false, tier: 'free' };
    }

    // Step 1: Determine if userId is profile_id or auth_user_id
    let profileIds: string[] = [];

    // Check if it's directly a profile_id
    const { data: directProfile, error: directError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .limit(1)
      .maybeSingle();

    if (!directError && directProfile) {
      // userId is profile_id - use directly
      profileIds = [directProfile.id];
      console.log('✅ userId is profile_id:', profileIds[0]);
    } else {
      // Try as auth_user_id - get ALL profiles for this user
      const { data: userProfiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_user_id', userId)
        .order('created_at', { ascending: false });

      if (!profileError && userProfiles && userProfiles.length > 0) {
        profileIds = userProfiles.map(p => p.id);
        console.log('✅ Found', profileIds.length, 'profiles for auth_user_id');
      } else {
        console.warn('⚠️ Could not find any profiles for userId:', userId);
        return { hasPremium: false, tier: 'free' };
      }
    }

    // Step 2: Check for active premium subscriptions across all profiles
    const { data: subscriptions, error: subError } = await supabase
      .from('user_subscriptions')
      .select('id, plan_tier, status, current_period_end, paid_by_advisor_id')
      .in('user_id', profileIds)
      .eq('status', 'active')
      .eq('plan_tier', 'premium') // Only check for premium tier
      .order('created_at', { ascending: false });

    if (subError) {
      console.error('❌ Error fetching subscriptions:', subError);
      console.error('   Error code:', subError.code);
      console.error('   Error message:', subError.message);
      
      // If it's a 403 error, RLS is blocking access
      if (subError.code === '403' || subError.status === 403) {
        console.error('🔴 RLS Policy is blocking access to user_subscriptions!');
        console.error('   This means the 403 error from the dashboard is happening here');
        console.error('   Deploy CREATE_BILLING_RLS.sql to fix');
      }
      
      return { hasPremium: false, tier: 'free' };
    }

    // Step 3: Check if any subscription is still valid (not expired)
    if (!subscriptions || subscriptions.length === 0) {
      console.log('ℹ️ No premium subscriptions found - user is on free tier');
      return { hasPremium: false, tier: 'free' };
    }

    // Check each subscription for validity
    for (const sub of subscriptions) {
      if (!sub.current_period_end) {
        console.warn('⚠️ Subscription missing current_period_end:', sub.id);
        continue;
      }

      const expiryDate = new Date(sub.current_period_end);
      const isExpired = expiryDate <= currentTime;

      console.log('🔍 Subscription check:', {
        subscriptionId: sub.id,
        tier: sub.plan_tier,
        status: sub.status,
        expiryDate: expiryDate.toISOString(),
        currentTime: currentTime.toISOString(),
        isExpired,
        paidByAdvisor: sub.paid_by_advisor_id ? 'yes' : 'no'
      });

      // If we found an active, non-expired premium subscription, return true
      if (!isExpired && sub.plan_tier === 'premium' && sub.status === 'active') {
        const source = sub.paid_by_advisor_id ? 'advisor-paid' : 'self-paid';
        console.log('✅ Premium subscription found! Source:', source);
        
        return {
          hasPremium: true,
          tier: 'premium',
          expiryDate,
          source,
          subscription: {
            id: sub.id,
            plan_tier: sub.plan_tier,
            status: sub.status,
            current_period_end: sub.current_period_end,
            paid_by_advisor_id: sub.paid_by_advisor_id
          }
        };
      }

      // If expired, continue to check other subscriptions
      if (isExpired) {
        console.log('⏰ Subscription expired, checking next subscription...');
      }
    }

    // No valid premium subscriptions found
    console.log('❌ No valid premium subscriptions found (all expired or inactive)');
    return { hasPremium: false, tier: 'free' };

  } catch (error: any) {
    console.error('❌ Error in hasUserBoughtPremium:', error);
    console.error('   Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    // On error, assume no premium to prevent access issues
    return { hasPremium: false, tier: 'free' };
  }
}

/**
 * USAGE EXAMPLES
 */

// Example 1: Check if current user has premium (profile_id)
/*
const currentUserProfileId = 'ea07161a-5c9e-40aa-a63a-9160d5d2bd33';
const result = await hasUserBoughtPremium(currentUserProfileId);

if (result.hasPremium) {
  console.log(`✅ User has ${result.tier} access until ${result.expiryDate?.toLocaleDateString()}`);
  console.log(`   Paid by: ${result.source}`);
} else {
  console.log('❌ User is on free tier - no premium access');
}
*/

// Example 2: Check if startup has premium (auth_user_id)
/*
const startupAuthUserId = '9b8f3c2a-1234-5678-abcd-efghijklmnop';
const result = await hasUserBoughtPremium(startupAuthUserId);

if (!result.hasPremium) {
  console.log('User can only access free features');
} else {
  console.log('User has premium access');
}
*/

// Example 3: Use in Investment Advisor Dashboard
/*
async function displayStartupPremiumStatus(startupProfileId: string) {
  const result = await hasUserBoughtPremium(startupProfileId);
  
  if (result.hasPremium) {
    const daysUntilExpiry = Math.ceil(
      (result.expiryDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    
    return `
      <div class="premium-badge">
        Premium - ${result.source} 
        Expires in ${daysUntilExpiry} days
        (${result.expiryDate?.toLocaleDateString()})
      </div>
    `;
  } else {
    return '<div class="free-badge">Free Tier</div>';
  }
}
*/

/**
 * TROUBLESHOOTING
 * 
 * If you get 403 Forbidden error:
 * 1. Deploy CREATE_BILLING_RLS.sql in Supabase SQL Editor
 * 2. Verify RLS policies exist with SUBSCRIPTION_403_ERROR_DIAGNOSTIC_QUERIES.sql
 * 3. Check that user_subscriptions table has correct policies using user_profiles
 * 
 * If function returns `hasPremium: false` when it should be true:
 * 1. Check subscription exists in database
 * 2. Verify subscription status = 'active'
 * 3. Verify plan_tier = 'premium'
 * 4. Verify current_period_end > NOW()
 * 5. Verify user_id in subscription matches user_profiles.id (profile_id)
 */

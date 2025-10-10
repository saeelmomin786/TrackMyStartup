// Debug script to check subscription status and dashboard access
// Run this in browser console to diagnose issues

console.log('🔍 Starting subscription debug...');

// Check current user
const checkCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('❌ Error getting current user:', error);
      return null;
    }
    console.log('✅ Current user:', user?.email, 'ID:', user?.id);
    return user;
  } catch (error) {
    console.error('❌ Error in checkCurrentUser:', error);
    return null;
  }
};

// Check subscription status
const checkSubscriptionStatus = async (userId) => {
  try {
    console.log('🔍 Checking subscription for user:', userId);
    
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');
    
    if (error) {
      console.error('❌ Error checking subscription:', error);
      return null;
    }
    
    console.log('📊 Subscription data:', data);
    
    if (!data || data.length === 0) {
      console.log('❌ No active subscription found');
      return false;
    }
    
    // Check if subscription is still valid
    const now = new Date();
    const periodEnd = new Date(data[0].current_period_end);
    
    console.log('⏰ Current time:', now.toISOString());
    console.log('⏰ Period end:', periodEnd.toISOString());
    console.log('⏰ Is valid:', periodEnd > now);
    
    if (periodEnd < now) {
      console.log('❌ Subscription expired');
      return false;
    }
    
    console.log('✅ Active subscription found:', data[0]);
    return true;
  } catch (error) {
    console.error('❌ Error in checkSubscriptionStatus:', error);
    return false;
  }
};

// Check user role
const checkUserRole = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('❌ Error checking user role:', error);
      return null;
    }
    
    console.log('👤 User role:', data?.role);
    return data?.role;
  } catch (error) {
    console.error('❌ Error in checkUserRole:', error);
    return null;
  }
};

// Main debug function
const debugSubscriptionFlow = async () => {
  console.log('🚀 Starting subscription flow debug...');
  
  // Step 1: Check current user
  const user = await checkCurrentUser();
  if (!user) {
    console.log('❌ No user found - authentication issue');
    return;
  }
  
  // Step 2: Check user role
  const role = await checkUserRole(user.id);
  console.log('👤 User role:', role);
  
  // Step 3: Check subscription status
  const hasActiveSubscription = await checkSubscriptionStatus(user.id);
  console.log('💳 Has active subscription:', hasActiveSubscription);
  
  // Step 4: Check if user should have dashboard access
  if (role === 'Startup') {
    if (hasActiveSubscription) {
      console.log('✅ Startup user with active subscription - should have dashboard access');
    } else {
      console.log('❌ Startup user without active subscription - should be redirected to payment');
    }
  } else {
    console.log('ℹ️ Non-startup user - dashboard access not restricted by subscription');
  }
  
  // Step 5: Check current page/route
  console.log('📍 Current page:', window.location.pathname);
  console.log('📍 Current hash:', window.location.hash);
  
  return {
    user,
    role,
    hasActiveSubscription,
    shouldHaveDashboardAccess: role !== 'Startup' || hasActiveSubscription
  };
};

// Run the debug
debugSubscriptionFlow().then(result => {
  console.log('🎯 Debug result:', result);
});

// Export for manual use
window.debugSubscriptionFlow = debugSubscriptionFlow;


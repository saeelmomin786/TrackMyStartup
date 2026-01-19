require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserIds() {
  console.log('🔍 Checking user IDs for confusion...\n');
  
  // Check profile_id 79dc2461
  const { data: profile1 } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', '79dc2461-eaf3-4c74-9552-5a82076b174f')
    .single();
    
  console.log('Profile 79dc2461:', {
    id: profile1?.id,
    auth_user_id: profile1?.auth_user_id,
    email: profile1?.email,
    user_type: profile1?.user_type
  });
  
  // Check if 645cfff5 exists
  const { data: profile2 } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', '645cfff5-172d-4c62-8ae3-883aea527f00')
    .single();
    
  console.log('\nProfile 645cfff5:', {
    id: profile2?.id,
    auth_user_id: profile2?.auth_user_id,
    email: profile2?.email,
    user_type: profile2?.user_type
  });
  
  // Check if 645cfff5 is an auth_user_id
  const { data: profileByAuth } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('auth_user_id', '645cfff5-172d-4c62-8ae3-883aea527f00')
    .single();
    
  console.log('\nProfile with auth_user_id 645cfff5:', {
    id: profileByAuth?.id,
    auth_user_id: profileByAuth?.auth_user_id,
    email: profileByAuth?.email,
    user_type: profileByAuth?.user_type
  });
  
  // Check subscriptions for both
  const { data: subs1 } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', '79dc2461-eaf3-4c74-9552-5a82076b174f');
    
  const { data: subs2 } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', '645cfff5-172d-4c62-8ae3-883aea527f00');
    
  console.log('\n📊 Subscriptions for 79dc2461:', subs1?.length || 0);
  console.log('📊 Subscriptions for 645cfff5:', subs2?.length || 0);
  
  if (subs2 && subs2.length > 0) {
    console.log('\n✅ Found subscription for 645cfff5:');
    console.log(subs2[0]);
  }
}

checkUserIds().then(() => process.exit(0)).catch(console.error);

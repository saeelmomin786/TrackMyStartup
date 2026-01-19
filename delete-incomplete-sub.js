// Delete incomplete subscription to test fresh creation
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function deleteIncompleteSubscription() {
  const profileId = 'db4c251a-9bc2-4e1c-952f-081e14a5ae06'; // Om Desai's profile ID
  
  console.log('🗑️  Deleting incomplete subscription for profile:', profileId);
  
  // Delete subscription
  const { error } = await supabase
    .from('user_subscriptions')
    .delete()
    .eq('user_id', profileId)
    .eq('plan_tier', 'free'); // Only delete the incomplete one
  
  if (error) {
    console.error('❌ Error deleting subscription:', error);
  } else {
    console.log('✅ Subscription deleted successfully');
    console.log('Now try making a payment again from the frontend!');
  }
}

deleteIncompleteSubscription().catch(console.error);

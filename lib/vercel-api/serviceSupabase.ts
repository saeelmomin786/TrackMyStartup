import type { SupabaseClient } from '@supabase/supabase-js';

/** Service-role client without generated DB types (avoids `never` table/RPC inference). */
export type ServiceSupabase = SupabaseClient<any, 'public', any>;

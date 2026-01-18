#!/usr/bin/env node

/**
 * VERIFY ACTUAL RLS POLICIES IN LIVE SUPABASE DATABASE
 * This script checks what policies and functions are actually deployed
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dlesebbmlrewsbmqvuza.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZXNlYmJtbHJld3NibXF2dXphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTMxMTcsImV4cCI6MjA3MDEyOTExN30.zFTVSgL5QpVqEDc-nQuKbaG_3egHZEm-V17UvkOpFCQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyPolicies() {
  console.log('🔍 VERIFYING SUPABASE RLS POLICIES AND FUNCTIONS\n');
  console.log('=' .repeat(60));

  try {
    // Query pg_policies to get actual deployed policies
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('tablename, policyname, cmd, roles');

    if (policiesError) {
      console.error('❌ Error querying pg_policies:', policiesError);
      console.log('\n⚠️  This is expected - pg_policies might not be directly queryable.');
      console.log('📝 Go to Supabase Dashboard > SQL Editor and run the queries in verify_policies.sql');
      return;
    }

    console.log('\n✅ POLICIES FOUND:');
    
    const tableGroups = {};
    (policies || []).forEach(p => {
      if (!tableGroups[p.tablename]) tableGroups[p.tablename] = [];
      tableGroups[p.tablename].push(p);
    });

    Object.entries(tableGroups).forEach(([table, policiesList]) => {
      console.log(`\n📋 TABLE: ${table}`);
      policiesList.forEach(p => {
        console.log(`  ├─ ${p.policyname}`);
        console.log(`  │  └─ Operation: ${p.cmd} (Roles: ${p.roles})`);
      });
    });

    // Try to list functions
    console.log('\n\n📦 CHECKING FOR FUNCTIONS:');
    const functionNames = [
      'is_subscription_valid',
      'handle_autopay_cancellation',
      'handle_subscription_payment_failure',
      'create_subscription'
    ];

    for (const fnName of functionNames) {
      try {
        const { error } = await supabase.rpc(fnName, {});
        if (error && error.message.includes('not found')) {
          console.log(`  ❌ ${fnName} - NOT FOUND`);
        } else if (error) {
          console.log(`  ✅ ${fnName} - EXISTS (error calling: expected)`);
        } else {
          console.log(`  ✅ ${fnName} - EXISTS`);
        }
      } catch (e) {
        console.log(`  ⚠️  ${fnName} - Could not verify`);
      }
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📚 NEXT STEPS:');
  console.log('1. Go to: https://app.supabase.com/');
  console.log('2. Select your project "dlesebbmlrewsbmqvuza"');
  console.log('3. SQL Editor → New query');
  console.log('4. Run the queries in verify_policies.sql to see actual deployed policies\n');
}

await verifyPolicies();

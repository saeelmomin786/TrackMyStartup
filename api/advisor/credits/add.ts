import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * API Endpoint: POST /api/advisor/credits/add
 * Purpose: Add credits to advisor account after successful payment
 * 
 * Uses service role key to:
 * 1. Call RPC function to increment advisor credits
 * 2. Record purchase history in database
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      advisor_user_id,
      credits_to_add,
      amount_paid,
      currency,
      payment_gateway,
      payment_transaction_id
    } = req.body;

    // Validate required fields
    if (!advisor_user_id || !credits_to_add || !amount_paid || !currency || !payment_gateway || !payment_transaction_id) {
      console.error('Missing required fields:', {
        has_advisor_user_id: !!advisor_user_id,
        has_credits_to_add: !!credits_to_add,
        has_amount_paid: !!amount_paid,
        has_currency: !!currency,
        has_payment_gateway: !!payment_gateway,
        has_payment_transaction_id: !!payment_transaction_id
      });
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['advisor_user_id', 'credits_to_add', 'amount_paid', 'currency', 'payment_gateway', 'payment_transaction_id']
      });
    }

    // Initialize Supabase with service role (has admin privileges)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔄 Adding credits via RPC for advisor:', advisor_user_id);

    // Call RPC function to increment credits
    // This function handles insert-or-update logic atomically
    const { data: incrementedCredits, error: rpcError } = await supabase.rpc('increment_advisor_credits', {
      p_advisor_user_id: advisor_user_id,
      p_credits_to_add: credits_to_add,
      p_amount_paid: amount_paid,
      p_currency: currency
    });

    if (rpcError) {
      console.error('❌ RPC Error adding credits:', {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint
      });
      
      // Try to record failed purchase for audit
      try {
        await supabase
          .from('credit_purchase_history')
          .insert({
            advisor_user_id: advisor_user_id,
            credits_purchased: credits_to_add,
            amount_paid: amount_paid,
            currency: currency,
            payment_gateway: payment_gateway,
            payment_transaction_id: payment_transaction_id,
            status: 'failed',
            metadata: { 
              error: rpcError.message,
              code: rpcError.code
            }
          });
      } catch (historyError) {
        console.error('Could not record failed purchase history:', historyError);
      }
      
      return res.status(500).json({ 
        error: 'Failed to add credits',
        details: rpcError.message,
        code: rpcError.code
      });
    }

    console.log('✅ Credits incremented successfully:', incrementedCredits);

    // Record purchase history (success)
    const { error: historyError } = await supabase
      .from('credit_purchase_history')
      .insert({
        advisor_user_id: advisor_user_id,
        credits_purchased: credits_to_add,
        amount_paid: amount_paid,
        currency: currency,
        payment_gateway: payment_gateway,
        payment_transaction_id: payment_transaction_id,
        status: 'completed',
        metadata: {
          credits_available: incrementedCredits?.credits_available,
          credits_used: incrementedCredits?.credits_used,
          credits_purchased: incrementedCredits?.credits_purchased
        }
      });

    if (historyError) {
      console.error('⚠️ Warning: Could not record purchase history:', historyError);
      // Don't fail the entire operation - credits were added successfully
      // History is just for auditing
    } else {
      console.log('✅ Purchase history recorded');
    }

    // Return success
    return res.status(200).json({
      success: true,
      credits: incrementedCredits,
      message: `Successfully added ${credits_to_add} credits to advisor account`
    });

  } catch (error: any) {
    console.error('❌ Unexpected error in add credits endpoint:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

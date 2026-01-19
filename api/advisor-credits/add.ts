import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

async function addAdvisorCredits(
  supabase: ReturnType<typeof createClient>,
  advisorUserId: string,
  creditsToAdd: number,
  amountPaid: number,
  currency: string,
  paymentGateway: string,
  paymentTransactionId: string
): Promise<{ success: boolean; error?: string; credits?: any }> {
  try {
    console.log('🔄 Adding credits via RPC for advisor:', advisorUserId);

    // Call RPC function to increment credits
    const { data: incrementedCredits, error: rpcError } = await supabase.rpc('increment_advisor_credits', {
      p_advisor_user_id: advisorUserId,
      p_credits_to_add: creditsToAdd,
      p_amount_paid: amountPaid,
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
            advisor_user_id: advisorUserId,
            credits_purchased: creditsToAdd,
            amount_paid: amountPaid,
            currency: currency,
            payment_gateway: paymentGateway,
            payment_transaction_id: paymentTransactionId,
            status: 'failed',
            metadata: {
              error: rpcError.message,
              code: rpcError.code
            }
          });
      } catch (historyError) {
        console.error('Could not record failed purchase history:', historyError);
      }

      return { 
        success: false,
        error: rpcError.message
      };
    }

    console.log('✅ Credits incremented successfully:', incrementedCredits);

    // Record purchase history (success)
    const { error: historyError } = await supabase
      .from('credit_purchase_history')
      .insert({
        advisor_user_id: advisorUserId,
        credits_purchased: creditsToAdd,
        amount_paid: amountPaid,
        currency: currency,
        payment_gateway: paymentGateway,
        payment_transaction_id: paymentTransactionId,
        status: 'completed',
        metadata: {
          credits_available: incrementedCredits?.credits_available,
          credits_used: incrementedCredits?.credits_used,
          credits_purchased: incrementedCredits?.credits_purchased
        }
      });

    if (historyError) {
      console.error('⚠️ Warning: Could not record purchase history:', historyError);
      // Don't fail - credits were added successfully
    } else {
      console.log('✅ Purchase history recorded');
    }

    return { 
      success: true,
      credits: incrementedCredits
    };
  } catch (error: any) {
    console.error('❌ Error in addAdvisorCredits:', error);
    return { 
      success: false,
      error: error.message 
    };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
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
    } = req.body as {
      advisor_user_id?: string;
      credits_to_add?: number;
      amount_paid?: number;
      currency?: string;
      payment_gateway?: string;
      payment_transaction_id?: string;
    };

    // Validate required fields
    if (!advisor_user_id || !credits_to_add || !amount_paid || !currency || !payment_gateway || !payment_transaction_id) {
      console.error('Missing required fields for advisor credits:', {
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

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const result = await addAdvisorCredits(
      supabase,
      advisor_user_id,
      credits_to_add,
      amount_paid,
      currency,
      payment_gateway,
      payment_transaction_id
    );

    if (!result.success) {
      return res.status(500).json({ 
        error: 'Failed to add credits',
        details: result.error
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Credits added successfully',
      credits: result.credits
    });

  } catch (error: any) {
    console.error('❌ Error in advisor credits endpoint:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

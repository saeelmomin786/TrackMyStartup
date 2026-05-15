import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import type { ServiceSupabase } from '../serviceSupabase';

function json(res: VercelResponse, status: number, data: unknown): void {
  res.status(status).json(data);
}

function readCronSecret(req: VercelRequest): string | undefined {
  const h = req.headers;
  const raw = h['cron_secret'];
  if (Array.isArray(raw)) return raw[0];
  if (typeof raw === 'string') return raw;
  const auth = h.authorization;
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return undefined;
}

/**
 * Auto-renew advisor credit assignments (GitHub Actions POST or Vercel Cron GET).
 * Auth: CRON_SECRET via `cron_secret` header or `Authorization: Bearer <CRON_SECRET>`.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const expected = process.env.CRON_SECRET;
  if (!expected || readCronSecret(req) !== expected) {
    return json(res, 401, { error: 'Unauthorized - Invalid CRON_SECRET' });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body) as Record<string, unknown>; } catch { return {}; } })() : (req.body as Record<string, unknown> | null);
    if (body?.endpoint !== 'auto-renew-advisor-credits') {
      return json(res, 400, { error: 'Invalid endpoint' });
    }
  } else if (req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return json(res, 500, { error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }) as ServiceSupabase;

    const { data: expiredAssignments, error: fetchError } = await supabase
      .from('advisor_credit_assignments')
      .select('*')
      .eq('status', 'active')
      .eq('auto_renewal_enabled', true)
      .lt('end_date', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching expired assignments:', fetchError);
      return json(res, 500, { error: 'Failed to fetch assignments' });
    }

    if (!expiredAssignments || expiredAssignments.length === 0) {
      return json(res, 200, { message: 'No expired assignments to renew', processed: 0 });
    }

    let processedCount = 0;
    let renewedCount = 0;
    let disabledCount = 0;

    for (const assignment of expiredAssignments) {
      try {
        const { data: advisorCredits, error: creditsError } = await supabase
          .from('advisor_credits')
          .select('credits_available, credits_used')
          .eq('advisor_user_id', assignment.advisor_user_id)
          .maybeSingle();

        if (creditsError || !advisorCredits) {
          console.warn(`No credits record for advisor ${assignment.advisor_user_id}`);
          processedCount++;
          continue;
        }

        if (advisorCredits.credits_available >= 1) {
          const { data: deductResult, error: deductError } = await supabase.rpc('deduct_advisor_credit_safe', {
            p_advisor_user_id: assignment.advisor_user_id,
            p_amount_to_deduct: 1,
          });

          if (deductError || !deductResult || !(deductResult as unknown as { success?: boolean }[])[0]?.success) {
            console.error(`Failed to deduct credit for assignment ${assignment.id}:`, deductError);
            processedCount++;
            continue;
          }

          const newEndDate = new Date(assignment.end_date);
          newEndDate.setMonth(newEndDate.getMonth() + 1);
          const newStartDate = new Date(assignment.end_date);

          const { error: updateAssignmentError } = await supabase
            .from('advisor_credit_assignments')
            .update({
              start_date: newStartDate.toISOString(),
              end_date: newEndDate.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', assignment.id);

          if (updateAssignmentError) {
            console.error(`Failed to update assignment ${assignment.id}:`, updateAssignmentError);
            processedCount++;
            continue;
          }

          const { error: updateSubError } = await supabase
            .from('user_subscriptions')
            .update({
              current_period_end: newEndDate.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', assignment.subscription_id)
            .select()
            .single();

          if (updateSubError) {
            console.warn(`Could not update subscription for assignment ${assignment.id}:`, updateSubError);
          } else {
            const { data: subDetails } = await supabase.from('user_subscriptions').select('*').eq('id', assignment.subscription_id).single();

            if (subDetails) {
              const nextCycleNumber = (subDetails.billing_cycle_count || 0) + 1;

              await supabase.from('billing_cycles').insert({
                subscription_id: assignment.subscription_id,
                cycle_number: nextCycleNumber,
                period_start: newStartDate.toISOString(),
                period_end: newEndDate.toISOString(),
                amount: subDetails.amount,
                currency: subDetails.currency,
                status: 'paid',
                plan_tier: subDetails.plan_tier,
                is_autopay: false,
                autopay_attempted_at: new Date().toISOString(),
              });

              await supabase.from('user_subscriptions').update({ billing_cycle_count: nextCycleNumber }).eq('id', assignment.subscription_id);
            }
          }

          console.log(`✅ Auto-renewed assignment ${assignment.id} until ${newEndDate.toISOString()}`);
          renewedCount++;
        } else {
          const { error: disableError } = await supabase
            .from('advisor_credit_assignments')
            .update({
              auto_renewal_enabled: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', assignment.id);

          if (disableError) {
            console.error(`Failed to disable auto-renewal for assignment ${assignment.id}:`, disableError);
          } else {
            console.log(`⚠️ Disabled auto-renewal for assignment ${assignment.id} (no credits)`);
            disabledCount++;
          }
        }

        processedCount++;
      } catch (error) {
        console.error(`Error processing assignment ${assignment.id}:`, error);
        processedCount++;
      }
    }

    return json(res, 200, {
      message: 'Auto-renewal cron completed',
      processed: processedCount,
      renewed: renewedCount,
      disabled: disabledCount,
    });
  } catch (error) {
    console.error('Error in auto-renew cron:', error);
    return json(res, 500, { error: 'Internal server error' });
  }
}

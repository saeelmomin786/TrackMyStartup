import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { isMissingRelationError } from '../../lib/postgrestErrors';

function json(res: VercelResponse, status: number, data: unknown): void {
  res.status(status).json(data);
}

function getAction(req: VercelRequest): string {
  const raw = req.query.action;
  return Array.isArray(raw) ? raw[0] : (raw || '');
}

function getSupabaseAdmin(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** GoTrue /user expects anon apikey + user access JWT; service-only client often returns 401 for the same JWT. */
async function getRequesterIdFromBearer(admin: SupabaseClient, authHeader: string | string[] | undefined): Promise<string | null> {
  const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const h = typeof raw === 'string' ? raw.trim() : '';
  if (!h.startsWith('Bearer ')) return null;
  const jwt = h.slice(7).trim();
  if (!jwt) return null;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (supabaseUrl && anon) {
    const anonAuth = createClient(supabaseUrl, anon, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: a, error: e1 } = await anonAuth.auth.getUser(jwt);
    if (!e1 && a?.user?.id) return a.user.id;
  }

  const { data, error } = await admin.auth.getUser(jwt);
  if (!error && data?.user?.id) return data.user.id;
  return null;
}

async function fetchGlobalDefaultFeeInr(admin: SupabaseClient): Promise<number> {
  const { data, error } = await admin.from('investor_application_fee_settings').select('fee_inr').eq('id', 1).maybeSingle();
  if (isMissingRelationError(error)) {
    return 0;
  }
  if (error || data == null) {
    return 499;
  }
  const n = Number((data as { fee_inr?: number }).fee_inr);
  return Number.isFinite(n) && n >= 0 ? n : 499;
}

/** Per-investor override if present; otherwise global default from investor_application_fee_settings. */
async function resolveApplicationFeeInr(admin: SupabaseClient, investorUserId: string): Promise<number> {
  const { data: row, error } = await admin
    .from('investor_application_fees')
    .select('fee_inr')
    .eq('investor_user_id', investorUserId)
    .maybeSingle();
  if (isMissingRelationError(error)) {
    return fetchGlobalDefaultFeeInr(admin);
  }
  if (!error && row != null && (row as { fee_inr?: number }).fee_inr != null) {
    const n = Number((row as { fee_inr?: number }).fee_inr);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return fetchGlobalDefaultFeeInr(admin);
}

async function handleCreateOrder(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return json(res, 500, { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

  const requesterId = await getRequesterIdFromBearer(admin, req.headers.authorization);
  if (!requesterId) {
    return json(res, 401, { error: 'Missing or invalid Authorization bearer token' });
  }

  try {
    const body = (req.body || {}) as { investorUserId?: string; startupId?: number; previewOnly?: boolean };
    const previewOnly = Boolean(body.previewOnly);
    const investorUserId = body.investorUserId?.trim();
    const startupId = Number(body.startupId);
    if (!investorUserId || !Number.isFinite(startupId)) {
      return json(res, 400, { error: 'investorUserId and startupId are required' });
    }

    const { data: startupRow, error: stErr } = await admin
      .from('startups')
      .select('id, user_id')
      .eq('id', startupId)
      .maybeSingle();
    if (stErr || !startupRow || (startupRow as { user_id?: string }).user_id !== requesterId) {
      return json(res, 403, { error: 'Startup not found or access denied' });
    }

    const feeInr = await resolveApplicationFeeInr(admin, investorUserId);

    const { data: pendingBlock } = await admin
      .from('investor_connection_requests')
      .select('id, status')
      .eq('investor_id', investorUserId)
      .eq('requester_id', requesterId)
      .eq('startup_id', startupId)
      .in('status', ['pending', 'accepted'])
      .maybeSingle();
    if (pendingBlock) {
      return json(res, 409, { error: 'You already have an active application for this investor.' });
    }

    if (previewOnly) {
      const safeFee = Number.isFinite(feeInr) && feeInr >= 0 ? feeInr : 0;
      return json(res, 200, {
        previewOnly: true,
        feeInr: safeFee,
        skipPayment: safeFee <= 0,
      });
    }

    const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (feeInr <= 0) {
      return json(res, 200, { skipPayment: true, feeInr: 0, keyId });
    }

    if (!keyId || !keySecret) {
      return json(res, 500, { error: 'Razorpay keys not configured' });
    }

    const amountInPaise = Math.round(feeInr * 100);
    if (amountInPaise < 100) {
      return json(res, 400, { error: 'Configured fee must be at least ₹1' });
    }

    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
    const receiptRaw = `invapp_${startupId}_${Date.now()}`;
    const receipt = receiptRaw.length > 40 ? receiptRaw.slice(0, 40) : receiptRaw;

    const rpResp = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        payment_capture: 1,
        notes: {
          purpose: 'startup_investor_application',
          startup_id: String(startupId),
          investor_id: investorUserId,
          requester_id: requesterId,
        },
      }),
    });

    if (!rpResp.ok) {
      const text = await rpResp.text();
      return json(res, rpResp.status, { error: 'Failed to create Razorpay order', details: text });
    }

    const order = await rpResp.json();
    return json(res, 200, {
      success: true,
      order,
      keyId,
      feeInr,
      currency: 'INR',
      investorUserId,
      startupId,
    });
  } catch (e) {
    return json(res, 500, { error: 'Server error', details: e instanceof Error ? e.message : String(e) });
  }
}

async function handleVerifyPayment(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return json(res, 500, { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

  const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return json(res, 500, { error: 'Missing Razorpay secret key' });
  }

  const requesterId = await getRequesterIdFromBearer(admin, req.headers.authorization);
  if (!requesterId) {
    return json(res, 401, { error: 'Missing or invalid Authorization bearer token' });
  }

  try {
    const body = (req.body || {}) as {
      investorUserId?: string;
      startupId?: number;
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
      startup_profile_url?: string;
    };
    const investorUserId = body.investorUserId?.trim();
    const startupId = Number(body.startupId);
    const orderId = body.razorpay_order_id?.trim();
    const paymentId = body.razorpay_payment_id?.trim();
    const signature = body.razorpay_signature?.trim();
    const startupProfileUrl = body.startup_profile_url?.trim();

    if (!investorUserId || !Number.isFinite(startupId) || !orderId || !paymentId || !signature || !startupProfileUrl) {
      return json(res, 400, {
        error:
          'investorUserId, startupId, startup_profile_url, razorpay_order_id, razorpay_payment_id, razorpay_signature are required',
      });
    }

    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto.createHmac('sha256', keySecret).update(payload).digest('hex');
    if (expectedSignature !== signature) {
      return json(res, 400, { error: 'Invalid payment signature' });
    }

    const { data: startupRow, error: stErr } = await admin
      .from('startups')
      .select('id, user_id')
      .eq('id', startupId)
      .maybeSingle();
    if (stErr || !startupRow || (startupRow as { user_id?: string }).user_id !== requesterId) {
      return json(res, 403, { error: 'Startup not found or access denied' });
    }

    const feeInr = await resolveApplicationFeeInr(admin, investorUserId);
    const expectedPaise = Math.round(feeInr * 100);

    const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    if (!keyId || !keySecret) {
      return json(res, 500, { error: 'Razorpay keys not configured' });
    }
    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;

    const payResp = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: { Authorization: authHeader },
    });
    if (!payResp.ok) {
      const t = await payResp.text();
      return json(res, 400, { error: 'Could not load payment from Razorpay', details: t });
    }
    const payment = (await payResp.json()) as {
      order_id?: string;
      amount?: number;
      currency?: string;
      status?: string;
    };
    if (payment.order_id !== orderId) {
      return json(res, 400, { error: 'Payment does not match order' });
    }
    if (payment.currency !== 'INR' || Number(payment.amount) !== expectedPaise) {
      return json(res, 400, { error: 'Payment amount does not match application fee' });
    }
    if (payment.status !== 'authorized' && payment.status !== 'captured') {
      return json(res, 400, { error: 'Payment is not successful' });
    }

    const { data: existing } = await admin
      .from('investor_connection_requests')
      .select('id, status, application_razorpay_payment_id')
      .eq('investor_id', investorUserId)
      .eq('requester_id', requesterId)
      .eq('startup_id', startupId)
      .eq('application_razorpay_payment_id', paymentId)
      .maybeSingle();
    if (existing) {
      return json(res, 200, { success: true, duplicate: true, requestId: (existing as { id: string }).id });
    }

    const { data: block } = await admin
      .from('investor_connection_requests')
      .select('id, status')
      .eq('investor_id', investorUserId)
      .eq('requester_id', requesterId)
      .eq('startup_id', startupId)
      .in('status', ['pending', 'accepted'])
      .maybeSingle();
    if (block) {
      return json(res, 409, { error: 'You already have an active application for this investor.' });
    }

    const insertRow: Record<string, unknown> = {
      investor_id: investorUserId,
      requester_id: requesterId,
      requester_type: 'Startup',
      startup_id: startupId,
      startup_profile_url: startupProfileUrl,
      status: 'pending',
      application_fee_inr: feeInr,
      application_razorpay_payment_id: paymentId,
    };

    const { data: inserted, error: insErr } = await admin
      .from('investor_connection_requests')
      .insert(insertRow)
      .select('id')
      .single();

    if (insErr) {
      return json(res, 500, { error: 'Failed to create application', details: insErr.message });
    }

    return json(res, 200, { success: true, requestId: (inserted as { id: string }).id });
  } catch (e) {
    return json(res, 500, { error: 'Server error', details: e instanceof Error ? e.message : String(e) });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const action = getAction(req);
  if (action === 'create-order') {
    return handleCreateOrder(req, res);
  }
  if (action === 'verify-payment') {
    return handleVerifyPayment(req, res);
  }
  return json(res, 404, { error: 'Unknown investor-application route' });
}

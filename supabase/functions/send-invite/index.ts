// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function: send-invite
// Sends invitation/association emails from support@trackmystartup.com using Resend API

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

type InviteKind = 'center' | 'investor';

interface InvitePayload {
  kind: InviteKind;
  name: string;
  email: string;
  phone?: string;
  startupName?: string;
  appUrl?: string;
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPPORT_FROM_EMAIL = Deno.env.get('SUPPORT_FROM_EMAIL') || 'support@trackmystartup.com';

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type'
    }
  });
}

function buildEmailContent(payload: InvitePayload) {
  const { kind, name, email, phone, startupName, appUrl } = payload;
  const roleLine = kind === 'center' ? 'Incubation Center / Accelerator' : 'Investor';
  const subject = kind === 'center'
    ? `Association details requested for ${startupName || 'a startup'}`
    : `Investment association details requested for ${startupName || 'a startup'}`;

  const registerUrl = appUrl ? `${appUrl}?page=register` : '';

  const lines: string[] = [];
  lines.push(`Hello ${name},`);
  lines.push('');
  if (kind === 'center') {
    lines.push(`${startupName || 'A startup'} is providing association details for your ${roleLine}.`);
    lines.push('If you are not yet on TrackMyStartup, you can register using the link below.');
  } else {
    lines.push(`${startupName || 'A startup'} is listing you as an ${roleLine} (grant, debt or equity).`);
    lines.push('If you are not yet on TrackMyStartup, you can register using the link below.');
  }
  lines.push('');
  if (phone) lines.push(`Contact Number: ${phone}`);
  lines.push(`Email: ${email}`);
  if (registerUrl) {
    lines.push('');
    lines.push(`Get started: ${registerUrl}`);
  }
  lines.push('');
  lines.push('Best regards,');
  lines.push('TrackMyStartup Support');

  return { subject, text: lines.join('\n') };
}

async function sendViaResend(to: string, subject: string, text: string) {
  if (!RESEND_API_KEY) throw new Error('Missing RESEND_API_KEY');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: `TrackMyStartup Support <${SUPPORT_FROM_EMAIL}>`,
      to: [to],
      subject,
      text
    })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Resend error: ${res.status} ${errText}`);
  }
  return await res.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return jsonResponse({}, 200);
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }
  try {
    const payload = (await req.json()) as InvitePayload;
    if (!payload || !payload.kind || !payload.name || !payload.email) {
      return jsonResponse({ error: 'Invalid payload' }, 400);
    }
    if (!['center', 'investor'].includes(payload.kind)) {
      return jsonResponse({ error: 'Invalid kind' }, 400);
    }

    const { subject, text } = buildEmailContent(payload);
    const result = await sendViaResend(payload.email, subject, text);
    return jsonResponse({ success: true, id: result?.id || null });
  } catch (e: any) {
    return jsonResponse({ success: false, error: e?.message || 'Unknown error' }, 500);
  }
});



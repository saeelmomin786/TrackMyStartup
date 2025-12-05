import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const crawlerRegex = /(bot|crawler|spider|facebookexternalhit|linkedinbot|slackbot|twitterbot|whatsapp|telegram|discord|preview)/i;

function escapeHtml(str = ''): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const ua = (req.headers['user-agent'] || '').toString().toLowerCase();
    if (!crawlerRegex.test(ua)) {
      return res.status(404).send('Not a crawler');
    }

    const startupId = (req.query.startupId || req.query.id) as string | undefined;
    if (!startupId) {
      return res.status(400).send('Missing startupId');
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return res.status(500).send('Supabase env not configured');
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: startup, error: startupErr } = await supabase
      .from('startups_public')
      .select('id,name,sector,current_valuation,currency,description,logo_url,compliance_status')
      .eq('id', startupId)
      .single();

    if (startupErr || !startup) {
      return res.status(404).send('Startup not found');
    }

    const { data: fundraisingRows } = await supabase
      .from('fundraising_details_public')
      .select('one_pager_one_liner,value,equity,stage,type,pitch_deck_url,pitch_video_url,created_at')
      .eq('startup_id', startupId)
      .order('created_at', { ascending: false })
      .limit(1);

    const fundraising = Array.isArray(fundraisingRows) && fundraisingRows.length > 0 ? fundraisingRows[0] : null;

    const title = startup.name ? `${startup.name} | TrackMyStartup` : 'TrackMyStartup';
    const description = fundraising?.one_pager_one_liner
      ? fundraising.one_pager_one_liner
      : startup.description || `Discover ${startup.name || 'this startup'} on TrackMyStartup`;

    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const rewrote = (req.headers['x-rewrite-url'] as string) || req.url || '';
    const shareUrl = `${proto}://${host}${rewrote}`.replace('/api/share-startup', '');

    const fallbackImg = `${proto}://${host}/Track.png`;
    const image = (startup as any)?.logo_url || fallbackImg;

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:url" content="${escapeHtml(shareUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <meta name="robots" content="index,follow" />
</head>
<body>
  <p>Redirecting...</p>
  <script>window.location.href=${JSON.stringify(shareUrl)};</script>
</body>
</html>`;

    res.status(200).send(html);
  } catch (err) {
    console.error('share-startup error', err);
    res.status(500).send('Server error');
  }
}


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

    // Format currency for better description
    const formatCurrency = (value: number, currency: string = 'INR') => {
      try {
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value);
      } catch {
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value);
      }
    };

    // Enhanced description with valuation/ask info
    const currency = startup.currency || 'INR';
    let enhancedDescription = description;
    if (fundraising?.value && fundraising?.equity) {
      enhancedDescription = `${description}\n\nAsk: ${formatCurrency(fundraising.value, currency)} for ${fundraising.equity}% equity`;
    } else if (startup.current_valuation) {
      enhancedDescription = `${description}\n\nValuation: ${formatCurrency(startup.current_valuation, currency)}`;
    }

    // Extract YouTube video ID and use thumbnail as OG image
    const getYoutubeVideoId = (url?: string): string | null => {
      if (!url) return null;
      try {
        // Handle youtube.com/watch?v=VIDEO_ID
        if (url.includes('youtube.com/watch')) {
          const urlObj = new URL(url);
          return urlObj.searchParams.get('v');
        }
        // Handle youtu.be/VIDEO_ID
        if (url.includes('youtu.be/')) {
          const urlObj = new URL(url);
          return urlObj.pathname.slice(1).split('?')[0];
        }
        // Handle youtube.com/embed/VIDEO_ID
        if (url.includes('youtube.com/embed/')) {
          const match = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
          return match ? match[1] : null;
        }
        // Handle youtube.com/shorts/VIDEO_ID
        if (url.includes('youtube.com/shorts/')) {
          const match = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
          return match ? match[1] : null;
        }
      } catch {
        return null;
      }
      return null;
    };

    // Priority: YouTube video thumbnail > Startup logo > Default logo
    const fallbackImg = `${proto}://${host}/Track.png`;
    let image = fallbackImg;
    
    const videoId = getYoutubeVideoId(fundraising?.pitch_video_url);
    if (videoId) {
      // Use YouTube thumbnail (maxresdefault.jpg is highest quality, 1280x720)
      image = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    } else if ((startup as any)?.logo_url) {
      image = (startup as any).logo_url;
    }

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(enhancedDescription)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:url" content="${escapeHtml(shareUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(enhancedDescription)}" />
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


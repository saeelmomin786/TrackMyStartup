import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
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
      .select('one_pager_one_liner,value,equity,stage,type')
      .eq('startup_id', startupId)
      .order('created_at', { ascending: false })
      .limit(1);

    const fundraising = Array.isArray(fundraisingRows) && fundraisingRows.length > 0 ? fundraisingRows[0] : null;

    // Format currency
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

    const valuation = startup.current_valuation || 0;
    const currency = startup.currency || 'INR';
    const formattedValuation = formatCurrency(valuation, currency);
    const description = fundraising?.one_pager_one_liner || startup.description || `${startup.name} - ${startup.sector || 'Startup'}`;
    const askText = fundraising 
      ? `${formatCurrency(fundraising.value || 0, currency)} for ${fundraising.equity || 0}% equity`
      : `Valuation: ${formattedValuation}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${startup.name} | TrackMyStartup</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(to bottom right, #f8fafc, #ffffff);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .card {
      width: 1200px;
      max-width: 100%;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      overflow: hidden;
    }
    .header {
      width: 100%;
      height: 280px;
      background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .logo {
      width: 200px;
      height: 200px;
      border-radius: 12px;
      object-fit: contain;
      background: white;
      padding: 20px;
    }
    .logo-placeholder {
      width: 200px;
      height: 200px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 72px;
      font-weight: bold;
      color: #64748b;
    }
    .content {
      padding: 40px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .title {
      font-size: 56px;
      font-weight: bold;
      color: #1e293b;
      line-height: 1.2;
    }
    .sector {
      font-size: 32px;
      color: #64748b;
      font-weight: 600;
    }
    .meta {
      display: flex;
      gap: 16px;
      font-size: 24px;
      color: #475569;
    }
    .description {
      font-size: 28px;
      color: #64748b;
      line-height: 1.5;
      max-height: 120px;
      overflow: hidden;
    }
    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 24px;
      border-top: 2px solid #e2e8f0;
    }
    .ask {
      font-size: 36px;
      font-weight: bold;
      color: #1e293b;
    }
    .verified {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #10b981;
      color: #ffffff;
      padding: 12px 24px;
      border-radius: 9999px;
      font-size: 24px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      ${startup.logo_url 
        ? `<img src="${startup.logo_url}" alt="${startup.name}" class="logo" />`
        : `<div class="logo-placeholder">${startup.name.charAt(0).toUpperCase()}</div>`
      }
    </div>
    <div class="content">
      <div>
        <h1 class="title">${startup.name}</h1>
        <p class="sector">${startup.sector || 'Startup'}</p>
        ${fundraising?.type ? `
          <div class="meta">
            <span>Round: ${fundraising.type}</span>
            ${fundraising.stage ? `<span>• Stage: ${fundraising.stage}</span>` : ''}
          </div>
        ` : ''}
      </div>
      <p class="description">${description.length > 120 ? description.substring(0, 120) + '...' : description}</p>
      <div class="footer">
        <div class="ask">${askText}</div>
        ${startup.compliance_status === 'Compliant' ? '<div class="verified">✓ Verified</div>' : ''}
      </div>
    </div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (err: any) {
    console.error('Error generating card HTML:', err);
    res.status(500).send(`Server error: ${err.message}`);
  }
}


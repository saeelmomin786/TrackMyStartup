import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return res.status(500).json({ error: 'Razorpay keys not configured' });

    const { user_id, final_amount, interval = 'monthly', plan_name = 'Startup Plan', customer_notify = 1 } = req.body || {};
    if (!user_id || !final_amount) return res.status(400).json({ error: 'user_id and final_amount are required' });

    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    // Always create a dynamic plan when final_amount is provided to ensure correct amount
    // Pre-configured plan IDs might have different amounts, causing incorrect charges
    console.log(`Creating dynamic Razorpay plan for ${interval} plan with amount: ${final_amount}`);
    
    const period = interval === 'yearly' ? 'yearly' : 'monthly';
    
    let plan_id;
    try {
      const planResp = await fetch('https://api.razorpay.com/v1/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({
          period,
          interval: 1,
          item: {
            name: `${plan_name} (${interval})`,
            amount: Math.round(final_amount * 100), // Convert to paise
            currency: 'INR'
          }
        })
      });

      if (!planResp.ok) {
        const txt = await planResp.text();
        console.error('Razorpay plan creation failed:', txt);
        return res.status(planResp.status).json({ error: `Failed to create Razorpay plan: ${txt}` });
      }
      
      const planJson = await planResp.json();
      plan_id = planJson?.id;
      
      if (!plan_id) {
        console.error('No plan id in Razorpay response');
        return res.status(500).json({ error: 'Failed to create Razorpay plan' });
      }
      
      console.log(`✅ Created dynamic Razorpay plan with ID: ${plan_id} for amount: ₹${final_amount} (${Math.round(final_amount * 100)} paise)`);
    } catch (planError) {
      console.error('Error creating Razorpay plan:', planError);
      return res.status(500).json({ error: 'Failed to create Razorpay plan' });
    }

    // Create subscription with the plan ID
    const r = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({
        plan_id,
        total_count: interval === 'yearly' ? 1 : 12,
        customer_notify,
        notes: { user_id, plan_name, interval }
      })
    });

    if (!r.ok) return res.status(r.status).send(await r.text());
    const sub = await r.json();
    return res.status(200).json(sub);
  } catch (e: any) {
    console.error('create-subscription error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
}



import Stripe from 'stripe';

const SUPA_URL = 'https://savrxykygruzyngttekl.supabase.co';

export const config = { api: { bodyParser: false } };

// Ende des laufenden Zeitraums (im Probeabo = Ende des Gratismonats). Neuere Stripe-Versionen
// fuehren es nur noch an den Abo-Positionen.
export function periodenEnde(sub) {
  const t = sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end ?? sub?.trial_end;
  return t ? new Date(t * 1000).toISOString() : null;
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Signatur IMMER pruefen. Kein unsicherer Fallback mehr: ohne gesetztes
  // Secret wird abgelehnt, statt gefaelschte "Zahlung erfolgt"-Events zu
  // akzeptieren (sonst koennte sich jemand selbst auf Pro schalten).
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET fehlt – Webhook abgelehnt.');
    return res.status(500).json({ error: 'webhook not configured' });
  }
  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (e) {
    return res.status(400).json({ error: 'Webhook signature failed: ' + e.message });
  }

  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hdrs = { Authorization: `Bearer ${svcKey}`, apikey: svcKey, 'Content-Type': 'application/json' };

  async function upsertSub(data) {
    await fetch(`${SUPA_URL}/rest/v1/subscriptions`, {
      method: 'POST',
      headers: { ...hdrs, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ ...data, updated_at: new Date().toISOString() })
    });
  }

  async function getUidFromCustomer(customerId) {
    const r = await fetch(`${SUPA_URL}/rest/v1/subscriptions?stripe_customer_id=eq.${customerId}&select=user_id`, { headers: hdrs });
    const rows = await r.json();
    return rows?.[0]?.user_id || null;
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const uid = session.metadata?.supabase_uid;
      if (!uid) break;
      // Echten Status des Abos uebernehmen – im Probeabo ist er 'trialing' (zaehlt als Pro).
      let status = 'active', ende = null;
      if (session.subscription) {
        try { const s = await stripe.subscriptions.retrieve(session.subscription); status = s.status || status; ende = periodenEnde(s); }
        catch (e) { console.error('stripe-webhook: Abo nicht lesbar', e?.message); }
      }
      await upsertSub({
        user_id: uid,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        plan: ['active', 'trialing'].includes(status) ? 'pro' : 'free',
        status,
        ...(ende ? { current_period_end: ende } : {}),
      });
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const uid = sub.metadata?.supabase_uid || await getUidFromCustomer(sub.customer);
      if (!uid) break;
      const isActive = ['active', 'trialing'].includes(sub.status);
      await upsertSub({
        user_id: uid,
        stripe_customer_id: sub.customer,
        stripe_subscription_id: sub.id,
        plan: isActive ? 'pro' : 'free',
        status: sub.status,
        ...(periodenEnde(sub) ? { current_period_end: periodenEnde(sub) } : {}),
      });
      break;
    }
  }

  return res.status(200).json({ received: true });
}

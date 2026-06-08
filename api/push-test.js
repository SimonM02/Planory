import webpush from 'web-push';

const SUPA_URL = 'https://savrxykygruzyngttekl.supabase.co';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  // Auth via user JWT
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  let userId;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
    userId = payload.sub;
    if (!userId) throw new Error('no sub');
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ error: 'token expired' });
    }
  } catch(e) {
    return res.status(401).json({ error: 'invalid token: ' + e.message });
  }

  const pub  = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subj = process.env.VAPID_SUBJECT || 'mailto:info@planory.app';
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const diag = { userId, vapid_pub: !!pub, vapid_priv: !!priv, svc_key: !!svcKey };

  if (!pub || !priv) return res.status(500).json({ error: 'VAPID keys missing', diag });
  if (!svcKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY missing', diag });

  webpush.setVapidDetails(subj, pub, priv);

  // Fetch subscription for this user
  const hdrs = { Authorization: `Bearer ${svcKey}`, apikey: svcKey };
  const subRes = await fetch(`${SUPA_URL}/rest/v1/push_subscriptions?user_id=eq.${userId}&select=*`, { headers: hdrs });
  const subs = await subRes.json();
  diag.subscriptions_found = Array.isArray(subs) ? subs.length : 'error';

  if (!Array.isArray(subs) || subs.length === 0) {
    return res.status(404).json({ error: 'No push subscription found for user – register device first', diag });
  }

  const sub = subs[0].subscription;
  diag.endpoint_prefix = sub?.endpoint?.slice(0, 50);

  try {
    await webpush.sendNotification(sub, JSON.stringify({
      title: '🔔 Planory Test',
      body: 'Server-Push funktioniert! ✅',
      tag: 'push-test-' + Date.now()
    }));
    return res.status(200).json({ ok: true, message: 'Push sent successfully', diag });
  } catch(e) {
    diag.webpush_error = e.message;
    diag.webpush_status = e.statusCode;
    if (e.statusCode === 410 || e.statusCode === 404) {
      // Subscription expired, delete it
      await fetch(`${SUPA_URL}/rest/v1/push_subscriptions?user_id=eq.${userId}`, { method: 'DELETE', headers: hdrs });
      diag.subscription_deleted = true;
    }
    return res.status(500).json({ error: 'webpush.sendNotification failed', diag });
  }
}

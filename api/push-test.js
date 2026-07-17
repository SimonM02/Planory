import webpush from 'web-push';
import { makeApnsJwt, openApnsClient, sendApns } from './_apns.js';

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
  if (!svcKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY missing', diag });

  const hdrs = { Authorization: `Bearer ${svcKey}`, apikey: svcKey };
  const MSG = { title: '🔔 Planory Test', body: 'Server-Push funktioniert! ✅' };

  let webOk = 0, nativeOk = 0;

  // ── Web-Push (Browser/PWA) ──
  if (pub && priv) {
    webpush.setVapidDetails(subj, pub, priv);
    const subRes = await fetch(`${SUPA_URL}/rest/v1/push_subscriptions?user_id=eq.${userId}&select=*`, { headers: hdrs });
    const subs = await subRes.json();
    diag.web_subscriptions = Array.isArray(subs) ? subs.length : 'error';
    for (const row of (Array.isArray(subs) ? subs : [])) {
      try {
        await webpush.sendNotification(row.subscription, JSON.stringify({ ...MSG, tag: 'push-test-' + Date.now() }));
        webOk++;
      } catch(e) {
        diag.webpush_error = e.message; diag.webpush_status = e.statusCode;
        if (e.statusCode === 410 || e.statusCode === 404) {
          await fetch(`${SUPA_URL}/rest/v1/push_subscriptions?user_id=eq.${userId}&subscription->>endpoint=eq.${encodeURIComponent(row.subscription.endpoint)}`, { method: 'DELETE', headers: hdrs });
        }
      }
    }
  }

  // ── Native Push (App-Store-App, APNs) ──
  try {
    const tRes = await fetch(`${SUPA_URL}/rest/v1/native_push_tokens?user_id=eq.${userId}&select=token`, { headers: hdrs });
    const toks = await tRes.json();
    diag.native_tokens = Array.isArray(toks) ? toks.length : 'n/a';
    const apnsJwt = makeApnsJwt();
    diag.apns_keys = !!apnsJwt;
    if (apnsJwt && Array.isArray(toks) && toks.length) {
      const client = openApnsClient();
      for (const t of toks) {
        const r = await sendApns(client, apnsJwt, t.token, MSG);
        if (r.ok) nativeOk++;
        else { diag.apns_error = `${r.status} ${r.reason}`;
          if (r.status === 410 || r.reason === 'BadDeviceToken' || r.reason === 'Unregistered') {
            await fetch(`${SUPA_URL}/rest/v1/native_push_tokens?token=eq.${encodeURIComponent(t.token)}`, { method: 'DELETE', headers: hdrs });
          }
        }
      }
      try { client.close(); } catch(_) {}
    }
  } catch(e) { diag.native_error = e.message; }

  diag.web_sent = webOk; diag.native_sent = nativeOk;

  if (webOk + nativeOk > 0) {
    return res.status(200).json({ ok: true, message: `Push sent (web:${webOk}, native:${nativeOk})`, diag });
  }
  return res.status(404).json({ error: 'Kein registriertes Geraet gefunden – bitte zuerst „Dieses Geraet registrieren" bzw. Mitteilungen in der App erlauben', diag });
}

import webpush from 'web-push';

const SUPA_URL = 'https://savrxykygruzyngttekl.supabase.co';

export default async function handler(req, res) {
  // Vercel cron sends: Authorization: Bearer <CRON_SECRET>
  // Also accept legacy x-cron-secret header for manual calls
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'] || '';
  const legacyHeader = req.headers['x-cron-secret'] || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (cronSecret && token !== cronSecret && legacyHeader !== cronSecret) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const pub  = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subj = process.env.VAPID_SUBJECT || 'mailto:info@planory.app';
  if (!pub || !priv) return res.status(500).json({ error: 'VAPID keys not configured' });

  webpush.setVapidDetails(subj, pub, priv);

  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!svcKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });

  const hdrs = { Authorization: `Bearer ${svcKey}`, apikey: svcKey, 'Content-Type': 'application/json' };

  // Fetch ALL unsent notifications that are due (no lower bound - catch everything past due)
  // Upper bound: now + 30s tolerance so we don't miss notifications that fire in the next few seconds
  const cutoff = new Date(Date.now() + 30000).toISOString();

  const notifRes = await fetch(
    `${SUPA_URL}/rest/v1/scheduled_notifications?scheduled_for=lte.${cutoff}&sent=eq.false&select=*&order=scheduled_for.asc&limit=100`,
    { headers: hdrs }
  );
  const notifications = await notifRes.json();
  if (!Array.isArray(notifications) || !notifications.length) {
    return res.status(200).json({ sent: 0, checked: 0 });
  }

  // Fetch push subscriptions for affected users
  const userIds = [...new Set(notifications.map(n => n.user_id))];
  const subsRes = await fetch(
    `${SUPA_URL}/rest/v1/push_subscriptions?user_id=in.(${userIds.join(',')})&select=*`,
    { headers: hdrs }
  );
  const subs = await subsRes.json();
  // Alle Geraete pro Nutzer sammeln (geteiltes Konto = mehrere Handys) –
  // nicht nur eines. Jede Subscription hat eine eigene endpoint-URL.
  const subsByUser = {};
  for (const s of (subs || [])) {
    (subsByUser[s.user_id] = subsByUser[s.user_id] || []).push(s.subscription);
  }

  let sent = 0;
  let failed = 0;
  const results = [];

  for (const notif of notifications) {
    const userSubs = subsByUser[notif.user_id] || [];
    if (!userSubs.length) {
      // Kein Geraet fuer diesen Nutzer — als gesendet markieren, damit es sich nicht anstaut
      await fetch(
        `${SUPA_URL}/rest/v1/scheduled_notifications?user_id=eq.${notif.user_id}&notif_id=eq.${encodeURIComponent(notif.notif_id)}`,
        { method: 'PATCH', headers: hdrs, body: JSON.stringify({ sent: true }) }
      );
      results.push({ id: notif.notif_id, status: 'no_subscription' });
      continue;
    }

    // An JEDES registrierte Geraet des Nutzers senden
    let anyOk = false;
    for (const sub of userSubs) {
      try {
        await webpush.sendNotification(sub, JSON.stringify({
          title: notif.title,
          body:  notif.body,
          tag:   notif.notif_id
        }));
        anyOk = true;
        sent++;
        results.push({ id: notif.notif_id, status: 'sent' });
      } catch (e) {
        failed++;
        results.push({ id: notif.notif_id, status: 'error', code: e.statusCode, msg: e.message });
        if (e.statusCode === 410 || e.statusCode === 404) {
          // Nur DIESES abgelaufene Geraet entfernen (per endpoint), nicht alle des Nutzers
          try {
            await fetch(`${SUPA_URL}/rest/v1/push_subscriptions?user_id=eq.${notif.user_id}&subscription->>endpoint=eq.${encodeURIComponent(sub.endpoint)}`,
              { method: 'DELETE', headers: hdrs });
          } catch (_) {}
        }
      }
    }

    // Als gesendet markieren, sobald mindestens ein Geraet erreicht wurde
    if (anyOk) {
      await fetch(
        `${SUPA_URL}/rest/v1/scheduled_notifications?user_id=eq.${notif.user_id}&notif_id=eq.${encodeURIComponent(notif.notif_id)}`,
        { method: 'PATCH', headers: hdrs, body: JSON.stringify({ sent: true }) }
      );
    }
  }

  return res.status(200).json({ sent, failed, checked: notifications.length, results });
}

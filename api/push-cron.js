import webpush from 'web-push';

const SUPA_URL = 'https://savrxykygruzyngttekl.supabase.co';

export default async function handler(req, res) {
  // Secured by secret header – set CRON_SECRET in Vercel env vars
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const pub  = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subj = process.env.VAPID_SUBJECT || 'mailto:admin@buildora.app';
  if (!pub || !priv) return res.status(500).json({ error: 'VAPID keys not configured' });

  webpush.setVapidDetails(subj, pub, priv);

  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hdrs   = { Authorization: `Bearer ${svcKey}`, apikey: svcKey, 'Content-Type': 'application/json' };

  // Fetch all unsent notifications due within the past 2 minutes (catches missed cron runs)
  const cutoff = new Date(Date.now() + 30000).toISOString(); // +30s tolerance
  const oldest = new Date(Date.now() - 120000).toISOString(); // ignore older than 2 min

  const notifRes = await fetch(
    `${SUPA_URL}/rest/v1/scheduled_notifications?scheduled_for=lte.${cutoff}&scheduled_for=gte.${oldest}&sent=eq.false&select=*`,
    { headers: hdrs }
  );
  const notifications = await notifRes.json();
  if (!Array.isArray(notifications) || !notifications.length) return res.status(200).json({ sent: 0 });

  // Fetch push subscriptions for affected users
  const userIds = [...new Set(notifications.map(n => n.user_id))];
  const subsRes = await fetch(
    `${SUPA_URL}/rest/v1/push_subscriptions?user_id=in.(${userIds.join(',')})&select=*`,
    { headers: hdrs }
  );
  const subs   = await subsRes.json();
  const subMap = Object.fromEntries((subs || []).map(s => [s.user_id, s.subscription]));

  let sent = 0;
  for (const notif of notifications) {
    const sub = subMap[notif.user_id];
    if (!sub) continue;
    try {
      await webpush.sendNotification(sub, JSON.stringify({
        title: notif.title,
        body:  notif.body,
        tag:   notif.notif_id
      }));
      sent++;
    } catch (e) {
      if (e.statusCode === 410 || e.statusCode === 404) {
        // Subscription expired – remove it
        await fetch(`${SUPA_URL}/rest/v1/push_subscriptions?user_id=eq.${notif.user_id}`,
          { method: 'DELETE', headers: hdrs });
      }
    }
    // Mark as sent regardless (avoid retry spam)
    await fetch(
      `${SUPA_URL}/rest/v1/scheduled_notifications?user_id=eq.${notif.user_id}&notif_id=eq.${encodeURIComponent(notif.notif_id)}`,
      { method: 'PATCH', headers: hdrs, body: JSON.stringify({ sent: true }) }
    );
  }

  return res.status(200).json({ sent });
}

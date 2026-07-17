// Speichert den APNs-Geraetetoken der nativen App pro Nutzer.
// Mehrere Geraete pro Nutzer moeglich (geteiltes Konto) -> Token ist der
// eindeutige Schluessel (merge-duplicates aktualisiert bestehende Zeile).

const SUPA_URL = 'https://savrxykygruzyngttekl.supabase.co';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

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
  } catch (e) {
    return res.status(401).json({ error: 'invalid token: ' + e.message });
  }

  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : (req.body || {});
  const deviceToken = body.token;
  const platform    = body.platform || 'ios';
  if (!deviceToken) return res.status(400).json({ error: 'token required' });

  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!svcKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY missing' });

  const saveRes = await fetch(`${SUPA_URL}/rest/v1/native_push_tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${svcKey}`,
      apikey: svcKey,
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify({ user_id: userId, token: deviceToken, platform, updated_at: new Date().toISOString() })
  });

  if (!saveRes.ok) {
    const err = await saveRes.text();
    return res.status(500).json({ error: err });
  }
  return res.status(200).json({ ok: true });
}

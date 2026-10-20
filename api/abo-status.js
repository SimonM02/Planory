// Laeuft ein Apple-Abo (iPhone-App, RevenueCat) fuer den angemeldeten Nutzer?
// Die Web-App kennt sonst nur Stripe-Abos – wer in der App abonniert hat, waere auf
// planory.at faelschlich gesperrt. Gefragt wird NUR fuer die eigene, von Supabase
// bestaetigte Nutzer-ID (dieselbe ID, mit der die App RevenueCat anmeldet).
import { nutzerAusToken } from './_auth.js';

const ERLAUBT = new Set(['https://planory.at', 'https://www.planory.at', 'https://bauplan-weld.vercel.app']);
// Oeffentlicher App-Schluessel (steht ohnehin in der App); RC_PUBLIC_KEY kann ihn ersetzen.
export const RC_KEY_STANDARD = 'appl_eMLeZHBkeBtxBeVVoPPTXKaSMvR';
const RC_ENTITLEMENT = 'Planory Pro';

export function appleAboAktiv(antwort, jetzt = Date.now()) {
  const e = antwort?.subscriber?.entitlements?.[RC_ENTITLEMENT];
  if (!e) return { apple: false };   // nie ein Apple-Abo
  const bis = [e.expires_date, e.grace_period_expires_date].map(d => (d ? Date.parse(d) : NaN)).filter(n => !isNaN(n));
  const aktiv = e.expires_date == null ? true : bis.some(t => t > jetzt);   // ohne Ablaufdatum = dauerhaft
  if (!aktiv) return { apple: false, hatte: true };   // frueher abonniert, jetzt abgelaufen
  const s = antwort?.subscriber?.subscriptions?.[e.product_identifier];
  return { apple: true, probe: s?.period_type === 'trial', bis: e.expires_date || null };
}

export default async function handler(req, res) {
  const origin = req.headers && req.headers.origin;
  if (origin && ERLAUBT.has(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const u = await nutzerAusToken(req.headers.authorization);
  if (!u) return res.status(401).json({ error: 'unauthorized' });

  try {
    const r = await fetch('https://api.revenuecat.com/v1/subscribers/' + encodeURIComponent(u.id), {
      headers: { Authorization: 'Bearer ' + (process.env.RC_PUBLIC_KEY || RC_KEY_STANDARD), 'Content-Type': 'application/json' },
    });
    if (!r.ok) { console.error('abo-status: RevenueCat', r.status); return res.status(502).json({ apple: false, error: 'revenuecat_unavailable' }); }
    return res.status(200).json(appleAboAktiv(await r.json()));
  } catch (e) {
    console.error('abo-status:', e?.message);
    return res.status(502).json({ apple: false, error: 'revenuecat_unavailable' });
  }
}

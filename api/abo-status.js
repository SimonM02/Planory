// Laeuft ein Apple-Abo (iPhone-App, RevenueCat) fuer den angemeldeten Nutzer?
// Die Web-App kennt sonst nur Stripe-Abos – wer in der App abonniert hat, waere auf
// planory.at faelschlich gesperrt. Gefragt wird NUR fuer die eigene, von Supabase
// bestaetigte Nutzer-ID (dieselbe ID, mit der die App RevenueCat anmeldet).
//
// Zweiter Eingang (?hook=revenuecat): RevenueCat meldet hier jede Abo-Aenderung. Der Stand wird in
// die Supabase-Tabelle apple_subscriptions gespiegelt, damit alle Abos an einem Ort sichtbar sind
// (Ansicht abo_uebersicht). Ueber den ZUGANG entscheidet weiterhin die Abfrage oben – die Tabelle
// ist nur die Uebersicht. (Bewusst keine eigene Datei: im Ordner api/ liegen schon 12 Funktionen.)
import crypto from 'node:crypto';
import { nutzerAusToken } from './_auth.js';

export const config = { maxDuration: 60 };

const SUPA_URL = 'https://savrxykygruzyngttekl.supabase.co';
const ERLAUBT = new Set(['https://planory.at', 'https://www.planory.at', 'https://bauplan-weld.vercel.app']);
// Oeffentlicher App-Schluessel (steht ohnehin in der App); RC_PUBLIC_KEY kann ihn ersetzen.
export const RC_KEY_STANDARD = 'appl_eMLeZHBkeBtxBeVVoPPTXKaSMvR';
const RC_ENTITLEMENT = 'Planory Pro';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function appleAboAktiv(antwort, jetzt = Date.now()) {
  const e = antwort?.subscriber?.entitlements?.[RC_ENTITLEMENT];
  if (!e) return { apple: false };   // nie ein Apple-Abo
  const bis = [e.expires_date, e.grace_period_expires_date].map(d => (d ? Date.parse(d) : NaN)).filter(n => !isNaN(n));
  const aktiv = e.expires_date == null ? true : bis.some(t => t > jetzt);   // ohne Ablaufdatum = dauerhaft
  if (!aktiv) return { apple: false, hatte: true };   // frueher abonniert, jetzt abgelaufen
  const s = antwort?.subscriber?.subscriptions?.[e.product_identifier];
  return { apple: true, probe: s?.period_type === 'trial', bis: e.expires_date || null };
}

// Zeile fuer die Tabelle apple_subscriptions. null = nie ein Apple-Abo (dann wird nichts gespeichert).
export function appleAboZeile(antwort, jetzt = Date.now()) {
  const e = antwort?.subscriber?.entitlements?.[RC_ENTITLEMENT];
  if (!e) return null;
  const pid = e.product_identifier || null;
  const s = antwort?.subscriber?.subscriptions?.[pid] || {};
  const aktiv = appleAboAktiv(antwort, jetzt).apple === true;
  return {
    product_id: pid,
    plan: /year|annual|jahr/i.test(pid || '') ? 'yearly' : /month|monat/i.test(pid || '') ? 'monthly' : null,
    status: !aktiv ? 'expired' : (s.period_type === 'trial' ? 'trialing' : 'active'),
    will_renew: aktiv && !s.unsubscribe_detected_at,          // false = gekuendigt, laeuft nur noch aus
    billing_issue: aktiv && !!s.billing_issues_detected_at,
    sandbox: s.is_sandbox === true,                            // Testkauf (TestFlight / Apple-Pruefer)
    period_type: s.period_type || null,
    started_at: s.original_purchase_date || e.purchase_date || null,
    purchased_at: s.purchase_date || e.purchase_date || null,
    expires_at: e.expires_date || s.expires_date || null,
    store: s.store || null,
  };
}

async function rcSubscriber(id) {
  const r = await fetch('https://api.revenuecat.com/v1/subscribers/' + encodeURIComponent(id), {
    headers: { Authorization: 'Bearer ' + (process.env.RC_PUBLIC_KEY || RC_KEY_STANDARD), 'Content-Type': 'application/json' },
  });
  if (!r.ok) { const e = new Error('RevenueCat ' + r.status); e.status = r.status; throw e; }
  return r.json();
}

const svcHdr = () => { const k = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; return { Authorization: `Bearer ${k}`, apikey: k, 'Content-Type': 'application/json' }; };

// 'ok' = gespeichert · 'unbekannt' = dieses Konto gibt es (nicht mehr) – kein Fehler
async function aboSpeichern(userId, zeile, ereignis) {
  const r = await fetch(`${SUPA_URL}/rest/v1/apple_subscriptions?on_conflict=user_id`, {
    method: 'POST',
    headers: { ...svcHdr(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: userId, ...zeile, last_event: ereignis, updated_at: new Date().toISOString() }),
  });
  if (r.ok) return 'ok';
  const t = await r.text().catch(() => '');
  if (r.status === 409 && t.includes('23503')) return 'unbekannt';   // Fremdschluessel: Konto existiert nicht
  throw new Error('Supabase ' + r.status);
}

// Aktuellen Stand EINES Kontos bei RevenueCat holen und spiegeln
async function abgleichen(userId, ereignis) {
  const zeile = appleAboZeile(await rcSubscriber(userId));
  if (!zeile) return 'kein_abo';
  return aboSpeichern(userId, zeile, ereignis);
}

async function alleNutzerIds() {
  const r = await fetch(`${SUPA_URL}/rest/v1/profiles?select=id&limit=5000`, { headers: svcHdr() });
  if (!r.ok) throw new Error('Supabase ' + r.status);
  return (await r.json()).map(z => z.id).filter(id => UUID.test(String(id)));
}

const gleich = (a, b) => crypto.timingSafeEqual(crypto.createHash('sha256').update(String(a)).digest(), crypto.createHash('sha256').update(String(b)).digest());

// RevenueCat-Webhook. Abgesichert mit dem Code aus RC_WEBHOOK_AUTH (in RevenueCat als „Authorization header“
// hinterlegt). Ohne gesetzten Code bleibt der Eingang zu. Jedes Ereignis loest nur einen Abgleich aus –
// der Inhalt des Ereignisses wird nie ungeprueft uebernommen (der Stand kommt direkt von RevenueCat).
// Ereignis TEST (Knopf „Send test event“): alle Konten einmal abgleichen (laufende Abos nachtragen).
async function revenuecatHook(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const soll = process.env.RC_WEBHOOK_AUTH || '';
  if (soll.length < 16) { console.error('abo-status: RC_WEBHOOK_AUTH fehlt – Webhook abgelehnt.'); return res.status(503).json({ error: 'webhook_not_configured' }); }
  const ist = String(req.headers?.authorization || '');
  if (!gleich(ist, soll) && !gleich(ist, 'Bearer ' + soll)) return res.status(401).json({ error: 'unauthorized' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ error: 'bad_json' }); } }
  const ev = (body && body.event) || {};
  const typ = String(ev.type || '').slice(0, 40) || 'UNBEKANNT';
  const test = typ === 'TEST';
  try {
    let ids = test ? await alleNutzerIds()
      : [ev.app_user_id, ev.original_app_user_id, ...(ev.aliases || []), ...(ev.transferred_from || []), ...(ev.transferred_to || [])];
    ids = [...new Set(ids.map(x => String(x || '').toLowerCase()).filter(x => UUID.test(x)))];   // anonyme RevenueCat-IDs zaehlen nicht
    const start = Date.now(), zahl = { ok: 0, kein_abo: 0, unbekannt: 0, offen: 0 };
    let i = 0, fehler = null;
    const arbeiter = async () => {
      while (i < ids.length && !fehler) {
        if (Date.now() - start > 45000) { zahl.offen = ids.length - i; return; }   // RevenueCat wartet hoechstens 60 s
        const id = ids[i++];
        try { zahl[await abgleichen(id, 'rc:' + typ)]++; }
        catch (e) { if (test) zahl.offen++; else fehler = e; }   // Nachtragen: ein Konto darf die anderen nicht aufhalten
      }
    };
    await Promise.all(Array.from({ length: Math.min(5, ids.length) }, arbeiter));
    if (fehler) throw fehler;
    return res.status(200).json({ ok: true, typ, konten: ids.length, ...zahl });
  } catch (e) {
    console.error('abo-status hook:', typ, e?.message);
    return res.status(500).json({ error: 'sync_failed' });   // RevenueCat versucht es spaeter erneut
  }
}

export default async function handler(req, res) {
  const hook = req.query?.hook ?? new URLSearchParams(String(req.url || '').split('?')[1] || '').get('hook');
  if (hook === 'revenuecat') return revenuecatHook(req, res);

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
    const antwort = await rcSubscriber(u.id);
    // Stand nebenbei spiegeln (heilt verpasste Webhooks). Darf die Antwort an die App nie veraendern.
    try { const z = appleAboZeile(antwort); if (z && process.env.SUPABASE_SERVICE_ROLE_KEY) await aboSpeichern(u.id, z, 'web'); }
    catch (e) { console.error('abo-status: spiegeln', e?.message); }
    return res.status(200).json(appleAboAktiv(antwort));
  } catch (e) {
    console.error('abo-status:', e?.message);
    return res.status(502).json({ apple: false, error: 'revenuecat_unavailable' });
  }
}

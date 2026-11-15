// ═══════════════════════════════════════════════════════════════════════
// PLANORY – Probeabo auf dem Server (Stripe-Checkout, Stripe-Webhook, Apple-Abo-Prüfung)
// ═══════════════════════════════════════════════════════════════════════
// Neue Konten bekommen beim ERSTEN Abo 30 Tage gratis (danach automatisch bezahlt),
// ältere Konten und wer schon ein Abo hatte nicht. Der Webhook übernimmt den echten
// Status ('trialing' = Pro). Läuft ohne Netz: Supabase, Stripe und RevenueCat sind nachgebaut.
// Ausfuehren:  node tests/abo-api.mjs
// ═══════════════════════════════════════════════════════════════════════
import Stripe from 'stripe';
import { Readable } from 'stream';

process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc-test';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_PRICE_MONTHLY = 'price_monat';
process.env.STRIPE_PRICE_YEARLY = 'price_jahr';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
const UA = '11111111-1111-4111-8111-111111111111';
// Token -> Konto (Supabase bestätigt es); NEU = nach dem Umstellungstag registriert
const KONTEN = { NEU: { id: UA, email: 'neu@test.at', created_at: '2026-10-25T09:00:00Z' },
                 ALT: { id: UA, email: 'alt@test.at', created_at: '2026-09-01T09:00:00Z' } };

let subsZeilen = [], schreib = [], rcAntwort = null, rcAufrufe = [];
// Spiegel der Apple-Abos in Supabase (Tabelle apple_subscriptions) + Kontenliste (profiles)
let appleSchreib = [], appleFehler = '', profilIds = [];
globalThis.fetch = async (url, opts = {}) => {
  url = String(url);
  const hdr = Object.fromEntries(Object.entries(opts.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
  if (url.endsWith('/auth/v1/user')) {
    const k = KONTEN[String(hdr.authorization || '').replace(/^Bearer\s+/, '')];
    return k ? new Response(JSON.stringify(k), { status: 200 }) : new Response('{}', { status: 401 });
  }
  if (url.includes('/rest/v1/subscriptions')) {
    if ((opts.method || 'GET') === 'GET') return new Response(JSON.stringify(subsZeilen), { status: 200 });
    schreib.push(JSON.parse(opts.body)); return new Response(null, { status: 201 });
  }
  if (url.includes('/rest/v1/apple_subscriptions')) {
    if (hdr.apikey !== 'svc-test') return new Response('{}', { status: 401 });
    if (appleFehler === 'fk') return new Response(JSON.stringify({ code: '23503', message: 'violates foreign key constraint' }), { status: 409 });
    if (appleFehler) return new Response('{}', { status: 500 });
    appleSchreib.push(JSON.parse(opts.body)); return new Response(null, { status: 201 });
  }
  if (url.includes('/rest/v1/profiles')) return new Response(JSON.stringify(profilIds.map(id => ({ id }))), { status: 200 });
  if (url.startsWith('https://api.revenuecat.com/')) {
    rcAufrufe.push(url);
    const a = typeof rcAntwort === 'function' ? rcAntwort(decodeURIComponent(url.split('/').pop())) : rcAntwort;
    return a ? new Response(JSON.stringify(a), { status: 200 }) : new Response('{}', { status: 500 });
  }
  return new Response('{}', { status: 404 });
};

// Stripe nachbauen (Methoden liegen am Prototyp – gilt auch für die Instanz im Handler)
const muster = new Stripe('sk_test_dummy');
let sessionParams = null, abosListe = [], aboAbruf = null, kundenSuche = [];
Object.getPrototypeOf(muster.checkout.sessions).create = async p => { sessionParams = p; return { url: 'https://checkout.stripe.test/s' }; };
Object.getPrototypeOf(muster.customers).create = async () => ({ id: 'cus_neu' });
Object.getPrototypeOf(muster.customers).search = async () => ({ data: kundenSuche });
Object.getPrototypeOf(muster.subscriptions).list = async () => ({ data: abosListe });
Object.getPrototypeOf(muster.subscriptions).retrieve = async () => aboAbruf;

function aufruf(handler, token, body) {
  return new Promise((resolve, reject) => {
    const res = { _s: 200, setHeader() {}, status(s) { this._s = s; return this; },
      json(b) { resolve({ status: this._s, body: b }); return this; }, end() { resolve({ status: this._s }); return this; } };
    Promise.resolve(handler({ method: 'POST', headers: token ? { authorization: 'Bearer ' + token, origin: 'https://planory.at' } : {}, body }, res)).catch(reject);
  });
}
function webhook(handler, event) {
  const payload = JSON.stringify(event);
  const req = Readable.from([Buffer.from(payload)]);
  req.method = 'POST';
  req.headers = { 'stripe-signature': muster.webhooks.generateTestHeaderString({ payload, secret: 'whsec_test' }) };
  return new Promise((resolve, reject) => {
    const res = { _s: 200, setHeader() {}, status(s) { this._s = s; return this; },
      json(b) { resolve({ status: this._s, body: b }); return this; }, end() { resolve({ status: this._s }); return this; } };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}

// RevenueCat-Webhook (zweiter Eingang von api/abo-status.js)
function rcHook(handler, event, auth) {
  return new Promise((resolve, reject) => {
    const res = { _s: 200, setHeader() {}, status(s) { this._s = s; return this; },
      json(b) { resolve({ status: this._s, body: b }); return this; }, end() { resolve({ status: this._s }); return this; } };
    Promise.resolve(handler({ method: 'POST', query: { hook: 'revenuecat' }, headers: auth ? { authorization: auth } : {},
      body: { api_version: '1.0', event } }, res)).catch(reject);
  });
}
const RC_CODE = 'geheimer-test-code-0123456789';
const UB = '22222222-2222-4222-8222-222222222222', UC = '33333333-3333-4333-8333-333333333333';
// Antwort von RevenueCat fuer ein Konto mit Abo
const rcAbo = (o = {}) => ({ subscriber: {
  entitlements: { 'Planory Pro': { expires_date: o.bis || '2099-01-01T00:00:00Z', product_identifier: o.produkt || 'planory_pro_monthly', purchase_date: '2026-11-14T06:50:00Z' } },
  subscriptions: { [o.produkt || 'planory_pro_monthly']: { period_type: o.art || 'trial', purchase_date: '2026-11-14T06:50:00Z',
    original_purchase_date: '2026-11-14T06:50:00Z', expires_date: o.bis || '2099-01-01T00:00:00Z', store: 'app_store', is_sandbox: !!o.sandbox,
    unsubscribe_detected_at: o.gekuendigt ? '2026-11-20T10:00:00Z' : null, billing_issues_detected_at: o.zahlung ? '2026-11-21T10:00:00Z' : null } } } });

const results = [];
async function check(name, fn) {
  subsZeilen = []; schreib = []; rcAntwort = null; rcAufrufe = []; sessionParams = null; abosListe = []; aboAbruf = null; kundenSuche = [];
  appleSchreib = []; appleFehler = ''; profilIds = []; delete process.env.RC_WEBHOOK_AUTH;
  try { const m = await fn(); results.push([!m, name, m || '']); }
  catch (e) { results.push([false, name, 'Abbruch: ' + String(e && e.message || e).split('\n')[0]]); }
}
const checkout = (await import('../api/stripe-checkout.js')).default;
const hook = (await import('../api/stripe-webhook.js')).default;
const status = (await import('../api/abo-status.js')).default;

await check('Checkout, neues Konto, erstes Abo: 30 Tage gratis, Karte wird hinterlegt, Hinweis auf Verlängerung', async () => {
  const r = await aufruf(checkout, 'NEU', { plan: 'yearly' });
  const p = sessionParams || {}, sd = p.subscription_data || {};
  const f = [];
  if (r.status !== 200 || !r.body.probe) f.push(`Antwort ${r.status} ${JSON.stringify(r.body)}`);
  if (sd.trial_period_days !== 30) f.push('kein 30-Tage-Testzeitraum');
  if (p.payment_method_collection !== 'always') f.push('Zahlungsmittel wird nicht verlangt');
  if (sd.trial_settings?.end_behavior?.missing_payment_method !== 'cancel') f.push('ohne Zahlungsmittel läuft es weiter');
  if (!/30 Tage gratis, danach 28,99 €.*automatisch.*kündbar/.test(p.custom_text?.submit?.message || '')) f.push('Hinweistext fehlt');
  if (p.line_items?.[0]?.price !== 'price_jahr' || sd.metadata?.supabase_uid !== UA) f.push('falscher Preis/Nutzer');
  return f.join(' · ');
});
await check('Checkout, Monatsabo: Hinweis nennt 3,99 € pro Monat', async () => {
  await aufruf(checkout, 'NEU', { plan: 'monthly' });
  const m = sessionParams?.custom_text?.submit?.message || '';
  return /danach 3,99 € pro Monat/.test(m) && sessionParams.line_items[0].price === 'price_monat' ? '' : 'Text/Preis: ' + m;
});
await check('Checkout: kein zweiter Gratismonat (früheres Abo in Supabase oder bei Stripe)', async () => {
  subsZeilen = [{ stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_alt' }];
  await aufruf(checkout, 'NEU', { plan: 'yearly' });
  const a = sessionParams?.subscription_data?.trial_period_days;
  sessionParams = null; subsZeilen = [{ stripe_customer_id: 'cus_1', stripe_subscription_id: null }]; abosListe = [{ id: 'sub_x' }];
  await aufruf(checkout, 'NEU', { plan: 'yearly' });
  const b = sessionParams?.subscription_data?.trial_period_days;
  return a || b ? `Testzeitraum trotz früherem Abo (${a}/${b})` : '';
});
await check('Checkout: kein zweiter Gratismonat (Kunde ohne Supabase-Zeile, Gratismonat schon in der iPhone-App)', async () => {
  kundenSuche = [{ id: 'cus_gefunden' }]; abosListe = [{ id: 'sub_alt', status: 'canceled' }];
  await aufruf(checkout, 'NEU', { plan: 'yearly' });
  const a = sessionParams?.subscription_data?.trial_period_days, kunde = sessionParams?.customer;
  sessionParams = null; kundenSuche = []; abosListe = [];
  rcAntwort = { subscriber: { entitlements: { 'Planory Pro': { expires_date: '2020-01-01T00:00:00Z', product_identifier: 'jahr' } } } };
  await aufruf(checkout, 'NEU', { plan: 'yearly' });
  const b = sessionParams?.subscription_data?.trial_period_days;
  if (kunde !== 'cus_gefunden') return 'vorhandener Stripe-Kunde nicht gefunden: ' + kunde;
  return a || b ? `Testzeitraum trotz früherem Abo (${a}/${b})` : '';
});
await check('Checkout: läuft schon ein Abo (zweiter Tab), wird kein zweites angelegt', async () => {
  subsZeilen = [{ stripe_customer_id: 'cus_1', stripe_subscription_id: null }]; abosListe = [{ id: 'sub_1', status: 'trialing' }];
  const r = await aufruf(checkout, 'NEU', { plan: 'yearly' });
  return r.status === 409 && !sessionParams ? '' : `Status ${r.status}, Checkout ${sessionParams ? 'angelegt' : '-'}`;
});
await check('Webhook: verspätetes „Abo angelegt“ überschreibt den aktuellen Stand nicht', async () => {
  aboAbruf = { id: 'sub_1', status: 'active', customer: 'cus_1', metadata: { supabase_uid: UA }, current_period_end: 1795000000 };
  await webhook(hook, { id: 'evt_4', object: 'event', type: 'customer.subscription.created',
    data: { object: { id: 'sub_1', object: 'subscription', customer: 'cus_1', status: 'incomplete', metadata: { supabase_uid: UA } } } });
  const z = schreib[0] || {};
  return z.plan === 'pro' && z.status === 'active' ? '' : 'gespeichert: ' + JSON.stringify(z);
});
await check('Checkout, Konto vor dem Umstellungstag: kein Stripe-Testzeitraum (hatte den Gratismonat schon)', async () => {
  const r = await aufruf(checkout, 'ALT', { plan: 'yearly' });
  return r.status === 200 && !sessionParams?.subscription_data?.trial_period_days && !sessionParams?.custom_text ? '' : 'Testzeitraum vergeben';
});
await check('Webhook: Abschluss im Gratismonat → Pro mit Status „trialing“ und Ende des Gratismonats', async () => {
  const ende = Math.floor(Date.parse('2026-11-24T09:00:00Z') / 1000);
  aboAbruf = { id: 'sub_1', status: 'trialing', items: { data: [{ current_period_end: ende }] }, trial_end: ende };
  const r = await webhook(hook, { id: 'evt_1', object: 'event', type: 'checkout.session.completed',
    data: { object: { id: 'cs_1', customer: 'cus_1', subscription: 'sub_1', metadata: { supabase_uid: UA } } } });
  const z = schreib[0] || {};
  if (r.status !== 200) return 'Status ' + r.status;
  return z.plan === 'pro' && z.status === 'trialing' && z.current_period_end === '2026-11-24T09:00:00.000Z' && z.stripe_subscription_id === 'sub_1'
    ? '' : 'gespeichert: ' + JSON.stringify(z);
});
await check('Webhook: Abo angelegt/gekündigt wird übernommen (auch ohne Zeitraum am Abo)', async () => {
  const sub = (st) => ({ id: 'sub_1', object: 'subscription', customer: 'cus_1', status: st, metadata: { supabase_uid: UA },
    items: { data: [{ current_period_end: 1795000000 }] } });
  await webhook(hook, { id: 'evt_2', object: 'event', type: 'customer.subscription.created', data: { object: sub('trialing') } });
  await webhook(hook, { id: 'evt_3', object: 'event', type: 'customer.subscription.deleted', data: { object: sub('canceled') } });
  const [a, b] = schreib;
  return a?.plan === 'pro' && a.current_period_end && b?.plan === 'free' && b.status === 'canceled' ? '' : JSON.stringify(schreib);
});
await check('Apple-Abo-Prüfung: nur mit echter Anmeldung, nur die eigene ID; aktiv / abgelaufen / Störung', async () => {
  const f = [];
  const x = await aufruf(status, 'GEFAELSCHT', {});
  if (x.status !== 401 || rcAufrufe.length) f.push('ohne gültige Anmeldung beantwortet');
  rcAntwort = { subscriber: { entitlements: { 'Planory Pro': { expires_date: '2099-01-01T00:00:00Z', product_identifier: 'jahr' } },
    subscriptions: { jahr: { period_type: 'trial' } } } };
  const a = await aufruf(status, 'NEU', {});
  if (!a.body.apple || !a.body.probe) f.push('aktives Abo nicht erkannt: ' + JSON.stringify(a.body));
  if (!rcAufrufe[0]?.endsWith('/v1/subscribers/' + UA)) f.push('falsche ID abgefragt: ' + rcAufrufe[0]);
  rcAntwort = { subscriber: { entitlements: { 'Planory Pro': { expires_date: '2020-01-01T00:00:00Z', product_identifier: 'jahr' } } } };
  const b = await aufruf(status, 'NEU', {});
  if (b.body.apple || !b.body.hatte) f.push('abgelaufenes Abo: ' + JSON.stringify(b.body));
  rcAntwort = null;
  const c = await aufruf(status, 'NEU', {});
  if (c.status !== 502 || c.body.apple) f.push('Störung: ' + c.status);
  return f.join(' · ');
});

// ── Apple-Abos in Supabase spiegeln (Tabelle apple_subscriptions, Ansicht abo_uebersicht) ──
const { appleAboZeile } = await import('../api/abo-status.js');
await check('Apple-Abo → Tabellenzeile: Gratismonat, aktiv, gekündigt, Zahlungsproblem, abgelaufen, nie, Monat/Jahr, Testkauf', async () => {
  const f = [], jetzt = Date.parse('2026-11-15T12:00:00Z');
  const z = o => appleAboZeile(rcAbo(o), jetzt);
  const a = z({});
  if (a.status !== 'trialing' || a.plan !== 'monthly' || a.will_renew !== true || a.billing_issue || a.sandbox) f.push('Gratismonat: ' + JSON.stringify(a));
  if (a.expires_at !== '2099-01-01T00:00:00Z' || a.started_at !== '2026-11-14T06:50:00Z' || a.store !== 'app_store') f.push('Daten fehlen: ' + JSON.stringify(a));
  const b = z({ art: 'normal', produkt: 'planory_pro_yearly' });
  if (b.status !== 'active' || b.plan !== 'yearly') f.push('aktiv/Jahr: ' + JSON.stringify(b));
  const c = z({ gekuendigt: true });
  if (c.status !== 'trialing' || c.will_renew !== false) f.push('gekündigt: ' + JSON.stringify(c));
  const d = z({ art: 'normal', zahlung: true });
  if (d.status !== 'active' || d.billing_issue !== true) f.push('Zahlungsproblem: ' + JSON.stringify(d));
  const e = z({ bis: '2026-11-01T00:00:00Z', art: 'normal' });
  if (e.status !== 'expired' || e.will_renew !== false || e.billing_issue) f.push('abgelaufen: ' + JSON.stringify(e));
  if (z({ sandbox: true }).sandbox !== true) f.push('Testkauf nicht erkannt');
  if (appleAboZeile({ subscriber: { entitlements: {} } }, jetzt) !== null || appleAboZeile(null, jetzt) !== null) f.push('ohne Abo entsteht eine Zeile');
  return f.join(' · ');
});
await check('RevenueCat-Webhook: ohne hinterlegten Code gesperrt, mit falschem Code abgelehnt – nichts wird gelesen oder geschrieben', async () => {
  const f = [];
  rcAntwort = rcAbo();
  const ev = { type: 'INITIAL_PURCHASE', app_user_id: UA };
  const a = await rcHook(status, ev, RC_CODE);                       // Code in Vercel noch nicht gesetzt
  if (a.status !== 503) f.push('ohne RC_WEBHOOK_AUTH: Status ' + a.status);
  process.env.RC_WEBHOOK_AUTH = 'kurz';                               // zu kurzer Code zaehlt nicht
  const a2 = await rcHook(status, ev, 'kurz');
  if (a2.status !== 503) f.push('zu kurzer Code angenommen');
  process.env.RC_WEBHOOK_AUTH = RC_CODE;
  const b = await rcHook(status, ev, 'falsch');
  const c = await rcHook(status, ev, '');
  if (b.status !== 401 || c.status !== 401) f.push(`falscher/kein Code: ${b.status}/${c.status}`);
  if (rcAufrufe.length || appleSchreib.length) f.push('trotz Ablehnung abgefragt/geschrieben');
  return f.join(' · ');
});
await check('RevenueCat-Webhook: Kauf → aktueller Stand kommt von RevenueCat und steht in der Tabelle (auch mit „Bearer “)', async () => {
  const f = [];
  process.env.RC_WEBHOOK_AUTH = RC_CODE;
  rcAntwort = rcAbo();
  // Das Ereignis behauptet etwas anderes (Jahr, kein Test) – gespeichert wird, was RevenueCat wirklich meldet
  const r = await rcHook(status, { type: 'INITIAL_PURCHASE', app_user_id: UA.toUpperCase(), original_app_user_id: '$RCAnonymousID:abc',
    aliases: ['$RCAnonymousID:abc', UA], product_id: 'planory_pro_yearly', period_type: 'NORMAL' }, RC_CODE);
  const z = appleSchreib[0] || {};
  if (r.status !== 200 || r.body.ok !== 1 && r.body.ok !== true) f.push('Antwort ' + r.status + ' ' + JSON.stringify(r.body));
  if (rcAufrufe.length !== 1 || !rcAufrufe[0].endsWith('/v1/subscribers/' + UA)) f.push('abgefragt: ' + rcAufrufe.join(', '));
  if (appleSchreib.length !== 1 || z.user_id !== UA || z.status !== 'trialing' || z.plan !== 'monthly' || z.last_event !== 'rc:INITIAL_PURCHASE' || !z.updated_at)
    f.push('gespeichert: ' + JSON.stringify(appleSchreib));
  const r2 = await rcHook(status, { type: 'RENEWAL', app_user_id: UA }, 'Bearer ' + RC_CODE);
  if (r2.status !== 200 || appleSchreib.length !== 2) f.push('„Bearer “-Schreibweise abgelehnt');
  return f.join(' · ');
});
await check('RevenueCat-Webhook: Ablauf → „expired“ · Konto-Übertragung gleicht beide Konten ab · anonyme ID → nichts', async () => {
  const f = [];
  process.env.RC_WEBHOOK_AUTH = RC_CODE;
  rcAntwort = rcAbo({ bis: '2020-01-01T00:00:00Z', art: 'normal' });
  await rcHook(status, { type: 'EXPIRATION', app_user_id: UA }, RC_CODE);
  if (appleSchreib[0]?.status !== 'expired' || appleSchreib[0]?.will_renew !== false) f.push('Ablauf: ' + JSON.stringify(appleSchreib[0]));
  appleSchreib = []; rcAufrufe = [];
  rcAntwort = id => (id === UB ? rcAbo({ art: 'normal' }) : { subscriber: { entitlements: {} } });
  const t = await rcHook(status, { type: 'TRANSFER', transferred_from: [UA], transferred_to: [UB] }, RC_CODE);
  if (t.status !== 200 || rcAufrufe.length !== 2 || appleSchreib.length !== 1 || appleSchreib[0].user_id !== UB) f.push('Übertragung: ' + JSON.stringify([t.body, appleSchreib]));
  appleSchreib = []; rcAufrufe = [];
  const a = await rcHook(status, { type: 'INITIAL_PURCHASE', app_user_id: '$RCAnonymousID:xyz' }, RC_CODE);
  if (a.status !== 200 || rcAufrufe.length || appleSchreib.length) f.push('anonyme ID: ' + a.status + ' / ' + rcAufrufe.length);
  return f.join(' · ');
});
await check('RevenueCat-Webhook: Störung → 500 (RevenueCat versucht es erneut) · gelöschtes Konto → 200 ohne Fehler', async () => {
  const f = [];
  process.env.RC_WEBHOOK_AUTH = RC_CODE;
  const ev = { type: 'RENEWAL', app_user_id: UA };
  rcAntwort = null;                                                  // RevenueCat nicht erreichbar
  const a = await rcHook(status, ev, RC_CODE);
  rcAntwort = rcAbo(); appleFehler = 'kaputt';                        // Supabase nimmt nichts an
  const b = await rcHook(status, ev, RC_CODE);
  if (a.status !== 500 || b.status !== 500) f.push(`Störung: ${a.status}/${b.status}`);
  appleFehler = 'fk';                                                 // Konto gibt es nicht (mehr)
  const c = await rcHook(status, ev, RC_CODE);
  if (c.status !== 200 || c.body.unbekannt !== 1) f.push('gelöschtes Konto: ' + c.status + ' ' + JSON.stringify(c.body));
  return f.join(' · ');
});
await check('RevenueCat-Webhook: „Send test event“ trägt alle Konten nach (ohne Abo → keine Zeile, ein Fehler hält die anderen nicht auf)', async () => {
  const f = [];
  process.env.RC_WEBHOOK_AUTH = RC_CODE;
  profilIds = [UA, UB, UC, 'keine-uuid'];
  rcAntwort = id => (id === UA ? rcAbo() : id === UB ? { subscriber: { entitlements: {} } } : null);   // UC: Störung
  const r = await rcHook(status, { type: 'TEST', app_user_id: 'test-nutzer-von-revenuecat' }, RC_CODE);
  if (r.status !== 200) return 'Status ' + r.status;
  if (r.body.konten !== 3 || r.body.ok !== 1 || r.body.kein_abo !== 1 || r.body.offen !== 1) f.push('Zählung: ' + JSON.stringify(r.body));
  if (appleSchreib.length !== 1 || appleSchreib[0].user_id !== UA || appleSchreib[0].last_event !== 'rc:TEST') f.push('gespeichert: ' + JSON.stringify(appleSchreib));
  return f.join(' · ');
});
await check('Apple-Abo-Prüfung im Web spiegelt den Stand mit – ein Fehler dabei ändert die Antwort an die App nicht', async () => {
  const f = [];
  rcAntwort = rcAbo();
  const a = await aufruf(status, 'NEU', {});
  if (!a.body.apple || !a.body.probe) f.push('Antwort: ' + JSON.stringify(a.body));
  if (appleSchreib.length !== 1 || appleSchreib[0].user_id !== UA || appleSchreib[0].last_event !== 'web') f.push('nicht gespiegelt: ' + JSON.stringify(appleSchreib));
  appleSchreib = []; appleFehler = 'kaputt';
  const b = await aufruf(status, 'NEU', {});
  if (b.status !== 200 || !b.body.apple) f.push('Supabase-Störung sperrt die App: ' + b.status + ' ' + JSON.stringify(b.body));
  appleFehler = ''; rcAntwort = { subscriber: { entitlements: {} } };
  const c = await aufruf(status, 'NEU', {});
  if (c.body.apple !== false || appleSchreib.length) f.push('ohne Abo wurde eine Zeile geschrieben');
  return f.join(' · ');
});

console.log('\n  PLANORY – Probeabo (Server)');
console.log('  ' + '─'.repeat(64));
let fail = 0;
for (const [ok, name, msg] of results) {
  console.log(`  ${ok ? '✅' : '❌'} ${name}`);
  if (!ok) { fail++; console.log('      → ' + msg); }
}
console.log('  ' + '─'.repeat(64));
console.log(`  ${results.length - fail} bestanden, ${fail} FEHLER\n`);
process.exit(fail ? 1 : 0);

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
  if (url.startsWith('https://api.revenuecat.com/')) {
    rcAufrufe.push(url);
    return rcAntwort ? new Response(JSON.stringify(rcAntwort), { status: 200 }) : new Response('{}', { status: 500 });
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

const results = [];
async function check(name, fn) {
  subsZeilen = []; schreib = []; rcAntwort = null; rcAufrufe = []; sessionParams = null; abosListe = []; aboAbruf = null; kundenSuche = [];
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

import Stripe from 'stripe';
import { appleAboAktiv, RC_KEY_STANDARD } from './abo-status.js';

const SUPA_URL = 'https://savrxykygruzyngttekl.supabase.co';
// Ab diesem Tag registrierte Konten starten ein Probeabo: 30 Tage gratis, danach verlaengert
// es sich automatisch (vorher kuendbar). Gleicher Wert wie PROBEABO_AB in index.html.
export const PROBEABO_AB = Date.parse('2026-10-21T00:00:00+02:00');
export const PROBE_TAGE = 30;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Token ECHT verifizieren (Signatur + Ablauf) ueber Supabase, statt ihn nur
  // zu dekodieren – ein gefaelschter Token wird so zuverlaessig abgelehnt.
  let userId, userEmail, userCreated;
  try {
    const vr = await fetch(`${SUPA_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: svcKey }
    });
    if (!vr.ok) throw new Error('invalid');
    const u = await vr.json();
    userId = u.id;
    userEmail = u.email;
    userCreated = u.created_at;
    if (!userId) throw new Error('no id');
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // Abo-Modell: 3,99 €/Monat oder 28,99 €/Jahr. Aeltere Konten hatten den Gratismonat
  // ab Registrierung (kein Stripe-Testzeitraum); neue Konten bekommen ihn hier als
  // Stripe-Testzeitraum – aber nur beim ersten Abo. Price-IDs kommen aus den
  // Vercel-Umgebungsvariablen; STRIPE_PRICE_ID bleibt als Fallback.
  let plan = 'monthly';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (body.plan === 'yearly') plan = 'yearly';
  } catch (e) { /* default monthly */ }
  const priceId = plan === 'yearly'
    ? process.env.STRIPE_PRICE_YEARLY
    : (process.env.STRIPE_PRICE_MONTHLY || process.env.STRIPE_PRICE_ID);
  if (!priceId) return res.status(500).json({ error: 'Stripe price not configured (STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY)' });

  const hdrs = { Authorization: `Bearer ${svcKey}`, apikey: svcKey, 'Content-Type': 'application/json' };

  try {
    // Check if user already has a Stripe customer ID
    const subRes = await fetch(`${SUPA_URL}/rest/v1/subscriptions?user_id=eq.${userId}&select=stripe_customer_id,stripe_subscription_id`, { headers: hdrs });
    const subs = await subRes.json();
    const zeile = Array.isArray(subs) ? subs[0] : null;
    let customerId = zeile?.stripe_customer_id || null;
    // Stripe-Kunde auch finden, wenn der Webhook (noch) keine Zeile geschrieben hat
    if (!customerId) {
      try { customerId = (await stripe.customers.search({ query: `metadata['supabase_uid']:'${userId}'`, limit: 1 })).data[0]?.id || null; }
      catch (e) { /* Suche nicht verfuegbar – dann neuer Kunde */ }
    }
    // Kein zweiter Gratismonat: wer schon ein Abo hatte (auch gekuendigt), zahlt sofort.
    let hatteAbo = !!zeile?.stripe_subscription_id;
    if (customerId) {
      let abos = [];
      try { abos = (await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 })).data; }
      catch (e) { hatteAbo = true; }   // im Zweifel kein Testzeitraum
      if (abos.length) hatteAbo = true;
      // Laeuft schon ein Abo (z. B. zweiter Tab oder Webhook noch unterwegs)? Kein zweites anlegen.
      if (abos.some(a => ['active', 'trialing', 'past_due'].includes(a.status))) {
        return res.status(409).json({ error: 'Du hast bereits ein aktives Abo – bitte die Seite neu laden.', code: 'already_subscribed' });
      }
    }
    // Gratismonat schon in der iPhone-App genutzt (Apple-Abo, auch abgelaufen)? Dann auch hier keiner.
    if (!hatteAbo) {
      try {
        const r = await fetch('https://api.revenuecat.com/v1/subscribers/' + encodeURIComponent(userId), {
          headers: { Authorization: 'Bearer ' + (process.env.RC_PUBLIC_KEY || RC_KEY_STANDARD) } });
        if (r.ok) { const a = appleAboAktiv(await r.json()); if (a.apple || a.hatte) hatteAbo = true; }
      } catch (e) { /* RevenueCat nicht erreichbar – Stripe-Pruefung reicht */ }
    }
    const probe = Date.parse(userCreated || '') >= PROBEABO_AB && !hatteAbo;

    // Create Stripe customer if needed
    if (!customerId) {
      const customer = await stripe.customers.create({ email: userEmail, metadata: { supabase_uid: userId } });
      customerId = customer.id;
    }

    const origin = req.headers.origin || 'https://planory.at';

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/?upgrade=success`,
      cancel_url: `${origin}/?upgrade=cancel`,
      metadata: { supabase_uid: userId },
      subscription_data: {
        metadata: { supabase_uid: userId },
        // Probeabo: Karte wird jetzt hinterlegt, abgebucht erst nach 30 Tagen. Ohne Zahlungsmittel endet es.
        ...(probe ? { trial_period_days: PROBE_TAGE, trial_settings: { end_behavior: { missing_payment_method: 'cancel' } } } : {}),
      },
      payment_method_collection: 'always',
      ...(probe ? { custom_text: { submit: { message: plan === 'yearly'
        ? '30 Tage gratis, danach 28,99 € pro Jahr. Verlängert sich automatisch – vor Ende des Gratismonats kündbar, dann zahlst du nichts.'
        : '30 Tage gratis, danach 3,99 € pro Monat. Verlängert sich automatisch – vor Ende des Gratismonats kündbar, dann zahlst du nichts.' } } } : {}),
      allow_promotion_codes: true,  // enables promo/discount codes
      locale: 'de',
    });

    return res.status(200).json({ url: session.url, probe });
  } catch (e) {
    // Echte Stripe-Fehlermeldung an den Client geben (z. B. "No such price"
    // bei Test-/Live-Mismatch) statt eines nackten 500 – so ist die Ursache
    // sofort sichtbar.
    console.error('stripe-checkout error:', e);
    return res.status(500).json({ error: e?.message || 'Stripe checkout failed', code: e?.code, type: e?.type });
  }
}

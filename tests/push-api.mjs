// ═══════════════════════════════════════════════════════════════════════
// PLANORY – Anmeldeprüfung der Server-Funktionen (Push, Stripe-Portal)
// ═══════════════════════════════════════════════════════════════════════
// Ein selbst gebautes Token mit fremder Nutzer-ID darf NICHT akzeptiert werden
// (früher wurde die ID nur aus dem Token gelesen). Läuft ohne Netz: Supabase
// wird nachgebaut (globales fetch ersetzt).
// Ausfuehren:  node tests/push-api.mjs
// ═══════════════════════════════════════════════════════════════════════
process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc-test';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
const UA = '11111111-1111-4111-8111-111111111111', UB = '22222222-2222-4222-8222-222222222222';
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
// Echtes Token (Supabase bestätigt es) und gefälschtes (richtiges Format, fremde ID, falsche Signatur)
const ECHT = 'ey.' + b64({ sub: UA, exp: Math.floor(Date.now() / 1000) + 3600 }) + '.echte-signatur';
const FALSCH = 'ey.' + b64({ sub: UB, exp: Math.floor(Date.now() / 1000) + 3600 }) + '.gefaelscht';

let schreib = [], lesen = [], extern = [];
globalThis.fetch = async (url, opts = {}) => {
  url = String(url);
  const hdr = Object.fromEntries(Object.entries(opts.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
  if (url.endsWith('/auth/v1/user')) {
    return hdr.authorization === 'Bearer ' + ECHT ? new Response(JSON.stringify({ id: UA }), { status: 200 }) : new Response('{}', { status: 401 });
  }
  if (url.includes('/rest/v1/')) {
    if ((opts.method || 'GET') === 'GET') { lesen.push(url); return new Response('[]', { status: 200 }); }
    schreib.push({ url, body: opts.body ? JSON.parse(opts.body) : null });
    return new Response(null, { status: 201 });
  }
  extern.push(url);
  return new Response('{}', { status: 200 });
};

function aufruf(handler, token, body) {
  return new Promise((resolve, reject) => {
    const res = { _s: 200, setHeader() {}, status(s) { this._s = s; return this; },
      json(b) { resolve({ status: this._s, body: b }); return this; }, end() { resolve({ status: this._s }); return this; } };
    Promise.resolve(handler({ method: 'POST', headers: token ? { authorization: 'Bearer ' + token } : {}, body }, res)).catch(reject);
  });
}

const results = [];
async function check(name, fn) {
  schreib = []; lesen = []; extern = [];
  try { const m = await fn(); results.push([!m, name, m || '']); }
  catch (e) { results.push([false, name, 'Abbruch: ' + String(e && e.message || e).split('\n')[0]]); }
}
const lade = async f => (await import('../api/' + f)).default;

await check('Push-Abo: gefälschtes Token → 401, nichts gespeichert; echtes → mit eigener ID', async () => {
  const h = await lade('push-subscribe.js');
  const f = await aufruf(h, FALSCH, { subscription: { endpoint: 'https://x' } });
  const p = [];
  if (f.status !== 401 || schreib.length) p.push(`gefälscht: ${f.status}, ${schreib.length} gespeichert`);
  schreib = [];
  const e = await aufruf(h, ECHT, { subscription: { endpoint: 'https://x' } });
  if (e.status !== 200 || !schreib[0] || schreib[0].body.user_id !== UA) p.push('echt: ' + e.status + ' ' + JSON.stringify(schreib[0] && schreib[0].body));
  return p.join(' · ');
});
await check('App-Gerätetoken: gefälschtes Token → 401, nichts gespeichert', async () => {
  const h = await lade('native-token-register.js');
  const f = await aufruf(h, FALSCH, { token: 'apns-geraet', platform: 'ios' });
  if (f.status !== 401 || schreib.length) return `gefälscht: ${f.status}, ${schreib.length} gespeichert`;
  const e = await aufruf(h, ECHT, { token: 'apns-geraet', platform: 'ios' });
  if (e.status !== 200 || !schreib[0] || schreib[0].body.user_id !== UA) return 'echt: ' + e.status;
  return '';
});
await check('Stripe-Kundenportal: gefälschtes Token → 401, kein Abo eines anderen Kontos abgefragt', async () => {
  const h = await lade('stripe-portal.js');
  const f = await aufruf(h, FALSCH, {});
  if (f.status !== 401) return 'Status ' + f.status;
  if (lesen.some(u => u.includes(UB)) || extern.length) return 'fremdes Abo abgefragt/Stripe aufgerufen';
  return '';
});
await check('Push-Test: gefälschtes Token → 401', async () => {
  const h = await lade('push-test.js');
  const f = await aufruf(h, FALSCH, {});
  if (f.status !== 401 || lesen.length) return `Status ${f.status}, ${lesen.length} Abfragen`;
  return '';
});

console.log('\n  PLANORY – Anmeldeprüfung der Server-Funktionen');
console.log('  ' + '─'.repeat(64));
let fail = 0;
for (const [ok, name, msg] of results) {
  console.log(`  ${ok ? '✅' : '❌'} ${name}`);
  if (!ok) { fail++; console.log('      → ' + msg); }
}
console.log('  ' + '─'.repeat(64));
console.log(`  ${results.length - fail} bestanden, ${fail} FEHLER\n`);
process.exit(fail ? 1 : 0);

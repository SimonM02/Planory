// ═══════════════════════════════════════════════════════════════════════
// PLANORY – Server-Funktion „App-Store-Version" (Hinweis „Neue Version verfügbar")
// Läuft ohne Netz: Apples Suche wird nachgebaut (globales fetch ersetzt).
// Ausfuehren:  node tests/app-version-api.mjs
// ═══════════════════════════════════════════════════════════════════════
let antworten = {}, aufrufe = [];
globalThis.fetch = async url => {
  url = String(url); aufrufe.push(url);
  const land = (url.match(/country=(\w+)/) || [])[1] || '';
  const a = antworten[land];
  if (a === 'fehler') throw new Error('netz');
  return new Response(JSON.stringify(a || { resultCount: 0, results: [] }), { status: 200 });
};
const { default: handler, _cacheLeeren } = await import('../api/app-version.js');
const aufruf = (method = 'GET') => new Promise(resolve => {
  const res = { _s: 200, h: {}, setHeader(k, v) { this.h[k] = v; }, status(s) { this._s = s; return this; },
    json(b) { resolve({ status: this._s, body: b, h: this.h }); return this; }, end() { resolve({ status: this._s, h: this.h }); return this; } };
  handler({ method, headers: {} }, res);
});
const results = [];
const check = async (name, fn) => { try { const m = await fn(); results.push([!m, name, m || '']); } catch (e) { results.push([false, name, 'Abbruch: ' + e.message]); } };
const app = (v, extra = {}) => ({ resultCount: 1, results: [{ version: v, trackId: 6740000001, trackViewUrl: 'https://apps.apple.com/at/app/planory/id6740000001', ...extra }] });

await check('Version aus dem österreichischen Store', async () => {
  _cacheLeeren(); aufrufe = []; antworten = { at: app('1.4') };
  const r = await aufruf();
  if (r.body.version !== '1.4' || r.body.id !== 6740000001 || !/apps\.apple\.com/.test(r.body.url)) return JSON.stringify(r.body);
  if (!aufrufe[0].includes('bundleId=com.planory.bauassistent') || !aufrufe[0].includes('country=at')) return aufrufe[0];
  if (r.h['Access-Control-Allow-Origin'] !== '*') return 'CORS fehlt';
});
await check('Fehlt die App in AT, wird DE und dann ohne Land gefragt', async () => {
  _cacheLeeren(); aufrufe = []; antworten = { at: 'fehler', '': app('2.0.1') };
  const r = await aufruf();
  if (r.body.version !== '2.0.1') return JSON.stringify(r.body);
  if (aufrufe.length !== 3) return `${aufrufe.length} Abfragen`;
});
await check('Ungültige Version/fremde Adresse werden nicht weitergegeben', async () => {
  _cacheLeeren(); antworten = { at: app('<script>', { trackViewUrl: 'javascript:alert(1)' }), de: app('1.5', { trackViewUrl: 'javascript:alert(1)' }) };
  const r = await aufruf();
  if (r.body.version !== '1.5' || r.body.url !== null) return JSON.stringify(r.body);
});
await check('Nichts gefunden → version: null (kein Fehler)', async () => {
  _cacheLeeren(); antworten = {};
  const r = await aufruf();
  if (r.status !== 200 || r.body.version !== null) return JSON.stringify(r);
});
await check('Ergebnis wird kurz zwischengespeichert', async () => {
  _cacheLeeren(); antworten = { at: app('1.6') }; await aufruf();
  aufrufe = []; antworten = { at: app('9.9') };
  const r = await aufruf();
  if (r.body.version !== '1.6' || aufrufe.length) return `${r.body.version}, ${aufrufe.length} Abfragen`;
});
await check('Nur GET erlaubt', async () => { const r = await aufruf('POST'); if (r.status !== 405) return String(r.status); });

console.log('\n  PLANORY – App-Store-Version (Server)\n  ' + '─'.repeat(52));
let fail = 0;
for (const [ok, name, msg] of results) { console.log(`  ${ok ? '✅' : '❌'} ${name}`); if (!ok) { fail++; console.log('      → ' + msg); } }
console.log('  ' + '─'.repeat(52) + `\n  ${results.length - fail} bestanden, ${fail} FEHLER\n`);
process.exit(fail ? 1 : 0);

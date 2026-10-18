// ═══════════════════════════════════════════════════════════════════════
// PLANORY – Test der Todoist-Schnittstelle (api/todoist.js)
// ═══════════════════════════════════════════════════════════════════════
// Laeuft ohne Netz: Supabase-Anmeldung, Datenbank (PostgREST) und Todoist werden
// nachgebaut (globales fetch ersetzt). Prueft Anmeldung, Sicherheit (Zufallswert,
// fremder Nutzer, Verschluesselung), Erneuern der Anmeldung (auch gleichzeitig),
// Aufgaben lesen/aendern und Trennen.
// Ausfuehren:  node tests/todoist-api.mjs
// ═══════════════════════════════════════════════════════════════════════
import crypto from 'node:crypto';

process.env.TODOIST_CLIENT_ID = 'cid-test';
process.env.TODOIST_CLIENT_SECRET = 'csecret-test';
process.env.TODOIST_TOKEN_KEY = crypto.randomBytes(32).toString('base64');
process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc-test';
process.env.TODOIST_APP_URL = 'https://planory.at/';

const UA = '11111111-1111-4111-8111-111111111111', UB = '22222222-2222-4222-8222-222222222222';
const NUTZER = { 'jwt-A': UA, 'jwt-B': UB };

// ── Nachgebaute Welt ──
let W;
function neueWelt() {
  W = { rows: [], log: [], oauth: { codes: { 'code-ok': { access: 'acc-1', refresh: 'ref-1', expires_in: 3600 } }, refreshValid: new Set(), delay: 0, refreshFail: false, refreshCalls: 0 },
        access: new Set(), tasks: [], due: {}, revoked: [], revokeStatus: 200, apiCalls: [] };
}
const json = (status, body, headers = {}) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
function filterRows(qs) {
  const p = new URLSearchParams(qs);
  return W.rows.filter(r => {
    for (const [k, v] of p) {
      if (['select', 'on_conflict'].includes(k)) continue;
      if (k === 'or') {
        const m = v.match(/^\(refresh_lock_until\.is\.null,refresh_lock_until\.lt\."(.+)"\)$/);
        if (!m) throw new Error('unbekannter or-Filter ' + v);
        if (!(r.refresh_lock_until == null || Date.parse(r.refresh_lock_until) < Date.parse(m[1]))) return false;
        continue;
      }
      const mm = v.match(/^eq\.(.*)$/);
      if (!mm) throw new Error('unbekannter Filter ' + k + '=' + v);
      if (String(r[k]) !== mm[1]) return false;
    }
    return true;
  });
}
globalThis.fetch = async (url, opts = {}) => {
  url = String(url); const method = (opts.method || 'GET').toUpperCase();
  const body = opts.body ? JSON.parse(opts.body) : undefined;
  const hdr = Object.fromEntries(Object.entries(opts.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
  // Supabase Auth
  if (url.endsWith('/auth/v1/user')) {
    const uid = NUTZER[String(hdr.authorization || '').replace('Bearer ', '')];
    return uid ? json(200, { id: uid }) : json(401, { msg: 'bad jwt' });
  }
  // PostgREST
  const rest = url.match(/\/rest\/v1\/todoist_verbindungen\??(.*)$/);
  if (rest) {
    if (hdr.apikey !== 'svc-test') return json(401, {});
    const qs = rest[1]; const prefer = String(hdr.prefer || '');
    if (method === 'GET') return json(200, filterRows(qs).map(r => ({ ...r })));
    if (method === 'POST') {
      const ex = W.rows.find(r => r.user_id === body.user_id);
      if (ex) Object.assign(ex, body); else W.rows.push({ token_gen: 0, refresh_lock_until: null, ...body });
      return new Response(null, { status: 201 });
    }
    if (method === 'PATCH') {
      const hits = filterRows(qs); hits.forEach(r => Object.assign(r, body));
      return prefer.includes('return=representation') ? json(200, hits.map(r => ({ ...r }))) : new Response(null, { status: 204 });
    }
    if (method === 'DELETE') { const hits = filterRows(qs); W.rows = W.rows.filter(r => !hits.includes(r)); return new Response(null, { status: 204 }); }
  }
  // Todoist OAuth
  if (url === 'https://todoist.com/oauth/access_token') {
    W.log.push({ oauth: body });
    if (body.client_id !== 'cid-test' || body.client_secret !== 'csecret-test') return json(401, { error: 'invalid_client' });
    if (body.grant_type === 'refresh_token') {
      W.oauth.refreshCalls++;
      if (W.oauth.delay) await new Promise(r => setTimeout(r, W.oauth.delay));
      if (W.oauth.clientFehler) return json(401, { error: 'invalid_client' });
      if (W.oauth.refreshFail || !W.oauth.refreshValid.has(body.refresh_token)) return json(400, { error: 'invalid_grant' });
      W.oauth.refreshValid.delete(body.refresh_token);
      const n = W.oauth.refreshCalls; const acc = 'acc-r' + n, ref = 'ref-r' + n;
      W.access.add(acc); W.oauth.refreshValid.add(ref);
      return json(200, { access_token: acc, refresh_token: ref, expires_in: 3600, token_type: 'Bearer' });
    }
    const c = W.oauth.codes[body.code];
    if (!c) return json(400, { error: 'invalid_grant' });
    W.access.add(c.access); W.oauth.refreshValid.add(c.refresh);
    return json(200, { access_token: c.access, refresh_token: c.refresh, expires_in: c.expires_in, token_type: 'Bearer' });
  }
  // Todoist API
  const api = url.match(/^https:\/\/api\.todoist\.com\/api\/v1(\/[^?]*)\??(.*)$/);
  if (api) {
    const pfad = api[1], q = new URLSearchParams(api[2]);
    if (pfad === '/revoke') {
      W.revoked.push({ auth: hdr.authorization, body });
      return new Response(null, { status: W.revokeStatus });
    }
    const tok = String(hdr.authorization || '').replace('Bearer ', '');
    W.apiCalls.push({ method, pfad, q: api[2], body, tok, rid: hdr['x-request-id'] });
    if (!W.access.has(tok)) return json(401, { error: 'unauthorized' });
    if (pfad === '/projects' && method === 'GET') return json(200, { results: [
      { id: 'P1', name: 'Inbox', inbox_project: true, child_order: 0 }, { id: 'P2', name: 'Hausbau', child_order: 1 },
      { id: 'P3', name: 'Elektro', parent_id: 'P2', child_order: 0 }, { id: 'P9', name: 'Alt', is_archived: true }], next_cursor: null });
    if (pfad === '/tasks' && method === 'GET') {
      const alle = W.tasks.filter(t => t.project_id === q.get('project_id'));
      const start = q.get('cursor') ? Number(q.get('cursor')) : 0, lim = 2;
      return json(200, { results: alle.slice(start, start + lim), next_cursor: start + lim < alle.length ? String(start + lim) : null });
    }
    if (pfad === '/tasks' && method === 'POST') { const t = { id: 'T' + (W.tasks.length + 100), priority: 1, ...body }; W.tasks.push(t); return json(200, t); }
    const tm = pfad.match(/^\/tasks\/([^/]+)(\/(close|reopen))?$/);
    if (tm) {
      const t = W.tasks.find(x => x.id === decodeURIComponent(tm[1]));
      if (!t) return json(404, { error: 'not found' });
      if (tm[3]) { t.checked = tm[3] === 'close'; return new Response(null, { status: 204 }); }
      if (method === 'GET') return json(200, t);
      if (method === 'DELETE') { W.tasks = W.tasks.filter(x => x !== t); return new Response(null, { status: 204 }); }
      if (method === 'POST') { Object.assign(t, body); return json(200, t); }
    }
    return json(404, {});
  }
  throw new Error('Unerwarteter Aufruf: ' + method + ' ' + url);
};

const { default: handler } = await import('../api/todoist.js').catch(e => ({ default: null, fehler: e }));
const lib = await import('../api/_todoist-lib.js').catch(() => null);
if (lib) { lib.cfg.lockWaitMs = 20; lib.cfg.fetchTimeoutMs = 2000; }

function aufruf({ method = 'POST', body, jwt, query, origin = 'https://planory.at' } = {}) {
  return new Promise((resolve, reject) => {
    const res = { _s: 200, _h: {}, statusCode: 200,
      setHeader(k, v) { this._h[k.toLowerCase()] = v; }, status(s) { this._s = s; return this; },
      json(b) { resolve({ status: this._s, body: b, headers: this._h }); return this; },
      end() { resolve({ status: this._s, body: null, headers: this._h }); return this; } };
    const req = { method, body: body ? JSON.stringify(body) : undefined, query: query || {},
      headers: { origin, ...(jwt ? { authorization: 'Bearer ' + jwt } : {}) } };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}
const post = (jwt, body) => aufruf({ jwt, body });
async function verbinde(jwt = 'jwt-A', code = 'code-ok') {
  const s = await post(jwt, { action: 'start' });
  const state = new URL(s.body.url).searchParams.get('state');
  const cb = await aufruf({ method: 'GET', query: { code, state } });
  const n = new URL(cb.headers.location).searchParams.get('n');
  const f = await post(jwt, { action: 'finish', n });
  return { s, state, cb, n, f };
}
const kein = (obj, ...was) => was.filter(w => JSON.stringify(obj).includes(w));

// ── Pruefungen ──
const results = [];
async function check(name, fn) {
  neueWelt();
  try { if (!handler) throw new Error('api/todoist.js fehlt'); const m = await fn(); results.push([!m, name, m || '']); }
  catch (e) { results.push([false, name, 'Abbruch: ' + String(e && e.message || e).split('\n')[0]]); }
}

await check('Verschlüsselung: hin und zurück, zufällig, manipuliert/fremder Nutzer scheitert', async () => {
  const a = lib.seal('geheim', 'u1|access'), b = lib.seal('geheim', 'u1|access');
  if (lib.open(a, 'u1|access') !== 'geheim') return 'Rückweg falsch';
  if (a === b) return 'gleicher Geheimtext (kein Zufall)';
  const kaputt = a.slice(0, -3) + (a.slice(-3) === 'AAA' ? 'BBB' : 'AAA');
  for (const [x, aad] of [[kaputt, 'u1|access'], [a, 'u2|access'], [a, 'u1|refresh']]) { try { lib.open(x, aad); return 'manipulierter/fremder Inhalt wurde entschlüsselt'; } catch (e) {} }
  return '';
});
await check('Start: ohne Anmeldung 401; mit Anmeldung Todoist-Link, nur Hash gespeichert', async () => {
  const o = await post(null, { action: 'start' });
  if (o.status !== 401) return 'ohne Anmeldung: ' + o.status;
  const s = await post('jwt-A', { action: 'start' });
  if (!String(s.body.url).startsWith('https://todoist.com/oauth/authorize?client_id=cid-test')) return 'Link: ' + s.body.url;
  const u = new URL(s.body.url);
  if (u.searchParams.get('scope') !== 'data:read_write,data:delete') return 'scope: ' + u.searchParams.get('scope');
  const state = u.searchParams.get('state');
  if (JSON.stringify(W.rows).includes(state)) return 'Zufallswert im Klartext gespeichert';
  return '';
});
await check('Verbinden: Callback tauscht Code, Weiterleitung mit finish, keine Tokens im Klartext', async () => {
  const { cb, f } = await verbinde();
  if (cb.status !== 302 || !/^https:\/\/planory\.at\/\?todoist=finish&n=/.test(cb.headers.location)) return 'Weiterleitung: ' + cb.headers.location;
  if (/code-ok|acc-1/.test(cb.headers.location)) return 'Code/Token in der Adresse';
  if (!f.body || !f.body.connected) return 'finish: ' + JSON.stringify(f.body);
  const st = await post('jwt-A', { action: 'status' });
  if (!st.body.connected) return 'Status nicht verbunden';
  const lecks = kein(W.rows, 'acc-1', 'ref-1');
  if (lecks.length) return 'Klartext in der Datenbank: ' + lecks.join(',');
  return '';
});
await check('Callback: falscher, abgelaufener, doppelter Zufallswert und Ablehnung → kein Code-Tausch', async () => {
  const p = [];
  let r = await aufruf({ method: 'GET', query: { code: 'code-ok', state: 'falsch' } });
  if (!/grund=state/.test(r.headers.location)) p.push('falsch: ' + r.headers.location);
  const s = await post('jwt-A', { action: 'start' }); const state = new URL(s.body.url).searchParams.get('state');
  W.rows[0].oauth_state_at = new Date(Date.now() - 11 * 60 * 1000).toISOString();
  r = await aufruf({ method: 'GET', query: { code: 'code-ok', state } });
  if (!/grund=state/.test(r.headers.location)) p.push('abgelaufen: ' + r.headers.location);
  const s2 = await post('jwt-A', { action: 'start' }); const st2 = new URL(s2.body.url).searchParams.get('state');
  await aufruf({ method: 'GET', query: { code: 'code-ok', state: st2 } });
  r = await aufruf({ method: 'GET', query: { code: 'code-ok', state: st2 } });
  if (!/grund=state/.test(r.headers.location)) p.push('doppelt: ' + r.headers.location);
  r = await aufruf({ method: 'GET', query: { error: 'access_denied', state: 'x' } });
  if (!/grund=denied/.test(r.headers.location)) p.push('abgelehnt: ' + r.headers.location);
  const tausche = W.log.filter(l => l.oauth && l.oauth.code).length;
  if (tausche !== 1) p.push(`Code-Tausch ${tausche}× (erwartet 1, nur der gültige)`);
  return p.join(' · ');
});
await check('finish mit fremdem Nutzer wird abgelehnt und verworfen', async () => {
  const s = await post('jwt-A', { action: 'start' });   // Angreifer A startet …
  const state = new URL(s.body.url).searchParams.get('state');
  const cb = await aufruf({ method: 'GET', query: { code: 'code-ok', state } });   // … Opfer B stimmt bei Todoist zu
  const n = new URL(cb.headers.location).searchParams.get('n');
  const f = await post('jwt-B', { action: 'finish', n });   // Browser von B (eingeloggt als B) ruft finish
  if (f.status !== 409) return 'fremdes finish: ' + f.status;
  const a = await post('jwt-A', { action: 'status' });
  if (a.body.connected) return 'Angreifer ist mit fremdem Todoist verbunden';
  if (W.rows.some(r => r.pending_enc)) return 'vorgemerkte Zugangsdaten nicht verworfen';
  if (!W.revoked.length) return 'fremder Token nicht widerrufen';
  return '';
});
await check('Aufgaben: mehrere Seiten, Datum aufbereitet, „* "-Aufgaben, ungültige ID → 400', async () => {
  await verbinde();
  W.tasks = [
    { id: 'T1', project_id: 'P2', content: 'Fenster bestellen', priority: 4, due: { date: '2026-11-03', string: '3 Nov', is_recurring: false } },
    { id: 'T2', project_id: 'P2', content: 'Wöchentlich Baustelle', due: { date: '2026-11-04', string: 'every week', is_recurring: true } },
    { id: 'T3', project_id: 'P2', content: '* Notiz', due: { date: '2026-11-05T09:30:00Z', string: '5 Nov 10:30', timezone: 'Europe/Vienna' } },
    { id: 'T4', project_id: 'P2', content: 'Ohne Datum', due: null }, { id: 'T5', project_id: 'X', content: 'anderes Projekt' }];
  const r = await post('jwt-A', { action: 'tasks', project_id: 'P2' });
  const t = r.body.tasks || [];
  const p = [];
  if (t.length !== 4) p.push(`${t.length} Aufgaben statt 4 (Seiten nicht zusammengeführt?)`);
  const t3 = t.find(x => x.id === 'T3');
  if (!t3 || t3.content !== 'Notiz' || !t3.uncompletable || t3.due.date !== '2026-11-05' || t3.due.time !== '10:30') p.push('T3: ' + JSON.stringify(t3));
  if (!t.find(x => x.id === 'T2')?.due.recurring) p.push('wiederkehrend nicht erkannt');
  const bad = await post('jwt-A', { action: 'tasks', project_id: '../x' });
  if (bad.status !== 400) p.push('ungültige ID: ' + bad.status);
  const pr = await post('jwt-A', { action: 'projects' });
  if ((pr.body.projects || []).map(x => x.id + ':' + x.depth).join() !== 'P1:0,P2:0,P3:1') p.push('Projekte: ' + JSON.stringify(pr.body.projects));
  return p.join(' · ');
});
await check('Abgelaufene Anmeldung: genau 1 Erneuerung, neuer Refresh-Token gespeichert', async () => {
  await verbinde();
  W.rows[0].expires_at = new Date(Date.now() - 1000).toISOString();
  W.tasks = [{ id: 'T1', project_id: 'P2', content: 'x' }];
  const r = await post('jwt-A', { action: 'tasks', project_id: 'P2' });
  const p = [];
  if (r.status !== 200) p.push('Status ' + r.status);
  if (W.oauth.refreshCalls !== 1) p.push(`${W.oauth.refreshCalls} Erneuerungen`);
  if (W.apiCalls.at(-1).tok !== 'acc-r1') p.push('alter Token benutzt');
  if (lib.open(W.rows[0].refresh_token_enc, `${UA}|refresh`) !== 'ref-r1') p.push('neuer Refresh-Token nicht gespeichert');
  if (W.rows[0].token_gen !== 2) p.push('token_gen ' + W.rows[0].token_gen);
  return p.join(' · ');
});
await check('Gleichzeitig: zwei Anfragen mit abgelaufener Anmeldung → nur 1 Erneuerung, beide ok', async () => {
  await verbinde();
  W.rows[0].expires_at = new Date(Date.now() - 1000).toISOString();
  W.tasks = [{ id: 'T1', project_id: 'P2', content: 'x' }];
  W.oauth.delay = 150;
  const [a, b] = await Promise.all([post('jwt-A', { action: 'tasks', project_id: 'P2' }), post('jwt-A', { action: 'tasks', project_id: 'P2' })]);
  const p = [];
  if (a.status !== 200 || b.status !== 200) p.push(`Status ${a.status}/${b.status}`);
  if (W.oauth.refreshCalls !== 1) p.push(`${W.oauth.refreshCalls} Erneuerungen (Nutzer würde rausfliegen)`);
  return p.join(' · ');
});
await check('Todoist lehnt ab (401) und Erneuern scheitert → getrennt, Grund „revoked"', async () => {
  await verbinde();
  W.access.clear(); W.oauth.refreshFail = true;
  W.tasks = [{ id: 'T1', project_id: 'P2', content: 'x' }];
  const r = await post('jwt-A', { action: 'tasks', project_id: 'P2' });
  const st = await post('jwt-A', { action: 'status' });
  const p = [];
  if (r.status !== 409 || r.body.error !== 'not_connected') p.push('Antwort ' + r.status + ' ' + JSON.stringify(r.body));
  if (st.body.connected || st.body.reason !== 'revoked') p.push('Status ' + JSON.stringify(st.body));
  if (W.rows[0].access_token_enc) p.push('Token nicht gelöscht');
  return p.join(' · ');
});
await check('Ändern: wiederkehrendes Datum gesperrt, nur erlaubte Felder, Datum löschen', async () => {
  await verbinde();
  W.tasks = [{ id: 'T2', project_id: 'P2', content: 'Wöchentlich', priority: 1, labels: ['x'], due: { date: '2026-11-04', string: 'every week', is_recurring: true } },
             { id: 'T4', project_id: 'P2', content: 'Normal', due: { date: '2026-11-04', string: '4 Nov', is_recurring: false } }];
  const p = [];
  const gesperrt = await post('jwt-A', { action: 'update', id: 'T2', due_date: '2026-12-01' });
  if (gesperrt.status !== 409 || gesperrt.body.error !== 'date_locked' || gesperrt.body.reason !== 'recurring') p.push('Datum wiederkehrend: ' + gesperrt.status + JSON.stringify(gesperrt.body));
  if (W.apiCalls.some(c => c.method === 'POST' && c.pfad === '/tasks/T2')) p.push('wiederkehrende Aufgabe trotzdem geändert');
  const titel = await post('jwt-A', { action: 'update', id: 'T2', content: 'Neu', labels: ['hack'], project_id: 'P9' });
  const sent = W.apiCalls.filter(c => c.method === 'POST' && c.pfad === '/tasks/T2').at(-1);
  if (titel.status !== 200 || !sent || JSON.stringify(Object.keys(sent.body)) !== '["content"]') p.push('gesendete Felder: ' + JSON.stringify(sent && sent.body));
  await post('jwt-A', { action: 'update', id: 'T4', due_date: null });
  const d = W.apiCalls.filter(c => c.method === 'POST' && c.pfad === '/tasks/T4').at(-1);
  if (!d || d.body.due_string !== 'no date' || 'due_date' in d.body) p.push('Datum löschen: ' + JSON.stringify(d && d.body));
  const neu = await post('jwt-A', { action: 'add', project_id: 'P2', content: 'Neue Aufgabe', priority: 3, request_id: '123e4567-e89b-42d3-a456-426614174000' });
  const a = W.apiCalls.filter(c => c.method === 'POST' && c.pfad === '/tasks').at(-1);
  if (neu.status !== 200 || !a || a.body.project_id !== 'P2' || a.rid !== '123e4567-e89b-42d3-a456-426614174000') p.push('Neu: ' + JSON.stringify(a));
  const c = await post('jwt-A', { action: 'close', id: 'T4' });
  if (c.status !== 200 || !W.tasks.find(t => t.id === 'T4').checked) p.push('Erledigen');
  const del = await post('jwt-A', { action: 'delete', id: 'T4' });
  if (del.status !== 200 || W.tasks.some(t => t.id === 'T4')) p.push('Löschen');
  return p.join(' · ');
});
await check('Trennen: widerruft (Basic), löscht Verbindung – auch wenn Widerrufen scheitert', async () => {
  await verbinde();
  W.revokeStatus = 500;
  const r = await post('jwt-A', { action: 'disconnect' });
  const p = [];
  if (r.status !== 200 || !r.body.ok) p.push('Antwort ' + r.status);
  if (W.rows.length) p.push('Verbindung nicht gelöscht');
  const basic = 'Basic ' + Buffer.from('cid-test:csecret-test').toString('base64');
  if (!W.revoked.length || W.revoked[0].auth !== basic) p.push('Widerruf ohne Basic-Anmeldung');
  await verbinde();
  await lib.cleanupTodoistForUser(UA);
  if (W.rows.length) p.push('Konto-Löschen räumt nicht auf');
  return p.join(' · ');
});
await check('CORS nur für planory.at; ohne Einrichtung unsichtbar; keine Tokens in Antworten', async () => {
  const p = [];
  const gut = await aufruf({ jwt: 'jwt-A', body: { action: 'status' }, origin: 'https://planory.at' });
  if (gut.headers['access-control-allow-origin'] !== 'https://planory.at') p.push('planory.at nicht erlaubt');
  const boese = await aufruf({ jwt: 'jwt-A', body: { action: 'status' }, origin: 'https://evil.example' });
  if (boese.headers['access-control-allow-origin']) p.push('fremde Seite erlaubt');
  const { f } = await verbinde();
  W.tasks = [{ id: 'T1', project_id: 'P2', content: 'x' }];
  const antworten = [f, await post('jwt-A', { action: 'status' }), await post('jwt-A', { action: 'tasks', project_id: 'P2' })];
  if (kein(antworten, 'acc-1', 'ref-1', 'csecret').length) p.push('Token/Secret in einer Antwort');
  const alt = process.env.TODOIST_CLIENT_SECRET; delete process.env.TODOIST_CLIENT_SECRET;
  try {
    const st = await post('jwt-A', { action: 'status' });
    const ta = await post('jwt-A', { action: 'tasks', project_id: 'P2' });
    if (st.body.configured !== false || ta.status !== 501) p.push('ohne Einrichtung: ' + JSON.stringify(st.body) + ' / ' + ta.status);
  } finally { process.env.TODOIST_CLIENT_SECRET = alt; }
  return p.join(' · ');
});

await check('Falsches Client-Secret beim Erneuern löscht die Verbindung NICHT (nur invalid_grant)', async () => {
  await verbinde();
  W.rows[0].expires_at = new Date(Date.now() - 1000).toISOString();
  W.tasks = [{ id: 'T1', project_id: 'P2', content: 'x' }];
  W.oauth.clientFehler = true;
  const r = await post('jwt-A', { action: 'tasks', project_id: 'P2' });
  const p = [];
  if (r.status !== 502) p.push('Antwort ' + r.status + ' ' + JSON.stringify(r.body));
  if (!W.rows[0].access_token_enc || !W.rows[0].refresh_token_enc) p.push('Zugangsdaten gelöscht');
  if (W.rows[0].refresh_lock_until) p.push('Sperre bleibt hängen');
  return p.join(' · ');
});
await check('Umbenennen einer nicht abhakbaren Aufgabe behält „* "', async () => {
  await verbinde();
  W.tasks = [{ id: 'T7', project_id: 'P2', content: '* Überschrift', due: null }];
  const r = await post('jwt-A', { action: 'update', id: 'T7', content: 'Neue Überschrift' });
  const sent = W.apiCalls.filter(c => c.method === 'POST' && c.pfad === '/tasks/T7').at(-1);
  if (r.status !== 200 || !sent || sent.body.content !== '* Neue Überschrift') return 'gesendet: ' + JSON.stringify(sent && sent.body);
  if (!r.body.task.uncompletable) return 'Antwort nicht mehr „nicht abhakbar"';
  return '';
});

console.log('\n  PLANORY – Todoist-Schnittstelle');
console.log('  ' + '─'.repeat(64));
let fail = 0;
for (const [ok, name, msg] of results) {
  console.log(`  ${ok ? '✅' : '❌'} ${name}`);
  if (!ok) { fail++; console.log('      → ' + msg); }
}
console.log('  ' + '─'.repeat(64));
console.log(`  ${results.length - fail} bestanden, ${fail} FEHLER\n`);
process.exit(fail ? 1 : 0);

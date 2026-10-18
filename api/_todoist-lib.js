// Todoist-Anbindung – gemeinsame Hilfen (kein eigener Endpunkt: Dateien mit "_" werden
// von Vercel nicht als Funktion ausgeliefert, siehe _apns.js).
//
// Sicherheit:
//  - Client-Secret und Zugangsdaten (Access/Refresh-Token) liegen NUR auf dem Server.
//  - Zugangsdaten werden mit AES-256-GCM verschluesselt in Supabase gespeichert
//    (Tabelle todoist_verbindungen, RLS an, KEINE Policies -> nur Service-Role).
//  - Anmelde-Zufallswerte (state) und Uebergabe-Nummern werden nur als SHA-256 gespeichert.
//  - Erneuern der Anmeldung (Refresh) mit Sperre + Zaehler token_gen: gleichzeitige
//    Anfragen erneuern nur EINMAL (Todoist tauscht dabei den Refresh-Token aus).
//  - Keine Zugangsdaten in Antworten oder Logs.
import crypto from 'node:crypto';

export const SUPA_URL = 'https://savrxykygruzyngttekl.supabase.co';
export const TD_API = 'https://api.todoist.com/api/v1';
export const TD_OAUTH = 'https://todoist.com/oauth';
export const TABELLE = 'todoist_verbindungen';
// In Tests ueberschreibbar
export const cfg = { stateTtlMs: 10 * 60 * 1000, lockMs: 20000, lockWaitMs: 400, maxPages: 5, fetchTimeoutMs: 6000, pageLimit: 200 };

export function httpErr(status, code, extra) { const e = new Error(code); e.status = status; e.code = code; e.extra = extra || {}; return e; }
const env = n => process.env[n] || '';
export function konfiguriert() {
  return !!(env('TODOIST_CLIENT_ID') && env('TODOIST_CLIENT_SECRET') && env('TODOIST_TOKEN_KEY') && env('SUPABASE_SERVICE_ROLE_KEY'));
}
export const sha256 = s => crypto.createHash('sha256').update(String(s)).digest('hex');
export const zufall = () => crypto.randomBytes(32).toString('base64url');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Verschluesselung (AES-256-GCM, Inhalt an Nutzer + Feld gebunden) ──
function schluessel() {
  const k = Buffer.from(env('TODOIST_TOKEN_KEY'), 'base64');
  if (k.length !== 32) throw httpErr(501, 'not_configured');
  return k;
}
export function seal(klar, aad) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', schluessel(), iv);
  c.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([c.update(String(klar), 'utf8'), c.final()]);
  return 'v1.' + Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64url');
}
export function open(s, aad) {
  const [v, b] = String(s || '').split('.');
  if (v !== 'v1' || !b) throw new Error('bad ct');
  const buf = Buffer.from(b, 'base64url');
  const d = crypto.createDecipheriv('aes-256-gcm', schluessel(), buf.subarray(0, 12));
  d.setAAD(Buffer.from(aad));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8');
}

// ── Planory-Anmeldung pruefen (wie api/ki.js) ──
export async function verifyUser(token) {
  if (!token) return null;
  try {
    const r = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: env('SUPABASE_SERVICE_ROLE_KEY') } });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u : null;
  } catch (e) { return null; }
}

// ── Datenbank (PostgREST mit Service-Role) ──
export async function db(method, pfad, { body, prefer } = {}) {
  const k = env('SUPABASE_SERVICE_ROLE_KEY');
  const r = await fetch(`${SUPA_URL}/rest/v1/${pfad}`, {
    method,
    headers: { apikey: k, Authorization: `Bearer ${k}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw httpErr(502, 'db_error');
  if (r.status === 204) return null;
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
const uidOk = uid => /^[0-9a-f-]{36}$/i.test(String(uid || ''));
export async function zeile(uid) {
  if (!uidOk(uid)) throw httpErr(400, 'bad_request');
  const rows = await db('GET', `${TABELLE}?user_id=eq.${uid}&select=*`);
  return (rows && rows[0]) || null;
}
const jetzt = () => new Date().toISOString();

// ── Todoist OAuth ──
async function oauthToken(body) {
  let r;
  try {
    r = await fetchMitTimeout(`${TD_OAUTH}/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: env('TODOIST_CLIENT_ID'), client_secret: env('TODOIST_CLIENT_SECRET'), ...body }) });
  } catch (e) { throw httpErr(502, 'todoist_unavailable'); }
  if (!r.ok) {
    // Nur "invalid_grant" heisst: diese Anmeldung ist ungueltig. Alles andere (z.B. falsches
    // Client-Secret = invalid_client, Stoerung) darf die gespeicherten Zugangsdaten NICHT loeschen.
    let j = null; try { j = await r.json(); } catch (e) {}
    if (r.status < 500 && j && j.error === 'invalid_grant') throw httpErr(401, 'invalid_grant');
    if (r.status < 500) console.warn('[todoist] OAuth-Fehler', r.status, (j && j.error) || '');
    throw httpErr(502, 'todoist_unavailable');
  }
  const j = await r.json();
  if (!j || !j.access_token) throw httpErr(502, 'todoist_unavailable');
  return j;
}
export const tauscheCode = code => oauthToken({ code });
export const erneuere = refreshToken => oauthToken({ refresh_token: refreshToken, grant_type: 'refresh_token' });
export async function widerrufe(token, hint = 'access_token') {
  if (!token) return false;
  try {
    const basic = Buffer.from(`${env('TODOIST_CLIENT_ID')}:${env('TODOIST_CLIENT_SECRET')}`).toString('base64');
    const r = await fetchMitTimeout(`${TD_API}/revoke`, { method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ token, token_type_hint: hint }) });
    return r.ok;
  } catch (e) { return false; }
}
export function authorizeUrl(state) {
  const q = new URLSearchParams({ client_id: env('TODOIST_CLIENT_ID'), scope: 'data:read_write,data:delete', state });
  return `${TD_OAUTH}/authorize?${q.toString()}`;
}
export function tokenFelder(uid, t) {
  return {
    access_token_enc: seal(t.access_token, `${uid}|access`),
    refresh_token_enc: t.refresh_token ? seal(t.refresh_token, `${uid}|refresh`) : null,
    expires_at: t.expires_in ? new Date(Date.now() + (Number(t.expires_in) - 60) * 1000).toISOString() : null,
    scope: t.scope || null,
  };
}

// Verbindung als getrennt markieren (nur, wenn niemand inzwischen neu verbunden/erneuert hat)
export async function markDisconnected(uid, gen, grund) {
  await db('PATCH', `${TABELLE}?user_id=eq.${uid}&token_gen=eq.${gen}`, {
    body: { access_token_enc: null, refresh_token_enc: null, expires_at: null, refresh_lock_until: null,
            disconnected_reason: grund, token_gen: gen + 1, updated_at: jetzt() },
    prefer: 'return=minimal' });
}

// Gueltigen Access-Token liefern; erneuert bei Bedarf – sicher bei gleichzeitigen Anfragen.
// invalidGen: Todoist hat den Token mit dieser Generation abgelehnt (401) -> erneuern.
export async function accessTokenFor(uid, { invalidGen = null } = {}) {
  for (let versuch = 0; versuch < 5; versuch++) {
    const row = await zeile(uid);
    if (!row || !row.access_token_enc) throw httpErr(409, 'not_connected', { reason: (row && row.disconnected_reason) || null });
    const gen = Number(row.token_gen) || 0;
    const access = () => open(row.access_token_enc, `${uid}|access`);
    const ablauf = row.expires_at ? Date.parse(row.expires_at) : null;
    if (invalidGen == null && (ablauf == null || ablauf - Date.now() > 5 * 60 * 1000)) return { token: access(), gen };
    if (invalidGen != null && invalidGen !== gen) return { token: access(), gen };   // schon von anderer Anfrage erneuert
    if (!row.refresh_token_enc) {
      if (invalidGen == null && ablauf != null && ablauf > Date.now()) return { token: access(), gen };
      await markDisconnected(uid, gen, invalidGen != null ? 'revoked' : 'expired');
      throw httpErr(409, 'not_connected', { reason: invalidGen != null ? 'revoked' : 'expired' });
    }
    // Sperre holen (nur wenn frei bzw. abgelaufen und Generation unveraendert)
    const n = jetzt();
    const sperre = encodeURIComponent(`(refresh_lock_until.is.null,refresh_lock_until.lt."${n}")`);
    const geholt = await db('PATCH', `${TABELLE}?user_id=eq.${uid}&token_gen=eq.${gen}&or=${sperre}`, {
      body: { refresh_lock_until: new Date(Date.now() + cfg.lockMs).toISOString() }, prefer: 'return=representation' });
    if (!geholt || !geholt.length) { await sleep(cfg.lockWaitMs * (versuch + 1)); continue; }
    let t;
    try { t = await erneuere(open(row.refresh_token_enc, `${uid}|refresh`)); }
    catch (e) {
      if (e.code === 'invalid_grant') {
        const neu = await zeile(uid);
        if (neu && neu.access_token_enc && Number(neu.token_gen) !== gen) return { token: open(neu.access_token_enc, `${uid}|access`), gen: Number(neu.token_gen) };
        await markDisconnected(uid, gen, 'revoked');
        throw httpErr(409, 'not_connected', { reason: 'revoked' });
      }
      await db('PATCH', `${TABELLE}?user_id=eq.${uid}&token_gen=eq.${gen}`, { body: { refresh_lock_until: null }, prefer: 'return=minimal' }).catch(() => {});
      throw httpErr(502, 'todoist_unavailable');
    }
    const felder = tokenFelder(uid, t);
    if (!t.refresh_token) felder.refresh_token_enc = row.refresh_token_enc;   // kein neuer -> alten behalten
    const gesetzt = await db('PATCH', `${TABELLE}?user_id=eq.${uid}&token_gen=eq.${gen}`, {
      body: { ...felder, token_gen: gen + 1, refresh_lock_until: null, updated_at: jetzt() }, prefer: 'return=representation' });
    if (!gesetzt || !gesetzt.length) throw httpErr(409, 'not_connected', { reason: null });   // inzwischen getrennt
    return { token: t.access_token, gen: gen + 1 };
  }
  throw httpErr(503, 'busy');
}

async function fetchMitTimeout(url, opts) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), cfg.fetchTimeoutMs);
  try { return await fetch(url, { ...opts, signal: ac.signal }); }
  finally { clearTimeout(t); }
}

// Todoist-Aufruf im Namen des Nutzers (erneuert bei 401 einmal und versucht es erneut)
export async function tdFetch(uid, method, pfad, { query, body, requestId } = {}) {
  let { token, gen } = await accessTokenFor(uid);
  const url = `${TD_API}${pfad}${query ? '?' + new URLSearchParams(query).toString() : ''}`;
  for (let i = 0; i < 2; i++) {
    let r;
    try {
      r = await fetchMitTimeout(url, { method, headers: { Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(requestId ? { 'X-Request-Id': requestId } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined });
    } catch (e) { throw httpErr(502, 'todoist_unavailable'); }
    if (r.status === 401) {
      if (i === 0) { ({ token, gen } = await accessTokenFor(uid, { invalidGen: gen })); continue; }
      await markDisconnected(uid, gen, 'revoked');
      throw httpErr(409, 'not_connected', { reason: 'revoked' });
    }
    if (r.status === 204) return null;
    if (r.ok) { const t = await r.text(); return t ? JSON.parse(t) : null; }
    if (r.status === 400) throw httpErr(400, 'bad_request');
    if (r.status === 403) throw httpErr(403, 'forbidden');
    if (r.status === 404) throw httpErr(404, 'not_found');
    if (r.status === 429) throw httpErr(429, 'rate_limited', { retry_after: Number(r.headers.get('retry-after')) || null });
    throw httpErr(502, 'todoist_unavailable');
  }
  throw httpErr(502, 'todoist_unavailable');
}

// Alle Seiten einer Liste holen (Cursor), mit Obergrenze
export async function alleSeiten(uid, pfad, query) {
  const out = []; let cursor = null, seiten = 0, abgeschnitten = false;
  do {
    const r = await tdFetch(uid, 'GET', pfad, { query: { ...query, limit: String(cfg.pageLimit), ...(cursor ? { cursor } : {}) } });
    out.push(...((r && r.results) || []));
    cursor = r && r.next_cursor;
    seiten++;
    if (cursor && seiten >= cfg.maxPages) { abgeschnitten = true; break; }
  } while (cursor);
  return { liste: out, abgeschnitten };
}

// ── Aufbereitung ──
function datumInZone(iso, zone) {
  try {
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: zone || 'Europe/Vienna', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const t = Object.fromEntries(f.formatToParts(new Date(iso)).map(p => [p.type, p.value]));
    return { date: `${t.year}-${t.month}-${t.day}`, time: `${t.hour}:${t.minute}` };
  } catch (e) { return { date: String(iso).slice(0, 10), time: null }; }
}
export function normDue(due) {
  if (!due) return null;
  let roh = String(due.date || '');
  if (!roh.includes('T') && due.datetime) roh = String(due.datetime);
  let date = roh.slice(0, 10), time = null;
  if (roh.includes('T')) {
    if (/Z$|[+-]\d\d:?\d\d$/.test(roh)) ({ date, time } = datumInZone(roh, due.timezone));
    else time = roh.slice(11, 16);
  }
  return { date, time, recurring: !!due.is_recurring, string: due.string || '' };
}
export function normTask(t) {
  const content = String(t.content || '');
  const unabhakbar = content.startsWith('* ');
  return {
    id: String(t.id), content: unabhakbar ? content.slice(2) : content, uncompletable: unabhakbar,
    description: String(t.description || ''), priority: Number(t.priority) || 1,
    parent_id: t.parent_id != null ? String(t.parent_id) : null, child_order: Number(t.child_order) || 0,
    due: normDue(t.due), url: `https://app.todoist.com/app/task/${encodeURIComponent(String(t.id))}`,
  };
}
export function projektBaum(liste) {
  const p = liste.filter(x => !x.is_archived && !x.is_deleted)
    .map(x => ({ id: String(x.id), name: String(x.name || ''), parent_id: x.parent_id != null ? String(x.parent_id) : null,
                 inbox: !!(x.inbox_project || x.is_inbox_project), shared: !!x.is_shared, order: Number(x.child_order) || 0 }));
  const ids = new Set(p.map(x => x.id));
  const kinder = new Map();
  p.forEach(x => { const k = x.parent_id && ids.has(x.parent_id) ? x.parent_id : ''; if (!kinder.has(k)) kinder.set(k, []); kinder.get(k).push(x); });
  const out = [];
  const lauf = (k, tiefe) => (kinder.get(k) || []).sort((a, b) => (b.inbox - a.inbox) || (a.order - b.order))
    .forEach(x => { if (tiefe > 8) return; out.push({ id: x.id, name: x.name, parent_id: x.parent_id, inbox: x.inbox, shared: x.shared, depth: tiefe }); lauf(x.id, tiefe + 1); });
  lauf('', 0);
  return out;
}

// Beim Konto-Loeschen: Todoist-Zugang widerrufen und Verbindung entfernen
export async function cleanupTodoistForUser(uid) {
  if (!konfiguriert() || !uidOk(uid)) return;
  const row = await zeile(uid);
  if (!row) return;
  try { if (row.access_token_enc) await widerrufe(open(row.access_token_enc, `${uid}|access`), 'access_token'); } catch (e) {}
  try { if (row.refresh_token_enc) await widerrufe(open(row.refresh_token_enc, `${uid}|refresh`), 'refresh_token'); } catch (e) {}
  await db('DELETE', `${TABELLE}?user_id=eq.${uid}`, { prefer: 'return=minimal' });
}

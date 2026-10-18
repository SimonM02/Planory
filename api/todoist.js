// Todoist-Anbindung (nur Web). Aufgaben aus EINEM Todoist-Projekt werden in Planory
// live angezeigt und bearbeitet – nichts wird in Planory gespeichert ausser der
// (verschluesselten) Verbindung. Ablauf der Anmeldung:
//   start (mit Planory-Login) -> Todoist-Zustimmung -> GET hierher (Callback, prueft und
//   verbraucht den Zufallswert, tauscht den Code, merkt Zugangsdaten verschluesselt vor)
//   -> planory.at/?todoist=finish&n=… -> finish (mit Planory-Login) uebernimmt NUR fuer
//   genau diesen Nutzer (verhindert, dass jemand ein fremdes Todoist an sein Konto haengt).
import {
  cfg, httpErr, konfiguriert, sha256, zufall, seal, open, verifyUser, db, zeile, TABELLE,
  tauscheCode, widerrufe, authorizeUrl, tokenFelder, tdFetch, alleSeiten, normTask, projektBaum,
} from './_todoist-lib.js';

const ERLAUBT = new Set(['https://planory.at', 'https://www.planory.at', 'https://bauplan-weld.vercel.app']);
const APP_URL = () => process.env.TODOIST_APP_URL || 'https://planory.at/';
const AKTIONEN = new Set(['start', 'finish', 'status', 'projects', 'tasks', 'add', 'update', 'close', 'reopen', 'delete', 'disconnect']);
const ID_OK = /^[A-Za-z0-9_-]{1,64}$/;
const UUID_OK = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const jetzt = () => new Date().toISOString();

function id(v) { const s = String(v == null ? '' : v); if (!ID_OK.test(s)) throw httpErr(400, 'bad_request'); return s; }
function datumOk(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T12:00:00Z')) && new Date(s + 'T12:00:00Z').toISOString().slice(0, 10) === s; }
// Nur erlaubte Felder weitergeben (Projekt, Labels, Zustaendige usw. bleiben unberuehrt)
function felder(b, neu) {
  const out = {};
  if (neu || 'content' in b) {
    const c = String(b.content == null ? '' : b.content).trim();
    if (!c || c.length > 500) throw httpErr(400, 'bad_request');
    out.content = c;
  }
  if ('description' in b) { const d = String(b.description == null ? '' : b.description); if (d.length > 16000) throw httpErr(400, 'bad_request'); out.description = d; }
  if ('priority' in b) { const p = Number(b.priority); if (!Number.isInteger(p) || p < 1 || p > 4) throw httpErr(400, 'bad_request'); out.priority = p; }
  if ('due_date' in b) {
    if (b.due_date === null || b.due_date === '') { if (!neu) out.due_string = 'no date'; }
    else if (datumOk(String(b.due_date))) out.due_date = String(b.due_date);
    else throw httpErr(400, 'bad_request');
  }
  return out;
}
const weiter = (res, url) => { res.setHeader('Location', url); res.setHeader('Referrer-Policy', 'no-referrer'); return res.status(302).end(); };

// ── Callback von Todoist (GET) ──
async function callback(req, res) {
  const q = req.query || {};
  const fehler = grund => weiter(res, `${APP_URL()}?todoist=error&grund=${grund}`);
  if (!konfiguriert()) return fehler('config');
  if (q.error) return fehler('denied');
  const state = String(q.state || ''), code = String(q.code || '');
  if (!state || !code || state.length > 200 || code.length > 500) return fehler('state');
  const h = sha256(state);
  const rows = await db('GET', `${TABELLE}?oauth_state_hash=eq.${h}&select=user_id,oauth_state_at`);
  const row = rows && rows[0];
  if (!row || !row.oauth_state_at || Date.now() - Date.parse(row.oauth_state_at) > cfg.stateTtlMs) return fehler('state');
  // Zufallswert verbrauchen (zweimal benutzen geht nicht)
  const verbraucht = await db('PATCH', `${TABELLE}?user_id=eq.${row.user_id}&oauth_state_hash=eq.${h}`, {
    body: { oauth_state_hash: null, oauth_state_at: null, updated_at: jetzt() }, prefer: 'return=representation' });
  if (!verbraucht || !verbraucht.length) return fehler('state');
  let t;
  try { t = await tauscheCode(code); } catch (e) { return fehler('exchange'); }
  const n = zufall();
  await db('PATCH', `${TABELLE}?user_id=eq.${row.user_id}`, {
    body: { pending_enc: seal(JSON.stringify(t), `${row.user_id}|pending`), pending_hash: sha256(n), pending_at: jetzt(), updated_at: jetzt() },
    prefer: 'return=minimal' });
  return weiter(res, `${APP_URL()}?todoist=finish&n=${encodeURIComponent(n)}`);
}

// ── Aktionen (POST, mit Planory-Anmeldung) ──
async function aktion(uid, a, b) {
  switch (a) {
    case 'status': {
      const row = await zeile(uid);
      return { configured: true, connected: !!(row && row.access_token_enc), reason: (row && !row.access_token_enc && row.disconnected_reason) || null };
    }
    case 'start': {
      const state = zufall();
      await db('POST', `${TABELLE}?on_conflict=user_id`, {
        body: { user_id: uid, oauth_state_hash: sha256(state), oauth_state_at: jetzt(), updated_at: jetzt() },
        prefer: 'resolution=merge-duplicates,return=minimal' });
      return { url: authorizeUrl(state) };
    }
    case 'finish': {
      const n = String(b.n || '');
      if (!n || n.length > 200) throw httpErr(400, 'bad_request');
      const h = sha256(n);
      const rows = await db('GET', `${TABELLE}?pending_hash=eq.${h}&select=*`);
      const row = rows && rows[0];
      if (!row) {
        const eigene = await zeile(uid);
        if (eigene && eigene.access_token_enc && !eigene.pending_hash) return { connected: true };   // schon uebernommen
        throw httpErr(400, 'finish_invalid');
      }
      const verwerfen = async () => {
        try { const t = JSON.parse(open(row.pending_enc, `${row.user_id}|pending`)); await widerrufe(t.access_token); } catch (e) {}
        await db('PATCH', `${TABELLE}?user_id=eq.${row.user_id}&pending_hash=eq.${h}`, { body: { pending_enc: null, pending_hash: null, pending_at: null }, prefer: 'return=minimal' });
      };
      if (row.user_id !== uid) { await verwerfen(); throw httpErr(409, 'finish_invalid'); }
      if (!row.pending_at || Date.now() - Date.parse(row.pending_at) > cfg.stateTtlMs) { await verwerfen(); throw httpErr(400, 'finish_invalid'); }
      const t = JSON.parse(open(row.pending_enc, `${uid}|pending`));
      const gen = Number(row.token_gen) || 0;
      const alt = row.access_token_enc;
      const ok = await db('PATCH', `${TABELLE}?user_id=eq.${uid}&pending_hash=eq.${h}`, {
        body: { ...tokenFelder(uid, t), token_gen: gen + 1, refresh_lock_until: null, pending_enc: null, pending_hash: null, pending_at: null,
                disconnected_reason: null, connected_at: jetzt(), updated_at: jetzt() },
        prefer: 'return=representation' });
      if (!ok || !ok.length) return { connected: true };   // parallel schon uebernommen
      if (alt) { try { const altToken = open(alt, `${uid}|access`); if (altToken !== t.access_token) await widerrufe(altToken); } catch (e) {} }
      return { connected: true };
    }
    case 'projects': {
      const { liste } = await alleSeiten(uid, '/projects', {});
      return { projects: projektBaum(liste) };
    }
    case 'tasks': {
      const { liste, abgeschnitten } = await alleSeiten(uid, '/tasks', { project_id: id(b.project_id) });
      return { tasks: liste.map(normTask), truncated: abgeschnitten };
    }
    case 'add': {
      const body = { ...felder(b, true), project_id: id(b.project_id) };
      const rid = b.request_id && UUID_OK.test(String(b.request_id)) ? String(b.request_id) : undefined;
      const t = await tdFetch(uid, 'POST', '/tasks', { body, requestId: rid });
      return { task: normTask(t || {}) };
    }
    case 'update': {
      const tid = id(b.id);
      const body = felder(b, false);
      if ('due_date' in body || 'due_string' in body) {
        // Datum von wiederkehrenden Aufgaben / Aufgaben mit Uhrzeit nie ueberschreiben (Wiederholung ginge verloren)
        const akt = normTask((await tdFetch(uid, 'GET', `/tasks/${encodeURIComponent(tid)}`)) || {});
        if (akt.due && (akt.due.recurring || akt.due.time)) throw httpErr(409, 'date_locked', { reason: akt.due.recurring ? 'recurring' : 'timed' });
      }
      if (!Object.keys(body).length) throw httpErr(400, 'bad_request');
      const t = await tdFetch(uid, 'POST', `/tasks/${encodeURIComponent(tid)}`, { body });
      return { task: normTask(t || { id: tid }) };
    }
    case 'close':
    case 'reopen':
      await tdFetch(uid, 'POST', `/tasks/${encodeURIComponent(id(b.id))}/${a}`);
      return { ok: true };
    case 'delete':
      await tdFetch(uid, 'DELETE', `/tasks/${encodeURIComponent(id(b.id))}`);
      return { ok: true };
    case 'disconnect': {
      const row = await zeile(uid);
      let revoked = false;
      if (row) {
        try { if (row.access_token_enc) revoked = await widerrufe(open(row.access_token_enc, `${uid}|access`), 'access_token'); } catch (e) {}
        try { if (row.refresh_token_enc) await widerrufe(open(row.refresh_token_enc, `${uid}|refresh`), 'refresh_token'); } catch (e) {}
        await db('DELETE', `${TABELLE}?user_id=eq.${uid}`, { prefer: 'return=minimal' });
      }
      return { ok: true, revoked };
    }
  }
  throw httpErr(400, 'bad_request');
}

export default async function handler(req, res) {
  const origin = req.headers && req.headers.origin;
  if (origin && ERLAUBT.has(origin)) { res.setHeader('Access-Control-Allow-Origin', origin); }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') return await callback(req, res);
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    const b = (typeof req.body === 'string') ? JSON.parse(req.body || '{}') : (req.body || {});
    const a = String(b.action || '');
    if (!AKTIONEN.has(a)) return res.status(400).json({ error: 'bad_request' });
    if (!konfiguriert()) return a === 'status' ? res.status(200).json({ configured: false, connected: false, reason: null }) : res.status(501).json({ error: 'not_configured' });
    const token = String((req.headers && req.headers.authorization) || '').replace(/^Bearer\s+/i, '').trim();
    const user = await verifyUser(token);
    if (!user) return res.status(401).json({ error: 'planory_auth' });
    return res.status(200).json(await aktion(user.id, a, b));
  } catch (e) {
    const status = e && e.status ? e.status : 500;
    if (status >= 500) console.warn('[todoist]', status, e && e.code);   // nie Tokens/Inhalte loggen
    if (req.method === 'GET') return weiter(res, `${APP_URL()}?todoist=error&grund=server`);
    return res.status(status).json({ error: (e && e.code) || 'server_error', ...((e && e.extra) || {}) });
  }
}

// APNs-Helfer (Apple Push Notification service).
// Dateiname mit "_" -> Vercel legt dafuer KEINEN eigenen Endpunkt an, die
// Datei wird nur von anderen Funktionen (push-cron, push-test) importiert.
//
// Sendet Push an die native App-Store-App ueber Apples HTTP/2-API, signiert
// mit einem .p8-Auth-Key (ES256-JWT). Benoetigte Vercel-Env-Variablen:
//   APNS_KEY        – Inhalt der .p8-Datei (mehrzeilig, inkl. BEGIN/END)
//   APNS_KEY_ID     – die 10-stellige Key-ID des .p8
//   APNS_TEAM_ID    – die 10-stellige Apple-Team-ID
//   APNS_BUNDLE_ID  – optional, Standard: com.planory.bau
//   APNS_PRODUCTION – "false" = Sandbox (Xcode-Debug), sonst Produktion (App Store/TestFlight)

import http2 from 'http2';
import crypto from 'crypto';

function b64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// Erzeugt ein APNs-Provider-Token (JWT, ES256). Gibt null zurueck, wenn die
// Schluessel-Variablen fehlen -> Aufrufer ueberspringt Native-Push dann.
export function makeApnsJwt() {
  const keyId  = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  let key      = process.env.APNS_KEY;
  if (!keyId || !teamId || !key) return null;
  // In Env-Variablen landen Zeilenumbrueche oft als "\n" – zurueckwandeln.
  key = key.replace(/\\n/g, '\n');
  try {
    const header  = b64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
    const payload = b64url(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) }));
    const signingInput = `${header}.${payload}`;
    const privateKey = crypto.createPrivateKey(key);
    // ieee-p1363 -> rohe R||S-Signatur (JWT/JOSE-Format), nicht DER.
    const sig = crypto.sign('sha256', Buffer.from(signingInput), { key: privateKey, dsaEncoding: 'ieee-p1363' });
    return `${signingInput}.${sig.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`;
  } catch (e) {
    console.error('makeApnsJwt failed:', e.message);
    return null;
  }
}

// Oeffnet eine HTTP/2-Verbindung zu Apple. Sandbox oder Produktion je nach Env.
export function openApnsClient() {
  const host = process.env.APNS_PRODUCTION === 'false'
    ? 'https://api.sandbox.push.apple.com'
    : 'https://api.push.apple.com';
  return http2.connect(host);
}

// Sendet EINE Benachrichtigung an EIN Geraet ueber eine offene Verbindung.
// Liefert { ok, status, reason } – nie ein Reject (Fehler werden gefangen).
export function sendApns(client, jwt, deviceToken, { title, body }) {
  return new Promise((resolve) => {
    const bundleId = process.env.APNS_BUNDLE_ID || 'com.planory.bau';
    const payload = JSON.stringify({ aps: { alert: { title, body: body || '' }, sound: 'default' } });
    let req;
    try {
      req = client.request({
        ':method': 'POST',
        ':path': `/3/device/${deviceToken}`,
        'authorization': `bearer ${jwt}`,
        'apns-topic': bundleId,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json'
      });
    } catch (e) { return resolve({ ok: false, status: 0, reason: e.message }); }
    let status = 0, data = '';
    req.setEncoding('utf8');
    req.on('response', (h) => { status = h[':status']; });
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      let reason = '';
      if (status !== 200 && data) { try { reason = JSON.parse(data).reason || ''; } catch (_) {} }
      resolve({ ok: status === 200, status, reason });
    });
    req.on('error', (e) => resolve({ ok: false, status: 0, reason: e.message }));
    req.end(payload);
  });
}

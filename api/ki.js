// KI-Proxy zu Anthropic. Sicherheit:
//  - Modelle auf die tatsaechlich genutzten begrenzt (kein Anfragen teurer/
//    fremder Modelle ueber unseren Schluessel).
//  - max_tokens serverseitig gedeckelt (Kostenschutz gegen Missbrauch),
//    unabhaengig davon, was der Client schickt.
//  - Login-Pruefung ueber REQUIRE_AUTH: solange false, sind Aufrufe auch ohne
//    Token erlaubt (damit aeltere App-Versionen weiter funktionieren) – die
//    Modell-/Token-Deckel schuetzen trotzdem vor teurem Missbrauch. Sobald
//    v1.2 (schickt den Token) verbreitet ist: REQUIRE_AUTH = true -> harte
//    Login-Pflicht, der Proxy ist dann komplett dicht.
const ALLOWED_MODELS = new Set([
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
]);
const MAX_TOKENS_CAP = 4096;
const REQUIRE_AUTH = false; // -> true, sobald alle aktiven Clients den Token senden
const SUPA_URL = 'https://savrxykygruzyngttekl.supabase.co';
// apikey fuer die Token-Pruefung: Service-Role ist auf Vercel gesetzt (wie in
// delete-user/stripe). Nur serverseitig, nie im Client.
const SUPA_APIKEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

async function verifyToken(token) {
  if (!token) return null;
  try {
    const r = await fetch(`${SUPA_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPA_APIKEY },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u?.id ? u : null;
  } catch (e) { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Harte Login-Pflicht nur, wenn aktiviert (verhindert, dass alte App-Clients
  // ohne Token ausgesperrt werden, solange REQUIRE_AUTH = false).
  if (REQUIRE_AUTH) {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    const user = await verifyToken(token);
    if (!user) return res.status(401).json({ error: 'login required' });
  }

  try {
    const body = (typeof req.body === 'string') ? JSON.parse(req.body) : (req.body || {});
    if (!ALLOWED_MODELS.has(body.model)) {
      return res.status(400).json({ error: 'model not allowed' });
    }
    // max_tokens serverseitig deckeln (Kostenschutz), egal was der Client schickt.
    body.max_tokens = Math.min(Number(body.max_tokens) || 1024, MAX_TOKENS_CAP);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

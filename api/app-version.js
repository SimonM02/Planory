// Aktuelle App-Store-Version von Planory – fuer den Hinweis „Neue Version verfuegbar" in der
// iPhone-App. Fragt Apples oeffentliche Suche ab (erst Store AT, dann DE, dann ohne Land) und
// merkt sich das Ergebnis kurz. Keine Anmeldung noetig, liefert nur oeffentliche Daten.
const BUNDLE = () => process.env.APP_BUNDLE_ID || 'com.planory.bauassistent';
const VERSION_OK = /^\d{1,4}(\.\d{1,4}){0,3}$/;
let cache = null;   // { at, data }

export function _cacheLeeren() { cache = null; }   // nur fuer Tests

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  res.setHeader('Cache-Control', 'public, max-age=900, s-maxage=900');
  if (cache && Date.now() - cache.at < 15 * 60 * 1000) return res.status(200).json(cache.data);
  for (const land of ['at', 'de', '']) {
    try {
      const r = await fetch(`https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(BUNDLE())}${land ? '&country=' + land : ''}`);
      if (!r.ok) continue;
      const j = await r.json();
      const app = j && Array.isArray(j.results) ? j.results[0] : null;
      if (app && VERSION_OK.test(String(app.version || ''))) {
        const url = /^https:\/\/apps\.apple\.com\//.test(String(app.trackViewUrl || '')) ? app.trackViewUrl : null;
        const data = { version: String(app.version), url, id: Number(app.trackId) || null };
        cache = { at: Date.now(), data };
        return res.status(200).json(data);
      }
    } catch (e) { /* naechstes Land probieren */ }
  }
  return res.status(200).json({ version: null });
}

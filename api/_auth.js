// Planory-Anmeldung serverseitig PRUEFEN (nicht nur das Token auslesen!).
// Frueher wurde die Nutzer-ID einfach aus dem Token gelesen – ein selbst gebautes Token
// mit fremder ID wurde akzeptiert. Supabase bestaetigt das Token hier echt.
// (Dateien mit "_" werden von Vercel nicht als eigener Endpunkt ausgeliefert.)
const SUPA_URL = 'https://savrxykygruzyngttekl.supabase.co';

export async function nutzerAusToken(authHeader) {
  const token = String(authHeader || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  try {
    const r = await fetch(`${SUPA_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '' },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u : null;
  } catch (e) { return null; }
}

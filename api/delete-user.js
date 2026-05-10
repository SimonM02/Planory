export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return res.status(501).json({ error: 'Account deletion not configured on server.' });

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  // Verify the JWT belongs to the userId being deleted
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authorization token required' });

  const SUPA_URL = 'https://savrxykygruzyngttekl.supabase.co';

  // Verify token → user
  const verifyRes = await fetch(`${SUPA_URL}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': serviceRoleKey }
  });
  const verifyData = await verifyRes.json();
  if (!verifyRes.ok || verifyData.id !== userId) {
    return res.status(403).json({ error: 'Token does not match userId' });
  }

  // Delete auth user via admin API
  const deleteRes = await fetch(`${SUPA_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey }
  });

  if (!deleteRes.ok) {
    const err = await deleteRes.json().catch(() => ({}));
    return res.status(deleteRes.status).json({ error: err.message || 'Failed to delete user' });
  }

  return res.status(200).json({ success: true });
}

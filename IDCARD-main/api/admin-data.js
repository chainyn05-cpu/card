import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

function validToken(token, secret) {
  try {
    const [body, signature] = String(token || '').split('.')
    if (!body || !signature) return false
    const expected = crypto.createHmac('sha256', secret).update(body).digest()
    const actual = Buffer.from(signature, 'base64url')
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return false
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    return payload.role === 'admin' && Number(payload.exp) > Date.now()
  } catch { return false }
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const secret = process.env.ADMIN_TOKEN_SECRET
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!secret || !validToken(token, secret)) return res.status(401).json({ error: 'Admin session expired. Please unlock again.' })
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: 'Server-side Supabase environment variables are missing.' })
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await supabase.from('employees').select('*').order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: 'Unable to load employee records.' })
  const records = await Promise.all((data || []).map(async row => {
    let photo = ''
    if (row.photo_path) {
      const { data: signed, error: signError } = await supabase.storage.from('employee-photos').createSignedUrl(row.photo_path, 3600)
      if (!signError) photo = signed?.signedUrl || ''
    }
    return { ...row, photo }
  }))
  return res.status(200).json({ records })
}

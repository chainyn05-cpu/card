import crypto from 'node:crypto'

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''))
  const y = Buffer.from(String(b || ''))
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}
function sign(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { ADMIN_PASSWORD, ADMIN_TOKEN_SECRET } = process.env
  if (!ADMIN_PASSWORD || !ADMIN_TOKEN_SECRET || ADMIN_PASSWORD.length < 5 || ADMIN_TOKEN_SECRET.length < 32) {
    return res.status(500).json({ error: 'Admin security environment variables are not configured securely.' })
  }
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!safeEqual(password, ADMIN_PASSWORD)) return res.status(401).json({ error: 'លេខសម្ងាត់មិនត្រឹមត្រូវ។' })
  const token = sign({ role: 'admin', exp: Date.now() + 8 * 60 * 60 * 1000 }, ADMIN_TOKEN_SECRET)
  return res.status(200).json({ token, expiresIn: 28800 })
}

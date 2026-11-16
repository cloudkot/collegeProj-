import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { HTTPException } from 'hono/http-exception'
import { 
  findUserByLogin, 
  findUserById, 
  findUserByEmail,
  setResetToken, 
  findByResetToken, 
  updatePassword,
  logAction 
} from '../db.js'
import { authMiddleware, JWT_SECRET } from '../auth.js'
import { loginRateLimit } from '../middleware/rate-limit.js'
import { sendEmail } from '../files.js' // функцию добавь ниже

const auth = new Hono()

auth.post('/login', loginRateLimit, async (c) => {
  const { login, password } = await c.req.json()
  if (!login || !password) throw new HTTPException(400, { message: 'Login and password required' })

  const user = findUserByLogin(login)
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new HTTPException(401, { message: 'Invalid credentials' })
  }

  const now = Math.floor(Date.now() / 1000)
  const token = await sign(
    { sub: user.id, role: user.role, name: user.name, groupId: user.group_id, mustChange: user.must_change_password === 1, iat: now, exp: now + 604800 },
    JWT_SECRET
  )

  logAction(user.id, 'login', { ip: c.req.header('x-forwarded-for') || 'local' })
  return c.json({ token, user: { id: user.id, role: user.role, name: user.name, groupId: user.group_id, mustChangePassword: user.must_change_password === 1 } })
})

auth.post('/forgot-password', async (c) => {
  const { email } = await c.req.json()
  if (!email) throw new HTTPException(400, { message: 'Email required' })

  const user = findUserByEmail(email)
  if (user) {
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 1000 * 60 * 60).toISOString()
    setResetToken(user.id, token, expires)
    const resetLink = `http://localhost:4200/reset-password?token=${token}`
    await sendEmail(email, 'Восстановление пароля', `Перейдите по ссылке: ${resetLink}`)
  }
  return c.json({ ok: true })
})

auth.post('/reset-password', async (c) => {
  const { token, newPassword } = await c.req.json()
  if (!token || !newPassword) throw new HTTPException(400, { message: 'Token and password required' })
  if (newPassword.length < 8) throw new HTTPException(400, { message: 'Password too short' })

  const user = findByResetToken(token)
  if (!user) throw new HTTPException(400, { message: 'Invalid or expired token' })

  updatePassword(user.id, bcrypt.hashSync(newPassword, 10), true)
  return c.json({ ok: true })
})

auth.get('/me', authMiddleware, async (c) => {
  const payload = c.get('user')
  const user = findUserById(payload.sub)
  if (!user) throw new HTTPException(404, { message: 'User not found' })
  return c.json({ id: user.id, role: user.role, name: user.name, groupId: user.group_id, mustChangePassword: user.must_change_password === 1 })
})

export default auth
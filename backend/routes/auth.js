import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import bcrypt from 'bcryptjs'
import { HTTPException } from 'hono/http-exception'
import { findUserByEmail, findUserById } from '../db.js'
import { authMiddleware, JWT_SECRET } from '../auth.js'
import { loginRateLimit } from '../middleware/rate-limit.js'
import { findUserByEmail, findUserById, logAction } from '../db.js'

const auth = new Hono()

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7

auth.post('/login', loginRateLimit, async (c) => {
  const { email, password } = await c.req.json()

  if (!email || !password) {
    throw new HTTPException(400, { message: 'Email and password required' })
  }

  const user = findUserByEmail(email)
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new HTTPException(401, { message: 'Invalid credentials' })
  }

  const now = Math.floor(Date.now() / 1000)
  const token = await sign(
    {
      sub: user.id,
      role: user.role,
      name: user.name,
      groupId: user.group_id,
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
    },
    JWT_SECRET
  )

  logAction(user.id, 'login', { ip: c.req.header('x-forwarded-for') || 'local' })

  return c.json({
    token,
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      groupId: user.group_id,
    },
  })
})

auth.get('/me', authMiddleware, async (c) => {
  const payload = c.get('user')
  const user = findUserById(payload.sub)
  
  if (!user) {
    throw new HTTPException(404, { message: 'User not found' })
  }
  
  return c.json({
    id: user.id,
    role: user.role,
    name: user.name,
    groupId: user.group_id,
  })
})

export default auth
import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import bcrypt from 'bcryptjs'
import { HTTPException } from 'hono/http-exception'
import { findUserByEmail, findUserById } from '../db.js'
import { authMiddleware } from '../auth.js'

const auth = new Hono()

auth.post('/login', async (c) => {
  const { email, password } = await c.req.json()

  if (!email || !password) {
    throw new HTTPException(400, { message: 'Email and password required' })
  }

  const user = findUserByEmail(email)
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new HTTPException(401, { message: 'Invalid credentials' })
  }

  const token = await sign(
    { sub: user.id, role: user.role, name: user.name, groupId: user.group_id },
    process.env.JWT_SECRET || 'dev-secret'
  )

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
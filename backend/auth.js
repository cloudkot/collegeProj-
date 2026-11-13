import { verify } from 'hono/jwt'
import { HTTPException } from 'hono/http-exception'
import { touchUser } from './db.js'

export const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in .env')
}

export const authMiddleware = async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header || !header.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }

  const token = header.slice(7)
  try {
    const payload = await verify(token, JWT_SECRET)
    c.set('user', payload)
    touchUser(payload.sub)
  } catch {
    throw new HTTPException(401, { message: 'Invalid or expired token' })
  }

  await next()
}

export const requireRole = (...roles) => {
  return async (c, next) => {
    const user = c.get('user')
    if (!user || !roles.includes(user.role)) {
      throw new HTTPException(403, { message: 'Forbidden' })
    }
    await next()
  }
}
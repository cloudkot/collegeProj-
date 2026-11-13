import { verify } from 'hono/jwt'
import { HTTPException } from 'hono/http-exception'

export const authMiddleware = async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header || !header.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }

  const token = header.slice(7)
  try {
    const payload = await verify(token, process.env.JWT_SECRET || 'dev-secret')
    c.set('user', payload)
    await next()
  } catch {
    throw new HTTPException(401, { message: 'Invalid token' })
  }
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
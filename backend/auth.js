import { verify } from 'hono/jwt'
import { HTTPException } from 'hono/http-exception'

export const authMiddleware = async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header || !header.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Требуется авторизация' })
  }

  const token = header.slice(7)
  try {
    const payload = await verify(token, process.env.JWT_SECRET || 'dev-secret')
    c.set('user', payload)
    await next()
  } catch {
    throw new HTTPException(401, { message: 'Неверный токен' })
  }
}

export const requireRole = (role) => {
  return async (c, next) => {
    const user = c.get('user')
    if (!user || user.role !== role) {
      throw new HTTPException(403, { message: 'Доступ запрещён' })
    }
    await next()
  }
}
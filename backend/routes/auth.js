import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { HTTPException } from 'hono/http-exception'
// import { db } from '../db.js' // позже

const auth = new Hono()

auth.post('/login', async (c) => {
  const body = await c.req.json()
  const { email, password } = body

  // TODO: проверка в БД
  if (email !== 'test@test.com' || password !== '123') {
    throw new HTTPException(401, { message: 'Неверный email или пароль' })
  }

  const token = await sign(
    { sub: 1, role: 'teacher', name: 'Тестовый Преподаватель' },
    process.env.JWT_SECRET || 'dev-secret'
  )

  return c.json({
    token,
    user: { id: 1, role: 'teacher', name: 'Тестовый Преподаватель' }
  })
})

auth.get('/me', async (c) => {
  // TODO: middleware для проверки токена
  return c.json({ id: 1, role: 'teacher', name: 'Тестовый Преподаватель' })
})

export default auth
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'
import materialRoutes from './routes/materials.js'
import reactionRoutes from './routes/reactions.js'

// Импорт роутов (пока заглушки, будем наполнять)
import authRoutes from './routes/auth.js'
import chatRoutes from './routes/chats.js'
import materialRoutes from './routes/materials.js'
import reactionRoutes from './routes/reactions.js'
import adminRoutes from './routes/admin.js'

const app = new Hono()

// Глобальные middleware
app.use('*', logger())
app.use('*', cors({
  origin: 'http://localhost:4200', // Angular dev-сервер
  credentials: true,
}))

// Health check
app.get('/api/health', (c) => c.json({ ok: true }))

// Монтируем роуты
app.route('/api/materials', materialRoutes)
app.route('/api/reactions', reactionRoutes)
app.route('/api/auth', authRoutes)
app.route('/api/chats', chatRoutes)
app.route('/api/materials', materialRoutes)
app.route('/api/reactions', reactionRoutes)
app.route('/api/admin', adminRoutes)

// Глобальный обработчик ошибок
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }
  console.error(err)
  return c.json({ error: 'Internal Server Error' }, 500)
})

// Запуск
const port = Number(process.env.PORT) || 3000
const server = serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`API on http://localhost:${info.port}`)
})

// Graceful shutdown
process.on('SIGINT', () => {
  server.close(() => process.exit(0))
})
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'

import authRoutes from './routes/auth.js'
import chatRoutes from './routes/chats.js'
import materialRoutes from './routes/materials.js'
import reactionRoutes from './routes/reactions.js'
import adminRoutes from './routes/admin.js'

const app = new Hono()

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  })
)

app.get('/api/health', (c) => c.json({ ok: true }))

app.route('/api/auth', authRoutes)
app.route('/api/chats', chatRoutes)
app.route('/api/materials', materialRoutes)
app.route('/api/reactions', reactionRoutes)
app.route('/api/admin', adminRoutes)

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }
  console.error(err)
  return c.json({ error: 'Internal Server Error' }, 500)
})

const port = Number(process.env.PORT) || 3000
const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log('\n=============================================')
  console.log('  College Materials Backend')
  console.log('=============================================')
  console.log(`  Server running at: http://localhost:${info.port}`)
  console.log(`  Health check:      http://localhost:${info.port}/api/health`)
  console.log(`  Frontend origin:   ${process.env.FRONTEND_URL || 'http://localhost:4200'}`)
  console.log('=============================================')
  console.log('  Available endpoints:')
  console.log('    POST   /api/auth/login')
  console.log('    GET    /api/auth/me')
  console.log('    GET    /api/chats')
  console.log('    GET    /api/chats/:id')
  console.log('    POST   /api/materials/chats/:chatId/materials')
  console.log('    GET    /api/materials/:id/file')
  console.log('    POST   /api/materials/:id/opened')
  console.log('    POST   /api/materials/:id/downloaded')
  console.log('    GET    /api/materials/:id/stats')
  console.log('    GET    /api/reactions/types')
  console.log('    POST   /api/reactions/materials/:id/reactions')
  console.log('    GET    /api/admin/groups')
  console.log('    POST   /api/admin/groups')
  console.log('    GET    /api/admin/teachers')
  console.log('    POST   /api/admin/teachers')
  console.log('    POST   /api/admin/groups/:id/teachers')
  console.log('    POST   /api/admin/students/import')
  console.log('=============================================\n')
})

process.on('SIGINT', () => {
  server.close(() => process.exit(0))
})
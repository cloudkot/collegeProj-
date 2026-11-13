import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { authMiddleware } from '../auth.js'
import {
  listChatsForStudent,
  listChatsForTeacher,
  getChat,
  listMaterials,
} from '../db.js'

const chats = new Hono()

chats.use('*', authMiddleware)

chats.get('/', async (c) => {
  const user = c.get('user')

  if (user.role === 'student') {
    if (!user.groupId) return c.json([])
    const rows = listChatsForStudent(user.groupId)
    return c.json(
      rows.map((r) => ({
        id: r.id,
        title: `Чат: ${r.teacher_name}`,
        createdAt: r.created_at,
      }))
    )
  }

  if (user.role === 'teacher') {
    const rows = listChatsForTeacher(user.sub)
    return c.json(
      rows.map((r) => ({
        id: r.id,
        title: `Чат: ${r.group_name}`,
        createdAt: r.created_at,
      }))
    )
  }

  throw new HTTPException(403, { message: 'Forbidden' })
})

chats.get('/:id', async (c) => {
  const user = c.get('user')
  const chatId = Number(c.req.param('id'))
  const chat = getChat(chatId)

  if (!chat) {
    throw new HTTPException(404, { message: 'Chat not found' })
  }

  if (user.role === 'student' && chat.group_id !== user.groupId) {
    throw new HTTPException(403, { message: 'Forbidden' })
  }
  if (user.role === 'teacher' && chat.teacher_id !== user.sub) {
    throw new HTTPException(403, { message: 'Forbidden' })
  }

  const title =
    user.role === 'student'
      ? `Чат: ${chat.teacher_name}`
      : `Чат: ${chat.group_name}`

  return c.json({
    id: chat.id,
    title,
    materials: listMaterials(chatId).map((m) => ({
      id: m.id,
      originalName: m.original_name,
      sizeBytes: m.size_bytes,
      createdAt: m.created_at,
      pdfUrl: `/api/materials/${m.id}/file`,
    })),
  })
})

export default chats
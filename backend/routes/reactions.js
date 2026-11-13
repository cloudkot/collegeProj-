import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { authMiddleware, requireRole } from '../auth.js'
import { getMaterial, getChat, setReaction } from '../db.js'

const reactions = new Hono()

reactions.use('*', authMiddleware)

const TYPES = [
  { type: 'understood', label: 'Понятно' },
  { type: 'not_understood', label: 'Не понял' },
  { type: 'thanks', label: 'Спасибо' },
  { type: 'sick', label: 'Болею, можно к следующей паре' },
]

reactions.get('/types', requireRole('student'), (c) => c.json(TYPES))

reactions.post(
  '/materials/:id/reactions',
  requireRole('student'),
  async (c) => {
    const user = c.get('user')
    const materialId = Number(c.req.param('id'))
    const { type } = await c.req.json()

    if (!TYPES.some((t) => t.type === type)) {
      throw new HTTPException(400, { message: 'Unknown reaction type' })
    }

    const material = getMaterial(materialId)
    if (!material) {
      throw new HTTPException(404, { message: 'Material not found' })
    }

    const chat = getChat(material.chat_id)
    if (!chat || chat.group_id !== user.groupId) {
      throw new HTTPException(403, { message: 'Forbidden' })
    }

    setReaction(materialId, user.sub, type)
    return c.json({ ok: true })
  }
)

export default reactions
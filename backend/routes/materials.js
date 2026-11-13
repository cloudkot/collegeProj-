import { Hono } from 'hono'
import { authMiddleware, requireRole } from '../auth.js'

const materials = new Hono()

materials.post('/', authMiddleware, requireRole('teacher'), async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']

  if (!(file instanceof File)) {
    return c.json({ error: 'Файл не передан' }, 400)
  }

  // Проверка размера (25 MB)
  if (file.size > 25 * 1024 * 1024) {
    return c.json({ error: 'Файл больше 25 МБ' }, 400)
  }

  // Дальше — твоя логика: антивирус, конвертация в PDF, сохранение
  // file.name, file.arrayBuffer() для чтения содержимого

  return c.json({ ok: true, name: file.name, size: file.size })
})

export default materials
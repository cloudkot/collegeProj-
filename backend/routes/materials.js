import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import fs from 'node:fs'
import {
  authMiddleware,
  requireRole,
} from '../auth.js'
import {
  getChat,
  createMaterial,
  listMaterials,
  getMaterial,
  markViewed,
  markDownloaded,
  getMaterialStats,
} from '../db.js'
import {
  validateFile,
  saveTemp,
  antivirusScan,
  convertToPdf,
  removeTemp,
  pdfPath,
} from '../files.js'

const materials = new Hono()

materials.use('*', authMiddleware)

const assertMaterialAccess = (user, materialId) => {
  const material = getMaterial(materialId)
  if (!material) throw new HTTPException(404, { message: 'Material not found' })
  const chat = getChat(material.chat_id)
  if (!chat) throw new HTTPException(404, { message: 'Chat not found' })

  if (user.role === 'student') {
    if (chat.group_id !== user.groupId) {
      throw new HTTPException(403, { message: 'Forbidden' })
    }
  } else if (user.role === 'teacher') {
    if (chat.teacher_id !== user.sub) {
      throw new HTTPException(403, { message: 'Forbidden' })
    }
  } else if (user.role !== 'admin') {
    throw new HTTPException(403, { message: 'Forbidden' })
  }

  return { material, chat }
}

materials.post(
  '/chats/:chatId/materials',
  requireRole('teacher', 'admin'),
  async (c) => {
    const user = c.get('user')
    const chatId = Number(c.req.param('chatId'))
    const chat = getChat(chatId)
    if (!chat) throw new HTTPException(404, { message: 'Chat not found' })
    if (user.role === 'teacher' && chat.teacher_id !== user.sub) {
      throw new HTTPException(403, { message: 'Forbidden' })
    }

    const body = await c.req.parseBody()
    const file = body['file']
    if (!(file instanceof File)) {
      throw new HTTPException(400, { message: 'File not provided' })
    }

    const check = validateFile(file.name, file.size)
    if (!check.ok) {
      throw new HTTPException(400, { message: check.error })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const tmpPath = await saveTemp(buffer, check.ext)

    try {
      const scan = await antivirusScan(tmpPath)
      if (!scan.ok) {
        throw new HTTPException(400, { message: scan.error })
      }

      const storedPdf = await convertToPdf(tmpPath, check.ext)
      if (!storedPdf) {
        throw new HTTPException(400, {
          message: 'Unsupported format for PDF conversion',
        })
      }

      const materialId = createMaterial({
        chatId,
        originalName: file.name,
        storedPdf,
        sizeBytes: file.size,
      })

      return c.json({ id: materialId }, 201)
    } finally {
      await removeTemp(tmpPath)
    }
  }
)

materials.get('/:id/file', async (c) => {
  const user = c.get('user')
  const materialId = Number(c.req.param('id'))
  const { material } = assertMaterialAccess(user, materialId)

  const filePath = pdfPath(material.stored_pdf)
  if (!fs.existsSync(filePath)) {
    throw new HTTPException(404, { message: 'File not found on disk' })
  }

  const data = fs.readFileSync(filePath)
  return c.body(data, 200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${material.original_name}.pdf"`,
  })
})

materials.post('/:id/opened', async (c) => {
  const user = c.get('user')
  const materialId = Number(c.req.param('id'))
  assertMaterialAccess(user, materialId)
  markViewed(materialId, user.sub)
  return c.json({ ok: true })
})

materials.post('/:id/downloaded', async (c) => {
  const user = c.get('user')
  const materialId = Number(c.req.param('id'))
  assertMaterialAccess(user, materialId)
  markDownloaded(materialId, user.sub)
  return c.json({ ok: true })
})

materials.get(
  '/:id/stats',
  requireRole('teacher', 'admin'),
  async (c) => {
    const user = c.get('user')
    const materialId = Number(c.req.param('id'))
    assertMaterialAccess(user, materialId)
    return c.json(getMaterialStats(materialId))
  }
)

export default materials
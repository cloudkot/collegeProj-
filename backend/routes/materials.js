import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import fs from 'node:fs'
import path from 'node:path'
import { authMiddleware, requireRole } from '../auth.js'
import {
  getChat,
  createMaterial,
  getMaterial,
  markViewed,
  markDownloaded,
  getMaterialStatsAggregated,
} from '../db.js'
import {
  validateFile,
  saveTemp,
  antivirusScan,
  convertToPdf,
  moveToStorage,
  removeTemp,
  pdfPath,
  UPLOAD_DIR,
} from '../files.js'

const materials = new Hono()

materials.use('*', authMiddleware)

const assertMaterialAccess = (user, materialId) => {
  const material = getMaterial(materialId)
  if (!material) throw new HTTPException(404, { message: 'Material not found' })

  const chat = getChat(material.chat_id)
  if (!chat) throw new HTTPException(404, { message: 'Chat not found' })

  if (user.role === 'student' && chat.group_id !== user.groupId) {
    throw new HTTPException(403, { message: 'Forbidden' })
  }
  if (user.role === 'teacher' && chat.teacher_id !== user.sub) {
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

    let storedSource = null
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

      if (check.ext !== '.pdf') {
        storedSource = await moveToStorage(tmpPath, check.ext)
      } else {
        await removeTemp(tmpPath)
      }

      const materialId = createMaterial({
        chatId,
        originalName: file.name,
        storedPdf,
        storedSource,
        sizeBytes: file.size,
      })

      return c.json({ id: materialId }, 201)
    } catch (err) {
      await removeTemp(tmpPath)
      throw err
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
  const safeName = encodeURIComponent(`${material.original_name}.pdf`)

  return c.body(data, 200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${safeName}"; filename*=UTF-8''${safeName}`,
  })
})

materials.get('/:id/source', requireRole('teacher', 'admin'), async (c) => {
  const user = c.get('user')
  const materialId = Number(c.req.param('id'))
  const { material } = assertMaterialAccess(user, materialId)

  if (!material.stored_source) {
    throw new HTTPException(404, { message: 'Source file not found' })
  }

  const filePath = path.join(UPLOAD_DIR, material.stored_source)
  if (!fs.existsSync(filePath)) {
    throw new HTTPException(404, { message: 'File not found on disk' })
  }

  const data = fs.readFileSync(filePath)
  const safeName = encodeURIComponent(material.original_name)

  return c.body(data, 200, {
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename*=UTF-8''${safeName}`,
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

materials.get('/:id/stats', requireRole('teacher', 'admin'), async (c) => {
  const user = c.get('user')
  const materialId = Number(c.req.param('id'))
  assertMaterialAccess(user, materialId)
  return c.json(getMaterialStatsAggregated(materialId))
})

export default materials
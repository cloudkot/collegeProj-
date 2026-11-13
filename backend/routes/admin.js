import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import bcrypt from 'bcryptjs'
import { parse } from 'csv-parse/sync'
import { authMiddleware, requireRole } from '../auth.js'
import {
  listGroups,
  createGroup,
  findUserByEmail,
  createUser,
  ensureChat,
  db,
} from '../db.js'

const admin = new Hono()

admin.use('*', authMiddleware, requireRole('admin'))

admin.get('/groups', (c) => c.json(listGroups()))

admin.post('/groups', async (c) => {
  const { name } = await c.req.json()
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new HTTPException(400, { message: 'Name required' })
  }
  if (name.length > 100) {
    throw new HTTPException(400, { message: 'Name too long' })
  }
  try {
    const id = createGroup(name.trim())
    return c.json({ id }, 201)
  } catch {
    throw new HTTPException(409, { message: 'Group already exists' })
  }
})

admin.get('/teachers', (c) => {
  const rows = db
    .prepare("SELECT id, email, name FROM users WHERE role = 'teacher' ORDER BY name")
    .all()
  return c.json(rows)
})

admin.post('/teachers', async (c) => {
  const { email, password, name } = await c.req.json()
  
  if (!email || !password || !name) {
    throw new HTTPException(400, { message: 'email, password, name required' })
  }
  if (password.length < 6) {
    throw new HTTPException(400, { message: 'Password must be at least 6 chars' })
  }
  if (findUserByEmail(email)) {
    throw new HTTPException(409, { message: 'Email already exists' })
  }

  const id = createUser({
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    role: 'teacher',
    name,
  })
  return c.json({ id }, 201)
})

admin.post('/groups/:id/teachers', async (c) => {
  const groupId = Number(c.req.param('id'))
  const { teacherId } = await c.req.json()
  if (!teacherId) throw new HTTPException(400, { message: 'teacherId required' })

  const group = db.prepare('SELECT id FROM groups WHERE id = ?').get(groupId)
  if (!group) throw new HTTPException(404, { message: 'Group not found' })

  const teacher = db
    .prepare("SELECT id FROM users WHERE id = ? AND role = 'teacher'")
    .get(teacherId)
  if (!teacher) throw new HTTPException(404, { message: 'Teacher not found' })

  db.prepare(
    'INSERT OR IGNORE INTO group_teachers (group_id, teacher_id) VALUES (?, ?)'
  ).run(groupId, teacherId)

  ensureChat(groupId, teacherId)

  return c.json({ ok: true })
})

admin.post('/students/import', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']
  if (!(file instanceof File)) {
    throw new HTTPException(400, { message: 'CSV file required' })
  }

  const groupName = String(body['groupName'] || '').trim()
  if (groupName.length > 100) {
    throw new HTTPException(400, { message: 'Group name too long' })
  }

  let defaultGroupId = null
  if (groupName) {
    const existing = db
      .prepare('SELECT id FROM groups WHERE name = ?')
      .get(groupName)
    defaultGroupId = existing ? existing.id : createGroup(groupName)
  }

  const text = await file.text()
  let rows
  try {
    rows = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })
  } catch {
    throw new HTTPException(400, { message: 'Invalid CSV format' })
  }

  const result = { created: 0, skipped: 0, errors: [] }
  const defaultPassword = process.env.DEFAULT_STUDENT_PASSWORD

  if (!defaultPassword) {
    throw new HTTPException(500, { message: 'DEFAULT_STUDENT_PASSWORD is not set' })
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const line = i + 2
    const email = row.email?.trim()
    const name = row.name?.trim()
    const rowGroup = row.group?.trim() || groupName

    if (!email || !name) {
      result.errors.push({ row: line, reason: 'email and name required' })
      continue
    }
    
    if (findUserByEmail(email)) {
      result.skipped++
      continue
    }

    if (email.length > 254 || name.length > 100) {
      result.errors.push({ row: line, reason: 'field too long' })
      continue
    }

    let targetGroupId = defaultGroupId
    if (rowGroup) {
      const g = db.prepare('SELECT id FROM groups WHERE name = ?').get(rowGroup)
      targetGroupId = g ? g.id : createGroup(rowGroup)
    }

    try {
      createUser({
        email,
        passwordHash: bcrypt.hashSync(defaultPassword, 10),
        role: 'student',
        name,
        groupId: targetGroupId,
      })
      result.created++
    } catch (err) {
      result.errors.push({ row: line, reason: err.message })
    }
  }

  return c.json(result)
})

export default admin
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { parse } from 'csv-parse/sync'
import { authMiddleware, requireRole } from '../auth.js'
import {
  listGroups,
  createGroup,
  findUserByEmail,
  findUserByLogin,
  createUser,
  ensureChat,
  listOnlineUsers,
  listAuditLog,
  db,
} from '../db.js'

const admin = new Hono()

admin.use('*', authMiddleware, requireRole('admin'))

const randomPassword = (length = 12) => {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let pass = ''
  const bytes = crypto.randomBytes(length)
  for (let i = 0; i < length; i++) pass += chars[bytes[i] % chars.length]
  return pass
}

const generateLogin = (name) => {
  const map = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y',
    'к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f',
    'х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
  }
  const translit = name.split('').map((ch) => map[ch] || ch).join('')
  const base = translit.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'user'
  
  let login = base
  let suffix = 1
  while (findUserByLogin(login)) {
    login = `${base}${suffix++}`
  }
  return login
}

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
    .prepare("SELECT id, login, email, name FROM users WHERE role = 'teacher' ORDER BY name")
    .all()
  return c.json(rows)
})

admin.post('/teachers', async (c) => {
  const { email, name } = await c.req.json()
  
  if (!email || !name) {
    throw new HTTPException(400, { message: 'email and name required' })
  }
  if (findUserByEmail(email)) {
    throw new HTTPException(409, { message: 'Email already exists' })
  }

  const login = generateLogin(name)
  const password = randomPassword()

  const id = createUser({
    login,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    role: 'teacher',
    name,
  })

  return c.json({ id, login, password, email }, 201)
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

  const result = { created: 0, skipped: 0, errors: [], createdUsers: [] }

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
      const login = generateLogin(name)
      const password = randomPassword()

      createUser({
        login,
        email,
        passwordHash: bcrypt.hashSync(password, 10),
        role: 'student',
        name,
        groupId: targetGroupId,
      })
      
      result.created++
      result.createdUsers.push({ login, password, name, email })
    } catch (err) {
      result.errors.push({ row: line, reason: err.message })
    }
  }

  return c.json(result)
})

admin.get('/online', (c) => c.json(listOnlineUsers()))

admin.get('/audit', (c) => c.json(listAuditLog()))

export default admin
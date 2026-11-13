import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, 'college.db')

export const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS groups (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('student','teacher','admin')),
  name          TEXT NOT NULL,
  group_id      INTEGER REFERENCES groups(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_group ON users(group_id);

CREATE TABLE IF NOT EXISTS group_teachers (
  group_id   INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  teacher_id INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  PRIMARY KEY (group_id, teacher_id)
);

CREATE TABLE IF NOT EXISTS chats (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id   INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  teacher_id INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (group_id, teacher_id)
);

CREATE TABLE IF NOT EXISTS materials (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id       INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  stored_pdf    TEXT NOT NULL,          -- имя файла в storage/pdf
  size_bytes    INTEGER NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_materials_chat ON materials(chat_id);

CREATE TABLE IF NOT EXISTS material_views (
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  viewed_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (material_id, user_id)
);

CREATE TABLE IF NOT EXISTS material_downloads (
  material_id   INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  downloaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (material_id, user_id)
);

CREATE TABLE IF NOT EXISTS reactions (
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  type        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (material_id, user_id)
);
`)

export const findUserByEmail = (email) =>
  db.prepare('SELECT * FROM users WHERE email = ?').get(email)

export const findUserById = (id) =>
  db.prepare('SELECT id, email, role, name, group_id FROM users WHERE id = ?').get(id)

export const createUser = ({ email, passwordHash, role, name, groupId = null }) =>
  db.prepare(
    'INSERT INTO users (email, password_hash, role, name, group_id) VALUES (?, ?, ?, ?, ?)'
  ).run(email, passwordHash, role, name, groupId).lastInsertRowid

export const listGroups = () => db.prepare('SELECT * FROM groups ORDER BY name').all()

export const createGroup = (name) =>
  db.prepare('INSERT INTO groups (name) VALUES (?)').run(name).lastInsertRowid

export const ensureChat = (groupId, teacherId) => {
  const existing = db.prepare(
    'SELECT id FROM chats WHERE group_id = ? AND teacher_id = ?'
  ).get(groupId, teacherId)
  if (existing) return existing.id
  return db.prepare(
    'INSERT INTO chats (group_id, teacher_id) VALUES (?, ?)'
  ).run(groupId, teacherId).lastInsertRowid
}

export const listChatsForStudent = (groupId) =>
  db.prepare(`
    SELECT c.id, u.name AS teacher_name, c.created_at
    FROM chats c
    JOIN users u ON u.id = c.teacher_id
    WHERE c.group_id = ?
    ORDER BY c.created_at DESC
  `).all(groupId)

export const listChatsForTeacher = (teacherId) =>
  db.prepare(`
    SELECT c.id, g.name AS group_name, c.created_at
    FROM chats c
    JOIN groups g ON g.id = c.group_id
    WHERE c.teacher_id = ?
    ORDER BY c.created_at DESC
  `).all(teacherId)

export const getChat = (chatId) =>
  db.prepare(`
    SELECT c.*, g.name AS group_name, u.name AS teacher_name
    FROM chats c
    JOIN groups g ON g.id = c.group_id
    JOIN users u  ON u.id = c.teacher_id
    WHERE c.id = ?
  `).get(chatId)

export const listMaterials = (chatId) =>
  db.prepare(
    'SELECT * FROM materials WHERE chat_id = ? ORDER BY created_at DESC'
  ).all(chatId)

export const createMaterial = ({ chatId, originalName, storedPdf, sizeBytes }) =>
  db.prepare(`
    INSERT INTO materials (chat_id, original_name, stored_pdf, size_bytes)
    VALUES (?, ?, ?, ?)
  `).run(chatId, originalName, storedPdf, sizeBytes).lastInsertRowid

export const getMaterial = (materialId) =>
  db.prepare('SELECT * FROM materials WHERE id = ?').get(materialId)

export const markViewed = (materialId, userId) =>
  db.prepare(
    'INSERT OR IGNORE INTO material_views (material_id, user_id) VALUES (?, ?)'
  ).run(materialId, userId)

export const markDownloaded = (materialId, userId) =>
  db.prepare(
    'INSERT OR IGNORE INTO material_downloads (material_id, user_id) VALUES (?, ?)'
  ).run(materialId, userId)

export const setReaction = (materialId, userId, type) =>
  db.prepare(`
    INSERT INTO reactions (material_id, user_id, type) VALUES (?, ?, ?)
    ON CONFLICT(material_id, user_id) DO UPDATE SET type = excluded.type
  `).run(materialId, userId, type)

export const getMaterialStats = (materialId) => {
  const opened = db.prepare(`
    SELECT u.id, u.name FROM material_views v
    JOIN users u ON u.id = v.user_id
    WHERE v.material_id = ?
  `).all(materialId)
  const downloaded = db.prepare(`
    SELECT u.id, u.name FROM material_downloads d
    JOIN users u ON u.id = d.user_id
    WHERE d.material_id = ?
  `).all(materialId)
  const reactions = db.prepare(`
    SELECT u.id, u.name, r.type FROM reactions r
    JOIN users u ON u.id = r.user_id
    WHERE r.material_id = ?
  `).all(materialId)
  return { opened, downloaded, reactions }
}
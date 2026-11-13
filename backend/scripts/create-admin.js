import bcrypt from 'bcryptjs'
import { createUser, findUserByEmail, createGroup } from '../db.js'

const email = 'admin@college.local'
const password = 'admin123'

if (findUserByEmail(email)) {
  console.log('User already exists')
  process.exit(0)
}

const groupId = createGroup('ИС-21')
createUser({
  email,
  passwordHash: bcrypt.hashSync(password, 10),
  role: 'admin',
  name: 'Администратор',
})

createUser({
  email: 'teacher@college.local',
  passwordHash: bcrypt.hashSync('teacher123', 10),
  role: 'teacher',
  name: 'Иванов Иван Иванович',
})

createUser({
  email: 'student@college.local',
  passwordHash: bcrypt.hashSync('student123', 10),
  role: 'student',
  name: 'Петров Пётр',
  groupId,
})

console.log('Created: admin/teacher/student')
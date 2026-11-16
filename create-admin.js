import bcrypt from 'bcryptjs'
import { createUser, findUserByLogin } from '../backend/db.js'

const login = 'admin'
const password = crypto.randomBytes(12).toString('base64').slice(0, 16)
const email = 'admin@college.local'

if (findUserByLogin(login)) {
  console.log(`Admin ${login} already exists`)
  process.exit(0)
}

createUser({ login, email, passwordHash: bcrypt.hashSync(password, 10), role: 'admin', name: 'Администратор' })
console.log(`Admin created: login=${login}, password=${password}`)
console.log('SAVE THIS PASSWORD. It will not be shown again.')
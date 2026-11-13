import bcrypt from 'bcryptjs'
import { createUser, findUserByEmail } from '../db.js'

const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD

if (!email || !password) {
  console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env')
  process.exit(1)
}

if (findUserByEmail(email)) {
  console.log(`Admin ${email} already exists`)
  process.exit(0)
}

createUser({
  email,
  passwordHash: bcrypt.hashSync(password, 10),
  role: 'admin',
  name: 'Администратор',
})

console.log(`Admin created: ${email}`)
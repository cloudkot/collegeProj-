import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const envPath = path.join(root, '.env')
const examplePath = path.join(root, '.env.example')

const example = fs.existsSync(examplePath)
  ? fs.readFileSync(examplePath, 'utf8')
  : ''

const random = (bytes = 32) => crypto.randomBytes(bytes).toString('hex')

const values = {
  JWT_SECRET: random(48),
  DEFAULT_STUDENT_PASSWORD: random(9),
  ADMIN_EMAIL: 'admin@college.local',
  ADMIN_PASSWORD: random(12),
}

let result = example
for (const [key, value] of Object.entries(values)) {
  const pattern = new RegExp(`^${key}=.*$`, 'm')
  if (pattern.test(result)) {
    result = result.replace(pattern, `${key}=${value}`)
  } else {
    result += `\n${key}=${value}`
  }
}

if (fs.existsSync(envPath)) {
  console.error('.env already exists, refusing to overwrite')
  process.exit(1)
}

fs.writeFileSync(envPath, result.trim() + '\n')
console.log('Generated backend/.env with random secrets')
console.log(`ADMIN_EMAIL=${values.ADMIN_EMAIL}`)
console.log(`ADMIN_PASSWORD=${values.ADMIN_PASSWORD}`)
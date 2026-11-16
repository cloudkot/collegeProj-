import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const envPath = path.join(root, '.env')
const examplePath = path.join(root, '.env.example')

if (fs.existsSync(envPath)) {
  console.error('.env already exists')
  process.exit(1)
}

const example = fs.readFileSync(examplePath, 'utf8')
const secret = crypto.randomBytes(48).toString('hex')
const result = example.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`)

fs.writeFileSync(envPath, result)
console.log('Generated .env in project root')
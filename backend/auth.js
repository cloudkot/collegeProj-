import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv' // добавь пакет, если ещё нет: pnpm add dotenv

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env') // корень проекта

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
} else {
  console.warn('WARNING: .env not found in project root')
}

export const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET is not set')
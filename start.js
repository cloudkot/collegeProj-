import { spawn, execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.join(__dirname, 'backend')
const frontendDir = path.join(__dirname, 'frontend')
const envPath = path.join(backendDir, '.env')
const dbPath = path.join(backendDir, 'college.db')

// Цвета для консоли
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  bold: '\x1b[1m'
}

console.log(`${c.cyan}${c.bold}=== College Materials Startup Script ===${c.reset}\n`)

// 1. Проверка и генерация .env
if (!fs.existsSync(envPath)) {
  console.log(`${c.yellow}[1/5] .env not found. Generating secrets...${c.reset}`)
  try {
    execSync('node scripts/generate-env.js', { cwd: backendDir, stdio: 'inherit' })
  } catch (err) {
    console.error(`${c.red}Failed to generate .env. Ensure backend dependencies are installed.${c.reset}`)
    process.exit(1)
  }
}

// 2. Установка зависимостей (если нет node_modules)
const checkInstall = (dir, name) => {
  if (!fs.existsSync(path.join(dir, 'node_modules'))) {
    console.log(`${c.yellow}[2/5] Installing ${name} dependencies...${c.reset}`)
    execSync('pnpm install', { cwd: dir, stdio: 'inherit' })
  }
}
checkInstall(backendDir, 'backend')
checkInstall(frontendDir, 'frontend')

// 3. Инициализация БД и админа (если БД нет)
if (!fs.existsSync(dbPath)) {
  console.log('Database not found. Creating default admin...')
  execSync('node scripts/create-admin.js', { cwd: __dirname, stdio: 'inherit' })
}

// 4. Чтение и вывод кредов
console.log(`${c.yellow}[4/5] Reading credentials from .env...${c.reset}`)
const envContent = fs.readFileSync(envPath, 'utf8')
const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'))
  return match ? match[1].trim() : 'NOT SET'
}

const adminEmail = getEnv('ADMIN_EMAIL')
const adminPass = getEnv('ADMIN_PASSWORD')
const studentPass = getEnv('DEFAULT_STUDENT_PASSWORD')

console.log(`\n${c.cyan}====================================================${c.reset}`)
console.log(`${c.bold} STARTUP CREDENTIALS ${c.reset}`)
console.log(`${c.cyan}====================================================${c.reset}`)
console.log(` ${c.bold}Admin Email:${c.reset}       ${adminEmail}`)
console.log(` ${c.bold}Admin Password:${c.reset}    ${adminPass}`)
console.log(` ${c.bold}Student Password:${c.reset}  ${studentPass} (для всех студентов из CSV)`)
console.log(`${c.cyan}====================================================${c.reset}\n`)

// 5. Запуск серверов
console.log(`${c.yellow}[5/5] Starting servers...${c.reset}\n`)

const backendProcess = spawn('pnpm', ['start'], {
  cwd: backendDir,
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe']
})

const frontendProcess = spawn('pnpm', ['start'], {
  cwd: frontendDir,
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe']
})

// Перехват логов
backendProcess.stdout.on('data', (data) => {
  process.stdout.write(`${c.green}[BACKEND]${c.reset} ${data.toString()}`)
})
backendProcess.stderr.on('data', (data) => {
  process.stderr.write(`${c.red}[BACKEND ERR]${c.reset} ${data.toString()}`)
})

frontendProcess.stdout.on('data', (data) => {
  process.stdout.write(`${c.cyan}[FRONTEND]${c.reset} ${data.toString()}`)
})
frontendProcess.stderr.on('data', (data) => {
  process.stderr.write(`${c.red}[FRONTEND ERR]${c.reset} ${data.toString()}`)
})

// Корректное завершение по Ctrl+C
const cleanup = () => {
  console.log(`\n${c.yellow}Stopping servers...${c.reset}`)
  backendProcess.kill()
  frontendProcess.kill()
  process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
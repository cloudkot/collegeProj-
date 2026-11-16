import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import crypto from 'node:crypto'
import nodemailer from 'nodemailer'

const exec = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const UPLOAD_DIR = path.join(__dirname, 'storage', 'uploads')
export const PDF_DIR = path.join(__dirname, 'storage', 'pdf')

fs.mkdirSync(UPLOAD_DIR, { recursive: true })
fs.mkdirSync(PDF_DIR, { recursive: true })

const ALLOWED_EXT = ['.doc', '.docx', '.ppt', '.pptx', '.pdf', '.txt']
const MAX_SIZE = 25 * 1024 * 1024

const SOFFICE_PATH =
  process.env.SOFFICE_PATH || 'C:\\Program Files\\LibreOffice\\program\\soffice.exe'

export const sanitizeFilename = (name) => {
  const base = path.basename(name)
  const ext = path.extname(base).toLowerCase()
  const stem = path.basename(base, ext)
  const cleaned = stem
    .replace(/[^\p{L}\p{N}\-_. ]/gu, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
  return { stem: cleaned || 'file', ext }
}

export const validateFile = (originalName, sizeBytes) => {
  const { ext } = sanitizeFilename(originalName)
  if (!ALLOWED_EXT.includes(ext)) {
    return { ok: false, error: `Extension ${ext} not allowed` }
  }
  if (sizeBytes > MAX_SIZE) {
    return { ok: false, error: 'File exceeds 25 MB' }
  }
  return { ok: true, ext }
}

export const sendEmail = async (to, subject, text) => {
  if (!process.env.SMTP_HOST) {
    console.warn(`[email] SMTP not configured. Would send to ${to}: ${subject}`)
    console.log(`[email] Body: ${text}`)
    return
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  await transporter.sendMail({ from: process.env.SMTP_USER, to, subject, text })
}

export const saveTemp = async (buffer, ext) => {
  const tmpName = `${crypto.randomUUID()}${ext}`
  const tmpPath = path.join(UPLOAD_DIR, tmpName)
  await fs.promises.writeFile(tmpPath, buffer)
  return tmpPath
}

export const antivirusScan = async (filePath) => {
  const clam = process.env.CLAMSCAN_PATH || 'clamscan'
  try {
    await exec(clam, ['--no-summary', filePath], { timeout: 30000 })
    return { ok: true }
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn('[antivirus] clamscan not found, skipping scan')
      return { ok: true, skipped: true }
    }
    return { ok: false, error: 'Antivirus detected a threat' }
  }
}

export const convertToPdf = async (sourcePath, ext) => {
  if (ext === '.pdf') {
    const targetName = `${crypto.randomUUID()}.pdf`
    const targetPath = path.join(PDF_DIR, targetName)
    await fs.promises.copyFile(sourcePath, targetPath)
    return targetName
  }

  if (ext === '.txt') {
    return null
  }

  const outDir = PDF_DIR
  await exec(
    SOFFICE_PATH,
    ['--headless', '--convert-to', 'pdf', '--outdir', outDir, sourcePath],
    { timeout: 60000 }
  )

  const produced = path.join(
    outDir,
    `${path.basename(sourcePath, ext)}.pdf`
  )
  const targetName = `${crypto.randomUUID()}.pdf`
  const targetPath = path.join(PDF_DIR, targetName)
  await fs.promises.rename(produced, targetPath)
  return targetName
}

export const moveToStorage = async (tempPath, ext) => {
  const name = `${crypto.randomUUID()}${ext}`
  const targetPath = path.join(UPLOAD_DIR, name)
  await fs.promises.rename(tempPath, targetPath)
  return name
}

export const pdfPath = (storedName) => path.join(PDF_DIR, storedName)

export { MAX_SIZE, ALLOWED_EXT }
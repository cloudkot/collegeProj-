const attempts = new Map()

export const loginRateLimit = async (c, next) => {
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
  const now = Date.now()
  const windowMs = 60 * 1000
  const maxAttempts = 5

  if (!attempts.has(ip)) {
    attempts.set(ip, { count: 1, resetAt: now + windowMs })
    return await next()
  }

  const record = attempts.get(ip)
  
  if (now > record.resetAt) {
    record.count = 1
    record.resetAt = now + windowMs
  } else {
    record.count++
  }

  if (record.count > maxAttempts) {
    return c.json({ error: 'Too many login attempts. Try again later.' }, 429)
  }

  await next()
}
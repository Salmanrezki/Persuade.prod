import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import userRoutes from './routes/user.routes.js'
import courseRoutes from './routes/course.routes.js'
import requestRoutes from './routes/request.routes.js'
import masterclassRoutes from './routes/masterclass.routes.js'
import chatRoutes from './routes/chat.routes.js'

const app = express()
const port = Number(process.env.PORT || 3001)
const jsonLimit = process.env.JSON_LIMIT || '6mb'
const isProduction = process.env.NODE_ENV === 'production'

if (isProduction && !process.env.CORS_ORIGIN) {
  throw new Error('CORS_ORIGIN must be defined in production')
}

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]

const allowedOrigins = (
  process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : defaultAllowedOrigins
)
  .map((origin) => origin.trim())
  .filter(Boolean)

app.disable('x-powered-by')
app.set('trust proxy', 1)

app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'same-origin')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  next()
})

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Origin not allowed by CORS'))
    },
  })
)
app.use(express.json({ limit: jsonLimit }))

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  })
})

app.use('/api/users', userRoutes)
app.use('/api/courses', courseRoutes)
app.use('/api/requests', requestRoutes)
app.use('/api/masterclasses', masterclassRoutes)
app.use('/api/chat', chatRoutes)

app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'API route not found' })
})

app.use((error, _req, res, _next) => {
  if (error?.message === 'Origin not allowed by CORS') {
    res.status(403).json({ message: 'Origin not allowed' })
    return
  }

  console.error('Unhandled backend error:', error)
  res.status(500).json({ message: 'Internal server error' })
})

app.listen(port, () => {
  console.log(`Backend running on port ${port}`)
})

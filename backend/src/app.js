import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'
import { env } from './config/env.js'
import apiRoutes from './routes/api.js'
import { errorHandler } from './middleware/error.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
)

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
)

app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// API Routes
app.use('/api', apiRoutes)

// Serve frontend build artifacts in production or when dist exists
const distPath = path.join(__dirname, '../../dist')
app.use(express.static(distPath))

app.get(/^(?!\/api).*/, (req, res, next) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next()
  })
})

// Centralized error handler
app.use(errorHandler)

export default app

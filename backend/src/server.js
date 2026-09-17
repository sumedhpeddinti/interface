import http from 'http'
import app from './app.js'
import { env } from './config/env.js'
import { initRealtime } from './realtime/socket.js'

const server = http.createServer(app)

// Initialize Socket.IO realtime layer
initRealtime(server, env.CORS_ORIGIN)

server.listen(env.PORT, () => {
  console.log(`🚀 Ganesh Café Backend Server running on http://localhost:${env.PORT}`)
  console.log(`📡 Environment: ${env.NODE_ENV}`)
})

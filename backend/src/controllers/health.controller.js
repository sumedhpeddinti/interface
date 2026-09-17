import { prisma } from '../db/client.js'

export async function checkHealth(req, res) {
  let dbStatus = 'healthy'
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (err) {
    dbStatus = 'unhealthy'
  }

  res.json({
    status: dbStatus === 'healthy' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    version: '1.0.0',
  })
}

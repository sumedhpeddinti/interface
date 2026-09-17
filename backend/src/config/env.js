import dotenv from 'dotenv'
dotenv.config()

export const env = {
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || 'ganesh-cafe-pos-secret-2026',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  DEFAULT_RESTAURANT_ID: 'rest_ganesh_cafe_01',
}

import dotenv from 'dotenv'
dotenv.config()

export const env = {
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || 'ganesh-cafe-pos-secret-2026',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  DEFAULT_RESTAURANT_ID: 'rest_ganesh_cafe_01',
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || 'BEZ8A63qaxycfOoMlmYCsVyMWmHK_8bAZqkAcFhSDw9DpPDivWDfXK0G3dwYikprT04M11dmk4Sdq2_bCDMJLQE',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || 'rw2Y3Af6kyRkGccW9kBGxfjfum_s-zzNZjbN1wnX3hw',
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:admin@ganeshcafe.com',
}

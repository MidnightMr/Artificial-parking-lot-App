import type { Config } from 'drizzle-kit'
import * as dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'mysql2',
  dbCredentials: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_parking',
  },
  verbose: true,
  strict: true,
} satisfies Config
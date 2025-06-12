import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart_parking',
}

// 创建连接池
const poolConnection = mysql.createPool(dbConfig)

// 创建Drizzle实例
export const db = drizzle(poolConnection)

// 测试数据库连接
export const testConnection = async () => {
  try {
    const connection = await poolConnection.getConnection()
    console.log('✅ 数据库连接成功')
    connection.release()
    return true
  } catch (error) {
    console.error('❌ 数据库连接失败:', error)
    return false
  }
}
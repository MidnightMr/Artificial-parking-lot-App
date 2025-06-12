import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { staticPlugin } from '@elysiajs/static'
import * as dotenv from 'dotenv'
import { userRoutes } from './api/routes/userRoutes'
import { testConnection } from './db/config'

// 加载环境变量
dotenv.config()

// 测试数据库连接
testConnection()

// 初始化Elysia应用
const app = new Elysia()
  // 添加Swagger文档
  .use(swagger({
    documentation: {
      info: {
        title: '智能停车助手 API',
        version: '1.0.0',
        description: '提供停车场管理、车位预约、停车记录、用户管理等功能的API服务'
      },
      tags: [
        { name: 'users', description: '用户管理' },
        { name: 'parking', description: '停车场管理' },
        { name: 'records', description: '停车记录' },
        { name: 'reservations', description: '预约系统' },
        { name: 'admin', description: '管理后台' }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    }
  }))
  // 添加静态文件服务
  .use(staticPlugin({
    prefix: '',
    assets: './public'
  }))
  // 使用用户路由
  .use(userRoutes)
  // 根路由
  .get('/', () => ({ message: '智能停车助手API服务运行中' }))
  // 启动服务器
  .listen(process.env.PORT || 3000)

console.log(`🚀 服务器运行在 http://${app.server?.hostname}:${app.server?.port}`)
console.log(`📚 Swagger文档: http://${app.server?.hostname}:${app.server?.port}/swagger`)

// 导出应用实例用于测试
export default app
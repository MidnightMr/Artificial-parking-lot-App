import { Elysia, t } from 'elysia'
import { db } from '../../db/config'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { createId } from '../../db/utils'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// 用户路由
export const userRoutes = new Elysia({ prefix: '/api/users' })
  // 用户注册
  .post('/register', async ({ body }) => {
    const { username, password, name, email, phone } = body
    
    // 检查用户名是否已存在
    const existingUser = await db.select().from(users).where(eq(users.username, username)).limit(1)
    if (existingUser.length > 0) {
      return { success: false, message: '用户名已存在' }
    }
    
    // 密码加密
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)
    
    // 创建新用户
    const newUser = {
      id: createId(),
      username,
      password: hashedPassword,
      name,
      email,
      phone,
      role: 'user',
      walletBalance: '0.00',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    await db.insert(users).values(newUser)
    
    return { success: true, message: '注册成功' }
  }, {
    body: t.Object({
      username: t.String(),
      password: t.String(),
      name: t.String(),
      email: t.Optional(t.String()),
      phone: t.Optional(t.String())
    }),
    detail: {
      tags: ['users'],
      summary: '用户注册',
      description: '创建新用户账户'
    }
  })
  
  // 用户登录
  .post('/login', async ({ body, set }) => {
    const { username, password } = body
    
    // 查找用户
    const user = await db.select().from(users).where(eq(users.username, username)).limit(1)
    if (user.length === 0) {
      set.status = 401
      return { success: false, message: '用户名或密码错误' }
    }
    
    // 验证密码
    const isMatch = await bcrypt.compare(password, user[0].password)
    if (!isMatch) {
      set.status = 401
      return { success: false, message: '用户名或密码错误' }
    }
    
    // 生成JWT令牌
    const token = jwt.sign(
      { id: user[0].id, username: user[0].username, role: user[0].role },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )
    
    return { 
      success: true, 
      token,
      user: {
        id: user[0].id,
        username: user[0].username,
        name: user[0].name,
        role: user[0].role
      }
    }
  }, {
    body: t.Object({
      username: t.String(),
      password: t.String()
    }),
    detail: {
      tags: ['users'],
      summary: '用户登录',
      description: '用户登录并获取JWT令牌'
    }
  })
  
  // 获取用户个人资料
  .get('/profile', async ({ headers, set }) => {
    // 这里应该有JWT验证中间件
    // 简化示例，实际应用中需要完整的JWT验证
    const authHeader = headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return { success: false, message: '未授权访问' }
    }
    
    try {
      const token = authHeader.split(' ')[1]
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here') as any
      
      const user = await db.select({
        id: users.id,
        username: users.username,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        walletBalance: users.walletBalance,
        createdAt: users.createdAt
      }).from(users).where(eq(users.id, decoded.id)).limit(1)
      
      if (user.length === 0) {
        set.status = 404
        return { success: false, message: '用户不存在' }
      }
      
      return { success: true, user: user[0] }
    } catch (error) {
      set.status = 401
      return { success: false, message: '令牌无效或已过期' }
    }
  }, {
    detail: {
      tags: ['users'],
      summary: '获取用户资料',
      description: '获取当前登录用户的个人资料',
      security: [{ bearerAuth: [] }]
    }
  })
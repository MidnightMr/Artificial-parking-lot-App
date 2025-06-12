# 项目设置指南

## 核心依赖安装

```bash
# 集成 Swagger 文档和静态文件服务
bun add @elysiajs/swagger @elysiajs/static

# 安装 Drizzle 相关依赖（MySQL 版本）
# ⚠️ 重要：先检查 TypeBox 版本兼容性；window没有grep命令，切换wsl终端，在执行下面
grep "@sinclair/typebox" node_modules/elysia/package.json
或者`Select-String -Pattern @sinclair/typebox node_modules/elysia/package.json`
# 在 package.json 中使用 overrides 字段固定版本为 elysia 使用的最低版本
示例："overrides": { "@sinclair/typebox": "0.xx.x" }
bun add drizzle-orm drizzle-typebox mysql2 dotenv
bun add -D drizzle-kit tsx
```

## 项目配置和初始化

```bash
# 创建必要的目录结构
mkdir -p src/db src/api/routes src/api/models src/services src/utils public

# 添加数据库管理脚本到 package.json
npm pkg set scripts.db:generate="drizzle-kit generate"
npm pkg set scripts.db:migrate="drizzle-kit migrate"
npm pkg set scripts.db:push="drizzle-kit push"
npm pkg set scripts.db:studio="drizzle-kit studio"
npm pkg set scripts.start="bun run src/index.ts"
```

## 常见问题解决

```bash
# 创建 public 目录（解决静态文件插件 ENOENT 错误）
mkdir public

# 问题3：数据库连接错误
# 确保 .env 文件配置正确且数据库服务已启动
```
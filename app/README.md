# 智能停车助手 API 服务

这是一个基于 Express.js 和 MongoDB 构建的智能停车助手 API 服务，提供停车场管理、车位预约、停车记录、用户管理等功能。

## 功能特点

- **用户管理**：注册、登录、个人资料管理、车牌管理、钱包充值
- **停车场管理**：停车场信息查询、附近停车场查找、车位状态管理
- **停车记录**：入场记录、出场结算、费用支付、历史记录查询
- **预约系统**：车位预约、预约支付、预约取消、预约记录查询
- **管理后台**：用户管理、停车场管理、数据统计、收入报表

## 技术栈

- **后端框架**：Express.js
- **数据库**：MongoDB (Mongoose ORM)
- **认证**：JWT (JSON Web Token)
- **API 文档**：Swagger/OpenAPI

## 安装与运行

### 前提条件

- Node.js (v14+)
- MongoDB

### 安装步骤

1. 克隆仓库

```bash
git clone <repository-url>
cd app
```

2. 安装依赖

```bash
npm install
```

3. 配置环境变量

创建 `.env` 文件，参考 `.env.example` 进行配置：

```
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/smart-parking
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
MAX_RESERVATION_TIME=120
```

4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## API 文档

### 用户 API

- `POST /api/users/register` - 用户注册
- `POST /api/users/login` - 用户登录
- `GET /api/users/profile` - 获取用户资料
- `PUT /api/users/profile` - 更新用户资料
- `POST /api/users/license-plates` - 添加车牌
- `DELETE /api/users/license-plates/:plateNumber` - 删除车牌
- `PUT /api/users/license-plates/:plateNumber/default` - 设置默认车牌
- `GET /api/users/wallet` - 获取钱包信息
- `POST /api/users/wallet/recharge` - 钱包充值

### 停车场 API

- `GET /api/parking/lots` - 获取停车场列表
- `GET /api/parking/lots/nearby` - 获取附近停车场
- `GET /api/parking/lots/:id` - 获取停车场详情
- `POST /api/parking/lots` - 创建停车场 (管理员)
- `PUT /api/parking/lots/:id` - 更新停车场 (管理员)
- `DELETE /api/parking/lots/:id` - 删除停车场 (管理员)
- `PUT /api/parking/lots/:id/spaces/:spaceNumber` - 更新车位状态 (管理员)
- `POST /api/parking/lots/:id/reviews` - 添加停车场评价

### 停车记录 API

- `POST /api/parking/records/entry` - 创建入场记录
- `PUT /api/parking/records/:id/exit` - 更新出场记录
- `PUT /api/parking/records/:id/payment` - 支付停车费
- `GET /api/parking/records` - 获取停车记录列表
- `GET /api/parking/records/active` - 获取当前活跃的停车记录
- `GET /api/parking/records/:id` - 获取停车记录详情

### 预约 API

- `POST /api/reservations` - 创建预约
- `PUT /api/reservations/:id/payment` - 支付预约费用
- `PUT /api/reservations/:id/cancel` - 取消预约
- `GET /api/reservations` - 获取预约列表
- `GET /api/reservations/active` - 获取当前有效的预约
- `GET /api/reservations/:id` - 获取预约详情

### 管理员 API

- `GET /api/admin/users` - 获取用户列表 (管理员)
- `GET /api/admin/users/:id` - 获取用户详情 (管理员)
- `PUT /api/admin/users/:id` - 更新用户信息 (管理员)
- `DELETE /api/admin/users/:id` - 删除用户 (管理员)
- `GET /api/admin/stats` - 获取系统统计数据 (管理员)
- `GET /api/admin/reports/income` - 获取收入报表 (管理员)
- `GET /api/admin/reports/usage` - 获取使用率报表 (管理员)

## 项目结构

```
app/
├── src/
│   ├── controllers/      # 控制器
│   ├── models/           # 数据模型
│   ├── middleware/       # 中间件
│   ├── routes/           # 路由
│   └── index.js          # 入口文件
├── .env                  # 环境变量
├── package.json          # 项目配置
└── README.md             # 项目说明
```

## 开发计划

- [x] 用户认证系统
- [x] 停车场管理
- [x] 停车记录管理
- [x] 预约系统
- [x] 管理员功能
- [ ] 支付集成
- [ ] 消息通知系统
- [ ] 移动端 API 优化
- [ ] API 文档自动生成
- [ ] 单元测试

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

[MIT](LICENSE)
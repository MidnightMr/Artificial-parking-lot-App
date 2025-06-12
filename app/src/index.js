import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

// 路由导入
import userRoutes from './routes/userRoutes.js';
import parkingRoutes from './routes/parkingRoutes.js';
import reservationRoutes from './routes/reservationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// 加载环境变量
dotenv.config();

// 初始化Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api/users', userRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/admin', adminRoutes);

// 根路由
app.get('/', (req, res) => {
  res.json({ message: '智能停车助手API服务运行中' });
});

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-parking')
  .then(() => {
    console.log('数据库连接成功');
    // 启动服务器
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('数据库连接失败:', err);
  });

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
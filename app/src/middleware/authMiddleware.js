import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

// 保护路由中间件 - 验证用户是否已登录
export const protect = async (req, res, next) => {
  try {
    let token;
    
    // 检查请求头中是否包含token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // 如果没有token，返回未授权错误
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未授权，请先登录'
      });
    }
    
    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 查找用户
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '此token对应的用户不存在'
      });
    }
    
    // 将用户信息添加到请求对象中
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '无效的token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'token已过期，请重新登录'
      });
    }
    
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 角色授权中间件
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未授权，请先登录'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '您没有权限执行此操作'
      });
    }
    
    next();
  };
};

// 生成JWT Token
export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};
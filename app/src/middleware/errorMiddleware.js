// 错误处理中间件

// 捕获404错误
export const notFound = (req, res, next) => {
  const error = new Error(`找不到 - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// 全局错误处理器
export const errorHandler = (err, req, res, next) => {
  // 如果状态码仍为200，则设置为500
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // 设置响应状态码
  res.status(statusCode);
  
  // 返回错误信息
  res.json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

// 处理MongoDB重复键错误
export const handleDuplicateKeyError = (err, req, res, next) => {
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `${field} '${value}' 已存在，请使用其他值`;
    
    res.status(400).json({
      success: false,
      message: message
    });
  } else {
    next(err);
  }
};

// 处理MongoDB验证错误
export const handleValidationError = (err, req, res, next) => {
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => error.message);
    const message = `输入数据验证失败: ${errors.join(', ')}`;
    
    res.status(400).json({
      success: false,
      message: message
    });
  } else {
    next(err);
  }
};

// 处理JWT错误
export const handleJWTError = (err, req, res, next) => {
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      message: '无效的token，请重新登录'
    });
  } else if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      message: 'token已过期，请重新登录'
    });
  } else {
    next(err);
  }
};
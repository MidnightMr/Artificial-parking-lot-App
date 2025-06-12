import User from '../models/userModel.js';
import { generateToken } from '../middleware/authMiddleware.js';

// @desc    注册新用户
// @route   POST /api/users/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const { username, password, name, phone, email } = req.body;
    
    // 检查用户是否已存在
    const userExists = await User.findOne({ $or: [{ username }, { phone }] });
    
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: '用户名或手机号已被注册'
      });
    }
    
    // 创建新用户
    const user = await User.create({
      username,
      password,
      name,
      phone,
      email
    });
    
    if (user) {
      // 生成token
      const token = generateToken(user._id);
      
      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          username: user.username,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          token
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: '无效的用户数据'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    用户登录
// @route   POST /api/users/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 查找用户并包含密码字段
    const user = await User.findOne({ username }).select('+password');
    
    // 检查用户是否存在以及密码是否匹配
    if (user && (await user.comparePassword(password))) {
      // 生成token
      const token = generateToken(user._id);
      
      res.json({
        success: true,
        data: {
          _id: user._id,
          username: user.username,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          token
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: '用户名或密码不正确'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    获取用户个人资料
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (user) {
      res.json({
        success: true,
        data: {
          _id: user._id,
          username: user.username,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          licensePlates: user.licensePlates,
          wallet: {
            balance: user.wallet.balance
          },
          createdAt: user.createdAt
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    更新用户个人资料
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (user) {
      // 更新用户信息
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone || user.phone;
      
      // 如果提供了新密码，则更新密码
      if (req.body.password) {
        user.password = req.body.password;
      }
      
      // 保存更新后的用户信息
      const updatedUser = await user.save();
      
      // 生成新token
      const token = generateToken(updatedUser._id);
      
      res.json({
        success: true,
        data: {
          _id: updatedUser._id,
          username: updatedUser.username,
          name: updatedUser.name,
          phone: updatedUser.phone,
          email: updatedUser.email,
          role: updatedUser.role,
          token
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    添加车牌号
// @route   POST /api/users/license-plates
// @access  Private
export const addLicensePlate = async (req, res) => {
  try {
    const { plateNumber, vehicleType, isDefault } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 检查车牌号是否已存在
    const plateExists = user.licensePlates.some(plate => plate.plateNumber === plateNumber);
    
    if (plateExists) {
      return res.status(400).json({
        success: false,
        message: '该车牌号已添加'
      });
    }
    
    // 如果新车牌设置为默认，则将其他车牌设置为非默认
    if (isDefault) {
      user.licensePlates.forEach(plate => {
        plate.isDefault = false;
      });
    }
    
    // 添加新车牌
    user.licensePlates.push({
      plateNumber,
      vehicleType: vehicleType || '小型车',
      isDefault: isDefault || user.licensePlates.length === 0 // 如果是第一个车牌，则默认设为默认车牌
    });
    
    await user.save();
    
    res.status(201).json({
      success: true,
      data: user.licensePlates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    删除车牌号
// @route   DELETE /api/users/license-plates/:plateNumber
// @access  Private
export const deleteLicensePlate = async (req, res) => {
  try {
    const { plateNumber } = req.params;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 查找车牌索引
    const plateIndex = user.licensePlates.findIndex(plate => plate.plateNumber === plateNumber);
    
    if (plateIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '车牌号不存在'
      });
    }
    
    // 检查是否为默认车牌
    const isDefault = user.licensePlates[plateIndex].isDefault;
    
    // 删除车牌
    user.licensePlates.splice(plateIndex, 1);
    
    // 如果删除的是默认车牌，且还有其他车牌，则将第一个车牌设为默认
    if (isDefault && user.licensePlates.length > 0) {
      user.licensePlates[0].isDefault = true;
    }
    
    await user.save();
    
    res.json({
      success: true,
      data: user.licensePlates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    设置默认车牌号
// @route   PUT /api/users/license-plates/:plateNumber/default
// @access  Private
export const setDefaultLicensePlate = async (req, res) => {
  try {
    const { plateNumber } = req.params;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 将所有车牌设置为非默认
    user.licensePlates.forEach(plate => {
      plate.isDefault = plate.plateNumber === plateNumber;
    });
    
    // 检查指定的车牌是否存在
    const plateExists = user.licensePlates.some(plate => plate.plateNumber === plateNumber);
    
    if (!plateExists) {
      return res.status(404).json({
        success: false,
        message: '车牌号不存在'
      });
    }
    
    await user.save();
    
    res.json({
      success: true,
      data: user.licensePlates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    获取钱包余额和交易记录
// @route   GET /api/users/wallet
// @access  Private
export const getWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    res.json({
      success: true,
      data: {
        balance: user.wallet.balance,
        transactions: user.wallet.transactions
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    充值钱包
// @route   POST /api/users/wallet/recharge
// @access  Private
export const rechargeWallet = async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: '充值金额必须大于0'
      });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 模拟支付过程，实际应用中应对接支付接口
    // 这里假设支付已成功
    
    // 更新钱包余额
    user.wallet.balance += amount;
    
    // 添加交易记录
    user.wallet.transactions.push({
      amount,
      type: '充值',
      description: `通过${paymentMethod || '在线支付'}充值`,
      createdAt: new Date()
    });
    
    await user.save();
    
    res.json({
      success: true,
      data: {
        balance: user.wallet.balance,
        transaction: user.wallet.transactions[user.wallet.transactions.length - 1]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
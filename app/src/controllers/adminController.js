import User from '../models/userModel.js';
import ParkingLot from '../models/parkingLotModel.js';
import ParkingRecord from '../models/parkingRecordModel.js';
import Reservation from '../models/reservationModel.js';

// @desc    获取所有用户（管理员）
// @route   GET /api/admin/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
  try {
    // 分页参数
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // 筛选参数
    const filter = {};
    
    // 按角色筛选
    if (req.query.role) {
      filter.role = req.query.role;
    }
    
    // 按搜索关键词筛选
    if (req.query.keyword) {
      filter.$or = [
        { username: { $regex: req.query.keyword, $options: 'i' } },
        { name: { $regex: req.query.keyword, $options: 'i' } },
        { phone: { $regex: req.query.keyword, $options: 'i' } },
        { email: { $regex: req.query.keyword, $options: 'i' } }
      ];
    }
    
    // 查询用户
    const users = await User.find(filter)
      .select('-password')
      .skip(skip)
      .limit(limit);
    
    // 获取总数
    const total = await User.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
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

// @desc    获取单个用户详情（管理员）
// @route   GET /api/admin/users/:id
// @access  Private/Admin
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '找不到该用户'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    更新用户信息（管理员）
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
export const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '找不到该用户'
      });
    }
    
    // 超级管理员只能由其他超级管理员修改
    if (user.role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: '无权修改超级管理员信息'
      });
    }
    
    // 更新用户信息
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    
    // 只有超级管理员可以修改用户角色
    if (req.body.role && req.user.role === 'superadmin') {
      user.role = req.body.role;
    }
    
    // 如果提供了新密码，则更新密码
    if (req.body.password) {
      user.password = req.body.password;
    }
    
    // 保存更新后的用户信息
    const updatedUser = await user.save();
    
    res.json({
      success: true,
      data: {
        _id: updatedUser._id,
        username: updatedUser.username,
        name: updatedUser.name,
        phone: updatedUser.phone,
        email: updatedUser.email,
        role: updatedUser.role
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

// @desc    删除用户（管理员）
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '找不到该用户'
      });
    }
    
    // 超级管理员只能由其他超级管理员删除
    if (user.role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: '无权删除超级管理员'
      });
    }
    
    // 管理员只能由超级管理员删除
    if (user.role === 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: '无权删除管理员'
      });
    }
    
    await user.remove();
    
    res.json({
      success: true,
      message: '用户已删除'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    获取系统统计数据（管理员）
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getSystemStats = async (req, res) => {
  try {
    // 获取用户总数
    const userCount = await User.countDocuments();
    
    // 获取停车场总数
    const parkingLotCount = await ParkingLot.countDocuments();
    
    // 获取总车位数
    const totalSpaces = await ParkingLot.aggregate([
      { $group: { _id: null, total: { $sum: '$totalSpaces' } } }
    ]);
    
    // 获取可用车位数
    const availableSpaces = await ParkingLot.aggregate([
      { $group: { _id: null, total: { $sum: '$availableSpaces' } } }
    ]);
    
    // 获取今日停车记录数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayParkingCount = await ParkingRecord.countDocuments({
      entryTime: { $gte: today }
    });
    
    // 获取今日预约数
    const todayReservationCount = await Reservation.countDocuments({
      createdAt: { $gte: today }
    });
    
    // 获取今日收入
    const todayIncome = await ParkingRecord.aggregate([
      {
        $match: {
          paymentTime: { $gte: today },
          paymentStatus: '已支付'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$fee' }
        }
      }
    ]);
    
    // 获取本月收入
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyIncome = await ParkingRecord.aggregate([
      {
        $match: {
          paymentTime: { $gte: firstDayOfMonth },
          paymentStatus: '已支付'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$fee' }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        userCount,
        parkingLotCount,
        totalSpaces: totalSpaces.length > 0 ? totalSpaces[0].total : 0,
        availableSpaces: availableSpaces.length > 0 ? availableSpaces[0].total : 0,
        todayParkingCount,
        todayReservationCount,
        todayIncome: todayIncome.length > 0 ? todayIncome[0].total : 0,
        monthlyIncome: monthlyIncome.length > 0 ? monthlyIncome[0].total : 0
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

// @desc    获取收入报表（管理员）
// @route   GET /api/admin/reports/income
// @access  Private/Admin
export const getIncomeReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    // 验证日期
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();
    
    // 设置分组条件
    let groupStage;
    if (groupBy === 'month') {
      groupStage = {
        $group: {
          _id: {
            year: { $year: '$paymentTime' },
            month: { $month: '$paymentTime' }
          },
          count: { $sum: 1 },
          income: { $sum: '$fee' }
        }
      };
    } else if (groupBy === 'week') {
      groupStage = {
        $group: {
          _id: {
            year: { $year: '$paymentTime' },
            week: { $week: '$paymentTime' }
          },
          count: { $sum: 1 },
          income: { $sum: '$fee' }
        }
      };
    } else {
      // 默认按天分组
      groupStage = {
        $group: {
          _id: {
            year: { $year: '$paymentTime' },
            month: { $month: '$paymentTime' },
            day: { $dayOfMonth: '$paymentTime' }
          },
          count: { $sum: 1 },
          income: { $sum: '$fee' }
        }
      };
    }
    
    // 聚合查询
    const incomeData = await ParkingRecord.aggregate([
      {
        $match: {
          paymentTime: { $gte: start, $lte: end },
          paymentStatus: '已支付'
        }
      },
      groupStage,
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 }
      }
    ]);
    
    // 格式化结果
    const formattedData = incomeData.map(item => {
      let dateLabel;
      
      if (groupBy === 'month') {
        dateLabel = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`;
      } else if (groupBy === 'week') {
        dateLabel = `${item._id.year}-W${item._id.week}`;
      } else {
        dateLabel = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`;
      }
      
      return {
        date: dateLabel,
        count: item.count,
        income: item.income
      };
    });
    
    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    获取停车场使用率报表（管理员）
// @route   GET /api/admin/reports/usage
// @access  Private/Admin
export const getUsageReport = async (req, res) => {
  try {
    const { parkingLotId, startDate, endDate, groupBy = 'day' } = req.query;
    
    // 验证日期
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();
    
    // 构建匹配条件
    const matchStage = {
      $match: {
        entryTime: { $gte: start, $lte: end }
      }
    };
    
    // 如果指定了停车场，则添加到匹配条件
    if (parkingLotId) {
      matchStage.$match.parkingLot = mongoose.Types.ObjectId(parkingLotId);
    }
    
    // 设置分组条件
    let groupStage;
    if (groupBy === 'month') {
      groupStage = {
        $group: {
          _id: {
            parkingLot: '$parkingLot',
            year: { $year: '$entryTime' },
            month: { $month: '$entryTime' }
          },
          count: { $sum: 1 }
        }
      };
    } else if (groupBy === 'week') {
      groupStage = {
        $group: {
          _id: {
            parkingLot: '$parkingLot',
            year: { $year: '$entryTime' },
            week: { $week: '$entryTime' }
          },
          count: { $sum: 1 }
        }
      };
    } else {
      // 默认按天分组
      groupStage = {
        $group: {
          _id: {
            parkingLot: '$parkingLot',
            year: { $year: '$entryTime' },
            month: { $month: '$entryTime' },
            day: { $dayOfMonth: '$entryTime' }
          },
          count: { $sum: 1 }
        }
      };
    }
    
    // 聚合查询
    const usageData = await ParkingRecord.aggregate([
      matchStage,
      groupStage,
      {
        $lookup: {
          from: 'parkinglots',
          localField: '_id.parkingLot',
          foreignField: '_id',
          as: 'parkingLotInfo'
        }
      },
      {
        $unwind: '$parkingLotInfo'
      },
      {
        $project: {
          _id: 0,
          parkingLotId: '$_id.parkingLot',
          parkingLotName: '$parkingLotInfo.name',
          year: '$_id.year',
          month: '$_id.month',
          day: '$_id.day',
          week: '$_id.week',
          count: 1,
          totalSpaces: '$parkingLotInfo.totalSpaces'
        }
      },
      {
        $sort: { 'parkingLotName': 1, 'year': 1, 'month': 1, 'day': 1, 'week': 1 }
      }
    ]);
    
    // 格式化结果
    const formattedData = usageData.map(item => {
      let dateLabel;
      
      if (groupBy === 'month') {
        dateLabel = `${item.year}-${item.month.toString().padStart(2, '0')}`;
      } else if (groupBy === 'week') {
        dateLabel = `${item.year}-W${item.week}`;
      } else {
        dateLabel = `${item.year}-${item.month.toString().padStart(2, '0')}-${item.day.toString().padStart(2, '0')}`;
      }
      
      return {
        parkingLotId: item.parkingLotId,
        parkingLotName: item.parkingLotName,
        date: dateLabel,
        count: item.count,
        totalSpaces: item.totalSpaces,
        usageRate: (item.count / item.totalSpaces).toFixed(2)
      };
    });
    
    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
import Reservation from '../models/reservationModel.js';
import ParkingLot from '../models/parkingLotModel.js';
import User from '../models/userModel.js';

// @desc    创建停车位预约
// @route   POST /api/reservations
// @access  Private
export const createReservation = async (req, res) => {
  try {
    const {
      parkingLotId,
      parkingSpace,
      licensePlate,
      vehicleType,
      reservationTime,
      expiryTime
    } = req.body;
    
    // 验证停车场是否存在
    const parkingLot = await ParkingLot.findById(parkingLotId);
    if (!parkingLot) {
      return res.status(404).json({
        success: false,
        message: '找不到该停车场'
      });
    }
    
    // 验证车位是否存在
    const space = parkingLot.parkingSpaces.find(s => s.spaceNumber === parkingSpace);
    if (!space) {
      return res.status(404).json({
        success: false,
        message: '找不到该车位'
      });
    }
    
    // 验证车位是否可用
    if (space.status !== '空闲') {
      return res.status(400).json({
        success: false,
        message: '该车位不可用'
      });
    }
    
    // 验证预约时间
    const now = new Date();
    const reservationTimeDate = new Date(reservationTime);
    const expiryTimeDate = new Date(expiryTime);
    
    if (reservationTimeDate < now) {
      return res.status(400).json({
        success: false,
        message: '预约时间不能早于当前时间'
      });
    }
    
    if (expiryTimeDate <= reservationTimeDate) {
      return res.status(400).json({
        success: false,
        message: '到期时间必须晚于预约时间'
      });
    }
    
    // 检查是否有冲突的预约
    const conflictingReservations = await Reservation.findConflicts(
      parkingLotId,
      parkingSpace,
      reservationTimeDate,
      expiryTimeDate
    );
    
    if (conflictingReservations.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该时间段内车位已被预约'
      });
    }
    
    // 计算预约费用
    let fee = 0;
    const hourlyRate = parkingLot.pricePerHour;
    const specialRate = parkingLot.specialRates.find(rate => rate.vehicleType === vehicleType);
    const rate = specialRate ? specialRate.pricePerHour : hourlyRate;
    
    // 预约费用为每小时费率的20%
    const durationHours = Math.ceil((expiryTimeDate - reservationTimeDate) / (1000 * 60 * 60));
    fee = rate * durationHours * 0.2;
    
    // 创建预约
    const reservation = await Reservation.create({
      user: req.user._id,
      parkingLot: parkingLotId,
      parkingSpace,
      licensePlate,
      vehicleType: vehicleType || '小型车',
      reservationTime: reservationTimeDate,
      expiryTime: expiryTimeDate,
      fee,
      status: '待确认'
    });
    
    // 更新车位状态
    space.status = '预约';
    parkingLot.availableSpaces = Math.max(0, parkingLot.availableSpaces - 1);
    await parkingLot.save();
    
    res.status(201).json({
      success: true,
      data: reservation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    支付预约费用
// @route   PUT /api/reservations/:id/payment
// @access  Private
export const payReservation = async (req, res) => {
  try {
    const { paymentMethod } = req.body;
    
    const reservation = await Reservation.findById(req.params.id);
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: '找不到该预约记录'
      });
    }
    
    // 验证是否是当前用户的预约
    if (reservation.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权操作此预约'
      });
    }
    
    // 检查预约状态
    if (reservation.status !== '待确认') {
      return res.status(400).json({
        success: false,
        message: `预约状态为${reservation.status}，无法支付`
      });
    }
    
    // 检查是否已支付
    if (reservation.paymentStatus === '已支付') {
      return res.status(400).json({
        success: false,
        message: '该预约费用已支付'
      });
    }
    
    // 处理支付
    if (paymentMethod === '钱包余额') {
      // 使用钱包余额支付
      const user = await User.findById(req.user._id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '找不到用户信息'
        });
      }
      
      // 检查余额是否足够
      if (user.wallet.balance < reservation.fee) {
        return res.status(400).json({
          success: false,
          message: '钱包余额不足'
        });
      }
      
      // 扣除余额
      user.wallet.balance -= reservation.fee;
      
      // 添加交易记录
      user.wallet.transactions.push({
        amount: -reservation.fee,
        type: '消费',
        description: `支付预约费用 - ${reservation._id}`,
        createdAt: new Date()
      });
      
      await user.save();
    } else {
      // 其他支付方式，实际应用中应对接支付接口
      // 这里假设支付已成功
    }
    
    // 更新支付状态
    reservation.paymentStatus = '已支付';
    reservation.paymentMethod = paymentMethod;
    reservation.paymentTime = new Date();
    reservation.paymentId = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    reservation.status = '已确认';
    
    await reservation.save();
    
    res.json({
      success: true,
      data: reservation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    取消预约
// @route   PUT /api/reservations/:id/cancel
// @access  Private
export const cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: '找不到该预约记录'
      });
    }
    
    // 验证是否是当前用户的预约
    if (reservation.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权操作此预约'
      });
    }
    
    // 检查预约状态
    if (reservation.status === '已使用' || reservation.status === '已过期') {
      return res.status(400).json({
        success: false,
        message: `预约状态为${reservation.status}，无法取消`
      });
    }
    
    // 更新预约状态
    reservation.status = '已取消';
    
    // 如果已支付，则更新支付状态为已退款
    if (reservation.paymentStatus === '已支付') {
      reservation.paymentStatus = '已退款';
      
      // 如果使用钱包支付，则退款到钱包
      if (reservation.paymentMethod === '钱包余额') {
        const user = await User.findById(req.user._id);
        
        if (user) {
          // 退款到钱包
          user.wallet.balance += reservation.fee;
          
          // 添加交易记录
          user.wallet.transactions.push({
            amount: reservation.fee,
            type: '退款',
            description: `预约取消退款 - ${reservation._id}`,
            createdAt: new Date()
          });
          
          await user.save();
        }
      }
    }
    
    await reservation.save();
    
    // 更新车位状态
    const parkingLot = await ParkingLot.findById(reservation.parkingLot);
    
    if (parkingLot) {
      // 查找车位
      const spaceIndex = parkingLot.parkingSpaces.findIndex(
        space => space.spaceNumber === reservation.parkingSpace
      );
      
      if (spaceIndex !== -1) {
        // 更新车位状态
        parkingLot.parkingSpaces[spaceIndex].status = '空闲';
        parkingLot.availableSpaces = Math.min(parkingLot.totalSpaces, parkingLot.availableSpaces + 1);
        await parkingLot.save();
      }
    }
    
    res.json({
      success: true,
      message: '预约已取消',
      data: reservation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    获取用户的预约记录
// @route   GET /api/reservations
// @access  Private
export const getUserReservations = async (req, res) => {
  try {
    // 分页参数
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // 筛选参数
    const filter = { user: req.user._id };
    
    // 按状态筛选
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // 按支付状态筛选
    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }
    
    // 按停车场筛选
    if (req.query.parkingLot) {
      filter.parkingLot = req.query.parkingLot;
    }
    
    // 按车牌号筛选
    if (req.query.licensePlate) {
      filter.licensePlate = req.query.licensePlate;
    }
    
    // 按日期范围筛选
    if (req.query.startDate) {
      filter.reservationTime = { $gte: new Date(req.query.startDate) };
    }
    
    if (req.query.endDate) {
      if (!filter.reservationTime) filter.reservationTime = {};
      filter.reservationTime.$lte = new Date(req.query.endDate);
    }
    
    // 查询预约记录
    const reservations = await Reservation.find(filter)
      .sort({ reservationTime: -1 })
      .skip(skip)
      .limit(limit)
      .populate('parkingLot', 'name address');
    
    // 获取总数
    const total = await Reservation.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        reservations,
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

// @desc    获取单个预约详情
// @route   GET /api/reservations/:id
// @access  Private
export const getReservationById = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('parkingLot', 'name address pricePerHour specialRates')
      .populate('user', 'name phone');
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: '找不到该预约记录'
      });
    }
    
    // 验证是否是当前用户的预约
    if (reservation.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权查看此预约'
      });
    }
    
    res.json({
      success: true,
      data: reservation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    获取当前有效的预约
// @route   GET /api/reservations/active
// @access  Private
export const getActiveReservations = async (req, res) => {
  try {
    const now = new Date();
    
    const activeReservations = await Reservation.find({
      user: req.user._id,
      status: { $in: ['待确认', '已确认'] },
      expiryTime: { $gt: now }
    }).populate('parkingLot', 'name address');
    
    res.json({
      success: true,
      data: activeReservations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
import ParkingRecord from '../models/parkingRecordModel.js';
import ParkingLot from '../models/parkingLotModel.js';
import User from '../models/userModel.js';
import Reservation from '../models/reservationModel.js';

// @desc    创建停车记录（入场）
// @route   POST /api/parking/records/entry
// @access  Private
export const createParkingEntry = async (req, res) => {
  try {
    const { parkingLotId, parkingSpace, licensePlate, vehicleType, reservationId } = req.body;
    
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
    if (space.status !== '空闲' && space.status !== '预约') {
      return res.status(400).json({
        success: false,
        message: '该车位不可用'
      });
    }
    
    // 如果有预约ID，验证预约信息
    let reservation = null;
    if (reservationId) {
      reservation = await Reservation.findById(reservationId);
      
      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: '找不到该预约记录'
        });
      }
      
      if (reservation.status !== '已确认') {
        return res.status(400).json({
          success: false,
          message: '预约状态无效'
        });
      }
      
      if (reservation.parkingLot.toString() !== parkingLotId ||
          reservation.parkingSpace !== parkingSpace ||
          reservation.licensePlate !== licensePlate) {
        return res.status(400).json({
          success: false,
          message: '预约信息与入场信息不匹配'
        });
      }
    }
    
    // 创建停车记录
    const parkingRecord = await ParkingRecord.create({
      user: req.user._id,
      parkingLot: parkingLotId,
      parkingSpace,
      licensePlate,
      vehicleType: vehicleType || '小型车',
      entryTime: new Date(),
      reservation: reservationId
    });
    
    // 更新车位状态
    space.status = '占用';
    parkingLot.availableSpaces = Math.max(0, parkingLot.availableSpaces - 1);
    await parkingLot.save();
    
    // 如果有预约，更新预约状态
    if (reservation) {
      reservation.status = '已使用';
      await reservation.save();
    }
    
    res.status(201).json({
      success: true,
      data: parkingRecord
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    更新停车记录（出场）
// @route   PUT /api/parking/records/:id/exit
// @access  Private
export const updateParkingExit = async (req, res) => {
  try {
    const parkingRecord = await ParkingRecord.findById(req.params.id);
    
    if (!parkingRecord) {
      return res.status(404).json({
        success: false,
        message: '找不到该停车记录'
      });
    }
    
    // 验证是否是当前用户的停车记录
    if (parkingRecord.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权操作此停车记录'
      });
    }
    
    // 检查是否已经出场
    if (parkingRecord.exitTime) {
      return res.status(400).json({
        success: false,
        message: '该车辆已经出场'
      });
    }
    
    // 更新出场时间
    parkingRecord.exitTime = new Date();
    parkingRecord.isActive = false;
    
    // 计算停车时长和费用
    await parkingRecord.calculateFeeAndDuration();
    
    // 更新停车场车位状态
    const parkingLot = await ParkingLot.findById(parkingRecord.parkingLot);
    
    if (parkingLot) {
      // 查找车位
      const spaceIndex = parkingLot.parkingSpaces.findIndex(
        space => space.spaceNumber === parkingRecord.parkingSpace
      );
      
      if (spaceIndex !== -1) {
        // 更新车位状态
        parkingLot.parkingSpaces[spaceIndex].status = '空闲';
        parkingLot.availableSpaces = Math.min(parkingLot.totalSpaces, parkingLot.availableSpaces + 1);
        await parkingLot.save();
      }
    }
    
    await parkingRecord.save();
    
    res.json({
      success: true,
      data: {
        parkingRecord,
        fee: parkingRecord.fee,
        duration: parkingRecord.duration
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

// @desc    支付停车费
// @route   PUT /api/parking/records/:id/payment
// @access  Private
export const payParkingFee = async (req, res) => {
  try {
    const { paymentMethod } = req.body;
    
    const parkingRecord = await ParkingRecord.findById(req.params.id);
    
    if (!parkingRecord) {
      return res.status(404).json({
        success: false,
        message: '找不到该停车记录'
      });
    }
    
    // 验证是否是当前用户的停车记录
    if (parkingRecord.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权操作此停车记录'
      });
    }
    
    // 检查是否已支付
    if (parkingRecord.paymentStatus === '已支付') {
      return res.status(400).json({
        success: false,
        message: '该停车费已支付'
      });
    }
    
    // 如果未出场，更新出场时间并计算费用
    if (!parkingRecord.exitTime) {
      parkingRecord.exitTime = new Date();
      parkingRecord.isActive = false;
      await parkingRecord.calculateFeeAndDuration();
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
      if (user.wallet.balance < parkingRecord.fee) {
        return res.status(400).json({
          success: false,
          message: '钱包余额不足'
        });
      }
      
      // 扣除余额
      user.wallet.balance -= parkingRecord.fee;
      
      // 添加交易记录
      user.wallet.transactions.push({
        amount: -parkingRecord.fee,
        type: '消费',
        description: `支付停车费 - ${parkingRecord._id}`,
        createdAt: new Date()
      });
      
      await user.save();
    } else {
      // 其他支付方式，实际应用中应对接支付接口
      // 这里假设支付已成功
    }
    
    // 更新支付状态
    parkingRecord.paymentStatus = '已支付';
    parkingRecord.paymentMethod = paymentMethod;
    parkingRecord.paymentTime = new Date();
    parkingRecord.paymentId = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    await parkingRecord.save();
    
    // 如果车辆还未出场，更新停车场车位状态
    if (parkingRecord.isActive) {
      const parkingLot = await ParkingLot.findById(parkingRecord.parkingLot);
      
      if (parkingLot) {
        // 查找车位
        const spaceIndex = parkingLot.parkingSpaces.findIndex(
          space => space.spaceNumber === parkingRecord.parkingSpace
        );
        
        if (spaceIndex !== -1) {
          // 更新车位状态
          parkingLot.parkingSpaces[spaceIndex].status = '空闲';
          parkingLot.availableSpaces = Math.min(parkingLot.totalSpaces, parkingLot.availableSpaces + 1);
          await parkingLot.save();
        }
      }
      
      parkingRecord.isActive = false;
      await parkingRecord.save();
    }
    
    res.json({
      success: true,
      data: parkingRecord
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    获取用户的停车记录
// @route   GET /api/parking/records
// @access  Private
export const getUserParkingRecords = async (req, res) => {
  try {
    // 分页参数
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // 筛选参数
    const filter = { user: req.user._id };
    
    // 按状态筛选
    if (req.query.isActive) {
      filter.isActive = req.query.isActive === 'true';
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
      filter.entryTime = { $gte: new Date(req.query.startDate) };
    }
    
    if (req.query.endDate) {
      if (!filter.entryTime) filter.entryTime = {};
      filter.entryTime.$lte = new Date(req.query.endDate);
    }
    
    // 查询停车记录
    const parkingRecords = await ParkingRecord.find(filter)
      .sort({ entryTime: -1 })
      .skip(skip)
      .limit(limit)
      .populate('parkingLot', 'name address');
    
    // 获取总数
    const total = await ParkingRecord.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        parkingRecords,
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

// @desc    获取单个停车记录详情
// @route   GET /api/parking/records/:id
// @access  Private
export const getParkingRecordById = async (req, res) => {
  try {
    const parkingRecord = await ParkingRecord.findById(req.params.id)
      .populate('parkingLot', 'name address pricePerHour specialRates')
      .populate('user', 'name phone');
    
    if (!parkingRecord) {
      return res.status(404).json({
        success: false,
        message: '找不到该停车记录'
      });
    }
    
    // 验证是否是当前用户的停车记录
    if (parkingRecord.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权查看此停车记录'
      });
    }
    
    res.json({
      success: true,
      data: parkingRecord
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    获取当前活跃的停车记录
// @route   GET /api/parking/records/active
// @access  Private
export const getActiveParkingRecords = async (req, res) => {
  try {
    const activeRecords = await ParkingRecord.find({
      user: req.user._id,
      isActive: true
    }).populate('parkingLot', 'name address');
    
    res.json({
      success: true,
      data: activeRecords
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MAX_RESERVATION_TIME = parseInt(process.env.MAX_RESERVATION_TIME) || 120; // 默认最大预约时间为120分钟

const reservationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parkingLot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingLot',
    required: true
  },
  parkingSpace: {
    type: String,
    required: true
  },
  licensePlate: {
    type: String,
    required: true
  },
  vehicleType: {
    type: String,
    enum: ['小型车', '中型车', '大型车', '新能源车'],
    default: '小型车'
  },
  reservationTime: {
    type: Date,
    required: true
  },
  expiryTime: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        const reservationTime = new Date(this.reservationTime);
        const expiryTime = new Date(value);
        const diffMinutes = (expiryTime - reservationTime) / (1000 * 60);
        return diffMinutes > 0 && diffMinutes <= MAX_RESERVATION_TIME;
      },
      message: `预约时长不能超过${MAX_RESERVATION_TIME}分钟`
    }
  },
  status: {
    type: String,
    enum: ['待确认', '已确认', '已使用', '已过期', '已取消'],
    default: '待确认'
  },
  fee: {
    type: Number, // 预约费用
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['未支付', '已支付', '已退款', '已取消'],
    default: '未支付'
  },
  paymentMethod: {
    type: String,
    enum: ['钱包余额', '微信支付', '支付宝', '银行卡'],
    default: null
  },
  paymentTime: {
    type: Date,
    default: null
  },
  paymentId: {
    type: String, // 支付交易ID
    default: null
  },
  confirmationCode: {
    type: String, // 预约确认码
    default: function() {
      // 生成6位随机确认码
      return Math.floor(100000 + Math.random() * 900000).toString();
    }
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时间中间件
reservationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 创建索引以提高查询性能
reservationSchema.index({ user: 1, status: 1 });
reservationSchema.index({ parkingLot: 1, parkingSpace: 1, reservationTime: 1 });
reservationSchema.index({ expiryTime: 1, status: 1 }); // 用于查找过期预约

// 静态方法：查找冲突的预约
reservationSchema.statics.findConflicts = function(parkingLotId, parkingSpace, startTime, endTime, excludeReservationId = null) {
  const query = {
    parkingLot: parkingLotId,
    parkingSpace: parkingSpace,
    status: { $in: ['待确认', '已确认'] },
    $or: [
      // 新预约的开始时间在现有预约的时间范围内
      { reservationTime: { $lte: endTime }, expiryTime: { $gte: startTime } }
    ]
  };
  
  // 如果提供了要排除的预约ID，则排除该预约
  if (excludeReservationId) {
    query._id = { $ne: excludeReservationId };
  }
  
  return this.find(query);
};

const Reservation = mongoose.model('Reservation', reservationSchema);

export default Reservation;
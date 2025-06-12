import mongoose from 'mongoose';

const parkingRecordSchema = new mongoose.Schema({
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
  entryTime: {
    type: Date,
    default: Date.now
  },
  exitTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // 停车时长（分钟）
    default: 0
  },
  fee: {
    type: Number, // 停车费用
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['未支付', '已支付', '已取消'],
    default: '未支付'
  },
  paymentMethod: {
    type: String,
    enum: ['钱包余额', '微信支付', '支付宝', '银行卡', '现金'],
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
  isActive: {
    type: Boolean, // 是否是当前活跃的停车记录
    default: true
  },
  reservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    default: null
  },
  entryPhoto: String, // 入场照片URL
  exitPhoto: String, // 出场照片URL
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
parkingRecordSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 计算停车时长和费用的方法
parkingRecordSchema.methods.calculateFeeAndDuration = async function() {
  if (!this.exitTime) {
    this.exitTime = new Date();
  }
  
  // 计算停车时长（分钟）
  const entryTime = new Date(this.entryTime);
  const exitTime = new Date(this.exitTime);
  const durationMs = exitTime - entryTime;
  this.duration = Math.ceil(durationMs / (1000 * 60)); // 向上取整到分钟
  
  // 获取停车场信息以计算费用
  const ParkingLot = mongoose.model('ParkingLot');
  const parkingLot = await ParkingLot.findById(this.parkingLot);
  
  if (!parkingLot) {
    throw new Error('找不到停车场信息');
  }
  
  // 查找特殊费率
  let hourlyRate = parkingLot.pricePerHour;
  const specialRate = parkingLot.specialRates.find(rate => rate.vehicleType === this.vehicleType);
  
  if (specialRate) {
    hourlyRate = specialRate.pricePerHour;
  }
  
  // 计算费用（向上取整到小时）
  const hours = Math.ceil(this.duration / 60);
  this.fee = hours * hourlyRate;
  
  return this;
};

const ParkingRecord = mongoose.model('ParkingRecord', parkingRecordSchema);

export default ParkingRecord;
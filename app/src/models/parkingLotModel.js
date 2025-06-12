import mongoose from 'mongoose';

const parkingLotSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '停车场名称是必填项'],
    trim: true
  },
  address: {
    type: String,
    required: [true, '地址是必填项']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [经度, 纬度]
      required: true
    }
  },
  totalSpaces: {
    type: Number,
    required: [true, '总车位数是必填项'],
    min: [1, '总车位数必须大于0']
  },
  availableSpaces: {
    type: Number,
    validate: {
      validator: function(val) {
        return val >= 0 && val <= this.totalSpaces;
      },
      message: '可用车位数必须在0和总车位数之间'
    },
    default: function() {
      return this.totalSpaces;
    }
  },
  pricePerHour: {
    type: Number,
    required: [true, '每小时价格是必填项'],
    min: [0, '价格不能为负']
  },
  specialRates: [{
    vehicleType: {
      type: String,
      enum: ['小型车', '中型车', '大型车', '新能源车'],
      required: true
    },
    pricePerHour: {
      type: Number,
      required: true,
      min: [0, '价格不能为负']
    },
    description: String
  }],
  businessHours: {
    open: {
      type: String,
      default: '00:00' // 24小时制
    },
    close: {
      type: String,
      default: '23:59' // 24小时制
    },
    is24Hours: {
      type: Boolean,
      default: true
    },
    weekdayHours: [{
      day: {
        type: String,
        enum: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
        required: true
      },
      open: String,
      close: String,
      isClosed: {
        type: Boolean,
        default: false
      }
    }]
  },
  facilities: [{
    type: String,
    enum: ['充电桩', '洗车', '维修', '便利店', '残疾人设施', '安保']
  }],
  images: [String],
  contactPhone: String,
  description: String,
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['营业中', '临时关闭', '永久关闭', '装修中'],
    default: '营业中'
  },
  parkingSpaces: [{
    spaceNumber: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['普通', '残疾人专用', '充电专用', 'VIP'],
      default: '普通'
    },
    status: {
      type: String,
      enum: ['空闲', '占用', '预约', '维护'],
      default: '空闲'
    },
    floor: {
      type: String,
      default: '1'
    },
    section: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 创建地理空间索引
parkingLotSchema.index({ location: '2dsphere' });

// 更新时间中间件
parkingLotSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 静态方法：查找附近的停车场
parkingLotSchema.statics.findNearby = function(longitude, latitude, maxDistance = 5000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance // 单位：米
      }
    }
  });
};

const ParkingLot = mongoose.model('ParkingLot', parkingLotSchema);

export default ParkingLot;
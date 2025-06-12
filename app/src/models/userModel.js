import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '用户名是必填项'],
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, '密码是必填项'],
    minlength: [6, '密码至少需要6个字符'],
    select: false // 查询时默认不返回密码
  },
  name: {
    type: String,
    required: [true, '姓名是必填项']
  },
  phone: {
    type: String,
    required: [true, '手机号是必填项'],
    unique: true,
    validate: {
      validator: function(v) {
        return /^1[3-9]\d{9}$/.test(v);
      },
      message: props => `${props.value}不是有效的手机号码`
    }
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: props => `${props.value}不是有效的邮箱地址`
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user'
  },
  licensePlates: [{
    plateNumber: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          // 简化的中国车牌号验证
          return /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-Z0-9]{5,6}$/.test(v);
        },
        message: props => `${props.value}不是有效的车牌号`
      }
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    vehicleType: {
      type: String,
      enum: ['小型车', '中型车', '大型车', '新能源车'],
      default: '小型车'
    }
  }],
  wallet: {
    balance: {
      type: Number,
      default: 0
    },
    transactions: [{
      amount: Number,
      type: {
        type: String,
        enum: ['充值', '消费', '退款']
      },
      description: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
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
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 密码加密中间件
userSchema.pre('save', async function(next) {
  // 只有在密码被修改时才进行加密
  if (!this.isModified('password')) return next();
  
  try {
    // 生成盐并加密密码
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 验证密码方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
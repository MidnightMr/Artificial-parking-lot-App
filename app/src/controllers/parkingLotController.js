import ParkingLot from '../models/parkingLotModel.js';

// @desc    获取所有停车场
// @route   GET /api/parking/lots
// @access  Public
export const getParkingLots = async (req, res) => {
  try {
    // 分页参数
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // 筛选参数
    const filter = {};
    
    // 按状态筛选
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // 按设施筛选
    if (req.query.facilities) {
      const facilitiesArray = req.query.facilities.split(',');
      filter.facilities = { $all: facilitiesArray };
    }
    
    // 按可用车位筛选
    if (req.query.availableSpaces) {
      filter.availableSpaces = { $gte: parseInt(req.query.availableSpaces) };
    }
    
    // 查询停车场
    const parkingLots = await ParkingLot.find(filter)
      .skip(skip)
      .limit(limit)
      .select('name address location totalSpaces availableSpaces pricePerHour facilities status rating');
    
    // 获取总数
    const total = await ParkingLot.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        parkingLots,
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

// @desc    获取附近的停车场
// @route   GET /api/parking/lots/nearby
// @access  Public
export const getNearbyParkingLots = async (req, res) => {
  try {
    const { longitude, latitude, distance = 5000 } = req.query; // 默认5公里范围
    
    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: '经度和纬度是必需的'
      });
    }
    
    // 查询附近的停车场
    const parkingLots = await ParkingLot.findNearby(
      parseFloat(longitude),
      parseFloat(latitude),
      parseFloat(distance)
    ).select('name address location totalSpaces availableSpaces pricePerHour facilities status rating');
    
    res.json({
      success: true,
      data: parkingLots
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    获取单个停车场详情
// @route   GET /api/parking/lots/:id
// @access  Public
export const getParkingLotById = async (req, res) => {
  try {
    const parkingLot = await ParkingLot.findById(req.params.id);
    
    if (!parkingLot) {
      return res.status(404).json({
        success: false,
        message: '找不到该停车场'
      });
    }
    
    res.json({
      success: true,
      data: parkingLot
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    创建新停车场（管理员）
// @route   POST /api/parking/lots
// @access  Private/Admin
export const createParkingLot = async (req, res) => {
  try {
    const {
      name,
      address,
      location,
      totalSpaces,
      pricePerHour,
      specialRates,
      businessHours,
      facilities,
      contactPhone,
      description,
      parkingSpaces
    } = req.body;
    
    // 创建停车场
    const parkingLot = await ParkingLot.create({
      name,
      address,
      location,
      totalSpaces,
      availableSpaces: totalSpaces, // 初始可用车位等于总车位
      pricePerHour,
      specialRates,
      businessHours,
      facilities,
      contactPhone,
      description,
      parkingSpaces: parkingSpaces || generateParkingSpaces(totalSpaces) // 如果未提供车位信息，则自动生成
    });
    
    res.status(201).json({
      success: true,
      data: parkingLot
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    更新停车场信息（管理员）
// @route   PUT /api/parking/lots/:id
// @access  Private/Admin
export const updateParkingLot = async (req, res) => {
  try {
    const parkingLot = await ParkingLot.findById(req.params.id);
    
    if (!parkingLot) {
      return res.status(404).json({
        success: false,
        message: '找不到该停车场'
      });
    }
    
    // 更新停车场信息
    const updatedParkingLot = await ParkingLot.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      data: updatedParkingLot
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    删除停车场（管理员）
// @route   DELETE /api/parking/lots/:id
// @access  Private/Admin
export const deleteParkingLot = async (req, res) => {
  try {
    const parkingLot = await ParkingLot.findById(req.params.id);
    
    if (!parkingLot) {
      return res.status(404).json({
        success: false,
        message: '找不到该停车场'
      });
    }
    
    await parkingLot.remove();
    
    res.json({
      success: true,
      message: '停车场已删除'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    更新停车场车位状态（管理员）
// @route   PUT /api/parking/lots/:id/spaces/:spaceNumber
// @access  Private/Admin
export const updateParkingSpace = async (req, res) => {
  try {
    const { id, spaceNumber } = req.params;
    const { status } = req.body;
    
    const parkingLot = await ParkingLot.findById(id);
    
    if (!parkingLot) {
      return res.status(404).json({
        success: false,
        message: '找不到该停车场'
      });
    }
    
    // 查找车位
    const spaceIndex = parkingLot.parkingSpaces.findIndex(
      space => space.spaceNumber === spaceNumber
    );
    
    if (spaceIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '找不到该车位'
      });
    }
    
    // 获取当前车位状态
    const currentStatus = parkingLot.parkingSpaces[spaceIndex].status;
    
    // 更新车位状态
    parkingLot.parkingSpaces[spaceIndex].status = status;
    
    // 更新可用车位数量
    if (currentStatus === '空闲' && status !== '空闲') {
      parkingLot.availableSpaces = Math.max(0, parkingLot.availableSpaces - 1);
    } else if (currentStatus !== '空闲' && status === '空闲') {
      parkingLot.availableSpaces = Math.min(parkingLot.totalSpaces, parkingLot.availableSpaces + 1);
    }
    
    await parkingLot.save();
    
    res.json({
      success: true,
      data: parkingLot.parkingSpaces[spaceIndex]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    添加停车场评价
// @route   POST /api/parking/lots/:id/reviews
// @access  Private
export const addParkingLotReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: '评分必须在1到5之间'
      });
    }
    
    const parkingLot = await ParkingLot.findById(req.params.id);
    
    if (!parkingLot) {
      return res.status(404).json({
        success: false,
        message: '找不到该停车场'
      });
    }
    
    // 检查用户是否已经评价过
    const alreadyReviewed = parkingLot.reviews.find(
      review => review.user.toString() === req.user._id.toString()
    );
    
    if (alreadyReviewed) {
      return res.status(400).json({
        success: false,
        message: '您已经评价过该停车场'
      });
    }
    
    // 创建新评价
    const review = {
      user: req.user._id,
      rating: Number(rating),
      comment
    };
    
    // 添加评价
    parkingLot.reviews.push(review);
    
    // 更新评分
    parkingLot.rating.count = parkingLot.reviews.length;
    parkingLot.rating.average = parkingLot.reviews.reduce((acc, item) => item.rating + acc, 0) / parkingLot.reviews.length;
    
    await parkingLot.save();
    
    res.status(201).json({
      success: true,
      message: '评价已添加',
      data: review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 辅助函数：生成停车位
const generateParkingSpaces = (totalSpaces) => {
  const spaces = [];
  
  for (let i = 1; i <= totalSpaces; i++) {
    spaces.push({
      spaceNumber: `A-${i.toString().padStart(3, '0')}`,
      type: '普通',
      status: '空闲',
      floor: '1'
    });
  }
  
  return spaces;
};
import express from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  addLicensePlate,
  deleteLicensePlate,
  setDefaultLicensePlate,
  getWallet,
  rechargeWallet
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 公共路由
router.post('/register', registerUser);
router.post('/login', loginUser);

// 受保护的路由
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

// 车牌管理路由
router.post('/license-plates', protect, addLicensePlate);
router.delete('/license-plates/:plateNumber', protect, deleteLicensePlate);
router.put('/license-plates/:plateNumber/default', protect, setDefaultLicensePlate);

// 钱包路由
router.get('/wallet', protect, getWallet);
router.post('/wallet/recharge', protect, rechargeWallet);

export default router;
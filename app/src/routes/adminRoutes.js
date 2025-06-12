import express from 'express';
import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getSystemStats,
  getIncomeReport,
  getUsageReport
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// 所有管理员路由都需要身份验证和授权
router.use(protect);
router.use(authorize('admin', 'superadmin'));

// 用户管理路由
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// 统计和报表路由
router.get('/stats', getSystemStats);
router.get('/reports/income', getIncomeReport);
router.get('/reports/usage', getUsageReport);

export default router;
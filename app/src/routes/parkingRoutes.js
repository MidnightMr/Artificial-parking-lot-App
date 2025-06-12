import express from 'express';
import {
  getParkingLots,
  getNearbyParkingLots,
  getParkingLotById,
  createParkingLot,
  updateParkingLot,
  deleteParkingLot,
  updateParkingSpace,
  addParkingLotReview
} from '../controllers/parkingLotController.js';
import {
  createParkingEntry,
  updateParkingExit,
  payParkingFee,
  getUserParkingRecords,
  getParkingRecordById,
  getActiveParkingRecords
} from '../controllers/parkingRecordController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// 停车场路由
router.get('/lots', getParkingLots);
router.get('/lots/nearby', getNearbyParkingLots);
router.get('/lots/:id', getParkingLotById);

// 管理员停车场路由
router.post('/lots', protect, authorize('admin', 'superadmin'), createParkingLot);
router.put('/lots/:id', protect, authorize('admin', 'superadmin'), updateParkingLot);
router.delete('/lots/:id', protect, authorize('admin', 'superadmin'), deleteParkingLot);
router.put('/lots/:id/spaces/:spaceNumber', protect, authorize('admin', 'superadmin'), updateParkingSpace);

// 停车场评价路由
router.post('/lots/:id/reviews', protect, addParkingLotReview);

// 停车记录路由
router.post('/records/entry', protect, createParkingEntry);
router.put('/records/:id/exit', protect, updateParkingExit);
router.put('/records/:id/payment', protect, payParkingFee);
router.get('/records', protect, getUserParkingRecords);
router.get('/records/active', protect, getActiveParkingRecords);
router.get('/records/:id', protect, getParkingRecordById);

export default router;
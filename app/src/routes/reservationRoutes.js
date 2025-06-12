import express from 'express';
import {
  createReservation,
  payReservation,
  cancelReservation,
  getUserReservations,
  getReservationById,
  getActiveReservations
} from '../controllers/reservationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 预约路由
router.post('/', protect, createReservation);
router.put('/:id/payment', protect, payReservation);
router.put('/:id/cancel', protect, cancelReservation);
router.get('/', protect, getUserReservations);
router.get('/active', protect, getActiveReservations);
router.get('/:id', protect, getReservationById);

export default router;
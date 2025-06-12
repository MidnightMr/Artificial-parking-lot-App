import { mysqlTable, varchar, int, timestamp, boolean, text, decimal, json } from 'drizzle-orm/mysql-core'
import { createId } from './utils'

// 用户表
export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey().notNull().$defaultFn(createId),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 100 }),
  role: varchar('role', { length: 20 }).notNull().default('user'),
  walletBalance: decimal('wallet_balance', { precision: 10, scale: 2 }).notNull().default('0.00'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

// 车牌表
export const licensePlates = mysqlTable('license_plates', {
  id: varchar('id', { length: 36 }).primaryKey().notNull().$defaultFn(createId),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  plateNumber: varchar('plate_number', { length: 20 }).notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

// 停车场表
export const parkingLots = mysqlTable('parking_lots', {
  id: varchar('id', { length: 36 }).primaryKey().notNull().$defaultFn(createId),
  name: varchar('name', { length: 100 }).notNull(),
  address: varchar('address', { length: 255 }).notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 7 }).notNull(),
  longitude: decimal('longitude', { precision: 10, scale: 7 }).notNull(),
  totalSpaces: int('total_spaces').notNull(),
  availableSpaces: int('available_spaces').notNull(),
  pricePerHour: decimal('price_per_hour', { precision: 10, scale: 2 }).notNull(),
  specialRates: json('special_rates'),
  businessHours: json('business_hours'),
  facilities: json('facilities'),
  images: json('images'),
  contact: varchar('contact', { length: 100 }),
  description: text('description'),
  rating: decimal('rating', { precision: 3, scale: 2 }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

// 停车位表
export const parkingSpaces = mysqlTable('parking_spaces', {
  id: varchar('id', { length: 36 }).primaryKey().notNull().$defaultFn(createId),
  parkingLotId: varchar('parking_lot_id', { length: 36 }).notNull().references(() => parkingLots.id, { onDelete: 'cascade' }),
  spaceNumber: varchar('space_number', { length: 20 }).notNull(),
  floor: varchar('floor', { length: 10 }),
  type: varchar('type', { length: 20 }).notNull().default('standard'),
  status: varchar('status', { length: 20 }).notNull().default('available'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

// 停车记录表
export const parkingRecords = mysqlTable('parking_records', {
  id: varchar('id', { length: 36 }).primaryKey().notNull().$defaultFn(createId),
  userId: varchar('user_id', { length: 36 }).references(() => users.id),
  parkingLotId: varchar('parking_lot_id', { length: 36 }).notNull().references(() => parkingLots.id),
  parkingSpaceId: varchar('parking_space_id', { length: 36 }).references(() => parkingSpaces.id),
  licensePlate: varchar('license_plate', { length: 20 }).notNull(),
  vehicleType: varchar('vehicle_type', { length: 20 }).notNull().default('car'),
  entryTime: timestamp('entry_time').notNull(),
  exitTime: timestamp('exit_time'),
  duration: int('duration'),
  fee: decimal('fee', { precision: 10, scale: 2 }),
  paymentStatus: varchar('payment_status', { length: 20 }).notNull().default('pending'),
  paymentMethod: varchar('payment_method', { length: 20 }),
  paymentTime: timestamp('payment_time'),
  isActive: boolean('is_active').notNull().default(true),
  reservationId: varchar('reservation_id', { length: 36 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

// 预约表
export const reservations = mysqlTable('reservations', {
  id: varchar('id', { length: 36 }).primaryKey().notNull().$defaultFn(createId),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  parkingLotId: varchar('parking_lot_id', { length: 36 }).notNull().references(() => parkingLots.id),
  parkingSpaceId: varchar('parking_space_id', { length: 36 }).references(() => parkingSpaces.id),
  licensePlate: varchar('license_plate', { length: 20 }).notNull(),
  vehicleType: varchar('vehicle_type', { length: 20 }).notNull().default('car'),
  reservationTime: timestamp('reservation_time').notNull(),
  expiryTime: timestamp('expiry_time').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  fee: decimal('fee', { precision: 10, scale: 2 }).notNull(),
  paymentStatus: varchar('payment_status', { length: 20 }).notNull().default('pending'),
  paymentMethod: varchar('payment_method', { length: 20 }),
  paymentTime: timestamp('payment_time'),
  confirmationCode: varchar('confirmation_code', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

// 钱包交易记录表
export const walletTransactions = mysqlTable('wallet_transactions', {
  id: varchar('id', { length: 36 }).primaryKey().notNull().$defaultFn(createId),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('completed'),
  description: varchar('description', { length: 255 }),
  referenceId: varchar('reference_id', { length: 36 }),
  referenceType: varchar('reference_type', { length: 20 }),
  createdAt: timestamp('created_at').notNull().defaultNow()
})
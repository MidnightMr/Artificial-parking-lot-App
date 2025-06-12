import { randomUUID } from 'crypto'

/**
 * 生成唯一ID（UUID v4）
 * 用于数据库记录的主键
 */
export const createId = () => {
  return randomUUID()
}
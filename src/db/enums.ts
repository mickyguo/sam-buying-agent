export const ProductStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus]

export const GroupStatus = {
  OPEN: 'OPEN',
  FILLED: 'FILLED',
  EXPIRED: 'EXPIRED',
  PURCHASING: 'PURCHASING',
  COMPLETED: 'COMPLETED',
} as const
export type GroupStatus = (typeof GroupStatus)[keyof typeof GroupStatus]

export const PayStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  REFUNDED: 'REFUNDED',
} as const
export type PayStatus = (typeof PayStatus)[keyof typeof PayStatus]

export const OrderType = {
  DIRECT: 'DIRECT',
  GROUP: 'GROUP',
} as const
export type OrderType = (typeof OrderType)[keyof typeof OrderType]

export const OrderStatus = {
  PENDING_PAY: 'PENDING_PAY',
  PAID: 'PAID',
  PURCHASING: 'PURCHASING',
  DELIVERING: 'DELIVERING',
  COMPLETED: 'COMPLETED',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED',
} as const
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]

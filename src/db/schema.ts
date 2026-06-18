import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

/** Prisma 迁移的 updatedAt 列无数据库默认值，需在应用层写入 */
function updatedAtColumn(name = 'updatedAt') {
  return timestamp(name, { precision: 3, mode: 'date' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
}

export const productStatusEnum = pgEnum('ProductStatus', ['ACTIVE', 'INACTIVE'])
export const groupStatusEnum = pgEnum('GroupStatus', [
  'OPEN',
  'FILLED',
  'EXPIRED',
  'PURCHASING',
  'COMPLETED',
])
export const payStatusEnum = pgEnum('PayStatus', ['PENDING', 'PAID', 'REFUNDED'])
export const orderTypeEnum = pgEnum('OrderType', ['DIRECT', 'GROUP'])
export const orderStatusEnum = pgEnum('OrderStatus', [
  'PENDING_PAY',
  'PAID',
  'PURCHASING',
  'DELIVERING',
  'COMPLETED',
  'REFUNDED',
  'CANCELLED',
])

export const user = pgTable(
  'User',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('emailVerified').notNull().default(false),
    image: text('image'),
    openid: text('openid'),
    nickname: text('nickname'),
    avatarUrl: text('avatarUrl'),
    phone: text('phone'),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('User_openid_key').on(table.openid),
    uniqueIndex('User_phone_key').on(table.phone),
    uniqueIndex('User_email_key').on(table.email),
  ],
)

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expiresAt', { precision: 3, mode: 'date' }).notNull(),
    token: text('token').notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: updatedAtColumn(),
    ipAddress: text('ipAddress'),
    userAgent: text('userAgent'),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [uniqueIndex('session_token_key').on(table.token)],
)

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt', {
    precision: 3,
    mode: 'date',
  }),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', {
    precision: 3,
    mode: 'date',
  }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
    .notNull()
    .defaultNow(),
  updatedAt: updatedAtColumn(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt', { precision: 3, mode: 'date' }).notNull(),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' }),
})

export const smsCode = pgTable(
  'SmsCode',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    phone: text('phone').notNull(),
    code: text('code').notNull(),
    expiresAt: timestamp('expiresAt', { precision: 3, mode: 'date' }).notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('SmsCode_phone_expiresAt_idx').on(table.phone, table.expiresAt)],
)

export const product = pgTable(
  'Product',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text('name').notNull(),
    imageUrl: text('imageUrl').notNull(),
    price: integer('price').notNull(),
    splittable: boolean('splittable').notNull().default(false),
    totalUnits: integer('totalUnits'),
    unitLabel: text('unitLabel'),
    description: text('description'),
    sourceUrl: text('sourceUrl'),
    externalId: text('externalId'),
    lastSyncedAt: timestamp('lastSyncedAt', { precision: 3, mode: 'date' }),
    status: productStatusEnum('status').notNull().default('ACTIVE'),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [uniqueIndex('Product_externalId_key').on(table.externalId)],
)

export const groupOrder = pgTable(
  'GroupOrder',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    productId: text('productId')
      .notNull()
      .references(() => product.id),
    initiatorId: text('initiatorId')
      .notNull()
      .references(() => user.id),
    totalUnits: integer('totalUnits').notNull(),
    filledUnits: integer('filledUnits').notNull().default(0),
    reservedUnits: integer('reservedUnits').notNull().default(0),
    status: groupStatusEnum('status').notNull().default('OPEN'),
    expiresAt: timestamp('expiresAt', { precision: 3, mode: 'date' }).notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index('GroupOrder_productId_status_idx').on(table.productId, table.status),
    index('GroupOrder_expiresAt_status_idx').on(table.expiresAt, table.status),
  ],
)

export const order = pgTable(
  'Order',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    orderNo: text('orderNo').notNull(),
    userId: text('userId')
      .notNull()
      .references(() => user.id),
    type: orderTypeEnum('type').notNull(),
    productId: text('productId')
      .notNull()
      .references(() => product.id),
    groupOrderId: text('groupOrderId'),
    checkoutBatchId: text('checkoutBatchId'),
    units: integer('units').notNull().default(1),
    amount: integer('amount').notNull(),
    status: orderStatusEnum('status').notNull().default('PENDING_PAY'),
    wxPayTxnId: text('wxPayTxnId'),
    wxOutTradeNo: text('wxOutTradeNo'),
    paidAt: timestamp('paidAt', { precision: 3, mode: 'date' }),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('Order_orderNo_key').on(table.orderNo),
    uniqueIndex('Order_wxOutTradeNo_key').on(table.wxOutTradeNo),
    index('Order_userId_idx').on(table.userId),
    index('Order_status_idx').on(table.status),
    index('Order_groupOrderId_idx').on(table.groupOrderId),
    index('Order_checkoutBatchId_idx').on(table.checkoutBatchId),
  ],
)

export const groupParticipation = pgTable(
  'GroupParticipation',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    groupOrderId: text('groupOrderId')
      .notNull()
      .references(() => groupOrder.id),
    userId: text('userId')
      .notNull()
      .references(() => user.id),
    units: integer('units').notNull(),
    amount: integer('amount').notNull(),
    payStatus: payStatusEnum('payStatus').notNull().default('PENDING'),
    orderId: text('orderId').references(() => order.id),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex('GroupParticipation_orderId_key').on(table.orderId),
    index('GroupParticipation_groupOrderId_idx').on(table.groupOrderId),
    index('GroupParticipation_userId_idx').on(table.userId),
  ],
)

export const payBatch = pgTable(
  'PayBatch',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    outTradeNo: text('outTradeNo').notNull(),
    userId: text('userId')
      .notNull()
      .references(() => user.id),
    orderIds: text('orderIds').array().notNull(),
    totalAmount: integer('totalAmount').notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('PayBatch_outTradeNo_key').on(table.outTradeNo),
    index('PayBatch_userId_idx').on(table.userId),
  ],
)

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  participations: many(groupParticipation),
  orders: many(order),
  initiatedGroups: many(groupOrder),
  payBatches: many(payBatch),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

export const productRelations = relations(product, ({ many }) => ({
  groupOrders: many(groupOrder),
  orders: many(order),
}))

export const groupOrderRelations = relations(groupOrder, ({ one, many }) => ({
  product: one(product, {
    fields: [groupOrder.productId],
    references: [product.id],
  }),
  initiator: one(user, {
    fields: [groupOrder.initiatorId],
    references: [user.id],
  }),
  participations: many(groupParticipation),
}))

export const groupParticipationRelations = relations(
  groupParticipation,
  ({ one }) => ({
    groupOrder: one(groupOrder, {
      fields: [groupParticipation.groupOrderId],
      references: [groupOrder.id],
    }),
    user: one(user, {
      fields: [groupParticipation.userId],
      references: [user.id],
    }),
    order: one(order, {
      fields: [groupParticipation.orderId],
      references: [order.id],
    }),
  }),
)

export const orderRelations = relations(order, ({ one }) => ({
  user: one(user, {
    fields: [order.userId],
    references: [user.id],
  }),
  product: one(product, {
    fields: [order.productId],
    references: [product.id],
  }),
  participation: one(groupParticipation, {
    fields: [order.id],
    references: [groupParticipation.orderId],
  }),
}))

export const payBatchRelations = relations(payBatch, ({ one }) => ({
  user: one(user, {
    fields: [payBatch.userId],
    references: [user.id],
  }),
}))

export const schema = {
  user,
  session,
  account,
  verification,
  smsCode,
  product,
  groupOrder,
  groupParticipation,
  order,
  payBatch,
  userRelations,
  sessionRelations,
  accountRelations,
  productRelations,
  groupOrderRelations,
  groupParticipationRelations,
  orderRelations,
  payBatchRelations,
}

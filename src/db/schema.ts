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
export const groupMatchIntentStatusEnum = pgEnum('GroupMatchIntentStatus', [
  'PENDING',
  'MATCHED',
  'CANCELLED',
  'EXPIRED',
])

export const orderEventTypeEnum = pgEnum('OrderEventType', [
  'PAID',
  'GROUP_FILLED',
  'PURCHASING',
  'PURCHASE_PROOF',
  'PICKUP_READY',
  'COMPLETED',
])

export const wishPostStatusEnum = pgEnum('WishPostStatus', [
  'PENDING',
  'MATCHED',
  'CANCELLED',
  'EXPIRED',
])

export const productImportRequestStatusEnum = pgEnum('ProductImportRequestStatus', [
  'PENDING',
  'APPROVED',
  'REJECTED',
])

export const couponTypeEnum = pgEnum('CouponType', ['FIXED', 'PERCENT', 'FREE_SERVICE'])

export const userCouponStatusEnum = pgEnum('UserCouponStatus', [
  'AVAILABLE',
  'USED',
  'EXPIRED',
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
    pickupLocationId: text('pickupLocationId'),
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
    pickupCode: text('pickupCode'),
    pickupSlotId: text('pickupSlotId'),
    pickupLocationId: text('pickupLocationId'),
    referralCode: text('referralCode'),
    userCouponId: text('userCouponId'),
    couponDiscount: integer('couponDiscount').notNull().default(0),
    purchasedAt: timestamp('purchasedAt', { precision: 3, mode: 'date' }),
    pickupReadyAt: timestamp('pickupReadyAt', { precision: 3, mode: 'date' }),
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

export const purchaseProof = pgTable(
  'PurchaseProof',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    orderId: text('orderId')
      .notNull()
      .references(() => order.id, { onDelete: 'cascade' }),
    imageUrl: text('imageUrl').notNull(),
    note: text('note'),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('PurchaseProof_orderId_key').on(table.orderId)],
)

export const groupMatchIntent = pgTable(
  'GroupMatchIntent',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('userId')
      .notNull()
      .references(() => user.id),
    productId: text('productId')
      .notNull()
      .references(() => product.id),
    wantUnits: integer('wantUnits').notNull(),
    maxWaitHours: integer('maxWaitHours').notNull().default(24),
    status: groupMatchIntentStatusEnum('status').notNull().default('PENDING'),
    matchedGroupOrderId: text('matchedGroupOrderId').references(() => groupOrder.id),
    expiresAt: timestamp('expiresAt', { precision: 3, mode: 'date' }).notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index('GroupMatchIntent_productId_status_idx').on(table.productId, table.status),
    index('GroupMatchIntent_userId_idx').on(table.userId),
  ],
)

export const priceHistory = pgTable(
  'PriceHistory',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    productId: text('productId')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    price: integer('price').notNull(),
    recordedAt: timestamp('recordedAt', { precision: 3, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('PriceHistory_productId_recordedAt_idx').on(table.productId, table.recordedAt)],
)

export const notifySubscription = pgTable(
  'NotifySubscription',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    openid: text('openid').notNull(),
    types: text('types').array().notNull().default([]),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [uniqueIndex('NotifySubscription_userId_key').on(table.userId)],
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

export const orderEvent = pgTable(
  'OrderEvent',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    orderId: text('orderId')
      .notNull()
      .references(() => order.id, { onDelete: 'cascade' }),
    type: orderEventTypeEnum('type').notNull(),
    note: text('note'),
    imageUrl: text('imageUrl'),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('OrderEvent_orderId_idx').on(table.orderId)],
)

export const scenePackage = pgTable('ScenePackage', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text('name').notNull(),
  description: text('description'),
  coverImage: text('coverImage'),
  promptHint: text('promptHint'),
  sortOrder: integer('sortOrder').notNull().default(0),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
    .notNull()
    .defaultNow(),
  updatedAt: updatedAtColumn(),
})

export const scenePackageItem = pgTable(
  'ScenePackageItem',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    scenePackageId: text('scenePackageId')
      .notNull()
      .references(() => scenePackage.id, { onDelete: 'cascade' }),
    productId: text('productId')
      .notNull()
      .references(() => product.id),
    units: integer('units').notNull().default(1),
  },
  (table) => [
    index('ScenePackageItem_scenePackageId_idx').on(table.scenePackageId),
  ],
)

export const priceAlert = pgTable(
  'PriceAlert',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    productId: text('productId')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    targetPrice: integer('targetPrice'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('PriceAlert_userId_productId_key').on(table.userId, table.productId),
  ],
)

export const favoriteProduct = pgTable(
  'FavoriteProduct',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    productId: text('productId')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('FavoriteProduct_userId_productId_key').on(table.userId, table.productId),
  ],
)

export const pickupLocation = pgTable('PickupLocation', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text('name').notNull(),
  address: text('address').notNull(),
  latitude: text('latitude'),
  longitude: text('longitude'),
  communityTags: text('communityTags').array().notNull().default([]),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
    .notNull()
    .defaultNow(),
  updatedAt: updatedAtColumn(),
})

export const pickupSlot = pgTable(
  'PickupSlot',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    pickupLocationId: text('pickupLocationId')
      .notNull()
      .references(() => pickupLocation.id, { onDelete: 'cascade' }),
    slotDate: text('slotDate').notNull(),
    startTime: text('startTime').notNull(),
    endTime: text('endTime').notNull(),
    capacity: integer('capacity').notNull().default(20),
    bookedCount: integer('bookedCount').notNull().default(0),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('PickupSlot_location_date_idx').on(table.pickupLocationId, table.slotDate),
  ],
)

export const coupon = pgTable('Coupon', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text('name').notNull(),
  type: couponTypeEnum('type').notNull(),
  discountAmount: integer('discountAmount').notNull().default(0),
  minOrderAmount: integer('minOrderAmount').notNull().default(0),
  validDays: integer('validDays').notNull().default(30),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
    .notNull()
    .defaultNow(),
})

export const userCoupon = pgTable(
  'UserCoupon',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    couponId: text('couponId')
      .notNull()
      .references(() => coupon.id),
    status: userCouponStatusEnum('status').notNull().default('AVAILABLE'),
    expiresAt: timestamp('expiresAt', { precision: 3, mode: 'date' }).notNull(),
    usedAt: timestamp('usedAt', { precision: 3, mode: 'date' }),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('UserCoupon_userId_status_idx').on(table.userId, table.status)],
)

export const referralCode = pgTable(
  'ReferralCode',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('ReferralCode_userId_key').on(table.userId),
    uniqueIndex('ReferralCode_code_key').on(table.code),
  ],
)

export const referralInvite = pgTable(
  'ReferralInvite',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    inviterId: text('inviterId')
      .notNull()
      .references(() => user.id),
    inviteeId: text('inviteeId')
      .notNull()
      .references(() => user.id),
    status: text('status').notNull().default('PENDING'),
    rewardedAt: timestamp('rewardedAt', { precision: 3, mode: 'date' }),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('ReferralInvite_inviteeId_key').on(table.inviteeId),
    index('ReferralInvite_inviterId_idx').on(table.inviterId),
  ],
)

export const wishPost = pgTable(
  'WishPost',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('userId')
      .notNull()
      .references(() => user.id),
    productId: text('productId')
      .notNull()
      .references(() => product.id),
    wantUnits: integer('wantUnits').notNull(),
    maxWaitHours: integer('maxWaitHours').notNull().default(24),
    note: text('note'),
    status: wishPostStatusEnum('status').notNull().default('PENDING'),
    matchedGroupOrderId: text('matchedGroupOrderId').references(() => groupOrder.id),
    pickupLocationId: text('pickupLocationId'),
    expiresAt: timestamp('expiresAt', { precision: 3, mode: 'date' }).notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index('WishPost_productId_status_idx').on(table.productId, table.status),
    index('WishPost_userId_idx').on(table.userId),
  ],
)

export const productImportRequest = pgTable(
  'ProductImportRequest',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('userId')
      .notNull()
      .references(() => user.id),
    sourceUrl: text('sourceUrl').notNull(),
    status: productImportRequestStatusEnum('status').notNull().default('PENDING'),
    productId: text('productId').references(() => product.id),
    adminNote: text('adminNote'),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [index('ProductImportRequest_status_idx').on(table.status)],
)

export const groupLeaderStat = pgTable(
  'GroupLeaderStat',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    groupsCreated: integer('groupsCreated').notNull().default(0),
    groupsFilled: integer('groupsFilled').notNull().default(0),
    groupsExpired: integer('groupsExpired').notNull().default(0),
    badgeLevel: integer('badgeLevel').notNull().default(0),
    updatedAt: updatedAtColumn(),
  },
  (table) => [uniqueIndex('GroupLeaderStat_userId_key').on(table.userId)],
)

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  participations: many(groupParticipation),
  orders: many(order),
  initiatedGroups: many(groupOrder),
  payBatches: many(payBatch),
  matchIntents: many(groupMatchIntent),
  notifySubscription: one(notifySubscription),
  priceAlerts: many(priceAlert),
  favorites: many(favoriteProduct),
  userCoupons: many(userCoupon),
  referralCode: one(referralCode),
  wishPosts: many(wishPost),
  leaderStat: one(groupLeaderStat),
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
  priceHistory: many(priceHistory),
  priceAlerts: many(priceAlert),
  scenePackageItems: many(scenePackageItem),
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

export const orderRelations = relations(order, ({ one, many }) => ({
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
  purchaseProof: one(purchaseProof, {
    fields: [order.id],
    references: [purchaseProof.orderId],
  }),
  events: many(orderEvent),
  pickupSlot: one(pickupSlot, {
    fields: [order.pickupSlotId],
    references: [pickupSlot.id],
  }),
}))

export const purchaseProofRelations = relations(purchaseProof, ({ one }) => ({
  order: one(order, {
    fields: [purchaseProof.orderId],
    references: [order.id],
  }),
}))

export const groupMatchIntentRelations = relations(groupMatchIntent, ({ one }) => ({
  user: one(user, {
    fields: [groupMatchIntent.userId],
    references: [user.id],
  }),
  product: one(product, {
    fields: [groupMatchIntent.productId],
    references: [product.id],
  }),
  matchedGroupOrder: one(groupOrder, {
    fields: [groupMatchIntent.matchedGroupOrderId],
    references: [groupOrder.id],
  }),
}))

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  product: one(product, {
    fields: [priceHistory.productId],
    references: [product.id],
  }),
}))

export const notifySubscriptionRelations = relations(notifySubscription, ({ one }) => ({
  user: one(user, {
    fields: [notifySubscription.userId],
    references: [user.id],
  }),
}))

export const payBatchRelations = relations(payBatch, ({ one }) => ({
  user: one(user, {
    fields: [payBatch.userId],
    references: [user.id],
  }),
}))

export const orderEventRelations = relations(orderEvent, ({ one }) => ({
  order: one(order, {
    fields: [orderEvent.orderId],
    references: [order.id],
  }),
}))

export const scenePackageRelations = relations(scenePackage, ({ many }) => ({
  items: many(scenePackageItem),
}))

export const scenePackageItemRelations = relations(scenePackageItem, ({ one }) => ({
  scenePackage: one(scenePackage, {
    fields: [scenePackageItem.scenePackageId],
    references: [scenePackage.id],
  }),
  product: one(product, {
    fields: [scenePackageItem.productId],
    references: [product.id],
  }),
}))

export const priceAlertRelations = relations(priceAlert, ({ one }) => ({
  user: one(user, {
    fields: [priceAlert.userId],
    references: [user.id],
  }),
  product: one(product, {
    fields: [priceAlert.productId],
    references: [product.id],
  }),
}))

export const favoriteProductRelations = relations(favoriteProduct, ({ one }) => ({
  user: one(user, {
    fields: [favoriteProduct.userId],
    references: [user.id],
  }),
  product: one(product, {
    fields: [favoriteProduct.productId],
    references: [product.id],
  }),
}))

export const pickupLocationRelations = relations(pickupLocation, ({ many }) => ({
  slots: many(pickupSlot),
}))

export const pickupSlotRelations = relations(pickupSlot, ({ one, many }) => ({
  location: one(pickupLocation, {
    fields: [pickupSlot.pickupLocationId],
    references: [pickupLocation.id],
  }),
  orders: many(order),
}))

export const userCouponRelations = relations(userCoupon, ({ one }) => ({
  user: one(user, {
    fields: [userCoupon.userId],
    references: [user.id],
  }),
  coupon: one(coupon, {
    fields: [userCoupon.couponId],
    references: [coupon.id],
  }),
}))

export const referralCodeRelations = relations(referralCode, ({ one }) => ({
  user: one(user, {
    fields: [referralCode.userId],
    references: [user.id],
  }),
}))

export const wishPostRelations = relations(wishPost, ({ one }) => ({
  user: one(user, {
    fields: [wishPost.userId],
    references: [user.id],
  }),
  product: one(product, {
    fields: [wishPost.productId],
    references: [product.id],
  }),
  matchedGroupOrder: one(groupOrder, {
    fields: [wishPost.matchedGroupOrderId],
    references: [groupOrder.id],
  }),
}))

export const productImportRequestRelations = relations(productImportRequest, ({ one }) => ({
  user: one(user, {
    fields: [productImportRequest.userId],
    references: [user.id],
  }),
  product: one(product, {
    fields: [productImportRequest.productId],
    references: [product.id],
  }),
}))

export const groupLeaderStatRelations = relations(groupLeaderStat, ({ one }) => ({
  user: one(user, {
    fields: [groupLeaderStat.userId],
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
  purchaseProof,
  groupMatchIntent,
  priceHistory,
  notifySubscription,
  payBatch,
  orderEvent,
  scenePackage,
  scenePackageItem,
  priceAlert,
  favoriteProduct,
  pickupLocation,
  pickupSlot,
  coupon,
  userCoupon,
  referralCode,
  referralInvite,
  wishPost,
  productImportRequest,
  groupLeaderStat,
  userRelations,
  sessionRelations,
  accountRelations,
  productRelations,
  groupOrderRelations,
  groupParticipationRelations,
  orderRelations,
  purchaseProofRelations,
  groupMatchIntentRelations,
  priceHistoryRelations,
  notifySubscriptionRelations,
  payBatchRelations,
  orderEventRelations,
  scenePackageRelations,
  scenePackageItemRelations,
  priceAlertRelations,
  favoriteProductRelations,
  pickupLocationRelations,
  pickupSlotRelations,
  userCouponRelations,
  referralCodeRelations,
  wishPostRelations,
  productImportRequestRelations,
  groupLeaderStatRelations,
}

import { and, eq, inArray, lte } from 'drizzle-orm'
import { groupOrder, groupParticipation, order, product } from '@/db/schema'
import {
  GroupStatus,
  OrderStatus,
  OrderType,
  PayStatus,
  ProductStatus,
} from '@/db/enums'
import { db } from '@/lib/db'
import {
  calcSplitAmount,
  generateOrderNo,
  getExpireAt,
  getOrderPayTimeoutMinutes,
} from '@/lib/utils'
import { sendSubscribeMessage } from '@/lib/wechat'

function getAvailableUnits(group: {
  totalUnits: number
  filledUnits: number
  reservedUnits: number
}) {
  return group.totalUnits - group.filledUnits - group.reservedUnits
}

export function serializeGroupOrder(group: {
  id: string
  productId: string
  initiatorId: string
  totalUnits: number
  filledUnits: number
  reservedUnits: number
  status: GroupStatus
  expiresAt: Date
  createdAt: Date
  product: {
    id: string
    name: string
    imageUrl: string
    price: number
    unitLabel: string | null
    totalUnits: number | null
  }
  participations: Array<{
    id: string
    units: number
    amount: number
    payStatus: PayStatus
    user: {
      id: string
      nickname: string | null
      avatarUrl: string | null
    }
  }>
}) {
  const remainingUnits = getAvailableUnits(group)
  const committedUnits = group.filledUnits + group.reservedUnits

  return {
    id: group.id,
    productId: group.productId,
    initiatorId: group.initiatorId,
    productName: group.product.name,
    productImage: group.product.imageUrl,
    unitLabel: group.product.unitLabel ?? '份',
    totalUnits: group.totalUnits,
    filledUnits: group.filledUnits,
    reservedUnits: group.reservedUnits,
    committedUnits,
    remainingUnits,
    status: group.status,
    expiresAt: group.expiresAt.toISOString(),
    createdAt: group.createdAt.toISOString(),
    participations: group.participations
      .filter((item) => item.payStatus === PayStatus.PAID)
      .map((item) => ({
        id: item.id,
        units: item.units,
        amount: item.amount,
        user: {
          id: item.user.id,
          nickname: item.user.nickname,
          avatarUrl: item.user.avatarUrl,
        },
      })),
  }
}

export async function createGroupOrder(params: {
  userId: string
  productId: string
  units: number
  checkoutBatchId?: string
  pickupLocationId?: string
}) {
  const [productRow] = await db
    .select()
    .from(product)
    .where(eq(product.id, params.productId))
    .limit(1)

  if (!productRow || productRow.status !== ProductStatus.ACTIVE) {
    throw new Error('商品不存在或已下架')
  }
  if (!productRow.splittable || !productRow.totalUnits) {
    throw new Error('该商品不支持拼单')
  }
  if (params.units <= 0 || params.units > productRow.totalUnits) {
    throw new Error('拼单份数无效')
  }

  const amount = calcSplitAmount(
    productRow.price,
    productRow.totalUnits,
    params.units,
  )
  const orderNo = generateOrderNo()

  return db.transaction(async (tx) => {
    const [groupOrderRow] = await tx
      .insert(groupOrder)
      .values({
        productId: productRow.id,
        initiatorId: params.userId,
        pickupLocationId: params.pickupLocationId,
        totalUnits: productRow.totalUnits!,
        reservedUnits: params.units,
        expiresAt: getExpireAt(),
      })
      .returning()

    const [orderRow] = await tx
      .insert(order)
      .values({
        orderNo,
        userId: params.userId,
        type: OrderType.GROUP,
        productId: productRow.id,
        groupOrderId: groupOrderRow.id,
        units: params.units,
        amount,
        status: OrderStatus.PENDING_PAY,
        wxOutTradeNo: orderNo,
        checkoutBatchId: params.checkoutBatchId,
      })
      .returning()

    const [participation] = await tx
      .insert(groupParticipation)
      .values({
        groupOrderId: groupOrderRow.id,
        userId: params.userId,
        units: params.units,
        amount,
        payStatus: PayStatus.PENDING,
        orderId: orderRow.id,
      })
      .returning()

    return {
      groupOrder: groupOrderRow,
      order: orderRow,
      participation,
    }
  })
}

export async function createGroupOrderWithLeader(params: {
  userId: string
  productId: string
  units: number
  checkoutBatchId?: string
  pickupLocationId?: string
}) {
  const result = await createGroupOrder(params)
  const { incrementLeaderOnCreate } = await import('@/lib/group-leader')
  await incrementLeaderOnCreate(params.userId)
  return result
}

export async function joinGroupOrder(params: {
  userId: string
  groupOrderId: string
  units: number
  checkoutBatchId?: string
}) {
  return db.transaction(async (tx) => {
    const groupOrderRow = await tx.query.groupOrder.findFirst({
      where: eq(groupOrder.id, params.groupOrderId),
      with: { product: true },
    })

    if (!groupOrderRow) {
      throw new Error('拼单不存在')
    }
    if (groupOrderRow.status !== GroupStatus.OPEN) {
      throw new Error('拼单已结束')
    }
    if (groupOrderRow.expiresAt <= new Date()) {
      throw new Error('拼单已过期')
    }

    const remaining = getAvailableUnits(groupOrderRow)
    if (params.units <= 0 || params.units > remaining) {
      throw new Error(
        `最多还能拼 ${remaining} ${groupOrderRow.product.unitLabel ?? '份'}`,
      )
    }

    const existing = await tx.query.groupParticipation.findFirst({
      where: and(
        eq(groupParticipation.groupOrderId, groupOrderRow.id),
        eq(groupParticipation.userId, params.userId),
        inArray(groupParticipation.payStatus, [PayStatus.PENDING, PayStatus.PAID]),
      ),
    })
    if (existing) {
      throw new Error('你已参与该拼单')
    }

    const amount = calcSplitAmount(
      groupOrderRow.product.price,
      groupOrderRow.totalUnits,
      params.units,
    )
    const orderNo = generateOrderNo()

    const [orderRow] = await tx
      .insert(order)
      .values({
        orderNo,
        userId: params.userId,
        type: OrderType.GROUP,
        productId: groupOrderRow.productId,
        groupOrderId: groupOrderRow.id,
        units: params.units,
        amount,
        status: OrderStatus.PENDING_PAY,
        wxOutTradeNo: orderNo,
        checkoutBatchId: params.checkoutBatchId,
      })
      .returning()

    const [participation] = await tx
      .insert(groupParticipation)
      .values({
        groupOrderId: groupOrderRow.id,
        userId: params.userId,
        units: params.units,
        amount,
        payStatus: PayStatus.PENDING,
        orderId: orderRow.id,
      })
      .returning()

    await tx
      .update(groupOrder)
      .set({ reservedUnits: groupOrderRow.reservedUnits + params.units })
      .where(eq(groupOrder.id, groupOrderRow.id))

    return {
      groupOrder: groupOrderRow,
      order: orderRow,
      participation,
      amount,
    }
  })
}

export async function markOrderPaid(orderId: string, wxPayTxnId?: string) {
  const updatedOrder = await db.transaction(async (tx) => {
    const orderRow = await tx.query.order.findFirst({
      where: eq(order.id, orderId),
      with: {
        product: true,
        user: true,
        participation: {
          with: {
            groupOrder: true,
          },
        },
      },
    })

    if (!orderRow) {
      throw new Error('订单不存在')
    }
    if (orderRow.status !== OrderStatus.PENDING_PAY) {
      return orderRow
    }

    const [updatedOrder] = await tx
      .update(order)
      .set({
        status: OrderStatus.PAID,
        wxPayTxnId,
        paidAt: new Date(),
      })
      .where(eq(order.id, orderRow.id))
      .returning()

    const { recordOrderEvent } = await import('@/lib/order-timeline')
    await recordOrderEvent(orderRow.id, 'PAID', '支付成功', undefined, tx)

    if (orderRow.type === OrderType.DIRECT) {
      return updatedOrder
    }

    const participation = orderRow.participation
    if (!participation) {
      return updatedOrder
    }

    await tx
      .update(groupParticipation)
      .set({ payStatus: PayStatus.PAID })
      .where(eq(groupParticipation.id, participation.id))

    const [groupOrderRow] = await tx
      .select()
      .from(groupOrder)
      .where(eq(groupOrder.id, participation.groupOrderId))
      .limit(1)
    if (!groupOrderRow) {
      return updatedOrder
    }

    const reservedUnits = Math.max(
      0,
      groupOrderRow.reservedUnits - participation.units,
    )
    const filledUnits = groupOrderRow.filledUnits + participation.units
    const isFilled = filledUnits >= groupOrderRow.totalUnits

    await tx
      .update(groupOrder)
      .set({
        reservedUnits,
        filledUnits,
        status: isFilled ? GroupStatus.PURCHASING : GroupStatus.OPEN,
      })
      .where(eq(groupOrder.id, groupOrderRow.id))

    if (isFilled) {
      const { recordOrderEvent } = await import('@/lib/order-timeline')

      await tx
        .update(order)
        .set({ status: OrderStatus.PURCHASING })
        .where(
          and(
            eq(order.groupOrderId, groupOrderRow.id),
            eq(order.status, OrderStatus.PAID),
          ),
        )

      const groupOrders = await tx.query.order.findMany({
        where: eq(order.groupOrderId, groupOrderRow.id),
      })
      for (const o of groupOrders) {
        await recordOrderEvent(o.id, 'GROUP_FILLED', '拼单已满员，等待采购', undefined, tx)
        await recordOrderEvent(o.id, 'PURCHASING', '代购采购中', undefined, tx)
      }

      const participants = await tx.query.groupParticipation.findMany({
        where: and(
          eq(groupParticipation.groupOrderId, groupOrderRow.id),
          eq(groupParticipation.payStatus, PayStatus.PAID),
        ),
        with: { user: true },
      })

      await Promise.all(
        participants
          .filter((item) => item.user.openid)
          .map((item) =>
            sendSubscribeMessage({
              openid: item.user.openid!,
              templateId: 'group_filled',
              page: `/shop/groups/${groupOrderRow.id}`,
              data: {
                thing1: { value: orderRow.product.name.slice(0, 20) },
                phrase2: { value: '拼单成功' },
              },
            }),
          ),
      )

      const { onGroupFilled } = await import('@/lib/group-leader')
      await onGroupFilled(groupOrderRow.initiatorId)
    } else {
      const { checkGroupAlmostFull } = await import('@/lib/group-almost-full')
      await checkGroupAlmostFull(groupOrderRow.id, tx)
    }

    return updatedOrder
  })

  const paidCount = await db.query.order.findMany({
    where: and(
      eq(order.userId, updatedOrder.userId),
      inArray(order.status, [
        OrderStatus.PAID,
        OrderStatus.PURCHASING,
        OrderStatus.DELIVERING,
        OrderStatus.COMPLETED,
      ]),
    ),
  })

  if (paidCount.length === 1) {
    const { rewardReferralOnFirstOrder } = await import('@/lib/referral')
    await rewardReferralOnFirstOrder(updatedOrder.userId).catch(() => undefined)
  }

  return updatedOrder
}

export async function cancelExpiredPendingOrders() {
  const timeoutMinutes = getOrderPayTimeoutMinutes()
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000)

  const pendingOrders = await db.query.order.findMany({
    where: and(
      eq(order.status, OrderStatus.PENDING_PAY),
      lte(order.createdAt, cutoff),
    ),
    with: {
      participation: true,
    },
  })

  let cancelledCount = 0

  for (const orderRow of pendingOrders) {
    await db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(order)
        .where(eq(order.id, orderRow.id))
        .limit(1)
      if (!current || current.status !== OrderStatus.PENDING_PAY) {
        return
      }

      await tx
        .update(order)
        .set({ status: OrderStatus.CANCELLED })
        .where(eq(order.id, orderRow.id))

      if (orderRow.type === OrderType.GROUP && orderRow.participation) {
        const [groupOrderRow] = await tx
          .select()
          .from(groupOrder)
          .where(eq(groupOrder.id, orderRow.participation.groupOrderId))
          .limit(1)
        if (groupOrderRow) {
          await tx
            .update(groupOrder)
            .set({
              reservedUnits: Math.max(
                0,
                groupOrderRow.reservedUnits - orderRow.participation.units,
              ),
            })
            .where(eq(groupOrder.id, groupOrderRow.id))
        }
      }
    })

    cancelledCount += 1
  }

  return cancelledCount
}

export async function expireOpenGroupOrders() {
  await cancelExpiredPendingOrders()

  const now = new Date()
  const expiredGroups = await db.query.groupOrder.findMany({
    where: and(
      eq(groupOrder.status, GroupStatus.OPEN),
      lte(groupOrder.expiresAt, now),
    ),
    with: {
      participations: {
        where: inArray(groupParticipation.payStatus, [
          PayStatus.PAID,
          PayStatus.PENDING,
        ]),
        with: { order: true, user: true },
      },
      product: true,
    },
  })

  for (const group of expiredGroups) {
    await db.transaction(async (tx) => {
      await tx
        .update(groupOrder)
        .set({ status: GroupStatus.EXPIRED, reservedUnits: 0 })
        .where(eq(groupOrder.id, group.id))

      for (const participation of group.participations) {
        if (!participation.order) {
          continue
        }

        if (participation.payStatus === PayStatus.PENDING) {
          await tx
            .update(order)
            .set({ status: OrderStatus.CANCELLED })
            .where(eq(order.id, participation.order.id))
          continue
        }

        await tx
          .update(groupParticipation)
          .set({ payStatus: PayStatus.REFUNDED })
          .where(eq(groupParticipation.id, participation.id))

        await tx
          .update(order)
          .set({ status: OrderStatus.REFUNDED })
          .where(eq(order.id, participation.order.id))
      }
    })

    const { refundOrder } = await import('@/lib/wxpay')
    for (const participation of group.participations) {
      if (participation.payStatus !== PayStatus.PAID) {
        continue
      }

      if (participation.order?.wxOutTradeNo) {
        await refundOrder({
          outTradeNo: participation.order.wxOutTradeNo,
          amount: participation.amount,
          reason: '拼单超时未凑满',
        }).catch((error) => {
          console.error('[expire] refund failed', error)
        })
      }

      if (participation.user.openid) {
        await sendSubscribeMessage({
          openid: participation.user.openid,
          templateId: 'group_expired',
          page: `/shop/groups/${group.id}`,
          data: {
            thing1: { value: group.product.name.slice(0, 20) },
            phrase2: { value: '拼单失败已退款' },
          },
        }).catch(() => undefined)
      }
    }

    const { onGroupExpired } = await import('@/lib/group-leader')
    await onGroupExpired(group.initiatorId)
  }

  return expiredGroups.length
}

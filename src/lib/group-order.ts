import {
  GroupStatus,
  OrderStatus,
  OrderType,
  PayStatus,
  ProductStatus,
} from '@/generated/prisma/client'
import { prisma } from '@/lib/db'
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
}) {
  const product = await prisma.product.findUnique({
    where: { id: params.productId },
  })

  if (!product || product.status !== ProductStatus.ACTIVE) {
    throw new Error('商品不存在或已下架')
  }
  if (!product.splittable || !product.totalUnits) {
    throw new Error('该商品不支持拼单')
  }
  if (params.units <= 0 || params.units > product.totalUnits) {
    throw new Error('拼单份数无效')
  }

  const amount = calcSplitAmount(product.price, product.totalUnits, params.units)
  const orderNo = generateOrderNo()

  const result = await prisma.$transaction(async (tx) => {
    const groupOrder = await tx.groupOrder.create({
      data: {
        productId: product.id,
        initiatorId: params.userId,
        totalUnits: product.totalUnits!,
        reservedUnits: params.units,
        expiresAt: getExpireAt(),
      },
    })

    const order = await tx.order.create({
      data: {
        orderNo,
        userId: params.userId,
        type: OrderType.GROUP,
        productId: product.id,
        groupOrderId: groupOrder.id,
        units: params.units,
        amount,
        status: OrderStatus.PENDING_PAY,
        wxOutTradeNo: orderNo,
        checkoutBatchId: params.checkoutBatchId,
      },
    })

    const participation = await tx.groupParticipation.create({
      data: {
        groupOrderId: groupOrder.id,
        userId: params.userId,
        units: params.units,
        amount,
        payStatus: PayStatus.PENDING,
        orderId: order.id,
      },
    })

    return { groupOrder, order, participation }
  })

  return result
}

export async function joinGroupOrder(params: {
  userId: string
  groupOrderId: string
  units: number
  checkoutBatchId?: string
}) {
  const amountResult = await prisma.$transaction(async (tx) => {
    const groupOrder = await tx.groupOrder.findUnique({
      where: { id: params.groupOrderId },
      include: { product: true },
    })

    if (!groupOrder) {
      throw new Error('拼单不存在')
    }
    if (groupOrder.status !== GroupStatus.OPEN) {
      throw new Error('拼单已结束')
    }
    if (groupOrder.expiresAt <= new Date()) {
      throw new Error('拼单已过期')
    }

    const remaining = getAvailableUnits(groupOrder)
    if (params.units <= 0 || params.units > remaining) {
      throw new Error(`最多还能拼 ${remaining} ${groupOrder.product.unitLabel ?? '份'}`)
    }

    const existing = await tx.groupParticipation.findFirst({
      where: {
        groupOrderId: groupOrder.id,
        userId: params.userId,
        payStatus: { in: [PayStatus.PENDING, PayStatus.PAID] },
      },
    })
    if (existing) {
      throw new Error('你已参与该拼单')
    }

    const amount = calcSplitAmount(
      groupOrder.product.price,
      groupOrder.totalUnits,
      params.units,
    )
    const orderNo = generateOrderNo()

    const order = await tx.order.create({
      data: {
        orderNo,
        userId: params.userId,
        type: OrderType.GROUP,
        productId: groupOrder.productId,
        groupOrderId: groupOrder.id,
        units: params.units,
        amount,
        status: OrderStatus.PENDING_PAY,
        wxOutTradeNo: orderNo,
        checkoutBatchId: params.checkoutBatchId,
      },
    })

    const participation = await tx.groupParticipation.create({
      data: {
        groupOrderId: groupOrder.id,
        userId: params.userId,
        units: params.units,
        amount,
        payStatus: PayStatus.PENDING,
        orderId: order.id,
      },
    })

    await tx.groupOrder.update({
      where: { id: groupOrder.id },
      data: { reservedUnits: groupOrder.reservedUnits + params.units },
    })

    return { groupOrder, order, participation, amount }
  })

  return amountResult
}

export async function markOrderPaid(orderId: string, wxPayTxnId?: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        product: true,
        user: true,
        participation: {
          include: {
            groupOrder: true,
          },
        },
      },
    })

    if (!order) {
      throw new Error('订单不存在')
    }
    if (order.status !== OrderStatus.PENDING_PAY) {
      return order
    }

    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PAID,
        wxPayTxnId,
        paidAt: new Date(),
      },
    })

    if (order.type === OrderType.DIRECT) {
      return updatedOrder
    }

    const participation = order.participation
    if (!participation) {
      return updatedOrder
    }

    await tx.groupParticipation.update({
      where: { id: participation.id },
      data: { payStatus: PayStatus.PAID },
    })

    const groupOrder = await tx.groupOrder.findUnique({
      where: { id: participation.groupOrderId },
    })
    if (!groupOrder) {
      return updatedOrder
    }

    const reservedUnits = Math.max(
      0,
      groupOrder.reservedUnits - participation.units,
    )
    const filledUnits = groupOrder.filledUnits + participation.units
    const isFilled = filledUnits >= groupOrder.totalUnits

    await tx.groupOrder.update({
      where: { id: groupOrder.id },
      data: {
        reservedUnits,
        filledUnits,
        status: isFilled ? GroupStatus.FILLED : GroupStatus.OPEN,
      },
    })

    if (isFilled) {
      await tx.order.updateMany({
        where: {
          groupOrderId: groupOrder.id,
          status: OrderStatus.PAID,
        },
        data: { status: OrderStatus.PURCHASING },
      })

      const participants = await tx.groupParticipation.findMany({
        where: {
          groupOrderId: groupOrder.id,
          payStatus: PayStatus.PAID,
        },
        include: { user: true },
      })

      await Promise.all(
        participants
          .filter((item) => item.user.openid)
          .map((item) =>
            sendSubscribeMessage({
              openid: item.user.openid!,
            templateId: 'GROUP_FILLED',
            page: `/shop/groups/${groupOrder.id}`,
            data: {
              thing1: { value: order.product.name.slice(0, 20) },
              phrase2: { value: '拼单成功' },
            },
          }),
        ),
      )
    }

    return updatedOrder
  })
}

export async function cancelExpiredPendingOrders() {
  const timeoutMinutes = getOrderPayTimeoutMinutes()
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000)

  const pendingOrders = await prisma.order.findMany({
    where: {
      status: OrderStatus.PENDING_PAY,
      createdAt: { lte: cutoff },
    },
    include: {
      participation: true,
    },
  })

  let cancelledCount = 0

  for (const order of pendingOrders) {
    await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id: order.id } })
      if (!current || current.status !== OrderStatus.PENDING_PAY) {
        return
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
      })

      if (order.type === OrderType.GROUP && order.participation) {
        const groupOrder = await tx.groupOrder.findUnique({
          where: { id: order.participation.groupOrderId },
        })
        if (groupOrder) {
          await tx.groupOrder.update({
            where: { id: groupOrder.id },
            data: {
              reservedUnits: Math.max(
                0,
                groupOrder.reservedUnits - order.participation.units,
              ),
            },
          })
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
  const expiredGroups = await prisma.groupOrder.findMany({
    where: {
      status: GroupStatus.OPEN,
      expiresAt: { lte: now },
    },
    include: {
      participations: {
        where: { payStatus: { in: [PayStatus.PAID, PayStatus.PENDING] } },
        include: { order: true, user: true },
      },
      product: true,
    },
  })

  for (const group of expiredGroups) {
    await prisma.$transaction(async (tx) => {
      await tx.groupOrder.update({
        where: { id: group.id },
        data: { status: GroupStatus.EXPIRED, reservedUnits: 0 },
      })

      for (const participation of group.participations) {
        if (!participation.order) {
          continue
        }

        if (participation.payStatus === PayStatus.PENDING) {
          await tx.order.update({
            where: { id: participation.order.id },
            data: { status: OrderStatus.CANCELLED },
          })
          continue
        }

        await tx.groupParticipation.update({
          where: { id: participation.id },
          data: { payStatus: PayStatus.REFUNDED },
        })

        await tx.order.update({
          where: { id: participation.order.id },
          data: { status: OrderStatus.REFUNDED },
        })
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
          templateId: 'GROUP_EXPIRED',
          page: `/shop/groups/${group.id}`,
          data: {
            thing1: { value: group.product.name.slice(0, 20) },
            phrase2: { value: '拼单失败已退款' },
          },
        }).catch(() => undefined)
      }
    }
  }

  return expiredGroups.length
}

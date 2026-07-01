import { eq } from 'drizzle-orm'
import { notifySubscription, order } from '@/db/schema'
import { OrderStatus } from '@/db/enums'
import { db } from '@/lib/db'
import { generatePickupCode } from '@/lib/utils'
import { sendSubscribeMessage } from '@/lib/wechat'

export function getPickupLocation(): string {
  return (
    process.env.PICKUP_LOCATION ??
    '山姆代购自提点（具体地址请联系代购员），每日 18:00-21:00 可取货'
  )
}

export function getPickupNotice(): string {
  return '本店仅支持到店自提，下单并完成支付后请按通知时间到自提点取货。'
}

export async function assignPickupCode(orderId: string) {
  const [orderRow] = await db
    .select()
    .from(order)
    .where(eq(order.id, orderId))
    .limit(1)

  if (!orderRow) {
    throw new Error('订单不存在')
  }
  if (orderRow.pickupCode) {
    return orderRow.pickupCode
  }

  const pickupCode = generatePickupCode()
  await db
    .update(order)
    .set({
      status: OrderStatus.DELIVERING,
      pickupCode,
      pickupReadyAt: new Date(),
    })
    .where(eq(order.id, orderId))

  const { recordOrderEvent } = await import('@/lib/order-timeline')
  await recordOrderEvent(orderId, 'PICKUP_READY', '商品已到自提点，请凭取货码取货')

  return pickupCode
}

export async function notifyPickupReady(orderId: string) {
  const orderRow = await db.query.order.findFirst({
    where: eq(order.id, orderId),
    with: { user: true, product: true },
  })

  if (!orderRow?.user.openid || !orderRow.pickupCode) {
    return
  }

  await sendSubscribeMessage({
    openid: orderRow.user.openid,
    templateId: 'pickup_ready',
    page: '/shop/orders',
    data: {
      thing1: { value: orderRow.product.name.slice(0, 20) },
      character_string2: { value: orderRow.pickupCode },
      phrase3: { value: '可自提' },
    },
  })
}

export async function verifyPickupCode(pickupCode: string) {
  const orderRow = await db.query.order.findFirst({
    where: eq(order.pickupCode, pickupCode),
    with: { product: true, user: true },
  })

  if (!orderRow) {
    throw new Error('取货码无效')
  }
  if (orderRow.status === OrderStatus.COMPLETED) {
    throw new Error('该订单已核销')
  }
  if (orderRow.status !== OrderStatus.DELIVERING) {
    throw new Error('订单尚未到货')
  }

  await db
    .update(order)
    .set({ status: OrderStatus.COMPLETED })
    .where(eq(order.id, orderRow.id))

  const { recordOrderEvent } = await import('@/lib/order-timeline')
  await recordOrderEvent(orderRow.id, 'COMPLETED', '已取货完成')

  return orderRow
}

export async function saveNotifySubscription(params: {
  userId: string
  openid: string
  types: string[]
}) {
  const existing = await db.query.notifySubscription.findFirst({
    where: eq(notifySubscription.userId, params.userId),
  })

  if (existing) {
    const mergedTypes = [...new Set([...existing.types, ...params.types])]
    await db
      .update(notifySubscription)
      .set({ types: mergedTypes, openid: params.openid })
      .where(eq(notifySubscription.userId, params.userId))
    return mergedTypes
  }

  await db.insert(notifySubscription).values({
    userId: params.userId,
    openid: params.openid,
    types: params.types,
  })

  return params.types
}

export async function notifySubscribedUsers(
  type: string,
  page: string,
  data: Record<string, { value: string }>,
) {
  const subscribers = await db.query.notifySubscription.findMany({
    with: { user: true },
  })

  await Promise.all(
    subscribers
      .filter((item) => item.types.includes(type) && item.openid)
      .map((item) =>
        sendSubscribeMessage({
          openid: item.openid,
          templateId: type as 'group_filled',
          page,
          data,
        }).catch(() => undefined),
      ),
  )
}

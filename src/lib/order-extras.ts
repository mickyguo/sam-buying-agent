import { eq } from 'drizzle-orm'
import { order } from '@/db/schema'
import { db } from '@/lib/db'
import { applyUserCoupon, markCouponUsed } from '@/lib/coupon'
import { bookPickupSlot } from '@/lib/reorder'

export async function applyOrderExtras(
  orderId: string,
  params: {
    pickupSlotId?: string
    pickupLocationId?: string
    userCouponId?: string
    orderAmount: number
  },
) {
  let couponDiscount = 0
  let userCouponId: string | undefined

  if (params.userCouponId) {
    const applied = await applyUserCoupon(params.userCouponId, params.orderAmount)
    couponDiscount = applied.discount
    userCouponId = applied.userCouponId
  }

  if (params.pickupSlotId) {
    await bookPickupSlot(params.pickupSlotId)
  }

  await db
    .update(order)
    .set({
      pickupSlotId: params.pickupSlotId,
      pickupLocationId: params.pickupLocationId,
      userCouponId,
      couponDiscount,
      amount: Math.max(0, params.orderAmount - couponDiscount),
    })
    .where(eq(order.id, orderId))

  if (userCouponId) {
    await markCouponUsed(userCouponId)
  }
}

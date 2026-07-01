import { coupon, pickupLocation, pickupSlot } from '@/db/schema'
import { db } from '@/lib/db'

async function main() {
  const existingCoupons = await db.query.coupon.findMany()
  if (existingCoupons.length === 0) {
    await db.insert(coupon).values([
      {
        name: '邀请有礼-邀请人',
        type: 'FIXED',
        discountAmount: 500,
        minOrderAmount: 3000,
      },
      {
        name: '邀请有礼-新用户',
        type: 'FIXED',
        discountAmount: 500,
        minOrderAmount: 2000,
      },
    ])
  }

  const existingLocation = await db.query.pickupLocation.findFirst()
  if (!existingLocation) {
    const [loc] = await db
      .insert(pickupLocation)
      .values({
        name: '默认自提点',
        address: process.env.PICKUP_LOCATION ?? '山姆代购自提点',
        communityTags: ['默认'],
      })
      .returning()

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().slice(0, 10)
    await db.insert(pickupSlot).values([
      {
        pickupLocationId: loc.id,
        slotDate: dateStr,
        startTime: '18:00',
        endTime: '18:30',
        capacity: 20,
      },
      {
        pickupLocationId: loc.id,
        slotDate: dateStr,
        startTime: '18:30',
        endTime: '19:00',
        capacity: 20,
      },
      {
        pickupLocationId: loc.id,
        slotDate: dateStr,
        startTime: '19:00',
        endTime: '19:30',
        capacity: 20,
      },
    ])
  }

  console.info('[seed] 基础数据初始化完成（优惠券、自提点）')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

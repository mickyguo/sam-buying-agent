import { describe, expect, it } from 'vitest'
import { calcCouponDiscount } from '@/lib/coupon'

describe('calcCouponDiscount', () => {
  it('订单未达门槛时返回 0', () => {
    expect(
      calcCouponDiscount(
        { type: 'FIXED', discountAmount: 500, minOrderAmount: 3000 },
        2999,
      ),
    ).toBe(0)
  })

  it('FIXED 类型：抵扣不超过订单金额', () => {
    expect(
      calcCouponDiscount(
        { type: 'FIXED', discountAmount: 500, minOrderAmount: 0 },
        10_000,
      ),
    ).toBe(500)
    expect(
      calcCouponDiscount(
        { type: 'FIXED', discountAmount: 500, minOrderAmount: 0 },
        300,
      ),
    ).toBe(300)
  })

  it('PERCENT 类型：discountAmount 为万分比', () => {
    expect(
      calcCouponDiscount(
        { type: 'PERCENT', discountAmount: 1000, minOrderAmount: 0 },
        5000,
      ),
    ).toBe(500)
  })

  it('FREE_SERVICE 类型：服务费抵扣封顶为订单金额', () => {
    expect(
      calcCouponDiscount(
        { type: 'FREE_SERVICE', discountAmount: 800, minOrderAmount: 0 },
        500,
      ),
    ).toBe(500)
    expect(
      calcCouponDiscount(
        { type: 'FREE_SERVICE', discountAmount: 800, minOrderAmount: 0 },
        2000,
      ),
    ).toBe(800)
  })
})

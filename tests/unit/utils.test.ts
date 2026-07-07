import { describe, expect, it } from 'vitest'
import { calcSplitAmount, calcUnitPrice } from '@/lib/utils'

describe('calcUnitPrice', () => {
  it('按总份数均分单价（分）', () => {
    expect(calcUnitPrice(5990, 10)).toBe(599)
  })

  it('不能整除时四舍五入', () => {
    expect(calcUnitPrice(1000, 3)).toBe(333)
  })
})

describe('calcSplitAmount', () => {
  it('按份数计算拼单金额', () => {
    expect(calcSplitAmount(5990, 10, 4)).toBe(2396)
    expect(calcSplitAmount(5990, 10, 1)).toBe(599)
    expect(calcSplitAmount(5990, 10, 10)).toBe(5990)
  })

  it('单价舍入后乘以份数', () => {
    expect(calcSplitAmount(1000, 3, 2)).toBe(666)
  })
})

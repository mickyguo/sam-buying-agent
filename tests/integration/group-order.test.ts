import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { groupOrder, order } from '@/db/schema'
import { GroupStatus, OrderStatus, PayStatus } from '@/db/enums'
import { db } from '@/lib/db'
import {
  createGroupOrder,
  joinGroupOrder,
  markOrderPaid,
} from '@/lib/group-order'
import {
  cleanupTestContext,
  createSplittableProduct,
  createTestContext,
  createTestUser,
  type TestContext,
} from '../helpers/fixtures'

const hasDatabase = Boolean(process.env.DATABASE_URL)

vi.mock('@/lib/wechat', () => ({
  sendSubscribeMessage: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/group-leader', () => ({
  incrementLeaderOnCreate: vi.fn().mockResolvedValue(undefined),
  onGroupFilled: vi.fn().mockResolvedValue(undefined),
  onGroupExpired: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/referral', () => ({
  rewardReferralOnFirstOrder: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/group-almost-full', () => ({
  checkGroupAlmostFull: vi.fn().mockResolvedValue(undefined),
}))

describe.skipIf(!hasDatabase)('group-order integration', () => {
  let ctx: TestContext

  beforeEach(() => {
    ctx = createTestContext()
  })

  afterEach(async () => {
    await cleanupTestContext(ctx)
  })

  it('发起拼单时占用 reservedUnits 并创建待支付订单', async () => {
    const userRow = await createTestUser()
    ctx.userIds.push(userRow.id)

    const productRow = await createSplittableProduct()
    ctx.productIds.push(productRow.id)

    const result = await createGroupOrder({
      userId: userRow.id,
      productId: productRow.id,
      units: 4,
    })

    ctx.groupOrderIds.push(result.groupOrder.id)
    ctx.orderIds.push(result.order.id)

    expect(result.groupOrder.reservedUnits).toBe(4)
    expect(result.groupOrder.filledUnits).toBe(0)
    expect(result.groupOrder.status).toBe(GroupStatus.OPEN)
    expect(result.order.status).toBe(OrderStatus.PENDING_PAY)
    expect(result.order.amount).toBe(2396)
    expect(result.participation.payStatus).toBe(PayStatus.PENDING)
  })

  it('参团后累加 reservedUnits，支付后转为 filledUnits', async () => {
    const initiator = await createTestUser()
    const joiner = await createTestUser()
    ctx.userIds.push(initiator.id, joiner.id)

    const productRow = await createSplittableProduct()
    ctx.productIds.push(productRow.id)

    const created = await createGroupOrder({
      userId: initiator.id,
      productId: productRow.id,
      units: 4,
    })
    ctx.groupOrderIds.push(created.groupOrder.id)
    ctx.orderIds.push(created.order.id)

    const joined = await joinGroupOrder({
      userId: joiner.id,
      groupOrderId: created.groupOrder.id,
      units: 3,
    })
    ctx.orderIds.push(joined.order.id)

    const afterJoin = await db.query.groupOrder.findFirst({
      where: eq(groupOrder.id, created.groupOrder.id),
    })
    expect(afterJoin?.reservedUnits).toBe(7)
    expect(afterJoin?.filledUnits).toBe(0)

    await markOrderPaid(created.order.id, 'txn_initiator')
    const afterFirstPay = await db.query.groupOrder.findFirst({
      where: eq(groupOrder.id, created.groupOrder.id),
    })
    expect(afterFirstPay?.reservedUnits).toBe(3)
    expect(afterFirstPay?.filledUnits).toBe(4)
    expect(afterFirstPay?.status).toBe(GroupStatus.OPEN)

    await markOrderPaid(joined.order.id, 'txn_joiner')
    const afterSecondPay = await db.query.groupOrder.findFirst({
      where: eq(groupOrder.id, created.groupOrder.id),
    })
    expect(afterSecondPay?.reservedUnits).toBe(0)
    expect(afterSecondPay?.filledUnits).toBe(7)
    expect(afterSecondPay?.status).toBe(GroupStatus.OPEN)
  })

  it('满员后拼单进入 PURCHASING，相关订单同步更新', async () => {
    const initiator = await createTestUser()
    const joiner = await createTestUser()
    ctx.userIds.push(initiator.id, joiner.id)

    const productRow = await createSplittableProduct({ totalUnits: 10 })
    ctx.productIds.push(productRow.id)

    const created = await createGroupOrder({
      userId: initiator.id,
      productId: productRow.id,
      units: 4,
    })
    ctx.groupOrderIds.push(created.groupOrder.id)
    ctx.orderIds.push(created.order.id)

    const joined = await joinGroupOrder({
      userId: joiner.id,
      groupOrderId: created.groupOrder.id,
      units: 6,
    })
    ctx.orderIds.push(joined.order.id)

    await markOrderPaid(created.order.id, 'txn_a')
    await markOrderPaid(joined.order.id, 'txn_b')

    const groupRow = await db.query.groupOrder.findFirst({
      where: eq(groupOrder.id, created.groupOrder.id),
    })
    expect(groupRow?.filledUnits).toBe(10)
    expect(groupRow?.reservedUnits).toBe(0)
    expect(groupRow?.status).toBe(GroupStatus.PURCHASING)

    const orders = await db.query.order.findMany({
      where: eq(order.groupOrderId, created.groupOrder.id),
    })
    expect(orders).toHaveLength(2)
    expect(orders.every((row) => row.status === OrderStatus.PURCHASING)).toBe(
      true,
    )
  })

  it.todo('并发参团时不应超卖最后一份')
  it.todo('待支付订单超时后应释放 reservedUnits')
})

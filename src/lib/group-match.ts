import { and, desc, eq } from 'drizzle-orm'
import { groupMatchIntent, groupOrder, product } from '@/db/schema'
import { GroupStatus, ProductStatus } from '@/db/enums'
import { db } from '@/lib/db'
import { createGroupOrder, createGroupOrderWithLeader, serializeGroupOrder } from '@/lib/group-order'

function getAvailableUnits(group: {
  totalUnits: number
  filledUnits: number
  reservedUnits: number
}) {
  return group.totalUnits - group.filledUnits - group.reservedUnits
}

export async function submitGroupMatchIntent(params: {
  userId: string
  productId: string
  wantUnits: number
  maxWaitHours?: number
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
  if (params.wantUnits <= 0 || params.wantUnits > productRow.totalUnits) {
    throw new Error('份数无效')
  }

  const maxWaitHours = params.maxWaitHours ?? 24
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + maxWaitHours)

  const openGroups = await db.query.groupOrder.findMany({
    where: and(
      eq(groupOrder.productId, params.productId),
      eq(groupOrder.status, GroupStatus.OPEN),
    ),
    orderBy: desc(groupOrder.createdAt),
    with: {
      product: true,
      participations: { with: { user: true } },
    },
  })

  const matchedGroup = openGroups.find(
    (group) => getAvailableUnits(group) >= params.wantUnits,
  )

  if (matchedGroup) {
    const [intent] = await db
      .insert(groupMatchIntent)
      .values({
        userId: params.userId,
        productId: params.productId,
        wantUnits: params.wantUnits,
        maxWaitHours,
        status: 'MATCHED',
        matchedGroupOrderId: matchedGroup.id,
        expiresAt,
      })
      .returning()

    return {
      intent,
      action: 'join' as const,
      groupOrder: serializeGroupOrder(matchedGroup),
    }
  }

  const created = await createGroupOrderWithLeader({
    userId: params.userId,
    productId: params.productId,
    units: params.wantUnits,
  })

  const groupWithRelations = await db.query.groupOrder.findFirst({
    where: eq(groupOrder.id, created.groupOrder.id),
    with: {
      product: true,
      participations: { with: { user: true } },
    },
  })

  const [intent] = await db
    .insert(groupMatchIntent)
    .values({
      userId: params.userId,
      productId: params.productId,
      wantUnits: params.wantUnits,
      maxWaitHours,
      status: 'MATCHED',
      matchedGroupOrderId: created.groupOrder.id,
      expiresAt,
    })
    .returning()

  return {
    intent,
    action: 'create' as const,
    groupOrder: groupWithRelations
      ? serializeGroupOrder(groupWithRelations)
      : null,
    orderId: created.order.id,
    amount: created.order.amount,
  }
}

export async function listOpenGroupsForHome(limit = 6) {
  const groups = await db.query.groupOrder.findMany({
    where: eq(groupOrder.status, GroupStatus.OPEN),
    with: {
      product: true,
      participations: { with: { user: true } },
    },
    orderBy: desc(groupOrder.createdAt),
    limit,
  })

  return groups.map(serializeGroupOrder)
}

export async function listPendingMatchIntents(userId: string) {
  return db.query.groupMatchIntent.findMany({
    where: and(
      eq(groupMatchIntent.userId, userId),
      eq(groupMatchIntent.status, 'PENDING'),
    ),
    with: { product: true },
    orderBy: desc(groupMatchIntent.createdAt),
  })
}

export async function expirePendingMatchIntents() {
  const now = new Date()
  const pending = await db.query.groupMatchIntent.findMany({
    where: and(
      eq(groupMatchIntent.status, 'PENDING'),
    ),
  })

  let count = 0
  for (const intent of pending) {
    if (intent.expiresAt > now) {
      continue
    }
    await db
      .update(groupMatchIntent)
      .set({ status: 'EXPIRED' })
      .where(eq(groupMatchIntent.id, intent.id))
    count += 1
  }
  return count
}

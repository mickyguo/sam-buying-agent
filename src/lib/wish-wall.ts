import { and, desc, eq, lte } from 'drizzle-orm'
import { groupOrder, product, wishPost } from '@/db/schema'
import { GroupStatus, ProductStatus } from '@/db/enums'
import { db } from '@/lib/db'
import { createGroupOrderWithLeader, joinGroupOrder, serializeGroupOrder } from '@/lib/group-order'

function getAvailableUnits(group: {
  totalUnits: number
  filledUnits: number
  reservedUnits: number
}) {
  return group.totalUnits - group.filledUnits - group.reservedUnits
}

export async function createWishPost(params: {
  userId: string
  productId: string
  wantUnits: number
  maxWaitHours?: number
  note?: string
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
  if (!productRow.splittable) {
    throw new Error('该商品不支持拼单许愿')
  }

  const maxWaitHours = params.maxWaitHours ?? 24
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + maxWaitHours)

  const openGroups = await db.query.groupOrder.findMany({
    where: eq(groupOrder.status, GroupStatus.OPEN),
    with: { product: true, participations: { with: { user: true } } },
    orderBy: desc(groupOrder.createdAt),
  })

  const matched = openGroups.find(
    (g) =>
      g.productId === params.productId &&
      (!params.pickupLocationId || g.pickupLocationId === params.pickupLocationId) &&
      getAvailableUnits(g) >= params.wantUnits,
  )

  if (matched) {
    const result = await joinGroupOrder({
      userId: params.userId,
      groupOrderId: matched.id,
      units: params.wantUnits,
    })

    const [post] = await db
      .insert(wishPost)
      .values({
        userId: params.userId,
        productId: params.productId,
        wantUnits: params.wantUnits,
        maxWaitHours,
        note: params.note,
        status: 'MATCHED',
        matchedGroupOrderId: matched.id,
        pickupLocationId: params.pickupLocationId,
        expiresAt,
      })
      .returning()

    return {
      wishPost: post,
      action: 'join' as const,
      groupOrder: serializeGroupOrder(matched),
      orderId: result.order.id,
    }
  }

  const [post] = await db
    .insert(wishPost)
    .values({
      userId: params.userId,
      productId: params.productId,
      wantUnits: params.wantUnits,
      maxWaitHours,
      note: params.note,
      status: 'PENDING',
      pickupLocationId: params.pickupLocationId,
      expiresAt,
    })
    .returning()

  return { wishPost: post, action: 'pending' as const }
}

export async function matchWishPost(wishPostId: string, matcherUserId: string) {
  const post = await db.query.wishPost.findFirst({
    where: eq(wishPost.id, wishPostId),
    with: { product: true },
  })

  if (!post || post.status !== 'PENDING') {
    throw new Error('许愿不存在或已处理')
  }
  if (post.userId === matcherUserId) {
    throw new Error('不能匹配自己的许愿')
  }

  const created = await createGroupOrderWithLeader({
    userId: matcherUserId,
    productId: post.productId,
    units: post.wantUnits,
  })

  await db
    .update(wishPost)
    .set({
      status: 'MATCHED',
      matchedGroupOrderId: created.groupOrder.id,
    })
    .where(eq(wishPost.id, wishPostId))

  const groupWithRelations = await db.query.groupOrder.findFirst({
    where: eq(groupOrder.id, created.groupOrder.id),
    with: { product: true, participations: { with: { user: true } } },
  })

  return {
    groupOrder: groupWithRelations ? serializeGroupOrder(groupWithRelations) : null,
    orderId: created.order.id,
  }
}

export async function listWishWall(limit = 20) {
  const posts = await db.query.wishPost.findMany({
    where: eq(wishPost.status, 'PENDING'),
    with: {
      user: true,
      product: true,
    },
    orderBy: desc(wishPost.createdAt),
    limit,
  })

  return posts.map((post) => ({
    id: post.id,
    wantUnits: post.wantUnits,
    note: post.note,
    expiresAt: post.expiresAt.toISOString(),
    createdAt: post.createdAt.toISOString(),
    user: {
      id: post.user.id,
      nickname: post.user.nickname,
      avatarUrl: post.user.avatarUrl,
    },
    product: {
      id: post.product.id,
      name: post.product.name,
      imageUrl: post.product.imageUrl,
      unitLabel: post.product.unitLabel,
      priceYuan: (post.product.price / 100).toFixed(2),
    },
  }))
}

export async function expireWishPosts() {
  const now = new Date()
  const pending = await db.query.wishPost.findMany({
    where: and(eq(wishPost.status, 'PENDING'), lte(wishPost.expiresAt, now)),
  })

  for (const post of pending) {
    await db
      .update(wishPost)
      .set({ status: 'EXPIRED' })
      .where(eq(wishPost.id, post.id))
  }
  return pending.length
}

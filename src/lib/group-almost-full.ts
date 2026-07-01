import { and, eq } from 'drizzle-orm'
import { groupOrder, groupParticipation } from '@/db/schema'
import { GroupStatus, PayStatus } from '@/db/enums'
import { db } from '@/lib/db'
import { notifySubscribedUsers } from '@/lib/pickup'

function getAvailableUnits(group: {
  totalUnits: number
  filledUnits: number
  reservedUnits: number
}) {
  return group.totalUnits - group.filledUnits - group.reservedUnits
}

export async function checkGroupAlmostFull(
  groupOrderId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any,
) {
  const client = tx ?? db
  const group = await client.query.groupOrder.findFirst({
    where: eq(groupOrder.id, groupOrderId),
    with: { product: true },
  })

  if (!group || group.status !== GroupStatus.OPEN) {
    return
  }

  const remaining = getAvailableUnits(group)
  if (remaining > 2 || remaining <= 0) {
    return
  }

  const participants = await client.query.groupParticipation.findMany({
    where: and(
      eq(groupParticipation.groupOrderId, groupOrderId),
      eq(groupParticipation.payStatus, PayStatus.PAID),
    ),
    with: { user: true },
  })

  await notifySubscribedUsers(
    'group_almost_full',
    `/shop/groups/${groupOrderId}`,
    {
      thing1: { value: group.product.name.slice(0, 20) },
      phrase2: { value: `还差${remaining}${group.product.unitLabel ?? '份'}` },
    },
  ).catch(() => undefined)

  return { remaining, notified: participants.length }
}

export async function scanAlmostFullGroups() {
  const openGroups = await db.query.groupOrder.findMany({
    where: eq(groupOrder.status, GroupStatus.OPEN),
    with: { product: true },
  })

  let count = 0
  for (const group of openGroups) {
    const remaining = getAvailableUnits(group)
    if (remaining > 0 && remaining <= 2) {
      await checkGroupAlmostFull(group.id)
      count += 1
    }
  }
  return count
}

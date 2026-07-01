import { eq, sql } from 'drizzle-orm'
import { groupLeaderStat, groupOrder } from '@/db/schema'
import { GroupStatus } from '@/db/enums'
import { db } from '@/lib/db'

function calcBadgeLevel(groupsFilled: number, fillRate: number) {
  if (groupsFilled >= 20 && fillRate >= 0.8) return 3
  if (groupsFilled >= 10 && fillRate >= 0.6) return 2
  if (groupsFilled >= 3) return 1
  return 0
}

const BADGE_LABELS = ['新手团长', '靠谱团长', '资深团长', '金牌团长']

export function getBadgeLabel(level: number) {
  return BADGE_LABELS[level] ?? BADGE_LABELS[0]
}

export async function updateLeaderStatOnGroupEnd(
  initiatorId: string,
  outcome: 'filled' | 'expired',
) {
  const existing = await db.query.groupLeaderStat.findFirst({
    where: eq(groupLeaderStat.userId, initiatorId),
  })

  const groupsFilled = (existing?.groupsFilled ?? 0) + (outcome === 'filled' ? 1 : 0)
  const groupsExpired = (existing?.groupsExpired ?? 0) + (outcome === 'expired' ? 1 : 0)

  const total = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(groupOrder)
    .where(eq(groupOrder.initiatorId, initiatorId))

  const created = total[0]?.count ?? 0
  const fillRate = created > 0 ? groupsFilled / created : 0
  const badgeLevel = calcBadgeLevel(groupsFilled, fillRate)

  if (existing) {
    await db
      .update(groupLeaderStat)
      .set({
        groupsCreated: created,
        groupsFilled,
        groupsExpired,
        badgeLevel,
      })
      .where(eq(groupLeaderStat.userId, initiatorId))
  } else {
    await db.insert(groupLeaderStat).values({
      userId: initiatorId,
      groupsCreated: created,
      groupsFilled,
      groupsExpired,
      badgeLevel,
    })
  }
}

export async function getLeaderProfile(userId: string) {
  const stat = await db.query.groupLeaderStat.findFirst({
    where: eq(groupLeaderStat.userId, userId),
  })

  if (!stat) {
    const total = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(groupOrder)
      .where(eq(groupOrder.initiatorId, userId))

    return {
      groupsCreated: total[0]?.count ?? 0,
      groupsFilled: 0,
      fillRate: 0,
      badgeLevel: 0,
      badgeLabel: getBadgeLabel(0),
    }
  }

  const fillRate =
    stat.groupsCreated > 0 ? stat.groupsFilled / stat.groupsCreated : 0

  return {
    groupsCreated: stat.groupsCreated,
    groupsFilled: stat.groupsFilled,
    fillRate: Math.round(fillRate * 100) / 100,
    badgeLevel: stat.badgeLevel,
    badgeLabel: getBadgeLabel(stat.badgeLevel),
  }
}

export async function incrementLeaderOnCreate(initiatorId: string) {
  const existing = await db.query.groupLeaderStat.findFirst({
    where: eq(groupLeaderStat.userId, initiatorId),
  })

  if (existing) {
    await db
      .update(groupLeaderStat)
      .set({ groupsCreated: existing.groupsCreated + 1 })
      .where(eq(groupLeaderStat.userId, initiatorId))
  } else {
    await db.insert(groupLeaderStat).values({
      userId: initiatorId,
      groupsCreated: 1,
    })
  }
}

export async function onGroupFilled(initiatorId: string) {
  await updateLeaderStatOnGroupEnd(initiatorId, 'filled')
}

export async function onGroupExpired(initiatorId: string) {
  await updateLeaderStatOnGroupEnd(initiatorId, 'expired')
}

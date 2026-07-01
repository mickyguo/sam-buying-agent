import { and, eq, gte, inArray } from 'drizzle-orm'
import { groupOrder } from '@/db/schema'
import { GroupStatus } from '@/db/enums'
import { db } from '@/lib/db'

export async function getGroupForecast(productId: string) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const groups = await db.query.groupOrder.findMany({
    where: and(
      eq(groupOrder.productId, productId),
      gte(groupOrder.createdAt, thirtyDaysAgo),
      inArray(groupOrder.status, [
        GroupStatus.PURCHASING,
        GroupStatus.COMPLETED,
        GroupStatus.FILLED,
      ]),
    ),
  })

  if (groups.length === 0) {
    return {
      sampleSize: 0,
      avgFillHours: null,
      fillProbability: null,
      message: '暂无历史数据',
    }
  }

  const fillDurations = groups
    .map((g) => {
      const hours =
        (g.updatedAt.getTime() - g.createdAt.getTime()) / (1000 * 60 * 60)
      return hours > 0 ? hours : null
    })
    .filter((h): h is number => h !== null)

  const avgFillHours =
    fillDurations.length > 0
      ? fillDurations.reduce((a, b) => a + b, 0) / fillDurations.length
      : null

  const totalRecent = await db.query.groupOrder.findMany({
    where: and(
      eq(groupOrder.productId, productId),
      gte(groupOrder.createdAt, thirtyDaysAgo),
    ),
  })

  const filledCount = totalRecent.filter((g) =>
    (['PURCHASING', 'COMPLETED', 'FILLED'] as string[]).includes(g.status),
  ).length

  const fillProbability =
    totalRecent.length > 0 ? filledCount / totalRecent.length : null

  let message = '暂无历史数据'
  if (avgFillHours !== null && fillProbability !== null) {
    const hours = Math.round(avgFillHours)
    const pct = Math.round(fillProbability * 100)
    message = `近30天约 ${pct}% 成团，平均 ${hours} 小时内满员`
  }

  return {
    sampleSize: totalRecent.length,
    avgFillHours: avgFillHours ? Math.round(avgFillHours * 10) / 10 : null,
    fillProbability: fillProbability
      ? Math.round(fillProbability * 100) / 100
      : null,
    message,
  }
}

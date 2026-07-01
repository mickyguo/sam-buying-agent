declare global {
  var __groupOrderCronStarted: boolean | undefined
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return
  }

  // EdgeOne Pages 使用 edgeone.json schedules 触发定时任务
  if (process.env.NODE_ENV === 'production') {
    return
  }

  if (global.__groupOrderCronStarted) {
    return
  }

  global.__groupOrderCronStarted = true

  const { default: cron } = await import('node-cron')

  cron.schedule('*/10 * * * *', async () => {
    try {
      const { cancelExpiredPendingOrders } = await import('@/lib/group-order')
      const cancelled = await cancelExpiredPendingOrders()
      if (cancelled > 0) {
        console.info(`[cron] cancelled ${cancelled} pending orders`)
      }
    } catch (error) {
      console.error('[cron] cancel pending orders failed', error)
    }
  })

  cron.schedule('0 * * * *', async () => {
    try {
      const { expireOpenGroupOrders } = await import('@/lib/group-order')
      const count = await expireOpenGroupOrders()
      if (count > 0) {
        console.info(`[cron] expired ${count} group orders`)
      }
    } catch (error) {
      console.error('[cron] expire groups failed', error)
    }
  })

  cron.schedule('*/10 * * * *', async () => {
    try {
      const { expirePendingMatchIntents } = await import('@/lib/group-match')
      const { expireWishPosts } = await import('@/lib/wish-wall')
      const { scanAlmostFullGroups } = await import('@/lib/group-almost-full')
      const intentCount = await expirePendingMatchIntents()
      const wishCount = await expireWishPosts()
      const almostCount = await scanAlmostFullGroups()
      if (intentCount > 0 || wishCount > 0 || almostCount > 0) {
        console.info(
          `[cron] expired ${intentCount} intents, ${wishCount} wishes, ${almostCount} almost-full scans`,
        )
      }
    } catch (error) {
      console.error('[cron] expire match intents failed', error)
    }
  })
}

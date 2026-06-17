import cron from 'node-cron'

declare global {
  var __groupOrderCronStarted: boolean | undefined
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return
  }

  // EdgeOne Pages 使用 edgeone.json schedules 触发定时任务，避免 serverless 里 node-cron 失效
  if (process.env.NODE_ENV === 'production') {
    return
  }

  if (global.__groupOrderCronStarted) {
    return
  }

  global.__groupOrderCronStarted = true

  cron.schedule('*/10 * * * *', async () => {
    try {
      const { cancelExpiredPendingOrders, expireOpenGroupOrders } =
        await import('@/lib/group-order')
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
}

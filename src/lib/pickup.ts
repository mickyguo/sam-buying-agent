export function getPickupLocation(): string {
  return (
    process.env.PICKUP_LOCATION ??
    '山姆代购自提点（具体地址请联系代购员），每日 18:00-21:00 可取货'
  )
}

export function getPickupNotice(): string {
  return '本店仅支持到店自提，下单并完成支付后请按通知时间到自提点取货。'
}

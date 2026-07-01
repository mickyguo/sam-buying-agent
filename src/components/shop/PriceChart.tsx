'use client'

interface PricePoint {
  priceYuan: string
  recordedAt: string
}

interface PriceChartProps {
  history: PricePoint[]
  currentPriceYuan: string
  minPrice30dYuan: string | null
  isLowest: boolean
}

export default function PriceChart({
  history,
  currentPriceYuan,
  minPrice30dYuan,
  isLowest,
}: PriceChartProps) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        当前价格 ¥{currentPriceYuan}，暂无历史走势
      </p>
    )
  }

  const prices = history.map((h) => Number(h.priceYuan))
  const max = Math.max(...prices)
  const min = Math.min(...prices)
  const range = max - min || 1

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-[#004b87]">¥{currentPriceYuan}</span>
        {isLowest && minPrice30dYuan ? (
          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
            30天最低价
          </span>
        ) : null}
      </div>
      {minPrice30dYuan ? (
        <p className="mt-1 text-xs text-slate-500">30天最低 ¥{minPrice30dYuan}</p>
      ) : null}
      <div className="mt-4 flex h-24 items-end gap-1">
        {[...history].reverse().map((point) => {
          const height = ((Number(point.priceYuan) - min) / range) * 80 + 8
          return (
            <div
              key={point.recordedAt}
              className="flex-1 rounded-t bg-[#004b87]/70"
              style={{ height: `${height}px` }}
              title={`¥${point.priceYuan}`}
            />
          )
        })}
      </div>
    </div>
  )
}

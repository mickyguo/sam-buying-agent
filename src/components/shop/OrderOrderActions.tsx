'use client'

import { useEffect, useState } from 'react'
import { addCartItem } from '@/lib/shop/cart'
import { shopFetch } from '@/lib/shop/api'
import { shopToastError } from '@/lib/shop/toast'
import { useRouter } from 'next/navigation'
import OrderTimeline from '@/components/shop/OrderTimeline'

interface OrderOrderActionsProps {
  orderId: string
  status: string
}

export default function OrderOrderActions({ orderId, status }: OrderOrderActionsProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [timeline, setTimeline] = useState<
    Array<{
      id: string
      type: string
      label: string
      note: string | null
      imageUrl: string | null
      createdAt: string
    }>
  >([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!expanded) {
      return
    }
    setLoading(true)
    shopFetch<{ timeline: typeof timeline }>(`/api/orders/${orderId}`)
      .then((data) => setTimeline(data.timeline ?? []))
      .catch((err) => {
        shopToastError(err, '加载订单进度失败')
        setTimeline([])
      })
      .finally(() => setLoading(false))
  }, [expanded, orderId])

  async function handleReorder() {
    try {
      const result = await shopFetch<{
        item: {
          productId: string
          productName: string
          productImage: string
          units: number
          mode: 'direct' | 'create'
          amountYuan: string
          unitLabel?: string | null
        }
      }>(`/api/orders/${orderId}/reorder`, { method: 'POST' })
      addCartItem(result.item)
      router.push('/shop/cart')
    } catch (err) {
      shopToastError(err, '再来一单失败')
    }
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
        type="button"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? '收起进度' : '查看进度'}
      </button>
      {status === 'COMPLETED' ? (
        <>
          <button
            className="rounded-full border border-[#004b87] px-3 py-1 text-xs text-[#004b87]"
            type="button"
            onClick={handleReorder}
          >
            再来一单
          </button>
          <a
            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
            href={`/api/orders/${orderId}/share-card`}
            rel="noreferrer"
            target="_blank"
          >
            生成分享图
          </a>
        </>
      ) : null}
      {expanded && !loading && timeline.length > 0 ? (
        <div className="w-full">
          <OrderTimeline events={timeline} />
        </div>
      ) : null}
    </div>
  )
}

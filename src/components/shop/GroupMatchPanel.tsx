'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { shopFetch } from '@/lib/shop/api'
import { requireShopLogin } from '@/lib/shop/auth'
import { shopToastError } from '@/lib/shop/toast'
import type { ShopGroupOrder, ShopProduct } from '@/lib/shop/types'

interface GroupMatchPanelProps {
  products: ShopProduct[]
}

export default function GroupMatchPanel({ products }: GroupMatchPanelProps) {
  const router = useRouter()
  const splittableProducts = products.filter((product) => product.splittable)
  const [productId, setProductId] = useState(splittableProducts[0]?.id ?? '')
  const [wantUnits, setWantUnits] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  if (splittableProducts.length === 0) {
    return null
  }

  const selectedProduct = splittableProducts.find((p) => p.id === productId)

  async function handleSubmit() {
    if (!productId || !selectedProduct) {
      return
    }

    setSubmitting(true)
    setMessage('')

    try {
      requireShopLogin('/shop')
      const result = await shopFetch<{
        action: 'join' | 'create'
        groupOrder: ShopGroupOrder | null
        orderId?: string
      }>('/api/group-match', {
        method: 'POST',
        body: JSON.stringify({ productId, wantUnits }),
      })

      if (result.action === 'join' && result.groupOrder) {
        setMessage('已为你匹配到进行中的拼单，快去参团吧')
        router.push(`/shop/groups/${result.groupOrder.id}`)
        return
      }

      if (result.action === 'create' && result.groupOrder) {
        setMessage('暂未找到合适拼单，已为你发起新团')
        router.push(`/shop/groups/${result.groupOrder.id}`)
      }
    } catch (err) {
      shopToastError(err, '撮合失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold">智能拼单撮合</h2>
      <p className="mt-1 text-xs text-slate-500">
        告诉我你想买几份，系统自动帮你凑团或发起新拼单
      </p>

      <div className="mt-4 space-y-3">
        <select
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
        >
          {splittableProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600">想买</label>
          <input
            className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-center text-sm"
            min={1}
            max={selectedProduct?.totalUnits ?? 99}
            type="number"
            value={wantUnits}
            onChange={(event) =>
              setWantUnits(Math.max(1, Number.parseInt(event.target.value, 10) || 1))
            }
          />
          <span className="text-sm text-slate-500">
            {selectedProduct?.unitLabel ?? '份'}
          </span>
        </div>

        <button
          className="w-full rounded-full bg-[#004b87] py-2.5 text-sm text-white disabled:opacity-60"
          disabled={submitting}
          type="button"
          onClick={handleSubmit}
        >
          {submitting ? '撮合中...' : '帮我凑团'}
        </button>
      </div>

      {message ? <p className="mt-3 text-sm text-green-600">{message}</p> : null}
    </section>
  )
}

'use client'

import ShopImage from '@/components/shop/ShopImage'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { shopFetch } from '@/lib/shop/api'
import { requireShopLogin } from '@/lib/shop/auth'
import { shopToastError, shopToastSuccess } from '@/lib/shop/toast'
import type { ShopProduct } from '@/lib/shop/types'

interface WishPost {
  id: string
  wantUnits: number
  note: string | null
  expiresAt: string
  user: { nickname: string | null; avatarUrl: string | null }
  product: {
    id: string
    name: string
    imageUrl: string
    unitLabel: string | null
  }
}

interface WishWallPanelProps {
  products: ShopProduct[]
}

export default function WishWallPanel({ products }: WishWallPanelProps) {
  const router = useRouter()
  const splittable = products.filter((p) => p.splittable)
  const [posts, setPosts] = useState<WishPost[]>([])
  const [productId, setProductId] = useState(splittable[0]?.id ?? '')
  const [wantUnits, setWantUnits] = useState(1)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    shopFetch<WishPost[]>('/api/wish-wall', { auth: false }).then(setPosts).catch(() => setPosts([]))
  }, [])

  if (splittable.length === 0) {
    return null
  }

  async function handlePublish() {
    setSubmitting(true)
    try {
      requireShopLogin('/shop')
      const result = await shopFetch<{
        action: string
        groupOrder?: { id: string }
        orderId?: string
      }>('/api/wish-wall', {
        method: 'POST',
        body: JSON.stringify({ productId, wantUnits, note }),
      })
      if (result.action === 'join' && result.groupOrder) {
        router.push(`/shop/groups/${result.groupOrder.id}`)
      } else {
        shopToastSuccess('许愿已发布，等待有缘人凑团')
        const updated = await shopFetch<WishPost[]>('/api/wish-wall', { auth: false })
        setPosts(updated)
      }
    } catch (err) {
      shopToastError(err, '发布失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMatch(wishId: string) {
    try {
      requireShopLogin('/shop')
      const result = await shopFetch<{ groupOrder: { id: string } | null }>(
        `/api/wish-wall/${wishId}/match`,
        { method: 'POST' },
      )
      if (result.groupOrder) {
        router.push(`/shop/groups/${result.groupOrder.id}`)
      }
    } catch (err) {
      shopToastError(err, '匹配失败')
    }
  }

  return (
    <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold">求拼墙</h2>
      <p className="mt-1 text-sm text-slate-500">发布许愿，或帮别人凑团</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        >
          {splittable.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          className="w-16 rounded-lg border border-slate-200 px-2 py-2 text-sm"
          min={1}
          type="number"
          value={wantUnits}
          onChange={(e) => setWantUnits(Number(e.target.value))}
        />
        <input
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="备注（可选）"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          className="rounded-full bg-[#004b87] px-4 py-2 text-sm text-white disabled:opacity-60"
          disabled={submitting}
          type="button"
          onClick={handlePublish}
        >
          发布许愿
        </button>
      </div>
      {posts.length > 0 ? (
        <div className="mt-4 space-y-3">
          {posts.slice(0, 5).map((post) => (
            <div key={post.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <ShopImage
                className="h-12 w-12 rounded-lg object-cover"
                src={post.product.imageUrl}
                alt={post.product.name}
                width={48}
                height={48}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{post.product.name}</p>
                <p className="text-xs text-slate-500">
                  {post.user.nickname ?? '用户'} 想要 {post.wantUnits}{' '}
                  {post.product.unitLabel ?? '份'}
                </p>
              </div>
              <button
                className="shrink-0 rounded-full border border-[#004b87] px-3 py-1 text-xs text-[#004b87]"
                type="button"
                onClick={() => handleMatch(post.id)}
              >
                帮凑团
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

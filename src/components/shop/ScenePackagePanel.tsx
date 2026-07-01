'use client'

import ShopImage from '@/components/shop/ShopImage'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { addCartItem } from '@/lib/shop/cart'
import { shopFetch } from '@/lib/shop/api'
import { requireShopLogin } from '@/lib/shop/auth'
import { shopToastError } from '@/lib/shop/toast'

interface ScenePackage {
  id: string
  name: string
  description: string | null
  coverImage: string | null
  promptHint: string | null
  items: Array<{ productId: string; productName: string; units: number }>
}

interface ScenePackagePanelProps {
  onScenePrompt?: (prompt: string) => void
}

export default function ScenePackagePanel({ onScenePrompt }: ScenePackagePanelProps) {
  const router = useRouter()
  const [packages, setPackages] = useState<ScenePackage[]>([])
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    shopFetch<ScenePackage[]>('/api/scene-packages', { auth: false })
      .then(setPackages)
      .catch(() => setPackages([]))
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd(pkg: ScenePackage) {
    setAddingId(pkg.id)
    setMessage('')
    try {
      requireShopLogin('/shop')
      const result = await shopFetch<{
        items: Array<{
          productId: string
          productName: string
          productImage: string
          units: number
          mode: 'direct' | 'create'
          unitLabel?: string | null
        }>
      }>(`/api/scene-packages/${pkg.id}/add-to-cart`, { method: 'POST' })

      for (const item of result.items) {
        addCartItem({
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage,
          units: item.units,
          mode: item.mode,
          amountYuan: '0',
          unitLabel: item.unitLabel,
        })
      }
      setMessage(`「${pkg.name}」已加入购物车`)
      router.push('/shop/cart')
    } catch (err) {
      shopToastError(err, '加购失败')
    } finally {
      setAddingId(null)
    }
  }

  if (loading || packages.length === 0) {
    return null
  }

  return (
    <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold">场景套餐</h2>
      <p className="mt-1 text-sm text-slate-500">一键搭配，聚会露营不用愁</p>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="w-40 shrink-0 rounded-xl border border-slate-100 bg-[#f8fbfd] p-3"
          >
            {pkg.coverImage ? (
              <ShopImage
                className="h-20 w-full rounded-lg object-cover"
                src={pkg.coverImage}
                alt={pkg.name}
                width={160}
                height={80}
              />
            ) : (
              <div className="flex h-20 items-center justify-center rounded-lg bg-slate-200 text-2xl">
                🎉
              </div>
            )}
            <p className="mt-2 text-sm font-medium">{pkg.name}</p>
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">
              {pkg.description ?? `${pkg.items.length} 件商品`}
            </p>
            <div className="mt-2 flex flex-col gap-1">
              <button
                className="rounded-full bg-[#004b87] py-1.5 text-xs text-white disabled:opacity-60"
                disabled={addingId === pkg.id}
                type="button"
                onClick={() => handleAdd(pkg)}
              >
                {addingId === pkg.id ? '添加中...' : '一键加购'}
              </button>
              {pkg.promptHint && onScenePrompt ? (
                <button
                  className="rounded-full border border-slate-200 py-1.5 text-xs text-slate-600"
                  type="button"
                  onClick={() => onScenePrompt(pkg.promptHint!)}
                >
                  问 AI
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {message ? <p className="mt-2 text-xs text-slate-500">{message}</p> : null}
    </div>
  )
}

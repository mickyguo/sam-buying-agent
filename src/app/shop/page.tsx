'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import AiChatPanel from '@/components/shop/AiChatPanel'
import AiOrderPanel from '@/components/shop/AiOrderPanel'
import FrequentItemsPanel from '@/components/shop/FrequentItemsPanel'
import GroupMatchPanel from '@/components/shop/GroupMatchPanel'
import OpenGroupsPanel from '@/components/shop/OpenGroupsPanel'
import ProductRequestPanel from '@/components/shop/ProductRequestPanel'
import ScenePackagePanel from '@/components/shop/ScenePackagePanel'
import SubscribeNotifyButton from '@/components/shop/SubscribeNotifyButton'
import WishWallPanel from '@/components/shop/WishWallPanel'
import ShopShell from '@/components/shop/ShopShell'
import { shopFetch } from '@/lib/shop/api'
import { shopToastError } from '@/lib/shop/toast'
import type { ShopProduct } from '@/lib/shop/types'

function ShopHomeContent() {
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [scenePrompt, setScenePrompt] = useState<string | null>(null)

  useEffect(() => {
    shopFetch<ShopProduct[]>('/api/products', { auth: false })
      .then(setProducts)
      .catch((err: Error) => shopToastError(err, '加载商品失败'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) {
      localStorage.setItem('sam_referral_code', ref)
      shopFetch('/api/users/me/referral', { method: 'POST' }).catch(() => undefined)
    }
  }, [searchParams])

  return (
    <ShopShell title="山姆商品">
      {loading ? <p className="py-16 text-center text-slate-400">加载中...</p> : null}
      {!loading && products.length === 0 ? (
        <p className="py-16 text-center text-slate-400">暂无商品</p>
      ) : null}
      {!loading && products.length > 0 ? (
        <>
          <SubscribeNotifyButton />
          <FrequentItemsPanel />
          <ScenePackagePanel onScenePrompt={setScenePrompt} />
          <AiChatPanel products={products} scenePrompt={scenePrompt} />
          <AiOrderPanel products={products} />
          <WishWallPanel products={products} />
          <GroupMatchPanel products={products} />
          <OpenGroupsPanel />
          <ProductRequestPanel />
        </>
      ) : null}
      <div className="grid gap-4">
        {products.map((product) => (
          <Link
            key={product.id}
            className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm"
            href={`/shop/products/${product.id}`}
          >
            <Image
              className="h-24 w-24 rounded-xl object-cover"
              src={product.imageUrl}
              alt={product.name}
              width={96}
              height={96}
            />
            <div className="flex flex-1 flex-col">
              <h2 className="font-semibold">{product.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                {product.description}
              </p>
              <div className="mt-auto flex items-center justify-between pt-2">
                <span className="text-lg font-bold text-[#004b87]">
                  ¥{product.priceYuan}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    product.splittable
                      ? 'bg-green-50 text-green-700'
                      : 'bg-orange-50 text-orange-700'
                  }`}
                >
                  {product.splittable ? '可拼单' : '整件代购'}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </ShopShell>
  )
}

export default function ShopHomePage() {
  return (
    <Suspense fallback={<ShopShell title="山姆商品"><p className="py-16 text-center text-slate-400">加载中...</p></ShopShell>}>
      <ShopHomeContent />
    </Suspense>
  )
}

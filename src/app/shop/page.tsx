'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import AiOrderPanel from '@/components/shop/AiOrderPanel'
import ShopShell from '@/components/shop/ShopShell'
import { shopFetch } from '@/lib/shop/api'
import type { ShopProduct } from '@/lib/shop/types'

export default function ShopHomePage() {
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    shopFetch<ShopProduct[]>('/api/products', { auth: false })
      .then(setProducts)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <ShopShell title="山姆商品">
      {loading ? <p className="py-16 text-center text-slate-400">加载中...</p> : null}
      {error ? <p className="py-16 text-center text-red-500">{error}</p> : null}
      {!loading && !error && products.length === 0 ? (
        <p className="py-16 text-center text-slate-400">暂无商品</p>
      ) : null}
      {!loading && !error && products.length > 0 ? (
        <AiOrderPanel products={products} />
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

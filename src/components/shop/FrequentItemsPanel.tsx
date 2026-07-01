'use client'

import ShopImage from '@/components/shop/ShopImage'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { shopFetch } from '@/lib/shop/api'
import { useShopAuth } from '@/lib/shop/use-shop-auth'

interface FrequentItem {
  productId: string
  name: string
  imageUrl: string
  priceYuan: string
  orderCount: number
}

export default function FrequentItemsPanel() {
  const { loggedIn } = useShopAuth()
  const [items, setItems] = useState<FrequentItem[]>([])

  useEffect(() => {
    if (!loggedIn) {
      return
    }
    shopFetch<FrequentItem[]>('/api/users/me/frequent-items')
      .then(setItems)
      .catch(() => setItems([]))
  }, [loggedIn])

  if (!loggedIn || items.length === 0) {
    return null
  }

  return (
    <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold">常买清单</h2>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
        {items.map((item) => (
          <Link
            key={item.productId}
            className="w-28 shrink-0"
            href={`/shop/products/${item.productId}`}
          >
            <ShopImage
              className="h-20 w-full rounded-lg object-cover"
              src={item.imageUrl}
              alt={item.name}
              width={112}
              height={80}
            />
            <p className="mt-1 line-clamp-2 text-xs">{item.name}</p>
            <p className="text-xs text-[#004b87]">¥{item.priceYuan}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

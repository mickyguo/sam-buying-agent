'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { CART_UPDATED_EVENT, getCartCount } from '@/lib/shop/cart'

const tabs = [
  { href: '/shop', label: '商品', match: /^\/shop(\/)?$/ },
  { href: '/shop/cart', label: '购物车', match: /^\/shop\/cart/ },
  { href: '/shop/orders', label: '订单', match: /^\/shop\/orders/ },
  { href: '/shop/profile', label: '我的', match: /^\/shop\/profile/ },
]

export default function ShopTabBar() {
  const pathname = usePathname()
  const [cartCount, setCartCount] = useState(0)

  const refreshCartCount = useCallback(() => {
    setCartCount(getCartCount())
  }, [])

  useEffect(() => {
    refreshCartCount()
    const onCartUpdated = () => refreshCartCount()
    window.addEventListener(CART_UPDATED_EVENT, onCartUpdated)
    return () => window.removeEventListener(CART_UPDATED_EVENT, onCartUpdated)
  }, [refreshCartCount])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-md">
        {tabs.map((tab) => {
          const active = tab.match.test(pathname)
          const showBadge = tab.href === '/shop/cart' && cartCount > 0
          return (
            <Link
              key={tab.href}
              className={`relative flex-1 py-3 text-center text-sm ${
                active ? 'font-semibold text-[#004b87]' : 'text-slate-500'
              }`}
              href={tab.href}
            >
              {tab.label}
              {showBadge ? (
                <span className="absolute right-1/4 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              ) : null}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import { getCurrentUser, isLoggedIn } from '@/lib/shop/auth'
import type { ShopUser } from '@/lib/shop/types'

export function useShopAuth() {
  const [mounted, setMounted] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [user, setUser] = useState<ShopUser | null>(null)

  const refresh = useCallback(() => {
    setLoggedIn(isLoggedIn())
    setUser(getCurrentUser())
  }, [])

  useEffect(() => {
    refresh()
    setMounted(true)
  }, [refresh])

  return { mounted, loggedIn, user, refresh }
}

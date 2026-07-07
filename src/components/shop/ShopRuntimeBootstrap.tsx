'use client'

import { ensureShopRuntimeConfig, getShopApiBase, missingApiBaseMessage } from '@/lib/shop/runtime-config'
import { useEffect, useState } from 'react'

export default function ShopRuntimeBootstrap({
  children,
}: {
  children: React.ReactNode
}) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      await ensureShopRuntimeConfig()
      if (!getShopApiBase()) {
        setError(missingApiBaseMessage())
        return
      }
      setReady(true)
    })()
  }, [])

  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center px-6 py-10 text-center text-sm text-red-600">
        {error}
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center justify-center text-sm text-zinc-500">
        加载中...
      </div>
    )
  }

  return children
}

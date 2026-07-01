'use client'

import { useState } from 'react'
import { shopFetch } from '@/lib/shop/api'
import { requireShopLogin } from '@/lib/shop/auth'
import { shopToastError } from '@/lib/shop/toast'
import { useShopAuth } from '@/lib/shop/use-shop-auth'

export default function ProductRequestPanel() {
  const { loggedIn } = useShopAuth()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  if (!loggedIn) {
    return null
  }

  async function handleSubmit() {
    if (!url.trim()) {
      return
    }
    setLoading(true)
    setMessage('')
    try {
      requireShopLogin('/shop')
      const result = await shopFetch<{ message: string }>('/api/product-requests', {
        method: 'POST',
        body: JSON.stringify({ sourceUrl: url.trim() }),
      })
      setMessage(result.message)
      setUrl('')
    } catch (err) {
      shopToastError(err, '提交失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-4 rounded-2xl bg-[#f8fbfd] p-4">
      <h2 className="font-semibold">想买这个？</h2>
      <p className="mt-1 text-sm text-slate-500">粘贴山姆 App 分享链接，审核后上架</p>
      <div className="mt-3 flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="粘贴山姆商品链接"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          className="shrink-0 rounded-full bg-[#004b87] px-4 py-2 text-sm text-white disabled:opacity-60"
          disabled={loading}
          type="button"
          onClick={handleSubmit}
        >
          提交
        </button>
      </div>
      {message ? <p className="mt-2 text-xs text-slate-500">{message}</p> : null}
    </div>
  )
}

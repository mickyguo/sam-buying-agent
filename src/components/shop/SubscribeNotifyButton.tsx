'use client'

import { useState } from 'react'
import { requireShopLogin } from '@/lib/shop/auth'
import { shopToastError } from '@/lib/shop/toast'
import { useWechatSubscribe } from '@/lib/shop/use-wechat-subscribe'
import { useShopAuth } from '@/lib/shop/use-shop-auth'

export default function SubscribeNotifyButton() {
  const { loggedIn } = useShopAuth()
  const [loading, setLoading] = useState(false)
  const { requestSubscribe, message } = useWechatSubscribe()

  async function handleSubscribe() {
    setLoading(true)
    try {
      requireShopLogin('/shop')
      await requestSubscribe([
        'group_filled',
        'group_expired',
        'group_almost_full',
        'pickup_ready',
        'price_drop',
      ])
    } catch (err) {
      shopToastError(err, '订阅失败')
    } finally {
      setLoading(false)
    }
  }

  if (!loggedIn) {
    return null
  }

  return (
    <div className="mb-4 rounded-2xl bg-[#f8fbfd] p-4">
      <p className="text-sm text-slate-600">订阅微信通知，拼单成功和到货自提不错过</p>
      <button
        className="mt-3 rounded-full border border-[#004b87] px-4 py-2 text-sm text-[#004b87] disabled:opacity-60"
        disabled={loading}
        type="button"
        onClick={handleSubscribe}
      >
        {loading ? '订阅中...' : '开启到货通知'}
      </button>
      {message ? <p className="mt-2 text-xs text-slate-500">{message}</p> : null}
    </div>
  )
}

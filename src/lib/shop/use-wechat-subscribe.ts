'use client'

import { useCallback, useState } from 'react'
import { shopFetch } from '@/lib/shop/api'
import { shopToastError } from '@/lib/shop/toast'
import type { NotifyType } from '@/lib/wechat-subscribe'

interface SubscribeConfig {
  tmplIds: string[]
  types: NotifyType[]
}

export function useWechatSubscribe() {
  const [message, setMessage] = useState('')

  const requestSubscribe = useCallback(async (types: NotifyType[]) => {
    setMessage('')
    try {
      let acceptedTypes = types

      if (typeof window !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent)) {
        const config = await shopFetch<SubscribeConfig>(
          `/api/wechat/subscribe-config?types=${types.join(',')}`,
          { auth: false },
        )

        if (config.tmplIds.length > 0) {
          const wx = (window as Window & { wx?: { requestSubscribeMessage: (p: { tmplIds: string[] }) => Promise<{ [key: string]: string }> } }).wx
          if (wx?.requestSubscribeMessage) {
            try {
              const result = await wx.requestSubscribeMessage({
                tmplIds: config.tmplIds,
              })
              acceptedTypes = types.filter(
                (_, i) => result[config.tmplIds[i]] === 'accept',
              )
            } catch {
              // user declined or env unsupported
            }
          }
        }
      }

      if (acceptedTypes.length === 0) {
        acceptedTypes = types
      }

      const result = await shopFetch<{ message: string }>('/api/notify/subscribe', {
        method: 'POST',
        body: JSON.stringify({ types: acceptedTypes }),
      })
      setMessage(result.message)
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '订阅失败'
      setMessage(errorMessage)
      shopToastError(err, '订阅失败')
      return false
    }
  }, [])

  return { requestSubscribe, message }
}

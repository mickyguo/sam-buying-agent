'use client'

import { useEffect, useState } from 'react'
import { shopFetch } from '@/lib/shop/api'

interface WechatShareConfig {
  enabled: boolean
  appId?: string
  timestamp?: string
  nonceStr?: string
  signature?: string
  message?: string
}

interface WxShareData {
  title: string
  desc: string
  link: string
  imgUrl: string
}

declare global {
  interface Window {
    wx?: {
      config: (params: Record<string, unknown>) => void
      ready: (callback: () => void) => void
      error: (callback: (error: unknown) => void) => void
      updateAppMessageShareData: (params: WxShareData & { success?: () => void }) => void
      updateTimelineShareData: (params: WxShareData & { success?: () => void }) => void
    }
  }
}

function loadWechatScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }
  if (window.wx) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('微信 JSSDK 加载失败'))
    document.head.appendChild(script)
  })
}

export function useWechatShare(shareData: WxShareData | null) {
  const [ready, setReady] = useState(false)
  const [useCopyFallback, setUseCopyFallback] = useState(true)

  useEffect(() => {
    if (!shareData) {
      return undefined
    }

    let cancelled = false

    async function initShare() {
      const currentShare = shareData
      if (!currentShare) {
        return
      }

      try {
        await loadWechatScript()
        const pageUrl = window.location.href.split('#')[0]
        const config = await shopFetch<WechatShareConfig>(
          `/api/wechat/jssdk-config?url=${encodeURIComponent(pageUrl)}`,
          { auth: false },
        )

        if (cancelled) {
          return
        }

        if (!config.enabled || !config.appId) {
          setUseCopyFallback(true)
          return
        }

        window.wx?.config({
          debug: false,
          appId: config.appId,
          timestamp: Number(config.timestamp),
          nonceStr: config.nonceStr,
          signature: config.signature,
          jsApiList: [
            'updateAppMessageShareData',
            'updateTimelineShareData',
          ],
        })

        window.wx?.ready(() => {
          if (cancelled) {
            return
          }
          window.wx?.updateAppMessageShareData({
            title: currentShare.title,
            desc: currentShare.desc,
            link: currentShare.link,
            imgUrl: currentShare.imgUrl,
          })
          window.wx?.updateTimelineShareData({
            title: currentShare.title,
            desc: currentShare.desc,
            link: currentShare.link,
            imgUrl: currentShare.imgUrl,
          })
          setReady(true)
          setUseCopyFallback(false)
        })

        window.wx?.error(() => {
          setUseCopyFallback(true)
        })
      } catch {
        setUseCopyFallback(true)
      }
    }

    initShare()

    return () => {
      cancelled = true
    }
  }, [shareData])

  async function copyShareLink() {
    if (!shareData?.link) {
      return false
    }
    try {
      await navigator.clipboard.writeText(shareData.link)
      return true
    } catch {
      return false
    }
  }

  return { ready, useCopyFallback, copyShareLink }
}

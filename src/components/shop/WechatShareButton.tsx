'use client'

import { useState } from 'react'
import { useWechatShare } from '@/lib/shop/use-wechat-share'

interface WechatShareButtonProps {
  title: string
  desc: string
  link: string
  imgUrl: string
  label?: string
}

export default function WechatShareButton({
  title,
  desc,
  link,
  imgUrl,
  label = '分享给好友',
}: WechatShareButtonProps) {
  const [message, setMessage] = useState('')
  const { useCopyFallback, copyShareLink } = useWechatShare({
    title,
    desc,
    link,
    imgUrl,
  })

  async function handleShare() {
    if (useCopyFallback) {
      const copied = await copyShareLink()
      setMessage(copied ? '链接已复制，请粘贴到微信发送给好友' : '请手动复制当前页面链接分享')
      return
    }
    setMessage('请点击右上角「···」分享给好友')
  }

  return (
    <div>
      <button
        className="w-full rounded-full border border-[#004b87] py-3 text-[#004b87]"
        type="button"
        onClick={handleShare}
      >
        {label}
      </button>
      {message ? <p className="mt-2 text-center text-sm text-slate-500">{message}</p> : null}
    </div>
  )
}

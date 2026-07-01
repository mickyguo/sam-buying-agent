'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addCartItem } from '@/lib/shop/cart'
import { shopFetch } from '@/lib/shop/api'
import { requireShopLogin } from '@/lib/shop/auth'
import { shopToastError } from '@/lib/shop/toast'
import type { CartItem, ShopProduct } from '@/lib/shop/types'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatItem {
  productId: string
  productName: string
  productImage: string
  units: number
  mode: 'direct' | 'create' | 'join'
  amountYuan: string
  unitLabel?: string | null
}

interface AiChatPanelProps {
  products: ShopProduct[]
  returnPath?: string
  scenePrompt?: string | null
}

export default function AiChatPanel({
  products,
  returnPath = '/shop',
  scenePrompt,
}: AiChatPanelProps) {
  const router = useRouter()
  const listRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '你好，我是山姆代购助手。可以说「下周六聚会 10 人，要甜点和烤鸡」，我来帮你搭配。',
    },
  ])
  const [items, setItems] = useState<ChatItem[]>([])
  const [source, setSource] = useState<'llm' | 'fallback' | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (scenePrompt) {
      setInput(scenePrompt)
    }
  }, [scenePrompt])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) {
      return
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: text },
    ]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    setItems([])

    try {
      const result = await shopFetch<{
        reply: string
        source: 'llm' | 'fallback'
        items: ChatItem[]
      }>('/api/shop/ai-chat', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          text,
        }),
      })

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: result.reply },
      ])
      setItems(result.items)
      setSource(result.source)

      requestAnimationFrame(() => {
        listRef.current?.scrollTo({
          top: listRef.current.scrollHeight,
          behavior: 'smooth',
        })
      })
    } catch (err) {
      shopToastError(err, '对话失败')
    } finally {
      setLoading(false)
    }
  }

  function handleAddToCart(goToCart: boolean) {
    if (submitting || items.length === 0) {
      return
    }

    setSubmitting(true)

    try {
      requireShopLogin(returnPath)

      for (const item of items) {
        const cartItem: CartItem = {
          id: `${item.productId}-${item.mode}-${item.units}-${Date.now()}`,
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage,
          units: item.units,
          mode: item.mode,
          amountYuan: item.amountYuan,
          unitLabel: item.unitLabel,
        }
        addCartItem(cartItem)
      }

      if (goToCart) {
        router.push('/shop/cart')
        return
      }

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: `已将 ${items.length} 项商品加入购物车。` },
      ])
      setItems([])
    } catch (err) {
      shopToastError(err, '加入购物车失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">AI 采购助手</h2>
          <p className="mt-1 text-xs text-slate-500">多轮对话，像跟代购聊天一样下单</p>
        </div>
        {source ? (
          <span className="rounded-full bg-[#e8f1f8] px-3 py-1 text-xs text-[#004b87]">
            {source === 'llm' ? 'LLM' : '规则引擎'}
          </span>
        ) : null}
      </div>

      <div
        ref={listRef}
        className="mt-4 max-h-56 space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-3"
      >
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <p
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                message.role === 'user'
                  ? 'bg-[#004b87] text-white'
                  : 'bg-white text-slate-700 shadow-sm'
              }`}
            >
              {message.content}
            </p>
          </div>
        ))}
        {loading ? (
          <p className="text-sm text-slate-400">思考中...</p>
        ) : null}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#004b87]"
          placeholder="例如：聚会 10 人，要甜点和饮料"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              handleSend()
            }
          }}
        />
        <button
          className="shrink-0 rounded-xl bg-[#004b87] px-4 py-2.5 text-sm text-white disabled:opacity-60"
          disabled={loading || !input.trim()}
          type="button"
          onClick={handleSend}
        >
          发送
        </button>
      </div>

      {items.length > 0 ? (
        <div className="mt-4 rounded-xl bg-[#f8fbfd] p-3">
          <p className="text-xs font-medium text-slate-500">推荐商品</p>
          <ul className="mt-2 space-y-2">
            {items.map((item) => (
              <li
                key={`${item.productId}-${item.mode}-${item.units}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="line-clamp-1">{item.productName}</span>
                <span className="shrink-0 text-slate-500">
                  {item.units} · ¥{item.amountYuan}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <button
              className="flex-1 rounded-full border border-[#004b87] py-2.5 text-sm text-[#004b87] disabled:opacity-60"
              disabled={submitting}
              type="button"
              onClick={() => handleAddToCart(false)}
            >
              加入购物车
            </button>
            <button
              className="flex-1 rounded-full bg-[#004b87] py-2.5 text-sm text-white disabled:opacity-60"
              disabled={submitting}
              type="button"
              onClick={() => handleAddToCart(true)}
            >
              去结算
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}

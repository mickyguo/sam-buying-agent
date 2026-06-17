'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addCartItem } from '@/lib/shop/cart'
import { requireShopLogin } from '@/lib/shop/auth'
import {
  matchedLinesToCartItems,
  parseAndMatchAiOrder,
  type MatchedOrderLine,
} from '@/lib/shop/ai-order'
import type { ShopProduct } from '@/lib/shop/types'

function getDisplayNameFromProduct(product: ShopProduct): string {
  return product.name.replace(/Member's Mark\s*/i, '').trim()
}

interface SpeechRecognitionAlternative {
  transcript: string
}

interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: SpeechRecognitionAlternative
}

interface SpeechRecognitionEventLike extends Event {
  results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
}

interface AiOrderPanelProps {
  products: ShopProduct[]
  returnPath?: string
}

export default function AiOrderPanel({
  products,
  returnPath = '/shop',
}: AiOrderPanelProps) {
  const router = useRouter()
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState<MatchedOrderLine[]>([])
  const [unmatched, setUnmatched] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const SpeechRecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition
    setSpeechSupported(Boolean(SpeechRecognitionCtor))

    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  function handleParse() {
    const text = input.trim()
    if (!text) {
      setError('请输入或说出想买的商品')
      setPreview([])
      setUnmatched([])
      return
    }

    setParsing(true)
    setError('')
    setMessage('')

    const result = parseAndMatchAiOrder(text, products)
    setPreview(result.matched)
    setUnmatched(result.unmatched)

    if (result.matched.length === 0) {
      setError('未能识别商品，请尝试更具体的名称，如「鲜牛乳一件、瑞士卷5个」')
    } else if (result.unmatched.length > 0) {
      setMessage(`已识别 ${result.matched.length} 项，${result.unmatched.length} 项未匹配`)
    } else {
      setMessage(`已识别 ${result.matched.length} 项商品`)
    }

    setParsing(false)
  }

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const SpeechRecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SpeechRecognitionCtor) {
      setError('当前浏览器不支持语音输入')
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'zh-CN'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join('')
        .trim()
      if (transcript) {
        setInput(transcript)
      }
    }

    recognition.onerror = () => {
      setListening(false)
      setError('语音识别失败，请检查麦克风权限后重试')
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition
    setError('')
    setListening(true)
    recognition.start()
  }

  function handleAddToCart(goToCart: boolean) {
    if (submitting || preview.length === 0) {
      return
    }

    setSubmitting(true)
    setError('')
    setMessage('')

    try {
      requireShopLogin(returnPath)

      for (const item of matchedLinesToCartItems(preview)) {
        addCartItem(item)
      }

      if (goToCart) {
        router.push('/shop/cart')
        return
      }

      setMessage(`已将 ${preview.length} 项商品加入购物车`)
      setPreview([])
      setUnmatched([])
      setInput('')
    } catch (err) {
      if (err instanceof Error && err.message === '请先登录') {
        return
      }
      setError(err instanceof Error ? err.message : '加入购物车失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">AI 下单</h2>
          <p className="mt-1 text-xs text-slate-500">
            语音或文字描述，如「鲜牛乳一件、瑞士卷5个」
          </p>
        </div>
        <span className="rounded-full bg-[#e8f1f8] px-3 py-1 text-xs text-[#004b87]">
          智能识别
        </span>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#004b87]"
          placeholder="输入或语音说出想买什么..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              handleParse()
            }
          }}
        />
        {speechSupported ? (
          <button
            className={`shrink-0 rounded-xl px-3 py-2.5 text-sm ${
              listening
                ? 'bg-red-50 text-red-600'
                : 'bg-slate-100 text-slate-700'
            }`}
            type="button"
            aria-label={listening ? '停止录音' : '语音输入'}
            onClick={toggleListening}
          >
            {listening ? '录音中' : '语音'}
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          className="flex-1 rounded-full border border-[#004b87] py-2.5 text-sm text-[#004b87] disabled:opacity-60"
          disabled={parsing || !input.trim()}
          type="button"
          onClick={handleParse}
        >
          {parsing ? '识别中...' : '识别商品'}
        </button>
      </div>

      {preview.length > 0 ? (
        <div className="mt-4 rounded-xl bg-[#f8fbfd] p-3">
          <p className="text-xs font-medium text-slate-500">识别结果</p>
          <ul className="mt-2 space-y-2">
            {preview.map((line, index) => (
              <li
                key={`${line.product.id}-${line.mode}-${line.units}-${index}`}
                className="flex items-center justify-between text-sm"
              >
                <span>{getDisplayNameFromProduct(line.product)}</span>
                <span className="text-slate-500">
                  {line.mode === 'direct'
                    ? `${line.units} 件`
                    : `${line.units} ${line.product.unitLabel ?? '份'}`}
                  {' · '}
                  ¥{line.amountYuan}
                </span>
              </li>
            ))}
          </ul>
          {unmatched.length > 0 ? (
            <p className="mt-2 text-xs text-amber-600">
              未匹配：{unmatched.join('、')}
            </p>
          ) : null}
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
              加入并结算
            </button>
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm text-green-600">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
    </section>
  )
}

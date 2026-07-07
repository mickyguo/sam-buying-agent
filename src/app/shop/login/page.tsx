'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, Suspense, useEffect, useState } from 'react'
import ShopShell from '@/components/shop/ShopShell'
import {
  devLogin,
  loginWithSms,
  sendSmsCode,
  startWechatOAuth,
} from '@/lib/shop/auth'
import { setShopSession } from '@/lib/shop/storage'
import { useShopAuth } from '@/lib/shop/use-shop-auth'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { mounted, user, refresh } = useShopAuth()
  const [phone, setPhone] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [smsMessage, setSmsMessage] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const redirectPath = searchParams.get('redirect')
  const oauthError = searchParams.get('error')

  useEffect(() => {
    const token = searchParams.get('token')
    const userRaw = searchParams.get('user')
    if (!token || !userRaw) {
      return
    }

    try {
      const parsedUser = JSON.parse(decodeURIComponent(userRaw))
      setShopSession(token, parsedUser)
      refresh()
      navigateAfterLogin()
    } catch {
      refresh()
    }
  }, [searchParams, refresh])

  useEffect(() => {
    if (mounted && user) {
      navigateAfterLogin()
    }
  }, [mounted, user])

  function navigateAfterLogin() {
    const target = redirectPath?.startsWith('/shop') ? redirectPath : '/shop/profile'
    router.replace(target)
  }

  async function handleSendCode() {
    setSmsMessage('')
    try {
      const result = await sendSmsCode(phone)
      setSmsMessage(result.message)
      setCountdown(60)
      const timer = window.setInterval(() => {
        setCountdown((value) => {
          if (value <= 1) {
            window.clearInterval(timer)
            return 0
          }
          return value - 1
        })
      }, 1000)
    } catch (error) {
      setSmsMessage(error instanceof Error ? error.message : '发送失败')
    }
  }

  async function handleSmsLogin(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setSmsMessage('')
    try {
      await loginWithSms(phone, smsCode)
      refresh()
      setSmsMessage('登录成功')
      navigateAfterLogin()
    } catch (error) {
      setSmsMessage(error instanceof Error ? error.message : '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDevLogin() {
    await devLogin()
    refresh()
    navigateAfterLogin()
  }

  function handleWechatLogin() {
    const returnPath = redirectPath?.startsWith('/shop')
      ? `/shop/login?redirect=${encodeURIComponent(redirectPath)}`
      : '/shop/login'
    startWechatOAuth(returnPath)
  }

  if (!mounted) {
    return (
      <ShopShell title="登录">
        <p className="py-16 text-center text-slate-400">加载中...</p>
      </ShopShell>
    )
  }

  if (user) {
    return (
      <ShopShell title="登录">
        <p className="py-16 text-center text-slate-400">跳转中...</p>
      </ShopShell>
    )
  }

  return (
    <ShopShell title="登录">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">欢迎使用山姆代购</h2>
        <p className="mt-2 text-sm text-slate-500">
          登录后可下单、支付与查看订单
        </p>
      </div>

      <form
        className="mt-4 rounded-2xl bg-white p-4 shadow-sm"
        onSubmit={handleSmsLogin}
      >
        <h2 className="mb-4 font-semibold">短信验证码登录</h2>
        {redirectPath ? (
          <p className="mb-3 text-sm text-amber-700">登录后将返回继续操作</p>
        ) : null}
        {oauthError ? (
          <p className="mb-3 text-sm text-red-600">微信登录失败，请重试</p>
        ) : null}
        <input
          className="mb-3 w-full rounded-xl border border-slate-200 px-4 py-3"
          type="tel"
          placeholder="手机号"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          maxLength={11}
        />
        <div className="mb-3 flex gap-3">
          <input
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3"
            type="text"
            placeholder="验证码（本地可用 123456）"
            value={smsCode}
            onChange={(event) => setSmsCode(event.target.value)}
            maxLength={6}
          />
          <button
            className="shrink-0 rounded-xl bg-slate-100 px-4 py-3 text-sm text-[#004b87] disabled:opacity-50"
            disabled={countdown > 0 || !phone}
            type="button"
            onClick={handleSendCode}
          >
            {countdown > 0 ? `${countdown}s` : '获取验证码'}
          </button>
        </div>
        <button
          className="w-full rounded-full bg-[#004b87] py-3 text-white disabled:opacity-60"
          disabled={submitting || !phone || !smsCode}
          type="submit"
        >
          {submitting ? '登录中...' : '登录'}
        </button>
        {smsMessage ? (
          <p className="mt-3 text-sm text-slate-500">{smsMessage}</p>
        ) : null}
        <p className="mt-3 text-xs text-slate-400">
          本地开发环境固定验证码 123456，无需真实短信。
        </p>
      </form>

      <div className="mt-4 rounded-2xl bg-white shadow-sm">
        <button
          className="block w-full border-b border-slate-100 px-4 py-4 text-left"
          type="button"
          onClick={handleWechatLogin}
        >
          微信授权登录
        </button>
        <button
          className="block w-full border-b border-slate-100 px-4 py-4 text-left"
          data-testid="dev-login-button"
          type="button"
          onClick={handleDevLogin}
        >
          开发模式登录
        </button>
        <Link className="block px-4 py-4" href="/terms">
          用户协议
        </Link>
        <Link className="block px-4 py-4" href="/privacy">
          隐私政策
        </Link>
      </div>
    </ShopShell>
  )
}

export default function ShopLoginPage() {
  return (
    <Suspense
      fallback={
        <ShopShell title="登录">
          <p className="py-16 text-center text-slate-400">加载中...</p>
        </ShopShell>
      }
    >
      <LoginContent />
    </Suspense>
  )
}

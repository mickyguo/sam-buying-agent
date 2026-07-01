'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import ShopShell from '@/components/shop/ShopShell'
import { logout } from '@/lib/shop/auth'
import { getShopConfig } from '@/lib/shop/pickup'
import { shopFetch } from '@/lib/shop/api'
import { useShopAuth } from '@/lib/shop/use-shop-auth'

export default function ShopProfilePage() {
  const { mounted, user, refresh } = useShopAuth()
  const [pickupLocation, setPickupLocation] = useState('')
  const [pickupNotice, setPickupNotice] = useState('')
  const [referral, setReferral] = useState<{
    code: string
    shareUrl: string
    totalInvites: number
    rewardedCount: number
  } | null>(null)
  const [coupons, setCoupons] = useState<
    Array<{ id: string; name: string; discountYuan: string }>
  >([])

  useEffect(() => {
    getShopConfig()
      .then((config) => {
        setPickupLocation(config.pickupLocation)
        setPickupNotice(config.pickupNotice)
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!user) {
      return
    }
    shopFetch<typeof referral>('/api/users/me/referral')
      .then((data) => setReferral(data))
      .catch(() => undefined)
    shopFetch<typeof coupons>('/api/users/me/coupons')
      .then(setCoupons)
      .catch(() => undefined)

    const refCode = localStorage.getItem('sam_referral_code')
    if (refCode) {
      shopFetch('/api/users/me/referral/claim', {
        method: 'POST',
        body: JSON.stringify({ code: refCode }),
      })
        .then(() => localStorage.removeItem('sam_referral_code'))
        .catch(() => undefined)
    }
  }, [user])

  function handleLogout() {
    logout()
    refresh()
  }

  if (!mounted) {
    return (
      <ShopShell title="我的">
        <p className="py-16 text-center text-slate-400">加载中...</p>
      </ShopShell>
    )
  }

  return (
    <ShopShell title="我的">
      {user ? (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-xl">
              {(user.nickname ?? user.phone ?? '用')[0]}
            </div>
            <div>
              <p className="text-lg font-semibold">
                {user.nickname ?? user.phone ?? '山姆会员'}
              </p>
              <p className="text-sm text-slate-500">
                {user.phone ? `手机号 ${user.phone}` : '已登录'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">欢迎使用山姆代购</h2>
          <p className="mt-2 text-sm text-slate-500">
            登录后可下单、支付与查看订单
          </p>
          <Link
            className="mt-4 block w-full rounded-full bg-[#004b87] py-3 text-center text-white"
            href="/shop/login"
          >
            立即登录
          </Link>
        </div>
      )}

      <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold">自提须知</h2>
        <p className="mt-2 text-sm text-slate-600">
          {pickupNotice || '本店仅支持到店自提。'}
        </p>
        {pickupLocation ? (
          <p className="mt-2 text-sm font-medium text-[#004b87]">
            {pickupLocation}
          </p>
        ) : null}
      </div>

      {user && referral ? (
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold">邀请有礼</h2>
          <p className="mt-2 text-sm text-slate-500">
            邀请好友首单，双方得优惠券（已邀请 {referral.totalInvites} 人，已奖励{' '}
            {referral.rewardedCount} 人）
          </p>
          <p className="mt-2 font-mono text-lg text-[#004b87]">{referral.code}</p>
          <button
            className="mt-3 rounded-full border border-[#004b87] px-4 py-2 text-sm text-[#004b87]"
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(referral.shareUrl)
            }}
          >
            复制邀请链接
          </button>
        </div>
      ) : null}

      {user && coupons.length > 0 ? (
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold">我的优惠券</h2>
          <ul className="mt-3 space-y-2">
            {coupons.map((coupon) => (
              <li
                key={coupon.id}
                className="flex items-center justify-between rounded-lg bg-[#f8fbfd] px-3 py-2 text-sm"
              >
                <span>{coupon.name}</span>
                <span className="font-medium text-[#004b87]">-¥{coupon.discountYuan}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl bg-white shadow-sm">
        {user ? (
          <button
            className="block w-full border-b border-slate-100 px-4 py-4 text-left"
            type="button"
            onClick={handleLogout}
          >
            退出登录
          </button>
        ) : null}
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

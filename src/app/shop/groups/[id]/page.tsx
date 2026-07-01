'use client'

import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import ShopShell from '@/components/shop/ShopShell'
import WechatShareButton from '@/components/shop/WechatShareButton'
import { shopFetch } from '@/lib/shop/api'
import type { ShopGroupOrder } from '@/lib/shop/types'

const STATUS_TEXT: Record<string, string> = {
  OPEN: '拼单中',
  FILLED: '拼单成功，等待代购',
  EXPIRED: '已过期',
  PURCHASING: '采购中',
  COMPLETED: '已完成',
}

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [group, setGroup] = useState<ShopGroupOrder | null>(null)
  const [countdown, setCountdown] = useState('')
  const [leaderBadge, setLeaderBadge] = useState('')

  useEffect(() => {
    shopFetch<ShopGroupOrder>(`/api/group-orders/${params.id}`, { auth: false })
      .then((data) => {
        setGroup(data)
        if (data.initiatorId) {
          shopFetch<{ badgeLabel: string }>(
            `/api/users/${data.initiatorId}/leader-profile`,
            { auth: false },
          )
            .then((profile) => setLeaderBadge(profile.badgeLabel))
            .catch(() => undefined)
        }
      })
      .catch(() => setGroup(null))
  }, [params.id])

  useEffect(() => {
    if (!group || group.status !== 'OPEN') {
      return undefined
    }

    const timer = window.setInterval(() => {
      const diff = new Date(group.expiresAt).getTime() - Date.now()
      if (diff <= 0) {
        setCountdown('已过期')
        return
      }
      const hours = Math.floor(diff / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setCountdown(`${hours}小时${minutes}分${seconds}秒`)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [group])

  const shareData = useMemo(() => {
    if (!group || typeof window === 'undefined') {
      return null
    }
    const remaining = group.remainingUnits
    const title =
      group.status === 'OPEN'
        ? `【山姆拼单】${group.productName}，还差 ${remaining} ${group.unitLabel} 成团`
        : `【山姆拼单】${group.productName} 拼单详情`
    return {
      title,
      desc: `已拼 ${group.committedUnits ?? group.filledUnits}/${group.totalUnits} ${group.unitLabel}，点击参团`,
      link: `${window.location.origin}/shop/groups/${group.id}`,
      imgUrl: group.productImage,
    }
  }, [group])

  if (!group) {
    return (
      <ShopShell title="拼单详情">
        <p className="py-16 text-center text-slate-400">加载中...</p>
      </ShopShell>
    )
  }

  const committedUnits = group.committedUnits ?? group.filledUnits
  const progress = Math.round((committedUnits / group.totalUnits) * 100)
  const isFilled = group.status === 'FILLED' || group.status === 'PURCHASING'

  return (
    <ShopShell title="拼单详情">
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="relative h-40 w-full bg-slate-100">
          <Image
            className="object-cover"
            src={group.productImage}
            alt={group.productName}
            fill
            sizes="100vw"
          />
        </div>
        <div className="p-4">
          <h2 className="text-lg font-bold">{group.productName}</h2>
          {leaderBadge ? (
            <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
              团长：{leaderBadge}
            </span>
          ) : null}
          <p className="mt-2 text-[#004b87]">{STATUS_TEXT[group.status] ?? group.status}</p>
          {isFilled ? (
            <p className="mt-2 text-sm text-green-700">
              拼单已满员，代购员将前往山姆采购，完成后请到店自提。
            </p>
          ) : null}
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-[#004b87] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-3 font-semibold">
            已拼 {committedUnits}/{group.totalUnits} {group.unitLabel}
          </p>
          <p className="text-sm text-slate-500">
            其中 {group.filledUnits} {group.unitLabel} 已支付
          </p>
          {group.status === 'OPEN' ? (
            <p className="mt-1 text-sm font-medium text-[#004b87]">
              还差 {group.remainingUnits} {group.unitLabel} 成团
            </p>
          ) : null}
          {group.status === 'OPEN' ? (
            <p className="mt-2 text-sm text-slate-500">倒计时：{countdown}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <h3 className="font-semibold">参团记录</h3>
        {group.participations.length === 0 ? (
          <p className="py-6 text-center text-slate-400">暂无已支付参团</p>
        ) : (
          group.participations.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 border-t border-slate-100 py-3"
            >
              {item.user.avatarUrl ? (
                <Image
                  className="h-10 w-10 rounded-full object-cover"
                  src={item.user.avatarUrl}
                  alt={item.user.nickname ?? '用户'}
                  width={40}
                  height={40}
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm">
                  {(item.user.nickname ?? '用')[0]}
                </div>
              )}
              <div>
                <p>{item.user.nickname ?? '微信用户'}</p>
                <p className="text-sm text-slate-500">
                  拼了 {item.units} {group.unitLabel}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {shareData ? (
        <div className="mt-4 space-y-2">
          <WechatShareButton
            title={shareData.title}
            desc={shareData.desc}
            link={shareData.link}
            imgUrl={shareData.imgUrl}
          />
          <a
            className="block w-full rounded-full border border-[#004b87] py-3 text-center text-sm text-[#004b87]"
            href={`/api/group-orders/${group.id}/poster`}
            rel="noreferrer"
            target="_blank"
          >
            生成拼单海报（长按保存）
          </a>
        </div>
      ) : null}

      {group.status === 'OPEN' && group.remainingUnits > 0 ? (
        <button
          className="mt-4 w-full rounded-full bg-[#004b87] py-3 text-white"
          type="button"
          onClick={() => {
            const query = new URLSearchParams({
              productId: group.productId,
              units: '1',
              mode: 'join',
              groupOrderId: group.id,
            })
            router.push(`/shop/checkout?${query.toString()}`)
          }}
        >
          立即参团
        </button>
      ) : null}
    </ShopShell>
  )
}

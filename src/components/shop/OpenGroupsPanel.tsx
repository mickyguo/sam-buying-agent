'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { shopFetch } from '@/lib/shop/api'
import type { ShopGroupOrder } from '@/lib/shop/types'

export default function OpenGroupsPanel() {
  const [groups, setGroups] = useState<ShopGroupOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    shopFetch<ShopGroupOrder[]>('/api/group-match', { auth: false })
      .then(setGroups)
      .catch(() => setGroups([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading || groups.length === 0) {
    return null
  }

  return (
    <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">正在凑团</h2>
        <span className="text-xs text-slate-400">{groups.length} 个拼单进行中</span>
      </div>
      <div className="mt-3 space-y-3">
        {groups.map((group) => {
          const progress = Math.round(
            ((group.committedUnits ?? group.filledUnits) / group.totalUnits) * 100,
          )
          return (
            <Link
              key={group.id}
              className="block rounded-xl border border-slate-100 p-3"
              href={`/shop/groups/${group.id}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="line-clamp-1 font-medium">{group.productName}</p>
                <span className="shrink-0 text-sm text-[#004b87]">
                  差 {group.remainingUnits} {group.unitLabel}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#004b87]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {group.committedUnits ?? group.filledUnits}/{group.totalUnits} {group.unitLabel}
              </p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

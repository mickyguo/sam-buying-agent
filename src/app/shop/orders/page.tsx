'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import ShopShell from '@/components/shop/ShopShell'
import { shopFetch } from '@/lib/shop/api'
import { requireShopLogin } from '@/lib/shop/auth'
import { payOrder, payOrders } from '@/lib/shop/pay'
import { getProductAvailabilityLabel } from '@/lib/shop/product-availability'
import { useShopAuth } from '@/lib/shop/use-shop-auth'
import type { ShopOrder } from '@/lib/shop/types'

const STATUS_TEXT: Record<string, string> = {
  PENDING_PAY: '待支付',
  PAID: '已支付',
  PURCHASING: '采购中',
  DELIVERING: '配送中',
  COMPLETED: '已完成',
  REFUNDED: '已退款',
  CANCELLED: '已取消',
}

function isPayableOrder(order: ShopOrder) {
  return order.status === 'PENDING_PAY' && order.product.status === 'ACTIVE'
}

function formatPurchaseDate(isoDate: string) {
  const date = new Date(isoDate)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  if (sameDay(date, today)) {
    return '今天'
  }
  if (sameDay(date, yesterday)) {
    return '昨天'
  }

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

function getOrderGroupKey(order: ShopOrder) {
  return order.checkoutBatchId ?? order.id
}

function groupOrdersByBatch(orders: ShopOrder[]) {
  const groups: Array<{
    groupKey: string
    dateLabel: string
    orders: ShopOrder[]
  }> = []
  const groupIndex = new Map<string, number>()

  for (const order of orders) {
    const groupKey = getOrderGroupKey(order)
    const existingIndex = groupIndex.get(groupKey)

    if (existingIndex === undefined) {
      groupIndex.set(groupKey, groups.length)
      groups.push({
        groupKey,
        dateLabel: formatPurchaseDate(order.createdAt),
        orders: [order],
      })
      continue
    }

    groups[existingIndex].orders.push(order)
  }

  return groups
}

function getBatchStatusLabel(orders: ShopOrder[]) {
  const statuses = [...new Set(orders.map((order) => order.status))]

  if (statuses.length === 1) {
    const status = statuses[0]
    return STATUS_TEXT[status] ?? status
  }

  if (orders.some((order) => order.status === 'PENDING_PAY')) {
    return '待支付'
  }

  return '处理中'
}

export default function ShopOrdersPage() {
  const { mounted, loggedIn } = useShopAuth()
  const [orders, setOrders] = useState<ShopOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [payingBatchKey, setPayingBatchKey] = useState('')
  const [merging, setMerging] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [error, setError] = useState('')

  const payableOrders = useMemo(
    () => orders.filter(isPayableOrder),
    [orders],
  )

  const selectedTotalYuan = useMemo(() => {
    const total = orders
      .filter((order) => selectedIds.includes(order.id))
      .reduce((sum, order) => sum + Number.parseFloat(order.amountYuan), 0)
    return total.toFixed(2)
  }, [orders, selectedIds])

  const orderGroups = useMemo(() => groupOrdersByBatch(orders), [orders])

  async function loadOrders() {
    if (!loggedIn) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const nextOrders = await shopFetch<ShopOrder[]>('/api/orders')
      setOrders(nextOrders)
      setSelectedIds((current) =>
        current.filter((id) =>
          nextOrders.some(
            (order) => order.id === id && isPayableOrder(order),
          ),
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  function getPayableIdsInBatch(batchOrders: ShopOrder[]) {
    return batchOrders.filter(isPayableOrder).map((order) => order.id)
  }

  function isBatchFullySelected(batchOrders: ShopOrder[]) {
    const payableIds = getPayableIdsInBatch(batchOrders)
    return (
      payableIds.length > 0 &&
      payableIds.every((id) => selectedIds.includes(id))
    )
  }

  function toggleBatchSelected(batchOrders: ShopOrder[]) {
    const payableIds = getPayableIdsInBatch(batchOrders)
    if (payableIds.length === 0) {
      return
    }

    if (isBatchFullySelected(batchOrders)) {
      setSelectedIds((current) =>
        current.filter((id) => !payableIds.includes(id)),
      )
      return
    }

    setSelectedIds((current) => [...new Set([...current, ...payableIds])])
  }

  function selectAllPayable() {
    setSelectedIds(payableOrders.map((order) => order.id))
  }

  function clearSelection() {
    setSelectedIds([])
  }

  async function handlePayBatch(groupKey: string, batchOrders: ShopOrder[]) {
    const payableIds = getPayableIdsInBatch(batchOrders)
    if (payableIds.length === 0) {
      return
    }

    setPayingBatchKey(groupKey)
    setError('')

    try {
      requireShopLogin('/shop/orders')
      if (payableIds.length === 1) {
        await payOrder(payableIds[0])
      } else {
        await payOrders(payableIds)
      }
      await loadOrders()
    } catch (err) {
      if (err instanceof Error && err.message === '请先登录') {
        return
      }
      setError(err instanceof Error ? err.message : '支付失败')
    } finally {
      setPayingBatchKey('')
    }
  }

  async function handleMergePay() {
    if (selectedIds.length === 0 || merging) {
      return
    }

    setMerging(true)
    setError('')
    try {
      requireShopLogin('/shop/orders')
      await payOrders(selectedIds)
      setSelectedIds([])
      await loadOrders()
    } catch (err) {
      if (err instanceof Error && err.message === '请先登录') {
        return
      }
      setError(err instanceof Error ? err.message : '支付失败')
    } finally {
      setMerging(false)
    }
  }

  useEffect(() => {
    if (!mounted) {
      return
    }
    loadOrders()
  }, [mounted, loggedIn])

  if (!mounted) {
    return (
      <ShopShell title="我的订单">
        <div className="flex flex-1 items-center justify-center">
          <p className="text-slate-400">加载中...</p>
        </div>
      </ShopShell>
    )
  }

  return (
    <ShopShell title="我的订单">
      {!loggedIn ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-slate-400">请先登录查看订单</p>
          <Link
            className="mt-4 inline-block rounded-full bg-[#004b87] px-6 py-2 text-sm text-white"
            href="/shop/profile?redirect=%2Fshop%2Forders"
          >
            去登录
          </Link>
        </div>
      ) : null}

      {loggedIn && loading ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-slate-400">加载中...</p>
        </div>
      ) : null}

      {loggedIn && !loading && payableOrders.length > 0 ? (
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm shadow-sm">
          <span className="text-slate-500">
            已选 {selectedIds.length} / {payableOrders.length} 件待支付
          </span>
          <div className="flex gap-3">
            <button
              className="text-[#004b87]"
              type="button"
              onClick={selectAllPayable}
            >
              全选
            </button>
            {selectedIds.length > 0 ? (
              <button
                className="text-slate-400"
                type="button"
                onClick={clearSelection}
              >
                取消
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {loggedIn && !loading && !error && orders.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-slate-400">暂无订单</p>
        </div>
      ) : null}

      {loggedIn && !loading && orders.length > 0 ? (
        <div className="grid flex-1 content-start gap-4 pb-28">
          {orderGroups.map((group) => {
            const batchTotalYuan = group.orders
              .reduce(
                (sum, order) => sum + Number.parseFloat(order.amountYuan),
                0,
              )
              .toFixed(2)
            const payableIds = getPayableIdsInBatch(group.orders)
            const hasPayable = payableIds.length > 0
            const batchSelected = isBatchFullySelected(group.orders)
            const batchStatus = getBatchStatusLabel(group.orders)
            const hasMixedStatus = new Set(group.orders.map((o) => o.status)).size > 1
            const isMultiItem = group.orders.length > 1

            return (
              <div
                key={group.groupKey}
                className="overflow-hidden rounded-2xl bg-white shadow-sm"
              >
                <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3">
                  {hasPayable ? (
                    <input
                      checked={batchSelected}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#004b87]"
                      type="checkbox"
                      onChange={() => toggleBatchSelected(group.orders)}
                    />
                  ) : (
                    <span className="mt-0.5 inline-block h-4 w-4 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-700">
                        购买日期：{group.dateLabel}
                      </p>
                      <span className="shrink-0 text-sm text-[#004b87]">
                        {batchStatus}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {isMultiItem
                        ? `共 ${group.orders.length} 件商品 · ¥${batchTotalYuan}`
                        : group.orders[0].orderNo}
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {group.orders.map((order) => {
                    const productUnavailable = order.product.status !== 'ACTIVE'
                    const availabilityLabel = productUnavailable
                      ? getProductAvailabilityLabel('inactive')
                      : null

                    return (
                      <div
                        key={order.id}
                        className={`px-4 py-3${productUnavailable ? ' opacity-60' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h2
                              className={`font-semibold${
                                productUnavailable ? ' text-slate-400' : ''
                              }`}
                            >
                              {order.product.name}
                            </h2>
                            {availabilityLabel ? (
                              <p className="mt-1 text-xs text-amber-600">
                                {availabilityLabel}
                              </p>
                            ) : null}
                            {!isMultiItem ? null : (
                              <p className="mt-1 text-xs text-slate-400">
                                {order.orderNo}
                              </p>
                            )}
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-sm text-slate-500">
                                {order.type === 'GROUP'
                                  ? `拼单 ${order.units}${order.product.unitLabel ?? '份'}`
                                  : '整件 x1'}
                              </span>
                              <span
                                className={`font-bold${
                                  productUnavailable
                                    ? ' text-slate-400'
                                    : ' text-[#004b87]'
                                }`}
                              >
                                ¥{order.amountYuan}
                              </span>
                            </div>
                            {hasMixedStatus ? (
                              <p className="mt-1 text-xs text-slate-500">
                                {STATUS_TEXT[order.status] ?? order.status}
                              </p>
                            ) : null}
                            {order.groupOrderId ? (
                              <Link
                                className="mt-2 inline-block text-sm text-[#004b87]"
                                href={`/shop/groups/${order.groupOrderId}`}
                              >
                                查看拼单
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {hasPayable ? (
                  <div className="border-t border-slate-100 px-4 py-3">
                    {group.orders.some(
                      (order) =>
                        order.status === 'PENDING_PAY' &&
                        order.product.status !== 'ACTIVE',
                    ) ? (
                      <p className="mb-2 text-xs text-amber-600">
                        部分商品已下架，仅可支付可用商品
                      </p>
                    ) : null}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#004b87]">
                        应付 ¥
                        {group.orders
                          .filter((order) => payableIds.includes(order.id))
                          .reduce(
                            (sum, order) =>
                              sum + Number.parseFloat(order.amountYuan),
                            0,
                          )
                          .toFixed(2)}
                      </span>
                      <button
                        className="rounded-full bg-[#004b87] px-4 py-2 text-sm text-white disabled:opacity-60"
                        disabled={
                          payingBatchKey === group.groupKey || merging
                        }
                        type="button"
                        onClick={() =>
                          handlePayBatch(group.groupKey, group.orders)
                        }
                      >
                        {payingBatchKey === group.groupKey
                          ? '支付中...'
                          : payableIds.length > 1
                            ? '合并支付'
                            : '去支付'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}

      {loggedIn && selectedIds.length > 0 ? (
        <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-slate-200 bg-white px-4 py-3 shadow-lg">
          <div className="mx-auto flex max-w-md items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500">
                已选 {selectedIds.length} 件
              </p>
              <p className="text-lg font-bold text-[#004b87]">
                ¥{selectedTotalYuan}
              </p>
            </div>
            <button
              className="rounded-full bg-[#004b87] px-6 py-3 text-sm text-white disabled:opacity-60"
              disabled={merging || payingBatchKey !== ''}
              type="button"
              onClick={handleMergePay}
            >
              {merging
                ? '支付中...'
                : selectedIds.length > 1
                  ? '合并支付'
                  : '确认支付'}
            </button>
          </div>
        </div>
      ) : null}
    </ShopShell>
  )
}

'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import ShopShell from '@/components/shop/ShopShell'
import SwipeableCartItem from '@/components/shop/SwipeableCartItem'
import {
  CART_UPDATED_EVENT,
  getCartItems,
  removeCartItem,
  removeCartItems,
} from '@/lib/shop/cart'
import { requireShopLogin } from '@/lib/shop/auth'
import { createShopOrder } from '@/lib/shop/order'
import { payOrders } from '@/lib/shop/pay'
import {
  fetchProductAvailabilityMap,
  getProductAvailabilityLabel,
  isProductUnavailable,
  type ProductAvailability,
} from '@/lib/shop/product-availability'
import { useShopAuth } from '@/lib/shop/use-shop-auth'
import type { CartItem } from '@/lib/shop/types'

const MODE_TEXT: Record<string, string> = {
  direct: '整件代购',
  create: '发起拼单',
  join: '参与拼单',
}

export default function ShopCartPage() {
  const router = useRouter()
  const { mounted, loggedIn } = useShopAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [availability, setAvailability] = useState<
    Record<string, ProductAvailability>
  >({})
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const prevItemIdsRef = useRef<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [paying, setPaying] = useState(false)
  const [pendingOrderIds, setPendingOrderIds] = useState<string[]>([])
  const [pendingTotalYuan, setPendingTotalYuan] = useState('0.00')
  const [error, setError] = useState('')

  const refreshCart = useCallback(async () => {
    const cartItems = getCartItems()
    setItems(cartItems)

    if (cartItems.length === 0) {
      setAvailability({})
      return
    }

    const availabilityMap = await fetchProductAvailabilityMap(
      cartItems.map((item) => item.productId),
    )
    setAvailability(availabilityMap)
  }, [])

  useEffect(() => {
    refreshCart()
    const onCartUpdated = () => refreshCart()
    window.addEventListener(CART_UPDATED_EVENT, onCartUpdated)
    return () => window.removeEventListener(CART_UPDATED_EVENT, onCartUpdated)
  }, [refreshCart])

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set<string>()
      const currentIds = new Set(items.map((item) => item.id))

      for (const item of items) {
        if (isProductUnavailable(availability[item.productId])) {
          continue
        }

        const isNewItem = !prevItemIdsRef.current.has(item.id)
        if (isNewItem || prev.has(item.id)) {
          next.add(item.id)
        }
      }

      if (prev.size === 0 && next.size === 0) {
        for (const item of items) {
          if (!isProductUnavailable(availability[item.productId])) {
            next.add(item.id)
          }
        }
      }

      prevItemIdsRef.current = currentIds
      return next
    })
  }, [items, availability])

  const selectableItems = items.filter(
    (item) => !isProductUnavailable(availability[item.productId]),
  )
  const selectedItems = items.filter((item) => selectedIds.has(item.id))
  const totalYuan = selectedItems
    .reduce((sum, item) => sum + Number.parseFloat(item.amountYuan), 0)
    .toFixed(2)
  const allSelected =
    selectableItems.length > 0 &&
    selectableItems.every((item) => selectedIds.has(item.id))

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(selectableItems.map((item) => item.id)))
  }

  function toggleItem(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function submitOrders() {
    if (selectedItems.length === 0 || submitting) {
      return
    }

    const hasUnavailableSelected = selectedItems.some((item) =>
      isProductUnavailable(availability[item.productId]),
    )
    if (hasUnavailableSelected) {
      setError('所选商品中有已下架或不存在商品，请取消勾选或删除后再提交')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      requireShopLogin('/shop/cart')
      const orderIds: string[] = []
      const checkoutBatchId =
        selectedItems.length > 1 ? crypto.randomUUID() : undefined

      for (const item of selectedItems) {
        const result = await createShopOrder({
          ...item,
          checkoutBatchId,
        })
        orderIds.push(result.orderId)
      }

      setPendingTotalYuan(totalYuan)
      removeCartItems(selectedItems.map((item) => item.id))
      refreshCart()
      setPendingOrderIds(orderIds)
    } catch (err) {
      if (err instanceof Error && err.message === '请先登录') {
        return
      }
      setError(err instanceof Error ? err.message : '提交订单失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmPay() {
    if (pendingOrderIds.length === 0 || paying) {
      return
    }

    setPaying(true)
    setError('')

    try {
      requireShopLogin('/shop/cart')

      await payOrders(pendingOrderIds)

      router.replace('/shop/orders')
    } catch (err) {
      if (err instanceof Error && err.message === '请先登录') {
        return
      }
      setError(err instanceof Error ? err.message : '支付失败')
    } finally {
      setPaying(false)
    }
  }

  const hasPendingPay = pendingOrderIds.length > 0
  const isEmpty = items.length === 0 && !hasPendingPay
  const canCheckout = mounted && loggedIn
  const hasUnavailableItems = items.some((item) =>
    isProductUnavailable(availability[item.productId]),
  )
  const hasSelectedItems = selectedItems.length > 0

  return (
    <ShopShell title="购物车">
      {mounted && !loggedIn ? (
        <div className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
          下单与支付需先
          <Link className="mx-1 font-semibold text-[#004b87]" href="/shop/profile?redirect=%2Fshop%2Fcart">
            登录
          </Link>
        </div>
      ) : null}

      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-slate-400">购物车是空的</p>
          <Link
            className="mt-4 inline-block rounded-full bg-[#004b87] px-6 py-2 text-sm text-white"
            href="/shop"
          >
            去逛逛
          </Link>
        </div>
      ) : null}

      {!hasPendingPay && items.length > 0 ? (
        <>
          <div className="grid flex-1 content-start gap-4">
            {items.map((item) => {
              const itemAvailability = availability[item.productId]
              const unavailable = isProductUnavailable(itemAvailability)
              const availabilityLabel = itemAvailability
                ? getProductAvailabilityLabel(itemAvailability)
                : null

              return (
              <SwipeableCartItem
                key={item.id}
                onDelete={() => removeCartItem(item.id)}
              >
              <div
                className={`flex items-center gap-3 p-4${
                  unavailable ? ' opacity-60' : ''
                }`}
              >
                <label className="flex shrink-0 items-center">
                  <input
                    checked={selectedIds.has(item.id)}
                    className="h-4 w-4 accent-[#004b87]"
                    disabled={unavailable}
                    type="checkbox"
                    onChange={() => toggleItem(item.id)}
                  />
                  <span className="sr-only">选择 {item.productName}</span>
                </label>
                <Image
                  className={`h-20 w-20 shrink-0 rounded-xl object-cover${
                    unavailable ? ' grayscale' : ''
                  }`}
                  src={item.productImage}
                  alt={item.productName}
                  width={80}
                  height={80}
                />
                <div className="min-w-0 flex-1">
                  <h2 className={`truncate font-semibold${unavailable ? ' text-slate-400' : ''}`}>
                    {item.productName}
                  </h2>
                  {availabilityLabel ? (
                    <p className="mt-1 text-xs text-amber-600">{availabilityLabel}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-500">{MODE_TEXT[item.mode]}</p>
                  {item.unitLabel ? (
                    <p className="mt-1 text-sm text-slate-500">
                      {item.units} {item.unitLabel}
                    </p>
                  ) : null}
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`font-bold${unavailable ? ' text-slate-400' : ' text-[#004b87]'}`}>
                      ¥{item.amountYuan}
                    </span>
                  </div>
                </div>
              </div>
              </SwipeableCartItem>
              )
            })}
          </div>

          <div className="mt-auto shrink-0 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  checked={allSelected}
                  className="h-4 w-4 accent-[#004b87]"
                  disabled={selectableItems.length === 0}
                  type="checkbox"
                  onChange={toggleSelectAll}
                />
                全选
              </label>
              <div className="text-right text-sm">
                <span className="text-slate-500">
                  已选 {selectedItems.length} 件，合计{' '}
                </span>
                <span className="text-lg font-bold text-[#004b87]">¥{totalYuan}</span>
              </div>
            </div>
            {hasUnavailableItems ? (
              <p className="mt-3 text-sm text-amber-600">
                部分商品已下架或不存在，建议删除；不影响勾选可用商品结算
              </p>
            ) : null}
            {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
            <button
              className="mt-4 w-full rounded-full bg-[#004b87] py-3 text-white disabled:opacity-60"
              disabled={submitting || !canCheckout || !hasSelectedItems}
              type="button"
              onClick={submitOrders}
            >
              {submitting
                ? '提交中...'
                : !canCheckout
                  ? '请先登录'
                  : hasSelectedItems
                    ? `提交订单 (${selectedItems.length})`
                    : '请选择商品'}
            </button>
          </div>
        </>
      ) : null}

      {hasPendingPay ? (
        <div className="mt-auto flex flex-1 flex-col justify-center">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">
            已提交 {pendingOrderIds.length} 笔订单，请完成支付。
          </p>
          <p className="mt-2 text-lg font-bold text-[#004b87]">应付 ¥{pendingTotalYuan}</p>
          {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
          {canCheckout ? (
            <button
              className="mt-4 w-full rounded-full bg-[#004b87] py-3 text-white disabled:opacity-60"
              disabled={paying}
              type="button"
              onClick={confirmPay}
            >
              {paying ? '支付中...' : '确认支付'}
            </button>
          ) : (
            <Link
              className="mt-4 block w-full rounded-full bg-[#004b87] py-3 text-center text-white"
              href="/shop/profile?redirect=%2Fshop%2Fcart"
            >
              登录后支付
            </Link>
          )}
          <Link
            className="mt-3 block text-center text-sm text-[#004b87]"
            href="/shop/orders"
          >
            稍后在订单里支付
          </Link>
          </div>
        </div>
      ) : null}
    </ShopShell>
  )
}

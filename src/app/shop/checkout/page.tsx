'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import ShopShell from '@/components/shop/ShopShell'
import { addCartItem } from '@/lib/shop/cart'
import { requireShopLogin } from '@/lib/shop/auth'
import { getShopConfig } from '@/lib/shop/pickup'
import { shopFetch } from '@/lib/shop/api'
import type { CheckoutMode, ShopProduct } from '@/lib/shop/types'

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const productId = searchParams.get('productId') ?? ''
  const units = Number(searchParams.get('units') ?? '1')
  const mode = (searchParams.get('mode') ?? 'direct') as CheckoutMode
  const groupOrderId = searchParams.get('groupOrderId') ?? ''

  const [product, setProduct] = useState<ShopProduct | null>(null)
  const [amountYuan, setAmountYuan] = useState('0.00')
  const [pickupLocation, setPickupLocation] = useState('')
  const [pickupNotice, setPickupNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getShopConfig()
      .then((config) => {
        setPickupLocation(config.pickupLocation)
        setPickupNotice(config.pickupNotice)
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!productId) {
      return
    }

    shopFetch<ShopProduct>(`/api/products/${productId}`, { auth: false })
      .then((item) => {
        setProduct(item)
        const amount = item.splittable
          ? Math.round(item.price / (item.totalUnits ?? 1)) * units
          : item.price
        setAmountYuan((amount / 100).toFixed(2))
      })
      .catch((err: Error) => setError(err.message))
  }, [productId, units])

  function addToCart() {
    if (!product || submitting) {
      return
    }

    setSubmitting(true)
    setError('')

    try {
      requireShopLogin(
        `/shop/checkout?${searchParams.toString()}`,
      )
      addCartItem({
        productId: product.id,
        productName: product.name,
        productImage: product.imageUrl,
        units,
        mode,
        groupOrderId: groupOrderId || undefined,
        amountYuan,
        unitLabel: product.unitLabel,
      })
      router.push('/shop/cart')
    } catch (err) {
      if (err instanceof Error && err.message === '请先登录') {
        return
      }
      setError(err instanceof Error ? err.message : '加入购物车失败')
      setSubmitting(false)
    }
  }

  const modeText =
    mode === 'direct' ? '整件代购' : mode === 'create' ? '发起拼单' : '参与拼单'

  return (
    <ShopShell title="确认订单">
      {!product ? (
        <p className="py-16 text-center text-slate-400">加载中...</p>
      ) : (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold">{product.name}</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">购买方式</span>
              <span>{modeText}</span>
            </div>
            {product.splittable ? (
              <div className="flex justify-between">
                <span className="text-slate-500">购买份数</span>
                <span>
                  {units} {product.unitLabel}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-slate-500">应付金额</span>
              <span className="text-lg font-bold text-[#004b87]">¥{amountYuan}</span>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <p className="text-slate-500">取货方式</p>
              <p className="mt-1 font-medium">到店自提</p>
              {pickupLocation ? (
                <p className="mt-1 text-slate-600">{pickupLocation}</p>
              ) : null}
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            {pickupNotice ||
              '加入购物车后，可在购物车中统一提交订单并支付。拼单商品支付成功后需凑满总份数才会进入采购流程。'}
          </p>
          {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
          <button
            className="mt-6 w-full rounded-full bg-[#004b87] py-3 text-white disabled:opacity-60"
            disabled={submitting}
            type="button"
            onClick={addToCart}
          >
            {submitting ? '加入中...' : '加入购物车'}
          </button>
        </div>
      )}
    </ShopShell>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<ShopShell title="确认订单"><p className="py-16 text-center text-slate-400">加载中...</p></ShopShell>}>
      <CheckoutContent />
    </Suspense>
  )
}

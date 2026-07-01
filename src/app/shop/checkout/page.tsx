'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import PickupSlotPicker from '@/components/shop/PickupSlotPicker'
import ShopShell from '@/components/shop/ShopShell'
import { addCartItem } from '@/lib/shop/cart'
import { requireShopLogin } from '@/lib/shop/auth'
import { getShopConfig } from '@/lib/shop/pickup'
import { shopFetch } from '@/lib/shop/api'
import { shopToastError } from '@/lib/shop/toast'
import type { CheckoutMode, ShopProduct } from '@/lib/shop/types'

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const productId = searchParams.get('productId') ?? ''
  const mode = (searchParams.get('mode') ?? 'direct') as CheckoutMode
  const groupOrderId = searchParams.get('groupOrderId') ?? ''

  const [units, setUnits] = useState(() =>
    Number(searchParams.get('units') ?? '1'),
  )
  const [product, setProduct] = useState<ShopProduct | null>(null)
  const [amountYuan, setAmountYuan] = useState('0.00')
  const [pickupLocation, setPickupLocation] = useState('')
  const [pickupNotice, setPickupNotice] = useState('')
  const [pickupSlotId, setPickupSlotId] = useState('')
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getShopConfig()
      .then((config) => {
        setPickupLocation(config.pickupLocation)
        setPickupNotice(config.pickupNotice)
        if (config.pickupLocations?.[0]) {
          setSelectedLocationId(config.pickupLocations[0].id)
        }
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    setUnits(Number(searchParams.get('units') ?? '1'))
  }, [searchParams])

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
      .catch((err: Error) => shopToastError(err, '加载商品失败'))
  }, [productId, units])

  function changeUnits(delta: number) {
    if (!product?.splittable) {
      return
    }

    const maxUnits = product.totalUnits ?? 1
    const next = Math.min(Math.max(1, units + delta), maxUnits)
    if (next === units) {
      return
    }

    setUnits(next)
    const query = new URLSearchParams(searchParams.toString())
    query.set('units', String(next))
    router.replace(`/shop/checkout?${query.toString()}`, { scroll: false })
  }

  function addToCart() {
    if (!product || submitting) {
      return
    }

    setSubmitting(true)

    try {
      const returnQuery = new URLSearchParams(searchParams.toString())
      returnQuery.set('units', String(units))
      requireShopLogin(`/shop/checkout?${returnQuery.toString()}`)
      addCartItem({
        productId: product.id,
        productName: product.name,
        productImage: product.imageUrl,
        units,
        mode,
        groupOrderId: groupOrderId || undefined,
        amountYuan,
        unitLabel: product.unitLabel,
        pickupSlotId: pickupSlotId || undefined,
      })
      router.push('/shop/cart')
    } catch (err) {
      shopToastError(err, '加入购物车失败')
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
              <div className="flex items-center justify-between">
                <span className="text-slate-500">购买份数</span>
                <div className="flex items-center gap-3">
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 disabled:opacity-40"
                    disabled={units <= 1}
                    type="button"
                    onClick={() => changeUnits(-1)}
                  >
                    −
                  </button>
                  <span className="min-w-16 text-center">
                    {units} {product.unitLabel}
                  </span>
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 disabled:opacity-40"
                    disabled={units >= (product.totalUnits ?? 1)}
                    type="button"
                    onClick={() => changeUnits(1)}
                  >
                    +
                  </button>
                </div>
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
              <div className="mt-3">
                <PickupSlotPicker
                  locationId={selectedLocationId || undefined}
                  value={pickupSlotId}
                  onChange={setPickupSlotId}
                />
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            {pickupNotice ||
              '加入购物车后，可在购物车中统一提交订单并支付。拼单商品支付成功后需凑满总份数才会进入采购流程。'}
          </p>
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

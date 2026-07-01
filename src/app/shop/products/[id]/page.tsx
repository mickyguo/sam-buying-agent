'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PriceChart from '@/components/shop/PriceChart'
import ShopShell from '@/components/shop/ShopShell'
import { addCartItem } from '@/lib/shop/cart'
import { requireShopLogin } from '@/lib/shop/auth'
import { shopFetch } from '@/lib/shop/api'
import { shopToastError } from '@/lib/shop/toast'
import type { CheckoutMode, ShopGroupOrder, ShopProduct } from '@/lib/shop/types'

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [product, setProduct] = useState<ShopProduct | null>(null)
  const [openGroups, setOpenGroups] = useState<ShopGroupOrder[]>([])
  const [units, setUnits] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cartMessage, setCartMessage] = useState('')
  const [priceData, setPriceData] = useState<{
    currentPriceYuan: string
    minPrice30dYuan: string | null
    isLowest: boolean
    history: Array<{ priceYuan: string; recordedAt: string }>
  } | null>(null)
  const [forecast, setForecast] = useState('')
  const [alertMessage, setAlertMessage] = useState('')

  useEffect(() => {
    Promise.all([
      shopFetch<ShopProduct>(`/api/products/${params.id}`, { auth: false }),
      shopFetch<ShopGroupOrder[]>(
        `/api/group-orders?productId=${params.id}&status=OPEN`,
        { auth: false },
      ).catch(() => [] as ShopGroupOrder[]),
      shopFetch<typeof priceData>(`/api/products/${params.id}/price-history`, {
        auth: false,
      }).catch(() => null),
      shopFetch<{ message: string }>(`/api/products/${params.id}/group-forecast`, {
        auth: false,
      }).catch(() => null),
    ])
      .then(([productData, groups, prices, forecastData]) => {
        setProduct(productData)
        setOpenGroups(groups)
        setPriceData(prices)
        if (forecastData && 'message' in forecastData) {
          setForecast((forecastData as { message: string }).message)
        }
      })
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading || !product) {
    return (
      <ShopShell title="商品详情">
        <p className="py-16 text-center text-slate-400">加载中...</p>
      </ShopShell>
    )
  }

  const maxUnits = product.splittable ? product.totalUnits ?? 1 : 1
  const unitPrice = product.splittable
    ? Math.round(product.price / (product.totalUnits ?? 1))
    : product.price
  const amountYuan = ((unitPrice * units) / 100).toFixed(2)

  const buildCartItem = (mode: CheckoutMode, groupOrderId?: string) => ({
    productId: product.id,
    productName: product.name,
    productImage: product.imageUrl,
    units,
    mode,
    groupOrderId,
    amountYuan,
    unitLabel: product.unitLabel,
  })

  const addToCart = (mode: CheckoutMode, groupOrderId?: string) => {
    if (submitting) {
      return
    }

    setSubmitting(true)
    setCartMessage('')

    try {
      requireShopLogin(`/shop/products/${params.id}`)
      addCartItem(buildCartItem(mode, groupOrderId))
      setCartMessage('已加入购物车')
    } catch (err) {
      shopToastError(err, '加入购物车失败')
    } finally {
      setSubmitting(false)
    }
  }

  const addToCartAndGo = (mode: CheckoutMode, groupOrderId?: string) => {
    if (submitting) {
      return
    }

    setSubmitting(true)
    setCartMessage('')

    try {
      requireShopLogin(`/shop/products/${params.id}`)
      addCartItem(buildCartItem(mode, groupOrderId))
      router.push('/shop/cart')
    } catch (err) {
      shopToastError(err, '加入购物车失败')
      setSubmitting(false)
    }
  }

  const goCheckout = (mode: CheckoutMode, groupOrderId?: string) => {
    const query = new URLSearchParams({
      productId: product.id,
      units: String(units),
      mode,
    })
    if (groupOrderId) {
      query.set('groupOrderId', groupOrderId)
    }
    router.push(`/shop/checkout?${query.toString()}`)
  }

  return (
    <ShopShell title="商品详情">
      <Image
        className="mb-4 h-56 w-full rounded-2xl object-cover"
        src={product.imageUrl}
        alt={product.name}
        width={800}
        height={448}
      />
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-xl font-bold">{product.name}</h2>
        <p className="mt-2 text-2xl font-bold text-[#004b87]">¥{product.priceYuan}</p>
        <p className="mt-3 text-sm text-slate-500">{product.description}</p>
        <span
          className={`mt-3 inline-block rounded-full px-3 py-1 text-xs ${
            product.splittable
              ? 'bg-green-50 text-green-700'
              : 'bg-orange-50 text-orange-700'
          }`}
        >
          {product.splittable ? '支持按份拼单' : '仅支持整件代购'}
        </span>
        {forecast ? (
          <p className="mt-2 text-sm text-slate-500">{forecast}</p>
        ) : null}
        {priceData ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <PriceChart
              currentPriceYuan={priceData.currentPriceYuan}
              history={priceData.history}
              isLowest={priceData.isLowest}
              minPrice30dYuan={priceData.minPrice30dYuan}
            />
            <button
              className="mt-3 rounded-full border border-[#004b87] px-4 py-1.5 text-sm text-[#004b87]"
              type="button"
              onClick={async () => {
                try {
                  requireShopLogin(`/shop/products/${params.id}`)
                  const result = await shopFetch<{ message: string }>(
                    `/api/products/${params.id}/price-alert`,
                    { method: 'POST', body: JSON.stringify({}) },
                  )
                  setAlertMessage(result.message)
                } catch (err) {
                  shopToastError(err, '订阅降价通知失败')
                }
              }}
            >
              降价通知我
            </button>
            {alertMessage ? (
              <p className="mt-2 text-xs text-slate-500">{alertMessage}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {product.splittable ? (
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="font-semibold">选择份数</h3>
          <input
            className="mt-4 w-full"
            type="range"
            min={1}
            max={maxUnits}
            value={units}
            onChange={(event) => setUnits(Number(event.target.value))}
          />
          <p className="mt-2 text-sm text-slate-500">
            已选 {units} {product.unitLabel}，约 ¥{amountYuan}
          </p>
          {cartMessage ? (
            <p className="mt-3 text-sm text-green-600">{cartMessage}</p>
          ) : null}
          <div className="mt-4 flex gap-3">
            <button
              className="flex-1 rounded-full border border-[#004b87] py-3 text-[#004b87] disabled:opacity-60"
              disabled={submitting}
              type="button"
              onClick={() => addToCart('create')}
            >
              加入购物车
            </button>
            <button
              className="flex-1 rounded-full bg-[#004b87] py-3 text-white disabled:opacity-60"
              disabled={submitting}
              type="button"
              onClick={() => addToCartAndGo('create')}
            >
              发起拼单
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          {cartMessage ? (
            <p className="mb-3 text-sm text-green-600">{cartMessage}</p>
          ) : null}
          <div className="flex gap-3">
            <button
              className="flex-1 rounded-full border border-[#004b87] py-3 text-[#004b87] disabled:opacity-60"
              disabled={submitting}
              type="button"
              onClick={() => addToCart('direct')}
            >
              加入购物车
            </button>
            <button
              className="flex-1 rounded-full bg-[#004b87] py-3 text-white disabled:opacity-60"
              disabled={submitting}
              type="button"
              onClick={() => addToCartAndGo('direct')}
            >
              立即购买
            </button>
          </div>
        </div>
      )}

      {product.splittable && openGroups.length > 0 ? (
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="font-semibold">进行中的拼单</h3>
          {openGroups.map((group) => (
            <div
              key={group.id}
              className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4"
            >
              <div>
                <p>
                  已拼 {(group.committedUnits ?? group.filledUnits)}/{group.totalUnits}{' '}
                  {group.unitLabel}
                </p>
                <p className="text-sm text-slate-500">
                  还差 {group.remainingUnits} {group.unitLabel} 成团
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  className="rounded-full bg-slate-100 px-4 py-2 text-sm text-[#004b87]"
                  href={`/shop/groups/${group.id}`}
                >
                  查看
                </Link>
                <button
                  className="rounded-full bg-[#004b87] px-4 py-2 text-sm text-white"
                  type="button"
                  onClick={() => goCheckout('join', group.id)}
                >
                  参团
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </ShopShell>
  )
}

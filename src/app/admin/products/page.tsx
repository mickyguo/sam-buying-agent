'use client'

import { FormEvent, useState } from 'react'

interface Product {
  id: string
  name: string
  imageUrl: string
  price: number
  priceYuan: string
  splittable: boolean
  totalUnits: number | null
  unitLabel: string | null
  description: string | null
  status: string
  sourceUrl: string | null
  externalId: string | null
  lastSyncedAt: string | null
}

interface ImportPreview {
  externalId: string
  name: string
  imageUrl: string
  priceCents: number
  description?: string
  sourceUrl: string
}

const emptyForm = {
  name: '',
  imageUrl: '',
  priceYuan: '',
  splittable: false,
  totalUnits: '10',
  unitLabel: '块',
  description: '',
  sourceUrl: '',
  externalId: '',
}

export default function AdminProductsPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState(emptyForm)
  const [importUrl, setImportUrl] = useState('')
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [importing, setImporting] = useState(false)
  const [syncingId, setSyncingId] = useState('')
  const [message, setMessage] = useState('')

  const headers = {
    'Content-Type': 'application/json',
    'x-admin-password': password,
  }

  async function loadProducts() {
    const response = await fetch('/api/products?all=1', { headers })
    const result = await response.json()
    console.log(result)
    if (result.success) {
      setProducts(result.data)
      setAuthenticated(true)
      setMessage('')
    } else {
      setMessage(result.message)
    }
  }

  async function handleAuth(event: FormEvent) {
    event.preventDefault()
    await loadProducts()
  }

  async function handleImportPreview(event: FormEvent) {
    event.preventDefault()
    setImporting(true)
    setMessage('')
    setImportPreview(null)

    try {
      const response = await fetch('/api/admin/products/import', {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: importUrl }),
      })
      const result = await response.json()
      if (!result.success) {
        setMessage(result.message)
        return
      }

      const preview = result.data as ImportPreview
      setImportPreview(preview)
      setForm({
        name: preview.name,
        imageUrl: preview.imageUrl,
        priceYuan: (preview.priceCents / 100).toFixed(2),
        splittable: false,
        totalUnits: '10',
        unitLabel: '块',
        description: preview.description ?? '',
        sourceUrl: preview.sourceUrl,
        externalId: preview.externalId,
      })
      setMessage('抓取成功，请确认是否可拆分后入库')
    } catch {
      setMessage('抓取失败，请检查链接格式')
    } finally {
      setImporting(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setMessage('')

    const response = await fetch('/api/products', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: form.name,
        imageUrl: form.imageUrl,
        price: Math.round(Number(form.priceYuan) * 100),
        splittable: form.splittable,
        totalUnits: form.splittable ? Number(form.totalUnits) : null,
        unitLabel: form.splittable ? form.unitLabel : null,
        description: form.description,
        sourceUrl: form.sourceUrl || null,
        externalId: form.externalId || null,
      }),
    })

    const result = await response.json()
    if (result.success) {
      setForm(emptyForm)
      setImportPreview(null)
      setImportUrl('')
      setMessage('商品创建成功')
      loadProducts()
    } else {
      setMessage(result.message)
    }
  }

  async function removeProduct(id: string) {
    const response = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers,
    })
    const result = await response.json()
    if (result.success) {
      setMessage(
        result.data.mode === 'deactivated'
          ? '商品已有订单或拼单记录，已下架（未物理删除）'
          : '商品已删除',
      )
      loadProducts()
    } else {
      setMessage(result.message)
    }
  }

  async function syncProduct(id: string) {
    setSyncingId(id)
    setMessage('')
    try {
      const response = await fetch(`/api/admin/products/${id}/sync`, {
        method: 'POST',
        headers,
      })
      const result = await response.json()
      if (result.success) {
        setMessage('价格已同步')
        loadProducts()
      } else {
        setMessage(result.message)
      }
    } catch {
      setMessage('同步失败')
    } finally {
      setSyncingId('')
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-semibold">sam · 商品管理</h1>

      <form
        className="mb-8 rounded-xl border border-zinc-200 p-4"
        onSubmit={handleAuth}
      >
        <label className="mb-2 block text-sm text-zinc-600">管理员密码</label>
        <div className="flex gap-3">
          <input
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="输入 ADMIN_PASSWORD"
          />
          <button
            className="rounded-lg bg-black px-4 py-2 text-white"
            type="submit"
          >
            进入
          </button>
        </div>
      </form>

      {authenticated ? (
        <>
          <form
            className="mb-8 grid gap-4 rounded-xl border border-zinc-200 p-6"
            onSubmit={handleImportPreview}
          >
            <h2 className="text-xl font-medium">从山姆链接导入</h2>
            <p className="text-sm text-zinc-500">
              粘贴山姆 App 或小程序分享链接，系统自动抓取名称、图片和价格。入库前请手动设置是否可拆分。
            </p>
            <input
              className="rounded-lg border border-zinc-300 px-3 py-2"
              placeholder="粘贴山姆商品分享链接"
              value={importUrl}
              onChange={(event) => setImportUrl(event.target.value)}
            />
            <button
              className="w-fit rounded-lg bg-[#004b87] px-4 py-2 text-white disabled:opacity-60"
              disabled={importing || !importUrl.trim()}
              type="submit"
            >
              {importing ? '抓取中...' : '抓取预览'}
            </button>
          </form>

          {importPreview ? (
            <div className="mb-8 flex gap-4 rounded-xl border border-green-200 bg-green-50 p-4">
              <img
                className="h-24 w-24 rounded-lg object-cover"
                src={importPreview.imageUrl}
                alt={importPreview.name}
              />
              <div>
                <p className="font-medium">{importPreview.name}</p>
                <p className="text-sm text-zinc-600">
                  ¥{(importPreview.priceCents / 100).toFixed(2)} · ID{' '}
                  {importPreview.externalId}
                </p>
              </div>
            </div>
          ) : null}

          <form
            className="mb-10 grid gap-4 rounded-xl border border-zinc-200 p-6"
            onSubmit={handleSubmit}
          >
            <h2 className="text-xl font-medium">新增商品</h2>
            <input
              className="rounded-lg border border-zinc-300 px-3 py-2"
              placeholder="商品名称"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
            <input
              className="rounded-lg border border-zinc-300 px-3 py-2"
              placeholder="图片 URL"
              value={form.imageUrl}
              onChange={(event) =>
                setForm({ ...form, imageUrl: event.target.value })
              }
              required
            />
            <input
              className="rounded-lg border border-zinc-300 px-3 py-2"
              placeholder="价格（元）"
              value={form.priceYuan}
              onChange={(event) =>
                setForm({ ...form, priceYuan: event.target.value })
              }
              required
            />
            <textarea
              className="rounded-lg border border-zinc-300 px-3 py-2"
              placeholder="商品描述"
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.splittable}
                onChange={(event) =>
                  setForm({ ...form, splittable: event.target.checked })
                }
              />
              可拆分拼单
            </label>
            {form.splittable ? (
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="rounded-lg border border-zinc-300 px-3 py-2"
                  placeholder="总份数"
                  value={form.totalUnits}
                  onChange={(event) =>
                    setForm({ ...form, totalUnits: event.target.value })
                  }
                />
                <input
                  className="rounded-lg border border-zinc-300 px-3 py-2"
                  placeholder="单位"
                  value={form.unitLabel}
                  onChange={(event) =>
                    setForm({ ...form, unitLabel: event.target.value })
                  }
                />
              </div>
            ) : null}
            <button
              className="rounded-lg bg-black px-4 py-2 text-white"
              type="submit"
            >
              保存商品
            </button>
            {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
          </form>

          <div className="grid gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 p-4"
              >
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-zinc-600">
                    ¥{product.priceYuan}
                    {product.splittable
                      ? ` · 可拼单 ${product.totalUnits}${product.unitLabel}`
                      : ' · 整件代购'}
                  </p>
                  {product.sourceUrl ? (
                    <p className="mt-1 truncate text-xs text-zinc-400">
                      来源：{product.sourceUrl}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {product.externalId ? (
                    <button
                      className="rounded-lg border border-zinc-300 px-3 py-1 text-sm disabled:opacity-60"
                      disabled={syncingId === product.id}
                      type="button"
                      onClick={() => syncProduct(product.id)}
                    >
                      {syncingId === product.id ? '同步中...' : '同步价格'}
                    </button>
                  ) : null}
                  <button
                    className="rounded-lg border border-red-300 px-3 py-1 text-red-600"
                    type="button"
                    onClick={() => removeProduct(product.id)}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

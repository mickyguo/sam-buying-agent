'use client'

import { FormEvent, useEffect, useState } from 'react'

interface ScenePackageRow {
  id: string
  name: string
  description: string | null
  active: boolean
  items: Array<{ productId: string; units: number; product: { name: string } }>
}

export default function AdminScenePackagesPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [packages, setPackages] = useState<ScenePackageRow[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')

  const headers = {
    'Content-Type': 'application/json',
    'x-admin-password': password,
  }

  async function load() {
    const res = await fetch('/api/admin/scene-packages', { headers })
    const result = await res.json()
    if (result.success) {
      setPackages(result.data)
      setAuthenticated(true)
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    await fetch('/api/admin/scene-packages', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, description }),
    })
    setName('')
    setDescription('')
    setMessage('已创建套餐（请在数据库添加商品项）')
    await load()
  }

  useEffect(() => {
    if (authenticated) {
      load()
    }
  }, [authenticated])

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-4 text-2xl font-semibold">场景套餐</h1>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); load() }}>
          <input
            className="flex-1 rounded border px-3 py-2"
            placeholder="管理员密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="rounded bg-zinc-900 px-4 py-2 text-white" type="submit">
            登录
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">场景套餐</h1>
      <form className="mb-8 flex flex-wrap gap-2" onSubmit={handleCreate}>
        <input
          className="rounded border px-3 py-2"
          placeholder="套餐名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="min-w-48 flex-1 rounded border px-3 py-2"
          placeholder="描述"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button className="rounded bg-zinc-900 px-4 py-2 text-white" type="submit">
          新增
        </button>
      </form>
      {message ? <p className="mb-4 text-sm text-slate-500">{message}</p> : null}
      <ul className="space-y-4">
        {packages.map((pkg) => (
          <li key={pkg.id} className="rounded border p-4">
            <p className="font-medium">
              {pkg.name} {pkg.active ? '' : '(已停用)'}
            </p>
            <p className="text-sm text-slate-500">{pkg.description}</p>
            <p className="mt-2 text-xs text-slate-400">
              {pkg.items.map((i) => `${i.product.name}×${i.units}`).join('、') || '无商品'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

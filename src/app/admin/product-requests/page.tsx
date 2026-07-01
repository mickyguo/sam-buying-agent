'use client'

import { useState } from 'react'

export default function AdminProductRequestsPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [requests, setRequests] = useState<
    Array<{
      id: string
      sourceUrl: string
      user: { nickname: string | null }
      createdAt: string
    }>
  >([])

  const headers = {
    'Content-Type': 'application/json',
    'x-admin-password': password,
  }

  async function load() {
    const res = await fetch('/api/admin/product-requests', { headers })
    const result = await res.json()
    if (result.success) {
      setRequests(result.data)
      setAuthenticated(true)
    }
  }

  async function handleReview(id: string, status: 'APPROVED' | 'REJECTED') {
    const productId = status === 'APPROVED' ? prompt('请输入已入库商品 ID（可选）') : ''
    await fetch('/api/admin/product-requests', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        id,
        status,
        productId: productId || undefined,
      }),
    })
    await load()
  }

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-4 text-2xl font-semibold">商品申请审核</h1>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); load() }}>
          <input className="flex-1 rounded border px-3 py-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="rounded bg-zinc-900 px-4 py-2 text-white" type="submit">登录</button>
        </form>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">用户商品申请</h1>
      {requests.length === 0 ? (
        <p className="text-slate-500">暂无待审核申请</p>
      ) : (
        <ul className="space-y-4">
          {requests.map((req) => (
            <li key={req.id} className="rounded border p-4">
              <p className="text-sm">{req.user.nickname ?? '用户'}</p>
              <p className="mt-1 break-all text-sm text-slate-600">{req.sourceUrl}</p>
              <div className="mt-3 flex gap-2">
                <button className="rounded bg-green-600 px-3 py-1 text-sm text-white" type="button" onClick={() => handleReview(req.id, 'APPROVED')}>通过</button>
                <button className="rounded bg-red-500 px-3 py-1 text-sm text-white" type="button" onClick={() => handleReview(req.id, 'REJECTED')}>拒绝</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

'use client'

import { FormEvent, useState } from 'react'

interface AdminOrder {
  id: string
  orderNo: string
  type: string
  status: string
  amount: number
  units: number
  groupOrderId: string | null
  productName: string
  userNickname: string | null
}

export default function AdminOrdersPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [message, setMessage] = useState('')

  const headers = {
    'Content-Type': 'application/json',
    'x-admin-password': password,
  }

  async function loadOrders() {
    const response = await fetch('/api/admin/orders', { headers })
    const result = await response.json()
    if (result.success) {
      setOrders(result.data)
      setAuthenticated(true)
      setMessage('')
    } else {
      setMessage(result.message)
    }
  }

  async function handleAuth(event: FormEvent) {
    event.preventDefault()
    await loadOrders()
  }

  async function updateOrder(orderId: string, status: string) {
    const response = await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ orderId, status }),
    })
    const result = await response.json()
    if (result.success) {
      loadOrders()
    } else {
      setMessage(result.message)
    }
  }

  async function updateGroup(groupOrderId: string, groupStatus: 'PURCHASING' | 'COMPLETED') {
    const response = await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ groupOrderId, groupStatus }),
    })
    const result = await response.json()
    if (result.success) {
      loadOrders()
    } else {
      setMessage(result.message)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-semibold">sam · 订单管理</h1>
      <form
        className="mb-8 rounded-xl border border-zinc-200 p-4"
        onSubmit={handleAuth}
      >
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

      {message ? <p className="mb-4 text-sm text-zinc-600">{message}</p> : null}

      {authenticated ? (
        <div className="grid gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-zinc-200 p-4"
            >
              <p className="font-medium">{order.productName}</p>
              <p className="text-sm text-zinc-600">
                {order.orderNo} · {order.userNickname ?? '微信用户'} · ¥
                {(order.amount / 100).toFixed(2)} · {order.status}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="rounded-lg border px-3 py-1"
                  type="button"
                  onClick={() => updateOrder(order.id, 'PURCHASING')}
                >
                  标记采购中
                </button>
                <button
                  className="rounded-lg border px-3 py-1"
                  type="button"
                  onClick={() => updateOrder(order.id, 'DELIVERING')}
                >
                  标记配送中
                </button>
                <button
                  className="rounded-lg border px-3 py-1"
                  type="button"
                  onClick={() => updateOrder(order.id, 'COMPLETED')}
                >
                  标记完成
                </button>
                {order.groupOrderId ? (
                  <>
                    <button
                      className="rounded-lg border px-3 py-1"
                      type="button"
                      onClick={() => updateGroup(order.groupOrderId!, 'PURCHASING')}
                    >
                      拼单采购中
                    </button>
                    <button
                      className="rounded-lg border px-3 py-1"
                      type="button"
                      onClick={() => updateGroup(order.groupOrderId!, 'COMPLETED')}
                    >
                      拼单完成
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

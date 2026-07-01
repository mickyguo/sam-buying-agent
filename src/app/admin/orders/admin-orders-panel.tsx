'use client'

import { Button, Form, Input, Select, Space, Table } from 'antd'
import type { TableColumnsType } from 'antd'
import { FormEvent, useMemo, useState } from 'react'

const PAGE_SIZE = 10

const STATUS_TEXT: Record<string, string> = {
  PENDING_PAY: '待支付',
  PAID: '已支付',
  PURCHASING: '采购中',
  DELIVERING: '配送中',
  COMPLETED: '已完成',
  REFUNDED: '已退款',
  CANCELLED: '已取消',
}

const STATUS_OPTIONS = Object.entries(STATUS_TEXT).map(([value, label]) => ({
  value,
  label,
}))

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
  pickupCode?: string | null
}

interface SearchForm {
  productName: string
  status?: string
}

export default function AdminOrdersPanel() {
  const [searchForm] = Form.useForm<SearchForm>()
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [message, setMessage] = useState('')
  const [filters, setFilters] = useState<SearchForm>({ productName: '' })
  const [currentPage, setCurrentPage] = useState(1)
  const [pickupCodeInput, setPickupCodeInput] = useState('')
  const [uploadingOrderId, setUploadingOrderId] = useState('')

  const filteredOrders = useMemo(() => {
    const nameQuery = filters.productName.trim().toLowerCase()
    return orders.filter((order) => {
      if (nameQuery && !order.productName.toLowerCase().includes(nameQuery)) {
        return false
      }
      if (filters.status && order.status !== filters.status) {
        return false
      }
      return true
    })
  }, [orders, filters])

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

  function handleSearch(values: SearchForm) {
    setFilters(values)
    setCurrentPage(1)
  }

  function handleReset() {
    searchForm.resetFields()
    setFilters({ productName: '' })
    setCurrentPage(1)
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

  async function uploadPurchaseProof(orderId: string, file: File) {
    setUploadingOrderId(orderId)
    setMessage('')
    try {
      const imageUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('读取图片失败'))
        reader.readAsDataURL(file)
      })

      const response = await fetch('/api/admin/purchase-proof', {
        method: 'POST',
        headers,
        body: JSON.stringify({ orderId, imageUrl, note: '山姆采购凭证' }),
      })
      const result = await response.json()
      if (result.success) {
        setMessage('采购凭证上传成功')
      } else {
        setMessage(result.message)
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '上传失败')
    } finally {
      setUploadingOrderId('')
    }
  }

  async function assignPickup(orderId: string) {
    const response = await fetch('/api/admin/pickup/verify', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'assign', orderId }),
    })
    const result = await response.json()
    if (result.success) {
      setMessage(`取货码已生成：${result.data.pickupCode}`)
      loadOrders()
    } else {
      setMessage(result.message)
    }
  }

  async function verifyPickup() {
    if (!pickupCodeInput.trim()) {
      return
    }
    const response = await fetch('/api/admin/pickup/verify', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'verify', pickupCode: pickupCodeInput.trim() }),
    })
    const result = await response.json()
    if (result.success) {
      setMessage(`核销成功：${result.data.orderNo}`)
      setPickupCodeInput('')
      loadOrders()
    } else {
      setMessage(result.message)
    }
  }

  const columns: TableColumnsType<AdminOrder> = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 180,
    },
    {
      title: '用户',
      key: 'userNickname',
      width: 120,
      render: (_, record) => record.userNickname ?? '微信用户',
    },
    {
      title: '金额',
      key: 'amount',
      width: 100,
      render: (_, record) => `¥${(record.amount / 100).toFixed(2)}`,
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, record) => STATUS_TEXT[record.status] ?? record.status,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space size={[8, 8]} wrap>
          <Button size="small" onClick={() => updateOrder(record.id, 'PURCHASING')}>
            标记采购中
          </Button>
          <Button size="small" onClick={() => updateOrder(record.id, 'DELIVERING')}>
            标记配送中
          </Button>
          <Button size="small" onClick={() => assignPickup(record.id)}>
            生成取货码
          </Button>
          <label className="cursor-pointer">
            <input
              accept="image/*"
              className="hidden"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  uploadPurchaseProof(record.id, file)
                }
                event.currentTarget.value = ''
              }}
            />
            <Button size="small" loading={uploadingOrderId === record.id}>
              上传小票
            </Button>
          </label>
          <Button size="small" onClick={() => updateOrder(record.id, 'COMPLETED')}>
            标记完成
          </Button>
          {record.groupOrderId ? (
            <>
              <Button
                size="small"
                onClick={() => updateGroup(record.groupOrderId!, 'PURCHASING')}
              >
                拼单采购中
              </Button>
              <Button
                size="small"
                onClick={() => updateGroup(record.groupOrderId!, 'COMPLETED')}
              >
                拼单完成
              </Button>
            </>
          ) : null}
        </Space>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-semibold">sam · 订单管理</h1>
      <form
        className="mb-8 rounded-xl border border-zinc-200 bg-white p-4"
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
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Input
              placeholder="输入取货码核销"
              style={{ width: 200 }}
              value={pickupCodeInput}
              onChange={(event) => setPickupCodeInput(event.target.value)}
            />
            <Button type="primary" onClick={verifyPickup}>
              核销取货
            </Button>
          </div>

          <Form
            form={searchForm}
            layout="inline"
            className="mb-4"
            initialValues={{ productName: '' }}
            onFinish={handleSearch}
          >
            <Form.Item label="商品名称" name="productName">
              <Input placeholder="搜索商品名称" allowClear />
            </Form.Item>
            <Form.Item label="状态" name="status">
              <Select
                allowClear
                placeholder="全部"
                style={{ width: 160 }}
                options={STATUS_OPTIONS}
              />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  搜索
                </Button>
                <Button onClick={handleReset}>重置</Button>
              </Space>
            </Form.Item>
          </Form>

          <Table
            columns={columns}
            dataSource={filteredOrders}
            rowKey="id"
            bordered
            locale={{ emptyText: '暂无订单' }}
            pagination={{
              current: currentPage,
              pageSize: PAGE_SIZE,
              total: filteredOrders.length,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page) => setCurrentPage(page),
            }}
          />
        </div>
      ) : null}
    </div>
  )
}

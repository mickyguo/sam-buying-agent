'use client'

import { Card, Col, Row, Statistic, Table } from 'antd'
import type { TableColumnsType } from 'antd'
import { FormEvent, useState } from 'react'

interface DashboardStats {
  todayGmvYuan: string
  todayOrderCount: number
  groupFillRate: number
  pendingOrderCount: number
  openGroupCount: number
  topProducts: Array<{
    productName: string
    totalAmountYuan: string
    orderCount: number
  }>
  groupFunnel: Array<{
    status: string
    count: number
  }>
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: '拼单中',
  FILLED: '已满员',
  PURCHASING: '采购中',
  COMPLETED: '已完成',
  EXPIRED: '已过期',
}

export default function AdminDashboardPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [message, setMessage] = useState('')

  const headers = {
    'Content-Type': 'application/json',
    'x-admin-password': password,
  }

  async function loadStats() {
    const response = await fetch('/api/admin/stats', { headers })
    const result = await response.json()
    if (result.success) {
      setStats(result.data)
      setAuthenticated(true)
      setMessage('')
    } else {
      setMessage(result.message)
    }
  }

  async function handleAuth(event: FormEvent) {
    event.preventDefault()
    await loadStats()
  }

  const topColumns: TableColumnsType<DashboardStats['topProducts'][number]> = [
    { title: '商品', dataIndex: 'productName', key: 'productName' },
    {
      title: '销售额',
      key: 'totalAmountYuan',
      render: (_, row) => `¥${row.totalAmountYuan}`,
    },
    { title: '订单数', dataIndex: 'orderCount', key: 'orderCount' },
  ]

  const funnelColumns: TableColumnsType<DashboardStats['groupFunnel'][number]> = [
    {
      title: '状态',
      key: 'status',
      render: (_, row) => STATUS_LABELS[row.status] ?? row.status,
    },
    { title: '数量', dataIndex: 'count', key: 'count' },
  ]

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-semibold">sam · 运营看板</h1>

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
          <button className="rounded-lg bg-black px-4 py-2 text-white" type="submit">
            进入
          </button>
        </div>
      </form>

      {message ? <p className="mb-4 text-sm text-zinc-600">{message}</p> : null}

      {authenticated && stats ? (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic title="今日 GMV" prefix="¥" value={stats.todayGmvYuan} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic title="今日订单" value={stats.todayOrderCount} suffix="笔" />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic title="成团率" value={stats.groupFillRate} suffix="%" />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic title="待处理订单" value={stats.pendingOrderCount} suffix="笔" />
              </Card>
            </Col>
          </Row>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card title="热门商品 TOP5">
              <Table
                columns={topColumns}
                dataSource={stats.topProducts}
                rowKey="productName"
                pagination={false}
                size="small"
              />
            </Card>
            <Card title={`拼单漏斗（进行中 ${stats.openGroupCount} 个）`}>
              <Table
                columns={funnelColumns}
                dataSource={stats.groupFunnel}
                rowKey="status"
                pagination={false}
                size="small"
              />
            </Card>
          </div>
        </>
      ) : null}
    </div>
  )
}

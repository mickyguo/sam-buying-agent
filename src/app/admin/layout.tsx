import { AntdRegistry } from '@ant-design/nextjs-registry'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'sam管理后台',
  description: 'sam商品与订单管理',
}

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <AntdRegistry>
      <div className="min-h-screen bg-zinc-50 text-zinc-900">{children}</div>
    </AntdRegistry>
  )
}

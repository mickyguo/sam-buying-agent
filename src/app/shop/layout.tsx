import type { Metadata, Viewport } from 'next'
import ShopRuntimeBootstrap from '@/components/shop/ShopRuntimeBootstrap'

export const metadata: Metadata = {
  title: 'sam',
  description: 'sam H5 商城',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ShopRuntimeBootstrap>
      <div className="min-h-dvh w-full bg-[#f5f7fa]">{children}</div>
    </ShopRuntimeBootstrap>
  )
}

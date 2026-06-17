import ShopTabBar from '@/components/shop/ShopTabBar'

export default function ShopShell({
  children,
  title,
}: {
  children: React.ReactNode
  title?: string
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-[#f5f7fa]">
      <header className="sticky top-0 z-40 shrink-0 bg-[#004b87] px-4 py-4 text-white">
        <h1 className="text-lg font-semibold">{title ?? 'sam'}</h1>
      </header>
      <main className="flex flex-1 flex-col px-4 py-4 pb-20">{children}</main>
      <ShopTabBar />
    </div>
  )
}

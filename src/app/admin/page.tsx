export default function AdminHomePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-4 text-3xl font-semibold">sam管理后台</h1>
      <div className="grid gap-4">
        <a className="rounded-xl border border-zinc-200 p-6" href="/admin/products">
          商品管理
        </a>
        <a className="rounded-xl border border-zinc-200 p-6" href="/admin/orders">
          订单管理
        </a>
      </div>
    </div>
  )
}

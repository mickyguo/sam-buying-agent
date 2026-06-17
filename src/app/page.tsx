import Link from 'next/link'

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <h1 className="mb-4 text-4xl font-semibold">sam</h1>
      <p className="mb-8 text-lg text-zinc-600">
        Next.js 后端 API + H5 移动端商城。支持微信 OAuth 登录、整件代购与按份拼单。
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          className="rounded-xl border border-zinc-200 p-6 hover:bg-zinc-50"
          href="/shop"
        >
          H5 商城
        </Link>
        <Link className="rounded-xl border border-zinc-200 p-6 hover:bg-zinc-50" href="/admin">
          管理后台
        </Link>
        <Link
          className="rounded-xl border border-zinc-200 p-6 hover:bg-zinc-50"
          href="/admin/products"
        >
          商品管理
        </Link>
        <Link
          className="rounded-xl border border-zinc-200 p-6 hover:bg-zinc-50"
          href="/api-docs"
        >
          API 文档
        </Link>
        <Link
          className="rounded-xl border border-zinc-200 p-6 hover:bg-zinc-50"
          href="/prd"
        >
          产品需求文档
        </Link>
        <Link
          className="rounded-xl border border-zinc-200 p-6 hover:bg-zinc-50"
          href="/privacy"
        >
          隐私政策
        </Link>
      </div>
      <p className="mt-8 text-sm text-zinc-500">
        手机浏览器或微信内打开 <Link href="/shop">/shop</Link> 即可使用 H5 商城。
      </p>
    </div>
  )
}

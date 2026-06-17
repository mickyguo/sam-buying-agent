import ApiDocsClient from './ApiDocsClient'

export const metadata = {
  title: 'API 文档 | 山姆代购',
  description: 'OpenAPI 3.0 接口文档',
}

export default function ApiDocsPage() {
  const isDev = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b border-zinc-200 px-4 py-3 shrink-0">
        <div className="mx-auto max-w-6xl flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">山姆代购 API</h1>
            <p className="text-sm text-zinc-500">OpenAPI 3.0 · Swagger UI</p>
          </div>
          {isDev ? (
            <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md">
              开发模式：可在此页直接 Try it out。短信验证码默认{' '}
              <code className="font-mono text-xs">123456</code>，支付可用 PUT
              模拟成功。
            </p>
          ) : (
            <p className="text-sm text-zinc-500">
              生产环境仅浏览文档；接口调试请在开发环境访问。
            </p>
          )}
        </div>
      </header>
      <main className="flex-1 [&_.swagger-ui]:max-w-none">
        <ApiDocsClient
          specUrl="/api/openapi"
          tryItOutEnabled={isDev}
        />
      </main>
    </div>
  )
}

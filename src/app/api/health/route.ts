import { jsonOk } from '@/lib/api-response'

export async function GET() {
  return jsonOk({
    status: 'ok',
    runtime: process.env.NEXT_RUNTIME ?? 'unknown',
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    nodeEnv: process.env.NODE_ENV ?? 'unknown',
  })
}

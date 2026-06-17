import { NextRequest } from 'next/server'
import { buildOpenApiSpec } from '@/lib/openapi/spec'

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin
  const spec = buildOpenApiSpec(origin)
  return Response.json(spec, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

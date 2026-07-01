import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { order, purchaseProof } from '@/db/schema'
import { db } from '@/lib/db'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const adminPassword = request.headers.get('x-admin-password')
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return jsonError('管理员密码错误', 403)
    }

    const body = (await request.json()) as {
      orderId?: string
      imageUrl?: string
      note?: string
    }

    if (!body.orderId || !body.imageUrl) {
      return jsonError('缺少订单或图片')
    }

    const orderRow = await db.query.order.findFirst({
      where: eq(order.id, body.orderId),
    })
    if (!orderRow) {
      return jsonError('订单不存在', 404)
    }

    const existing = await db.query.purchaseProof.findFirst({
      where: eq(purchaseProof.orderId, body.orderId),
    })

    if (existing) {
      const [updated] = await db
        .update(purchaseProof)
        .set({
          imageUrl: body.imageUrl,
          note: body.note ?? null,
        })
        .where(eq(purchaseProof.id, existing.id))
        .returning()
      const { recordOrderEvent } = await import('@/lib/order-timeline')
      await recordOrderEvent(
        body.orderId,
        'PURCHASE_PROOF',
        body.note ?? '已更新采购凭证',
        body.imageUrl,
      )
      return jsonOk(updated)
    }

    const [created] = await db
      .insert(purchaseProof)
      .values({
        orderId: body.orderId,
        imageUrl: body.imageUrl,
        note: body.note ?? null,
      })
      .returning()

    const { recordOrderEvent } = await import('@/lib/order-timeline')
    await recordOrderEvent(
      body.orderId,
      'PURCHASE_PROOF',
      body.note ?? '已上传采购凭证',
      body.imageUrl,
    )

    return jsonOk(created, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const adminPassword = request.headers.get('x-admin-password')
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return jsonError('管理员密码错误', 403)
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    if (!orderId) {
      return jsonError('缺少 orderId')
    }

    const proof = await db.query.purchaseProof.findFirst({
      where: eq(purchaseProof.orderId, orderId),
    })

    return jsonOk(proof)
  } catch (error) {
    return handleApiError(error)
  }
}

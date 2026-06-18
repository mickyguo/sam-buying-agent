import { NextRequest } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { groupOrder } from '@/db/schema'
import { GroupStatus } from '@/db/enums'
import { requireAuthUser } from '@/lib/shop-auth'
import { db } from '@/lib/db'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'
import {
  createGroupOrder,
  serializeGroupOrder,
} from '@/lib/group-order'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const status = searchParams.get('status') as GroupStatus | null

    const groups = await db.query.groupOrder.findMany({
      where: and(
        productId ? eq(groupOrder.productId, productId) : undefined,
        eq(groupOrder.status, status ?? GroupStatus.OPEN),
      ),
      with: {
        product: true,
        participations: {
          with: { user: true },
        },
      },
      orderBy: desc(groupOrder.createdAt),
    })

    return jsonOk(groups.map(serializeGroupOrder))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const userRow = await requireAuthUser(request)
    const body = (await request.json()) as {
      productId?: string
      units?: number
      checkoutBatchId?: string
    }

    if (!body.productId || !body.units) {
      return jsonError('缺少商品或份数')
    }

    const result = await createGroupOrder({
      userId: userRow.id,
      productId: body.productId,
      units: body.units,
      checkoutBatchId: body.checkoutBatchId,
    })

    return jsonOk(
      {
        groupOrderId: result.groupOrder.id,
        orderId: result.order.id,
        amount: result.order.amount,
        outTradeNo: result.order.wxOutTradeNo,
      },
      { status: 201 },
    )
  } catch (error) {
    return handleApiError(error)
  }
}

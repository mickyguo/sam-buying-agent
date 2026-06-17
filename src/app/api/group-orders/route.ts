import { NextRequest } from 'next/server'
import { GroupStatus } from '@/generated/prisma/client'
import { requireAuthUser } from '@/lib/shop-auth'
import { prisma } from '@/lib/db'
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

    const groups = await prisma.groupOrder.findMany({
      where: {
        productId: productId ?? undefined,
        status: status ?? GroupStatus.OPEN,
      },
      include: {
        product: true,
        participations: {
          include: { user: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return jsonOk(groups.map(serializeGroupOrder))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthUser(request)
    const body = (await request.json()) as {
      productId?: string
      units?: number
      checkoutBatchId?: string
    }

    if (!body.productId || !body.units) {
      return jsonError('缺少商品或份数')
    }

    const result = await createGroupOrder({
      userId: user.id,
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

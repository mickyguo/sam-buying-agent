import { NextRequest } from 'next/server'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { groupOrder, order } from '@/db/schema'
import { OrderStatus } from '@/db/enums'
import { db } from '@/lib/db'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const adminPassword = request.headers.get('x-admin-password')
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return jsonError('管理员密码错误', 403)
    }

    const orders = await db.query.order.findMany({
      with: {
        product: true,
        user: true,
      },
      orderBy: desc(order.createdAt),
      limit: 100,
    })

    return jsonOk(
      orders.map((orderRow) => ({
        id: orderRow.id,
        orderNo: orderRow.orderNo,
        type: orderRow.type,
        status: orderRow.status,
        amount: orderRow.amount,
        units: orderRow.units,
        groupOrderId: orderRow.groupOrderId,
        createdAt: orderRow.createdAt.toISOString(),
        productName: orderRow.product.name,
        userNickname: orderRow.user.nickname,
      })),
    )
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const adminPassword = request.headers.get('x-admin-password')
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return jsonError('管理员密码错误', 403)
    }

    const body = (await request.json()) as {
      orderId?: string
      status?: OrderStatus
      groupOrderId?: string
      groupStatus?: 'PURCHASING' | 'COMPLETED'
    }

    if (body.groupOrderId && body.groupStatus) {
      await db
        .update(groupOrder)
        .set({ status: body.groupStatus })
        .where(eq(groupOrder.id, body.groupOrderId))

      const nextStatus =
        body.groupStatus === 'COMPLETED'
          ? OrderStatus.COMPLETED
          : OrderStatus.PURCHASING

      await db
        .update(order)
        .set({
          status:
            body.groupStatus === 'COMPLETED'
              ? OrderStatus.COMPLETED
              : nextStatus,
        })
        .where(
          and(
            eq(order.groupOrderId, body.groupOrderId),
            inArray(order.status, [
              OrderStatus.PAID,
              OrderStatus.PURCHASING,
              OrderStatus.DELIVERING,
            ]),
          ),
        )

      return jsonOk({ groupOrderId: body.groupOrderId, status: body.groupStatus })
    }

    if (!body.orderId || !body.status) {
      return jsonError('缺少参数')
    }

    const [orderRow] = await db
      .update(order)
      .set({ status: body.status })
      .where(eq(order.id, body.orderId))
      .returning()

    return jsonOk({ id: orderRow.id, status: orderRow.status })
  } catch (error) {
    return handleApiError(error)
  }
}

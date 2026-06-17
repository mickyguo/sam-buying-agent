import { NextRequest } from 'next/server'
import { OrderStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const adminPassword = request.headers.get('x-admin-password')
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return jsonError('管理员密码错误', 403)
    }

    const orders = await prisma.order.findMany({
      include: {
        product: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return jsonOk(
      orders.map((order) => ({
        id: order.id,
        orderNo: order.orderNo,
        type: order.type,
        status: order.status,
        amount: order.amount,
        units: order.units,
        groupOrderId: order.groupOrderId,
        createdAt: order.createdAt.toISOString(),
        productName: order.product.name,
        userNickname: order.user.nickname,
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
      await prisma.groupOrder.update({
        where: { id: body.groupOrderId },
        data: { status: body.groupStatus },
      })

      const nextStatus =
        body.groupStatus === 'COMPLETED'
          ? OrderStatus.COMPLETED
          : OrderStatus.PURCHASING

      await prisma.order.updateMany({
        where: {
          groupOrderId: body.groupOrderId,
          status: {
            in: [OrderStatus.PAID, OrderStatus.PURCHASING, OrderStatus.DELIVERING],
          },
        },
        data: {
          status:
            body.groupStatus === 'COMPLETED'
              ? OrderStatus.COMPLETED
              : nextStatus,
        },
      })

      return jsonOk({ groupOrderId: body.groupOrderId, status: body.groupStatus })
    }

    if (!body.orderId || !body.status) {
      return jsonError('缺少参数')
    }

    const order = await prisma.order.update({
      where: { id: body.orderId },
      data: { status: body.status },
    })

    return jsonOk({ id: order.id, status: order.status })
  } catch (error) {
    return handleApiError(error)
  }
}

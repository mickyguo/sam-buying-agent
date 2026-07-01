import { NextRequest } from 'next/server'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'
import { assignPickupCode, notifyPickupReady, verifyPickupCode } from '@/lib/pickup'

export async function POST(request: NextRequest) {
  try {
    const adminPassword = request.headers.get('x-admin-password')
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return jsonError('管理员密码错误', 403)
    }

    const body = (await request.json()) as {
      action?: 'assign' | 'verify'
      orderId?: string
      pickupCode?: string
    }

    if (body.action === 'assign') {
      if (!body.orderId) {
        return jsonError('缺少 orderId')
      }
      const pickupCode = await assignPickupCode(body.orderId)
      await notifyPickupReady(body.orderId).catch(() => undefined)
      return jsonOk({ orderId: body.orderId, pickupCode })
    }

    if (body.action === 'verify') {
      if (!body.pickupCode) {
        return jsonError('缺少取货码')
      }
      const orderRow = await verifyPickupCode(body.pickupCode)
      return jsonOk({
        orderId: orderRow.id,
        orderNo: orderRow.orderNo,
        status: 'COMPLETED',
      })
    }

    return jsonError('无效操作')
  } catch (error) {
    return handleApiError(error)
  }
}

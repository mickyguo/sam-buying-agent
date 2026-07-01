import { shopFetch } from '@/lib/shop/api'
import type { CartItem, CheckoutMode } from '@/lib/shop/types'

export interface CreatedOrderResult {
  orderId: string
  groupOrderId?: string
  mode: CheckoutMode
}

export async function createShopOrder(
  item: Pick<
    CartItem,
    'productId' | 'units' | 'mode' | 'groupOrderId' | 'pickupSlotId' | 'pickupLocationId'
  > & {
    checkoutBatchId?: string
    userCouponId?: string
  },
): Promise<CreatedOrderResult> {
  const slotPayload = {
    pickupSlotId: item.pickupSlotId,
    pickupLocationId: item.pickupLocationId,
    userCouponId: item.userCouponId,
  }

  if (item.mode === 'direct') {
    const result = await shopFetch<{ orderId: string }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        productId: item.productId,
        checkoutBatchId: item.checkoutBatchId,
        ...slotPayload,
      }),
    })
    return { orderId: result.orderId, mode: 'direct' }
  }

  if (item.mode === 'create') {
    const result = await shopFetch<{ orderId: string; groupOrderId: string }>(
      '/api/group-orders',
      {
        method: 'POST',
        body: JSON.stringify({
          productId: item.productId,
          units: item.units,
          checkoutBatchId: item.checkoutBatchId,
          ...slotPayload,
        }),
      },
    )
    return {
      orderId: result.orderId,
      groupOrderId: result.groupOrderId,
      mode: 'create',
    }
  }

  if (!item.groupOrderId) {
    throw new Error('缺少拼单 ID')
  }

  const result = await shopFetch<{ orderId: string }>(
    `/api/group-orders/${item.groupOrderId}/join`,
    {
      method: 'POST',
      body: JSON.stringify({
        units: item.units,
        checkoutBatchId: item.checkoutBatchId,
        ...slotPayload,
      }),
    },
  )

  return {
    orderId: result.orderId,
    groupOrderId: item.groupOrderId,
    mode: 'join',
  }
}

import { eq } from 'drizzle-orm'
import { orderEvent } from '@/db/schema'
import { db } from '@/lib/db'

export type OrderEventType =
  | 'PAID'
  | 'GROUP_FILLED'
  | 'PURCHASING'
  | 'PURCHASE_PROOF'
  | 'PICKUP_READY'
  | 'COMPLETED'

const EVENT_LABELS: Record<OrderEventType, string> = {
  PAID: '支付成功',
  GROUP_FILLED: '拼单满员',
  PURCHASING: '代购采购中',
  PURCHASE_PROOF: '已采购到货',
  PICKUP_READY: '可取货',
  COMPLETED: '已取货',
}

export function getOrderEventLabel(type: OrderEventType) {
  return EVENT_LABELS[type] ?? type
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbExecutor = typeof db | { insert: typeof db.insert }

export async function recordOrderEvent(
  orderId: string,
  type: OrderEventType,
  note?: string,
  imageUrl?: string,
  tx?: DbExecutor,
) {
  const client = tx ?? db
  await client.insert(orderEvent).values({
    orderId,
    type,
    note: note ?? getOrderEventLabel(type),
    imageUrl,
  })
}

export async function getOrderTimeline(orderId: string) {
  const events = await db.query.orderEvent.findMany({
    where: eq(orderEvent.orderId, orderId),
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  })

  return events.map((event) => ({
    id: event.id,
    type: event.type,
    label: getOrderEventLabel(event.type as OrderEventType),
    note: event.note,
    imageUrl: event.imageUrl,
    createdAt: event.createdAt.toISOString(),
  }))
}

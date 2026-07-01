import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { product } from '@/db/schema'
import { ProductStatus } from '@/db/enums'
import { db } from '@/lib/db'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'
import { chatWithLlm, type LlmChatMessage } from '@/lib/llm'
import { formatPrice } from '@/lib/utils'
import {
  matchedLinesToCartItems,
  parseAndMatchAiOrder,
} from '@/lib/shop/ai-order'
import type { ShopProduct } from '@/lib/shop/types'

function serializeProduct(row: typeof product.$inferSelect): ShopProduct {
  const totalUnits = row.totalUnits ?? 1
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.imageUrl,
    price: row.price,
    priceYuan: formatPrice(row.price),
    splittable: row.splittable,
    totalUnits: row.totalUnits,
    unitLabel: row.unitLabel,
    description: row.description,
    status: row.status,
    unitPrice: row.splittable && row.totalUnits
      ? Math.round(row.price / row.totalUnits)
      : row.price,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      messages?: LlmChatMessage[]
      text?: string
    }

    const products = await db
      .select()
      .from(product)
      .where(eq(product.status, ProductStatus.ACTIVE))

    const shopProducts = products.map(serializeProduct)

    if (body.messages && body.messages.length > 0) {
      const llmResult = await chatWithLlm(body.messages, shopProducts)
      if (llmResult) {
        const cartItems = llmResult.items
          .map((item) => {
            const productRow = shopProducts.find((p) => p.id === item.productId)
            if (!productRow) {
              return null
            }
            const amountYuan =
              item.mode === 'direct'
                ? productRow.priceYuan
                : (
                    (productRow.unitPrice * item.units) /
                    100
                  ).toFixed(2)
            return {
              productId: item.productId,
              productName: productRow.name,
              productImage: productRow.imageUrl,
              units: item.units,
              mode: item.mode,
              amountYuan,
              unitLabel: productRow.unitLabel,
            }
          })
          .filter(Boolean)

        return jsonOk({
          reply: llmResult.reply,
          source: llmResult.source,
          items: cartItems,
        })
      }
    }

    const lastUserMessage =
      body.text ??
      [...(body.messages ?? [])].reverse().find((m) => m.role === 'user')?.content

    if (!lastUserMessage?.trim()) {
      return jsonError('请输入内容')
    }

    const fallback = parseAndMatchAiOrder(lastUserMessage, shopProducts)
    const cartItems = matchedLinesToCartItems(fallback.matched)

    let reply = ''
    if (fallback.matched.length === 0) {
      reply = '暂未识别到商品，请尝试更具体的名称，例如「瑞士卷 5 块、烤鸡 1 只」。'
    } else if (fallback.unmatched.length > 0) {
      reply = `已识别 ${fallback.matched.length} 项商品。未匹配：${fallback.unmatched.join('、')}`
    } else {
      reply = `已为你识别 ${fallback.matched.length} 项商品，可加入购物车。`
    }

    return jsonOk({
      reply,
      source: 'fallback' as const,
      items: cartItems,
      unmatched: fallback.unmatched,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

import type { ShopProduct } from '@/lib/shop/types'

export interface LlmChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LlmOrderItem {
  productId: string
  productName: string
  units: number
  mode: 'direct' | 'create' | 'join'
}

export interface LlmChatResult {
  reply: string
  items: LlmOrderItem[]
  source: 'llm' | 'fallback'
}

function buildCatalogPrompt(products: ShopProduct[]): string {
  const lines = products.map((product) => {
    const type = product.splittable
      ? `可拼单，整盒${product.totalUnits ?? '?'}${product.unitLabel ?? '份'}，单价约¥${(product.unitPrice / 100).toFixed(2)}/${product.unitLabel ?? '份'}`
      : '整件代购'
    return `- id:${product.id} 名称:${product.name} 价格:¥${product.priceYuan} ${type}`
  })

  return `你是山姆代购助手。根据用户自然语言推荐商品并解析购买数量。
商品列表：
${lines.join('\n')}

回复要求：
1. 用简短中文回复用户
2. 在回复末尾单独一行输出 JSON 数组（不要 markdown 代码块），格式：
[{"productId":"id","units":数量,"mode":"direct|create"}]
3. mode 规则：splittable 商品用 create（发起拼单），整件用 direct
4. 若无法确定商品，items 为空数组，在回复中追问
5. 聚会场景可推荐搭配，如瑞士卷+烤鸡`
}

function parseItemsFromReply(
  reply: string,
  products: ShopProduct[],
): { cleanReply: string; items: LlmOrderItem[] } {
  const lines = reply.trim().split('\n')
  let items: LlmOrderItem[] = []
  let cleanReply = reply

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i].trim()
    if (!line.startsWith('[')) {
      continue
    }
    try {
      const parsed = JSON.parse(line) as Array<{
        productId?: string
        units?: number
        mode?: string
      }>
      items = parsed
        .filter((item) => item.productId && item.units && item.units > 0)
        .map((item) => {
          const product = products.find((p) => p.id === item.productId)
          const mode =
            item.mode === 'direct' || item.mode === 'create'
              ? item.mode
              : product?.splittable
                ? 'create'
                : 'direct'
          return {
            productId: item.productId!,
            productName: product?.name ?? '未知商品',
            units: item.units!,
            mode,
          }
        })
      cleanReply = lines.slice(0, i).join('\n').trim()
      break
    } catch {
      // not json line
    }
  }

  return { cleanReply, items }
}

function isCursorApi(baseUrl: string): boolean {
  return baseUrl.includes('api.cursor.com')
}

function buildCursorModelPayload(model: string): {
  id: string
  params?: Array<{ id: string; value: string }>
} {
  if (!model.startsWith('composer')) {
    return { id: model }
  }

  const useFast = process.env.LLM_MODEL_FAST === 'true'
  return {
    id: model,
    params: [{ id: 'fast', value: useFast ? 'true' : 'false' }],
  }
}

function buildAuthHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  }
}

function formatMessagesForPrompt(
  systemPrompt: string,
  messages: LlmChatMessage[],
): string {
  const roleLabel = (role: LlmChatMessage['role']) => {
    if (role === 'user') return '用户'
    if (role === 'assistant') return '助手'
    return '系统'
  }
  const history = messages
    .map((message) => `${roleLabel(message.role)}: ${message.content}`)
    .join('\n\n')
  return `${systemPrompt}\n\n---\n\n${history}`
}

async function pollCursorRunResult(
  baseUrl: string,
  apiKey: string,
  agentId: string,
  runId: string,
): Promise<string | null> {
  const headers = buildAuthHeaders(apiKey)
  const runUrl = `${baseUrl}/agents/${agentId}/runs/${runId}`
  const terminal = new Set(['FINISHED', 'ERROR', 'CANCELLED', 'EXPIRED'])

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const response = await fetch(runUrl, { headers })
    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as {
      status?: string
      result?: string
    }
    if (data.status && terminal.has(data.status)) {
      return data.status === 'FINISHED' ? data.result?.trim() ?? null : null
    }

    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  return null
}

async function chatWithCursorAgent(
  messages: LlmChatMessage[],
  products: ShopProduct[],
  apiKey: string,
  baseUrl: string,
  model: string,
): Promise<LlmChatResult | null> {
  const systemPrompt = buildCatalogPrompt(products)
  const promptText = formatMessagesForPrompt(systemPrompt, messages)
  const headers = buildAuthHeaders(apiKey)

  const response = await fetch(`${baseUrl}/agents`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: { text: promptText },
      model: buildCursorModelPayload(model),
    }),
  })

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as {
    agent?: { id?: string }
    run?: { id?: string }
  }
  const agentId = data.agent?.id
  const runId = data.run?.id
  if (!agentId || !runId) {
    return null
  }

  const content = await pollCursorRunResult(baseUrl, apiKey, agentId, runId)
  if (!content) {
    return null
  }

  const { cleanReply, items } = parseItemsFromReply(content, products)
  return {
    reply: cleanReply || content,
    items,
    source: 'llm',
  }
}

async function chatWithOpenAiCompatible(
  messages: LlmChatMessage[],
  products: ShopProduct[],
  apiKey: string,
  baseUrl: string,
  model: string,
): Promise<LlmChatResult | null> {
  const systemPrompt = buildCatalogPrompt(products)
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: buildAuthHeaders(apiKey),
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }),
  })

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) {
    return null
  }

  const { cleanReply, items } = parseItemsFromReply(content, products)
  return {
    reply: cleanReply || content,
    items,
    source: 'llm',
  }
}

export async function chatWithLlm(
  messages: LlmChatMessage[],
  products: ShopProduct[],
): Promise<LlmChatResult | null> {
  const apiKey = process.env.LLM_API_KEY
  const baseUrl = (process.env.LLM_API_BASE_URL ?? 'https://api.openai.com/v1').replace(
    /\/$/,
    '',
  )
  const model = process.env.LLM_MODEL ?? 'gpt-4o-mini'

  if (!apiKey) {
    return null
  }

  if (isCursorApi(baseUrl)) {
    return chatWithCursorAgent(messages, products, apiKey, baseUrl, model)
  }

  return chatWithOpenAiCompatible(messages, products, apiKey, baseUrl, model)
}

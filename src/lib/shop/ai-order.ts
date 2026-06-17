import type { CartItem, CheckoutMode, ShopProduct } from '@/lib/shop/types'

export interface ParsedOrderLine {
  query: string
  units: number
}

export interface MatchedOrderLine {
  product: ShopProduct
  units: number
  mode: CheckoutMode
  amountYuan: string
}

export interface AiOrderResult {
  matched: MatchedOrderLine[]
  unmatched: string[]
}

const CHINESE_DIGITS: Record<string, number> = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  俩: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
}

const UNIT_SUFFIX =
  '(?:件|个|块|盒|瓶|份|袋|桶|支|包|整(?:件)?|盒装|箱)?'

const LEADING_FILLERS =
  /^(?:请|帮我|给我|来|买|要|加|添|订|下单|购买|带|拿)+/

function parseChineseNumber(text: string): number | null {
  const trimmed = text.trim()
  if (!trimmed) {
    return null
  }
  if (/^\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10)
  }

  if (trimmed === '十') {
    return 10
  }
  if (trimmed.startsWith('十')) {
    const rest = trimmed.slice(1)
    return 10 + (rest ? (CHINESE_DIGITS[rest] ?? 0) : 0)
  }
  if (trimmed.endsWith('十')) {
    const head = trimmed.slice(0, -1)
    const tens = head ? (CHINESE_DIGITS[head] ?? Number.parseInt(head, 10)) : 1
    return tens * 10
  }
  if (trimmed.includes('十')) {
    const [head, tail] = trimmed.split('十')
    const tens = head ? (CHINESE_DIGITS[head] ?? Number.parseInt(head, 10)) : 1
    const ones = tail ? (CHINESE_DIGITS[tail] ?? Number.parseInt(tail, 10)) : 0
    return tens * 10 + ones
  }

  const digit = CHINESE_DIGITS[trimmed]
  return digit ?? null
}

function normalizeSegment(segment: string): string {
  return segment
    .trim()
    .replace(LEADING_FILLERS, '')
    .replace(/[。！!？?~～]+$/g, '')
    .trim()
}

function parseSegment(segment: string): ParsedOrderLine | null {
  const text = normalizeSegment(segment)
  if (!text) {
    return null
  }

  const nameThenQty = new RegExp(
    `^(.+?)(\\d+|[零一二两俩三四五六七八九十百]+)${UNIT_SUFFIX}$`,
  )
  const qtyThenName = new RegExp(
    `^(\\d+|[零一二两俩三四五六七八九十百]+)${UNIT_SUFFIX}?(.+)$`,
  )

  const tailMatch = text.match(nameThenQty)
  if (tailMatch) {
    const units = parseChineseNumber(tailMatch[2]) ?? 1
    return { query: tailMatch[1].trim(), units: Math.max(1, units) }
  }

  const headMatch = text.match(qtyThenName)
  if (headMatch) {
    const units = parseChineseNumber(headMatch[1]) ?? 1
    return { query: headMatch[2].trim(), units: Math.max(1, units) }
  }

  return { query: text, units: 1 }
}

export function parseAiOrderText(text: string): ParsedOrderLine[] {
  const cleaned = text
    .replace(/[，,、；;|\n]+/g, '，')
    .replace(/\s+(?:和|还有|以及|跟|同|加)\s+/g, '，')
    .trim()

  if (!cleaned) {
    return []
  }

  const segments = cleaned.split('，').map(normalizeSegment).filter(Boolean)
  const parsed: ParsedOrderLine[] = []

  for (const segment of segments) {
    const line = parseSegment(segment)
    if (line?.query) {
      parsed.push(line)
    }
  }

  return parsed
}

function getDisplayName(product: ShopProduct): string {
  return product.name.replace(/Member's Mark\s*/i, '').trim()
}

function scoreProductMatch(query: string, product: ShopProduct): number {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return 0
  }

  const displayName = getDisplayName(product).toLowerCase()
  const fullName = product.name.toLowerCase()
  const description = product.description?.toLowerCase() ?? ''

  if (displayName === normalizedQuery || fullName === normalizedQuery) {
    return 100
  }
  if (displayName.includes(normalizedQuery)) {
    return 90
  }
  if (normalizedQuery.includes(displayName)) {
    return 85
  }
  if (fullName.includes(normalizedQuery)) {
    return 80
  }
  if (description.includes(normalizedQuery)) {
    return 70
  }

  let overlap = 0
  for (const char of normalizedQuery) {
    if (displayName.includes(char)) {
      overlap += 1
    }
  }
  const overlapScore = (overlap / normalizedQuery.length) * 60
  if (overlapScore < 25) {
    return 0
  }
  return overlapScore
}

function buildMatchedLine(
  product: ShopProduct,
  units: number,
): MatchedOrderLine {
  if (product.splittable) {
    const maxUnits = product.totalUnits ?? 1
    const cappedUnits = Math.min(Math.max(1, units), maxUnits)
    const unitPrice = Math.round(product.price / maxUnits)
    return {
      product,
      units: cappedUnits,
      mode: 'create',
      amountYuan: ((unitPrice * cappedUnits) / 100).toFixed(2),
    }
  }

  const quantity = Math.max(1, units)
  return {
    product,
    units: quantity,
    mode: 'direct',
    amountYuan: ((product.price * quantity) / 100).toFixed(2),
  }
}

export function matchAiOrderLines(
  lines: ParsedOrderLine[],
  products: ShopProduct[],
): AiOrderResult {
  const activeProducts = products.filter((item) => item.status === 'ACTIVE')
  const matched: MatchedOrderLine[] = []
  const unmatched: string[] = []

  for (const line of lines) {
    let bestProduct: ShopProduct | null = null
    let bestScore = 0

    for (const product of activeProducts) {
      const score = scoreProductMatch(line.query, product)
      if (score > bestScore) {
        bestScore = score
        bestProduct = product
      }
    }

    if (!bestProduct || bestScore < 40) {
      unmatched.push(line.query)
      continue
    }

    matched.push(buildMatchedLine(bestProduct, line.units))
  }

  return { matched, unmatched }
}

export function parseAndMatchAiOrder(
  text: string,
  products: ShopProduct[],
): AiOrderResult {
  return matchAiOrderLines(parseAiOrderText(text), products)
}

export function matchedLinesToCartItems(
  lines: MatchedOrderLine[],
): Array<Omit<CartItem, 'id'>> {
  const items: Array<Omit<CartItem, 'id'>> = []

  for (const line of lines) {
    if (line.mode === 'direct') {
      for (let index = 0; index < line.units; index += 1) {
        items.push({
          productId: line.product.id,
          productName: line.product.name,
          productImage: line.product.imageUrl,
          units: 1,
          mode: 'direct',
          amountYuan: (line.product.price / 100).toFixed(2),
          unitLabel: line.product.unitLabel,
        })
      }
      continue
    }

    items.push({
      productId: line.product.id,
      productName: line.product.name,
      productImage: line.product.imageUrl,
      units: line.units,
      mode: 'create',
      amountYuan: line.amountYuan,
      unitLabel: line.product.unitLabel,
    })
  }

  return items
}

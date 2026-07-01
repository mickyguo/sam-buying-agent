import { normalizeImageUrl } from '@/lib/utils'

export interface SamsImportPreview {
  externalId: string
  name: string
  imageUrl: string
  priceCents: number
  description?: string
  sourceUrl: string
}

const ID_PARAM_NAMES = [
  'itemId',
  'goodsId',
  'itemNo',
  'productId',
  'skuId',
  'spuId',
  'id',
]

const MINI_PROGRAM_SCHEME = /(?:#\s*)?小程序:\/\//

export function parseExternalIdFromInput(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  if (/^\d{5,}$/.test(trimmed)) {
    return trimmed
  }

  const miniProgramMatch = trimmed.match(
    /(?:#\s*)?小程序:\/\/[^/\s#]+[/]([A-Za-z0-9_-]+)/,
  )
  if (miniProgramMatch?.[1] && miniProgramMatch[1].length >= 6) {
    return miniProgramMatch[1]
  }

  const pathMatch = trimmed.match(
    /(?:product|goods|item|detail)[/_-](\d{5,})/i,
  )
  if (pathMatch?.[1]) {
    return pathMatch[1]
  }

  try {
    const url = new URL(trimmed)
    for (const key of ID_PARAM_NAMES) {
      const value = url.searchParams.get(key)
      if (value && /^\d+$/.test(value)) {
        return value
      }
    }

    const segments = url.pathname.split('/').filter(Boolean)
    const lastSegment = segments[segments.length - 1]
    if (lastSegment && /^\d{5,}$/.test(lastSegment)) {
      return lastSegment
    }
    if (lastSegment && /^[A-Za-z0-9_-]{6,}$/.test(lastSegment)) {
      return lastSegment
    }
  } catch {
    // not a valid URL, try regex below
  }

  for (const key of ID_PARAM_NAMES) {
    const regex = new RegExp(`${key}[=:]\\s*(\\d{5,})`, 'i')
    const match = trimmed.match(regex)
    if (match?.[1]) {
      return match[1]
    }
  }

  if (/山姆|SamsClub|samsclub/i.test(trimmed)) {
    const tokenMatch = trimmed.match(/[/]([A-Za-z0-9_-]{6,})(?:[?\s#]|$)/)
    if (tokenMatch?.[1]) {
      return tokenMatch[1]
    }
  }

  const genericMatch = trimmed.match(/(\d{8,})/)
  return genericMatch?.[1] ?? null
}

function normalizeSourceUrl(input: string, externalId: string): string {
  const trimmed = input.trim()
  if (MINI_PROGRAM_SCHEME.test(trimmed)) {
    return trimmed
  }
  try {
    return new URL(trimmed).toString()
  } catch {
    return `sams://product/${externalId}`
  }
}

function isDevImportMode(): boolean {
  return (
    process.env.SAMS_IMPORT_DEV_MODE === 'true' ||
    process.env.NODE_ENV === 'development'
  )
}

function parsePriceToCents(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value >= 1000 ? Math.round(value) : Math.round(value * 100)
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.]/g, '')
    const yuan = Number(cleaned)
    if (Number.isFinite(yuan) && yuan > 0) {
      return Math.round(yuan * 100)
    }
  }
  return null
}

function extractFromJson(data: Record<string, unknown>): Partial<SamsImportPreview> {
  const name =
    (data.title as string) ??
    (data.name as string) ??
    (data.goodsName as string) ??
    (data.productName as string)

  const imageUrl =
    (data.imageUrl as string) ??
    (data.image as string) ??
    (data.mainImage as string) ??
    (data.picUrl as string) ??
    (Array.isArray(data.images) ? (data.images[0] as string) : undefined)

  const priceCents =
    parsePriceToCents(data.price) ??
    parsePriceToCents(data.salePrice) ??
    parsePriceToCents(data.currentPrice) ??
    parsePriceToCents(data.minPrice)

  const description =
    (data.description as string) ??
    (data.subTitle as string) ??
    (data.brief as string)

  return {
    name: name?.trim(),
    imageUrl: imageUrl ? normalizeImageUrl(imageUrl.trim()) : undefined,
    priceCents: priceCents ?? undefined,
    description: description?.trim(),
  }
}

function parseHtmlMeta(html: string): Partial<SamsImportPreview> {
  const getMeta = (property: string) => {
    const regex = new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
      'i',
    )
    const match = html.match(regex)
    return match?.[1]?.trim()
  }

  const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
  const jsonLdMatch = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i,
  )

  let jsonData: Partial<SamsImportPreview> = {}
  if (jsonLdMatch?.[1]) {
    try {
      const parsed = JSON.parse(jsonLdMatch[1]) as Record<string, unknown>
      jsonData = extractFromJson(parsed)
    } catch {
      // ignore invalid json-ld
    }
  }

  const ogTitle = getMeta('og:title')
  const ogImage = getMeta('og:image')
  const ogDescription = getMeta('og:description')

  return {
    name: jsonData.name ?? ogTitle ?? titleMatch?.[1]?.trim(),
    imageUrl: jsonData.imageUrl ?? ogImage,
    description: jsonData.description ?? ogDescription,
    priceCents: jsonData.priceCents,
  }
}

async function fetchFromConfiguredApi(
  externalId: string,
): Promise<Partial<SamsImportPreview> | null> {
  const template = process.env.SAMS_PRODUCT_API_URL
  if (!template) {
    return null
  }

  const url = template.replace('{id}', externalId)
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'sam-buying-agent/1.0',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as Record<string, unknown>
  const payload =
    (data.data as Record<string, unknown> | undefined) ??
    (data.result as Record<string, unknown> | undefined) ??
    data

  return extractFromJson(payload)
}

async function fetchFromPageUrl(
  pageUrl: string,
): Promise<Partial<SamsImportPreview> | null> {
  try {
    const response = await fetch(pageUrl, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      return null
    }

    const html = await response.text()
    return parseHtmlMeta(html)
  } catch {
    return null
  }
}

function buildDevPreview(
  externalId: string,
  sourceUrl: string,
): SamsImportPreview {
  return {
    externalId,
    sourceUrl,
    name: `山姆商品 ${externalId}`,
    imageUrl:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
    priceCents: 5990,
    description: '开发模式预览数据，请确认价格与图片后入库。价格以山姆门店为准。',
  }
}

export async function importSamsProductFromUrl(
  input: string,
): Promise<SamsImportPreview> {
  const externalId = parseExternalIdFromInput(input)
  if (!externalId) {
    throw new Error(
      '无法从链接中解析商品 ID，请粘贴山姆 App/小程序分享链接，或改用手动录入',
    )
  }

  const sourceUrl = normalizeSourceUrl(input, externalId)
  let partial: Partial<SamsImportPreview> | null = null

  partial = await fetchFromConfiguredApi(externalId)

  if (!partial?.name && input.startsWith('http')) {
    partial = {
      ...partial,
      ...(await fetchFromPageUrl(input)),
    }
  }

  if (!partial?.name && isDevImportMode()) {
    return buildDevPreview(externalId, sourceUrl)
  }

  if (!partial?.name || !partial.imageUrl || !partial.priceCents) {
    if (isDevImportMode()) {
      return buildDevPreview(externalId, sourceUrl)
    }
    throw new Error(
      '未能自动抓取完整商品信息。请配置 SAMS_PRODUCT_API_URL，或在开发模式下使用预览数据后手动补全。',
    )
  }

  return {
    externalId,
    sourceUrl,
    name: partial.name,
    imageUrl: partial.imageUrl,
    priceCents: partial.priceCents,
    description:
      partial.description ??
      '价格以山姆门店为准，入库前请核对是否可拆分及份数。',
  }
}

export async function syncSamsProductByExternalId(
  externalId: string,
  sourceUrl?: string | null,
): Promise<Pick<SamsImportPreview, 'name' | 'imageUrl' | 'priceCents' | 'description'>> {
  const preview = await importSamsProductFromUrl(
    sourceUrl ?? externalId,
  )

  if (preview.externalId !== externalId) {
    throw new Error('商品 ID 不匹配')
  }

  return {
    name: preview.name,
    imageUrl: preview.imageUrl,
    priceCents: preview.priceCents,
    description: preview.description,
  }
}

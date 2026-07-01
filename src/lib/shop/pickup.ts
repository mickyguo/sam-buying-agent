import { shopFetch } from '@/lib/shop/api'

interface ShopConfig {
  pickupLocation: string
  pickupNotice: string
  pickupLocations?: Array<{
    id: string
    name: string
    address: string
    communityTags: string[]
  }>
}

let cachedConfig: ShopConfig | null = null

export async function getShopConfig(): Promise<ShopConfig> {
  if (cachedConfig) {
    return cachedConfig
  }

  cachedConfig = await shopFetch<ShopConfig>('/api/shop/config', {
    auth: false,
  })
  return cachedConfig
}

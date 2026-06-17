export interface ShopUser {
  id: string
  nickname: string | null
  avatarUrl: string | null
  phone: string | null
}

export interface ShopProduct {
  id: string
  name: string
  imageUrl: string
  price: number
  priceYuan: string
  splittable: boolean
  totalUnits: number | null
  unitLabel: string | null
  description: string | null
  status: string
  unitPrice: number
}

export interface ShopGroupOrder {
  id: string
  productId: string
  productName: string
  productImage: string
  unitLabel: string
  totalUnits: number
  filledUnits: number
  reservedUnits: number
  committedUnits: number
  remainingUnits: number
  status: string
  expiresAt: string
  createdAt: string
  participations: Array<{
    id: string
    units: number
    amount: number
    user: {
      id: string
      nickname: string | null
      avatarUrl: string | null
    }
  }>
}

export interface ShopOrder {
  id: string
  orderNo: string
  type: string
  units: number
  amount: number
  amountYuan: string
  status: string
  groupOrderId: string | null
  checkoutBatchId: string | null
  createdAt: string
  paidAt: string | null
  product: {
    id: string
    name: string
    imageUrl: string
    unitLabel: string | null
    splittable: boolean
    status: string
  }
}

export type CheckoutMode = 'direct' | 'create' | 'join'

export interface CartItem {
  id: string
  productId: string
  productName: string
  productImage: string
  units: number
  mode: CheckoutMode
  groupOrderId?: string
  amountYuan: string
  unitLabel?: string | null
}

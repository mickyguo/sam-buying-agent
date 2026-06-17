import type { CartItem } from '@/lib/shop/types'

const CART_KEY = 'sam_shop_cart'
export const CART_UPDATED_EVENT = 'sam-cart-updated'

export function getCartItems(): CartItem[] {
  if (typeof window === 'undefined') {
    return []
  }
  const raw = localStorage.getItem(CART_KEY)
  if (!raw) {
    return []
  }
  try {
    return JSON.parse(raw) as CartItem[]
  } catch {
    return []
  }
}

function setCartItems(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items))
}

export function notifyCartUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CART_UPDATED_EVENT))
  }
}

export function addCartItem(item: Omit<CartItem, 'id'>) {
  const items = getCartItems()
  items.push({ ...item, id: crypto.randomUUID() })
  setCartItems(items)
  notifyCartUpdated()
  return items.length
}

export function removeCartItem(id: string) {
  setCartItems(getCartItems().filter((entry) => entry.id !== id))
  notifyCartUpdated()
}

export function removeCartItems(ids: string[]) {
  const idSet = new Set(ids)
  setCartItems(getCartItems().filter((entry) => !idSet.has(entry.id)))
  notifyCartUpdated()
}

export function clearCart() {
  localStorage.removeItem(CART_KEY)
  notifyCartUpdated()
}

export function getCartCount() {
  return getCartItems().length
}

export function getCartTotalYuan() {
  const total = getCartItems().reduce(
    (sum, item) => sum + Number.parseFloat(item.amountYuan),
    0,
  )
  return total.toFixed(2)
}

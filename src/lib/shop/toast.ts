type ShopToastType = 'error' | 'success' | 'info'

let container: HTMLDivElement | null = null

function getContainer() {
  if (typeof document === 'undefined') {
    return null
  }

  if (!container) {
    container = document.createElement('div')
    container.className =
      'fixed inset-0 z-[9999] flex items-center justify-center px-8 pointer-events-none'
    container.setAttribute('aria-live', 'polite')
    document.body.appendChild(container)
  }

  return container
}

export function shopToast(message: string, _type: ShopToastType = 'info') {
  const root = getContainer()
  if (!root || !message.trim()) {
    return
  }

  const el = document.createElement('div')
  el.className =
    'pointer-events-auto max-w-xs rounded-2xl bg-black/75 px-5 py-3 text-center text-sm leading-relaxed text-white shadow-lg backdrop-blur-sm transition-opacity duration-200'
  el.textContent = message.trim()
  root.appendChild(el)

  window.setTimeout(() => {
    el.style.opacity = '0'
    window.setTimeout(() => el.remove(), 200)
  }, 2800)
}

export function shopToastSuccess(message: string) {
  shopToast(message, 'success')
}

export function shopToastError(err: unknown, fallback = '请求失败') {
  if (err instanceof Error && err.message === '请先登录') {
    return
  }

  shopToast(err instanceof Error ? err.message : fallback, 'error')
}

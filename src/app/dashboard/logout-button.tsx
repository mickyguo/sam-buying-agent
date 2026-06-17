'use client'

import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth-client'

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-md border border-neutral-300 px-4 py-2 font-medium hover:bg-neutral-100"
    >
      退出登录
    </button>
  )
}

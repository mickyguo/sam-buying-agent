import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { LogoutButton } from './logout-button'

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  const user = session!.user

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">控制台</h1>
        <p className="mt-2 text-neutral-600">欢迎回来，{user.name || '用户'}</p>
        <p className="text-sm text-neutral-500">{user.email}</p>
      </div>
      <LogoutButton />
    </main>
  )
}

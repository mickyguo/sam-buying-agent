import { NextRequest } from 'next/server'

export function verifyAdminPassword(request: NextRequest): boolean {
  const adminPassword = request.headers.get('x-admin-password')
  return Boolean(
    process.env.ADMIN_PASSWORD &&
      adminPassword === process.env.ADMIN_PASSWORD,
  )
}

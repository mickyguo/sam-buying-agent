import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret'

export interface JwtPayload {
  userId: string
  openid: string
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' })
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload
}

export function getBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) {
    return null
  }
  return auth.slice(7)
}

export async function getAuthUser(request: NextRequest) {
  const token = getBearerToken(request)
  if (!token) {
    return null
  }

  try {
    const payload = verifyToken(token)
    return prisma.user.findUnique({ where: { id: payload.userId } })
  } catch {
    return null
  }
}

export async function requireAuthUser(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  return user
}

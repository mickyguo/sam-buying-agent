import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { schema } from '@/db/schema'
import { db } from '@/lib/db'

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      openid: {
        type: 'string',
        required: false,
      },
      nickname: {
        type: 'string',
        required: false,
      },
      avatarUrl: {
        type: 'string',
        required: false,
      },
      phone: {
        type: 'string',
        required: false,
      },
    },
  },
  plugins: [nextCookies()],
})

export type Session = typeof auth.$Infer.Session

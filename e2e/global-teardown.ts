import { cleanupE2eProducts } from './helpers/seed'

export default async function globalTeardown() {
  if (!process.env.DATABASE_URL) {
    return
  }

  await cleanupE2eProducts()
  console.info('[e2e] cleaned up seeded products and related orders')
}

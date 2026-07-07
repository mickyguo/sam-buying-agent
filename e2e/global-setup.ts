import { seedE2eProducts } from './helpers/seed'

export default async function globalSetup() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'E2E tests require DATABASE_URL in .env. Run pnpm db:push before test:e2e.',
    )
  }

  const state = await seedE2eProducts()
  console.info(
    `[e2e] seeded products: direct=${state.directProductId}, splittable=${state.splittableProductId}`,
  )
}

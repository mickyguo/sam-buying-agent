import { asc, eq } from 'drizzle-orm'
import { product, scenePackage, scenePackageItem } from '@/db/schema'
import { ProductStatus } from '@/db/enums'
import { db } from '@/lib/db'
import { normalizeImageUrl } from '@/lib/utils'

export async function listScenePackages() {
  const packages = await db.query.scenePackage.findMany({
    where: eq(scenePackage.active, true),
    with: {
      items: { with: { product: true } },
    },
    orderBy: asc(scenePackage.sortOrder),
  })

  return packages.map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    coverImage: pkg.coverImage ? normalizeImageUrl(pkg.coverImage) : pkg.coverImage,
    promptHint: pkg.promptHint,
    items: pkg.items
      .filter((item) => item.product.status === ProductStatus.ACTIVE)
      .map((item) => ({
        productId: item.productId,
        productName: item.product.name,
        productImage: normalizeImageUrl(item.product.imageUrl),
        units: item.units,
        splittable: item.product.splittable,
        priceYuan: (item.product.price / 100).toFixed(2),
      })),
  }))
}

export async function resolveScenePackageCartItems(scenePackageId: string) {
  const pkg = await db.query.scenePackage.findFirst({
    where: eq(scenePackage.id, scenePackageId),
    with: { items: { with: { product: true } } },
  })

  if (!pkg || !pkg.active) {
    throw new Error('场景套餐不存在')
  }

  return pkg.items
    .filter((item) => item.product.status === ProductStatus.ACTIVE)
    .map((item) => ({
      productId: item.productId,
      productName: item.product.name,
      productImage: normalizeImageUrl(item.product.imageUrl),
      units: item.units,
      mode: item.product.splittable ? ('create' as const) : ('direct' as const),
      unitLabel: item.product.unitLabel,
    }))
}

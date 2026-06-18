import { and, count, eq, inArray, notInArray, or } from 'drizzle-orm'
import { product } from '@/db/schema'
import { ProductStatus } from '@/db/enums'
import { db } from '@/lib/db'

/** 山姆会员店常见热销品（参考门店价，入库后可在后台同步调整） */
const products = [
  {
    externalId: 'sams-swiss-roll',
    name: "Member's Mark 瑞士卷",
    imageUrl:
      'https://images.unsplash.com/photo-1614707267537-b85daf0538a0?w=800',
    price: 5990,
    splittable: true,
    totalUnits: 10,
    unitLabel: '块',
    description: '山姆人气烘焙，1.2kg/盒约10块，支持按块拼单代购。',
    status: ProductStatus.ACTIVE,
  },
  {
    externalId: 'sams-rotisserie-chicken',
    name: "Member's Mark 美式烤鸡",
    imageUrl:
      'https://images.unsplash.com/photo-1598103442097-8b74350b4a85?w=800',
    price: 3980,
    splittable: false,
    description: '现烤整鸡约1.5kg，门店爆款，仅支持整件代购。',
    status: ProductStatus.ACTIVE,
  },
  {
    externalId: 'sams-mochi-bread',
    name: "Member's Mark 麻薯面包",
    imageUrl:
      'https://images.unsplash.com/photo-1509440155596-9c308373bb09?w=800',
    price: 2980,
    splittable: true,
    totalUnits: 24,
    unitLabel: '个',
    description: '24枚装麻薯面包，外脆内Q，支持按个拼单。',
    status: ProductStatus.ACTIVE,
  },
  {
    externalId: 'sams-beef-roll',
    name: "Member's Mark 牛肉卷",
    imageUrl:
      'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800',
    price: 6580,
    splittable: false,
    description: '冷冻牛肉卷组合装，仅支持整件代购。',
    status: ProductStatus.ACTIVE,
  },
  {
    externalId: 'sams-lime-juice',
    name: "Member's Mark 青柠汁",
    imageUrl:
      'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=800',
    price: 3280,
    splittable: false,
    description: '1.25L×2瓶，酸甜清爽，仅支持整件代购。',
    status: ProductStatus.ACTIVE,
  },
  {
    externalId: 'sams-durian-crepe',
    name: "Member's Mark 榴莲千层",
    imageUrl:
      'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800',
    price: 8880,
    splittable: true,
    totalUnits: 8,
    unitLabel: '块',
    description: '榴莲千层蛋糕，约8人份切块，支持按块拼单。',
    status: ProductStatus.ACTIVE,
  },
  {
    externalId: 'sams-tiramisu',
    name: "Member's Mark 提拉米苏",
    imageUrl:
      'https://images.unsplash.com/photo-1571877227200-a0d92ea4c2a7?w=800',
    price: 7980,
    splittable: true,
    totalUnits: 10,
    unitLabel: '块',
    description: '意式提拉米苏大盒装，约10块，支持按块拼单。',
    status: ProductStatus.ACTIVE,
  },
  {
    externalId: 'sams-soda-crackers',
    name: "Member's Mark 海盐苏打饼干",
    imageUrl:
      'https://images.unsplash.com/photo-1558961363-fa8a64d0e701?w=800',
    price: 3990,
    splittable: false,
    description: '1.5kg大包装苏打饼干，仅支持整件代购。',
    status: ProductStatus.ACTIVE,
  },
  {
    externalId: 'sams-greek-yogurt',
    name: "Member's Mark 希腊酸奶",
    imageUrl:
      'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800',
    price: 6980,
    splittable: false,
    description: '1kg×2桶装希腊酸奶，高蛋白，仅支持整件代购。',
    status: ProductStatus.ACTIVE,
  },
  {
    externalId: 'sams-fresh-milk',
    name: "Member's Mark 鲜牛乳",
    imageUrl:
      'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800',
    price: 5990,
    splittable: false,
    description: '2L×2全脂鲜牛乳，冷藏配送，仅支持整件代购。',
    status: ProductStatus.ACTIVE,
  },
]

async function main() {
  const externalIds = products.map((item) => item.externalId)

  await db
    .update(product)
    .set({ status: ProductStatus.INACTIVE })
    .where(
      and(
        notInArray(product.externalId, externalIds),
        eq(product.status, ProductStatus.ACTIVE),
      ),
    )

  for (const item of products) {
    const existing = await db.query.product.findFirst({
      where: or(
        eq(product.externalId, item.externalId),
        eq(product.name, item.name),
      ),
    })

    if (existing) {
      await db
        .update(product)
        .set({
          ...item,
          lastSyncedAt: new Date(),
        })
        .where(eq(product.id, existing.id))
      continue
    }

    await db.insert(product).values({
      ...item,
      lastSyncedAt: new Date(),
    })
  }

  const [countRow] = await db
    .select({ count: count() })
    .from(product)
    .where(
      and(
        eq(product.status, ProductStatus.ACTIVE),
        inArray(product.externalId, externalIds),
      ),
    )

  console.info(
    `[seed] 已初始化 ${countRow.count} 个山姆热销商品（共 ${products.length} 条种子数据）`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

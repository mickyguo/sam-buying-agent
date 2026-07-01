import { NextRequest } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { scenePackage, scenePackageItem } from '@/db/schema'
import { db } from '@/lib/db'
import { handleApiError, jsonError, jsonOk } from '@/lib/api-response'

function checkAdmin(request: NextRequest) {
  return request.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

export async function GET(request: NextRequest) {
  try {
    if (!checkAdmin(request)) {
      return jsonError('管理员密码错误', 403)
    }
    const packages = await db.query.scenePackage.findMany({
      with: { items: { with: { product: true } } },
      orderBy: asc(scenePackage.sortOrder),
    })
    return jsonOk(packages)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!checkAdmin(request)) {
      return jsonError('管理员密码错误', 403)
    }
    const body = (await request.json()) as {
      name?: string
      description?: string
      coverImage?: string
      promptHint?: string
      sortOrder?: number
      items?: Array<{ productId: string; units: number }>
    }

    if (!body.name) {
      return jsonError('缺少套餐名称')
    }

    const [pkg] = await db
      .insert(scenePackage)
      .values({
        name: body.name,
        description: body.description,
        coverImage: body.coverImage,
        promptHint: body.promptHint,
        sortOrder: body.sortOrder ?? 0,
      })
      .returning()

    if (body.items?.length) {
      await db.insert(scenePackageItem).values(
        body.items.map((item) => ({
          scenePackageId: pkg.id,
          productId: item.productId,
          units: item.units,
        })),
      )
    }

    return jsonOk(pkg, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!checkAdmin(request)) {
      return jsonError('管理员密码错误', 403)
    }
    const body = (await request.json()) as {
      id?: string
      active?: boolean
      name?: string
      description?: string
      promptHint?: string
    }
    if (!body.id) {
      return jsonError('缺少 id')
    }
    await db
      .update(scenePackage)
      .set({
        active: body.active,
        name: body.name,
        description: body.description,
        promptHint: body.promptHint,
      })
      .where(eq(scenePackage.id, body.id))
    return jsonOk({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}

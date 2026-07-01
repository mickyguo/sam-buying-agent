import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { pickupLocation, pickupSlot } from '@/db/schema'
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
    const locations = await db.query.pickupLocation.findMany({
      with: { slots: true },
    })
    return jsonOk(locations)
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
      action?: 'location' | 'slot'
      name?: string
      address?: string
      communityTags?: string[]
      pickupLocationId?: string
      slotDate?: string
      startTime?: string
      endTime?: string
      capacity?: number
    }

    if (body.action === 'location') {
      if (!body.name || !body.address) {
        return jsonError('缺少自提点信息')
      }
      const [loc] = await db
        .insert(pickupLocation)
        .values({
          name: body.name,
          address: body.address,
          communityTags: body.communityTags ?? [],
        })
        .returning()
      return jsonOk(loc, { status: 201 })
    }

    if (!body.pickupLocationId || !body.slotDate || !body.startTime || !body.endTime) {
      return jsonError('缺少时段信息')
    }

    const [slot] = await db
      .insert(pickupSlot)
      .values({
        pickupLocationId: body.pickupLocationId,
        slotDate: body.slotDate,
        startTime: body.startTime,
        endTime: body.endTime,
        capacity: body.capacity ?? 20,
      })
      .returning()

    return jsonOk(slot, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!checkAdmin(request)) {
      return jsonError('管理员密码错误', 403)
    }
    const body = (await request.json()) as { locationId?: string; active?: boolean }
    if (!body.locationId) {
      return jsonError('缺少 locationId')
    }
    await db
      .update(pickupLocation)
      .set({ active: body.active })
      .where(eq(pickupLocation.id, body.locationId))
    return jsonOk({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}

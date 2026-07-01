import { jsonOk } from '@/lib/api-response'
import { getPickupLocation, getPickupNotice } from '@/lib/pickup'
import { db } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { pickupLocation } from '@/db/schema'

export async function GET() {
  const locations = await db.query.pickupLocation.findMany({
    where: eq(pickupLocation.active, true),
  })

  return jsonOk({
    pickupLocation: getPickupLocation(),
    pickupNotice: getPickupNotice(),
    pickupLocations: locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      address: loc.address,
      communityTags: loc.communityTags,
      latitude: loc.latitude,
      longitude: loc.longitude,
    })),
  })
}

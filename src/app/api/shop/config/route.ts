import { jsonOk } from '@/lib/api-response'
import { getPickupLocation, getPickupNotice } from '@/lib/pickup'

export async function GET() {
  return jsonOk({
    pickupLocation: getPickupLocation(),
    pickupNotice: getPickupNotice(),
  })
}

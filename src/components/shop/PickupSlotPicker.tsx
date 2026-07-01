'use client'

import { useEffect, useState } from 'react'
import { shopFetch } from '@/lib/shop/api'

interface PickupSlot {
  id: string
  label: string
  remaining: number
  locationName: string
}

interface PickupSlotPickerProps {
  value: string
  locationId?: string
  onChange: (slotId: string) => void
}

export default function PickupSlotPicker({
  value,
  locationId,
  onChange,
}: PickupSlotPickerProps) {
  const [slots, setSlots] = useState<PickupSlot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const query = locationId ? `?locationId=${locationId}` : ''
    shopFetch<PickupSlot[]>(`/api/pickup-slots${query}`, { auth: false })
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoading(false))
  }, [locationId])

  if (loading) {
    return <p className="text-sm text-slate-400">加载取货时段...</p>
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        暂无可预约时段，到货后将通知您取货
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">选择取货时段</p>
      <div className="flex flex-wrap gap-2">
        {slots.map((slot) => (
          <button
            key={slot.id}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              value === slot.id
                ? 'border-[#004b87] bg-[#004b87] text-white'
                : 'border-slate-200 text-slate-600'
            }`}
            type="button"
            onClick={() => onChange(slot.id)}
          >
            {slot.label}（余{slot.remaining}）
          </button>
        ))}
      </div>
    </div>
  )
}

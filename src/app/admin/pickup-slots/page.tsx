'use client'

import { FormEvent, useState } from 'react'

export default function AdminPickupSlotsPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [locations, setLocations] = useState<
    Array<{
      id: string
      name: string
      address: string
      slots: Array<{ id: string; slotDate: string; startTime: string; endTime: string; bookedCount: number; capacity: number }>
    }>
  >([])
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [slotDate, setSlotDate] = useState('')
  const [startTime, setStartTime] = useState('18:00')
  const [endTime, setEndTime] = useState('18:30')
  const [locationId, setLocationId] = useState('')

  const headers = {
    'Content-Type': 'application/json',
    'x-admin-password': password,
  }

  async function load() {
    const res = await fetch('/api/admin/pickup-slots', { headers })
    const result = await res.json()
    if (result.success) {
      setLocations(result.data)
      setAuthenticated(true)
      if (!locationId && result.data[0]) {
        setLocationId(result.data[0].id)
      }
    }
  }

  async function addLocation(e: FormEvent) {
    e.preventDefault()
    await fetch('/api/admin/pickup-slots', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'location', name, address }),
    })
    setName('')
    setAddress('')
    await load()
  }

  async function addSlot(e: FormEvent) {
    e.preventDefault()
    await fetch('/api/admin/pickup-slots', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        pickupLocationId: locationId,
        slotDate,
        startTime,
        endTime,
      }),
    })
    await load()
  }

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-4 text-2xl font-semibold">自提时段</h1>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); load() }}>
          <input
            className="flex-1 rounded border px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="rounded bg-zinc-900 px-4 py-2 text-white" type="submit">
            登录
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">自提网点与时段</h1>
      <form className="mb-6 flex flex-wrap gap-2" onSubmit={addLocation}>
        <input className="rounded border px-3 py-2" placeholder="网点名称" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="min-w-48 flex-1 rounded border px-3 py-2" placeholder="地址" value={address} onChange={(e) => setAddress(e.target.value)} />
        <button className="rounded bg-zinc-900 px-4 py-2 text-white" type="submit">新增网点</button>
      </form>
      <form className="mb-8 flex flex-wrap gap-2" onSubmit={addSlot}>
        <select className="rounded border px-3 py-2" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <input className="rounded border px-3 py-2" type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} />
        <input className="w-24 rounded border px-3 py-2" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        <input className="w-24 rounded border px-3 py-2" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        <button className="rounded bg-zinc-900 px-4 py-2 text-white" type="submit">新增时段</button>
      </form>
      {locations.map((loc) => (
        <div key={loc.id} className="mb-6 rounded border p-4">
          <h2 className="font-medium">{loc.name}</h2>
          <p className="text-sm text-slate-500">{loc.address}</p>
          <ul className="mt-2 text-sm">
            {loc.slots.map((s) => (
              <li key={s.id}>
                {s.slotDate} {s.startTime}-{s.endTime}（{s.bookedCount}/{s.capacity}）
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

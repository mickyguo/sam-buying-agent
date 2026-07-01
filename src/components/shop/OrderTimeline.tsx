'use client'

interface TimelineEvent {
  id: string
  type: string
  label: string
  note: string | null
  imageUrl: string | null
  createdAt: string
}

interface OrderTimelineProps {
  events: TimelineEvent[]
}

export default function OrderTimeline({ events }: OrderTimelineProps) {
  if (events.length === 0) {
    return null
  }

  return (
    <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="font-semibold">订单进度</h3>
      <ol className="mt-4 space-y-4">
        {events.map((event, index) => (
          <li key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`h-3 w-3 rounded-full ${
                  index === events.length - 1 ? 'bg-[#004b87]' : 'bg-slate-300'
                }`}
              />
              {index < events.length - 1 ? (
                <div className="min-h-8 w-0.5 flex-1 bg-slate-200" />
              ) : null}
            </div>
            <div className="flex-1 pb-2">
              <p className="font-medium text-slate-800">{event.label}</p>
              {event.note ? (
                <p className="mt-0.5 text-sm text-slate-500">{event.note}</p>
              ) : null}
              {event.imageUrl ? (
                <img
                  className="mt-2 max-h-32 rounded-lg object-cover"
                  src={event.imageUrl}
                  alt="凭证"
                />
              ) : null}
              <p className="mt-1 text-xs text-slate-400">
                {new Date(event.createdAt).toLocaleString('zh-CN')}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

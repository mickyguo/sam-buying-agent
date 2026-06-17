'use client'

import { useRef, useState } from 'react'

const DELETE_WIDTH = 72
const OPEN_THRESHOLD = 36

interface SwipeableCartItemProps {
  children: React.ReactNode
  onDelete: () => void
}

export default function SwipeableCartItem({
  children,
  onDelete,
}: SwipeableCartItemProps) {
  const [offsetX, setOffsetX] = useState(0)
  const startX = useRef(0)
  const startOffset = useRef(0)
  const dragging = useRef(false)
  const [isDragging, setIsDragging] = useState(false)

  function clampOffset(value: number) {
    return Math.max(0, Math.min(DELETE_WIDTH, value))
  }

  function handleTouchStart(event: React.TouchEvent) {
    dragging.current = true
    setIsDragging(true)
    startX.current = event.touches[0].clientX
    startOffset.current = offsetX
  }

  function handleTouchMove(event: React.TouchEvent) {
    if (!dragging.current) {
      return
    }
    const delta = startX.current - event.touches[0].clientX
    setOffsetX(clampOffset(startOffset.current + delta))
  }

  function handleTouchEnd() {
    dragging.current = false
    setIsDragging(false)
    setOffsetX((current) =>
      current >= OPEN_THRESHOLD ? DELETE_WIDTH : 0,
    )
  }

  function handleDelete() {
    setOffsetX(0)
    onDelete()
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div
        className="absolute inset-y-0 right-0 flex w-[72px] items-center justify-center bg-[#E31837]"
        aria-hidden
      >
        <button
          className="h-full w-full text-sm font-medium text-white"
          type="button"
          onClick={handleDelete}
        >
          删除
        </button>
      </div>
      <div
        className="relative touch-pan-y bg-white shadow-sm transition-transform duration-200 ease-out"
        style={{
          transform: `translateX(-${offsetX}px)`,
          transitionDuration: isDragging ? '0ms' : undefined,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}

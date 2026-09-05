import { useCallback, useEffect, useRef, useState } from 'react'
import { loadRoom, type Room } from '@/data/queries'
import { subscribeRoom } from '@/data/room'

export function useRoom(sessionId: string) {
  const [room, setRoom] = useState<Room | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inflight = useRef<Promise<void> | null>(null)

  const reload = useCallback(() => {
    if (inflight.current) return inflight.current
    inflight.current = loadRoom(sessionId)
      .then((r) => {
        setRoom(r)
        setError(null)
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => {
        inflight.current = null
      })
    return inflight.current
  }, [sessionId])

  useEffect(() => {
    reload()
    return subscribeRoom(sessionId, () => void reload())
  }, [sessionId, reload])

  return { room, error, reload }
}

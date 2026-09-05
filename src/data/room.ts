import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'

// Realtime is a poke: every change triggers a full reload of the room. No payload is applied.
export function subscribeRoom(sessionId: string, onPoke: () => void): () => void {
  let channel: RealtimeChannel | null = null
  let stopped = false

  const open = () => {
    channel = supabase.channel(`room:${sessionId}`)
    for (const table of ['issues', 'participants', 'votes'] as const) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `session_id=eq.${sessionId}` }, onPoke)
    }
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` }, onPoke)
    channel.subscribe((status) => {
      if (stopped) return
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        supabase.removeChannel(channel!)
        setTimeout(() => {
          if (!stopped) {
            open()
            onPoke()
          }
        }, 1500)
      }
    })
  }
  open()

  return () => {
    stopped = true
    if (channel) supabase.removeChannel(channel)
  }
}

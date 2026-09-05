import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/data/supabase'

export type AuthState = { loading: boolean; user: User | null }

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ loading: true, user: null })
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState({ loading: false, user: data.session?.user ?? null }))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setState({ loading: false, user: session?.user ?? null }),
    )
    return () => sub.subscription.unsubscribe()
  }, [])
  return state
}

export const isFacilitator = (user: User | null) => !!user && !user.is_anonymous

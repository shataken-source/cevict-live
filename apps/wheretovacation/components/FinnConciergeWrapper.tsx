'use client'

import { useAuth } from '@/lib/auth-context'
import FinnConcierge from './FinnConcierge'

export default function FinnConciergeWrapper() {
  const { user } = useAuth()
  return <FinnConcierge userId={user?.id} />
}

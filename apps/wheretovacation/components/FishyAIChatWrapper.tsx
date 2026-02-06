'use client'

import { useAuth } from '@/lib/auth-context'
import FishyAIChat from './FishyAIChat'

export default function FishyAIChatWrapper() {
  const { user } = useAuth()
  return <FishyAIChat userType={user ? 'customer' : 'guest'} />
}

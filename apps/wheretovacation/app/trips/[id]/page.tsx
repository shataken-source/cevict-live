import { redirect } from 'next/navigation'
import { getServerUser, getSupabaseAdminClient } from '@/lib/supabase'
import { TripStoryboard } from '@/components/TripStoryboard'

export const dynamic = 'force-dynamic'

export default async function TripPage({ params }: { params: { id: string } }) {
  const user = await getServerUser()
  if (!user) {
    redirect(`/auth/login?redirect=/trips/${params.id}`)
  }

  const admin = getSupabaseAdminClient()
  if (!admin) {
    redirect('/')
  }

  const { data, error } = await admin
    .from('itineraries')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    redirect('/')
  }

  const items = (data.items as any[]) || []

  // Simple, deterministic storyboard: group items by date or by index into Day 1/2/3...
  const byDate = new Map<string, any[]>()
  items.forEach((item, index) => {
    const key = item.date || `index-${Math.floor(index / 2)}`
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key)!.push(item)
  })

  const days = Array.from(byDate.entries()).map(([key, group], idx) => {
    const label = key.startsWith('index-') ? `Day ${idx + 1}` : `Day ${idx + 1}`
    const title =
      group[0]?.name ||
      (idx === 0 ? 'Arrival & Check-in' : idx === byDate.size - 1 ? 'Departure Day' : 'Vacation Day')

    const notesLines: string[] = []
    const rentals = group.filter((g) => g.type === 'rental').map((g) => g)

    if (rentals.length > 0) {
      notesLines.push(`Stay: ${rentals.map((r) => r.name).join(', ')}`)
    }

    const activities = group.filter((g) => g.type === 'activity')
    if (activities.length > 0) {
      notesLines.push(`Activities: ${activities.map((a) => a.name).join(', ')}`)
    }

    const boats = group.filter((g) => g.type === 'boat')
    if (boats.length > 0) {
      notesLines.push(`Charters: ${boats.map((b) => b.name).join(', ')}`)
    }

    return {
      id: key,
      label,
      title,
      subtitle: group.some((g) => g.date)
        ? new Date(group[0].date).toLocaleDateString()
        : undefined,
      notes: notesLines.join('\n'),
      rentals,
    }
  })

  const destinationName =
    (items.find((i) => i.destinationName)?.destinationName as string | undefined) || undefined

  return (
    <TripStoryboard
      name={data.name || 'My Trip'}
      destinationName={destinationName}
      startDate={data.start_date ?? null}
      endDate={data.end_date ?? null}
      days={days}
    />
  )
}


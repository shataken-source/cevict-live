import { notFound } from 'next/navigation'
import { getSupabaseAdminClient } from '@/lib/supabase'
import { TripStoryboard } from '@/components/TripStoryboard'

export const dynamic = 'force-dynamic'

export default async function SharedTripPage({ params }: { params: { shareId: string } }) {
  const admin = getSupabaseAdminClient()
  if (!admin) {
    notFound()
  }

  const { data, error } = await admin
    .from('itineraries')
    .select('*')
    .eq('share_id', params.shareId)
    .eq('is_public', true)
    .single()

  if (error || !data) {
    notFound()
  }

  const items = (data.items as any[]) || []

  const byDate = new Map<string, any[]>()
  items.forEach((item, index) => {
    const key = item.date || `index-${Math.floor(index / 2)}`
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key)!.push(item)
  })

  const days = Array.from(byDate.entries()).map(([key, group], idx) => ({
    id: key,
    label: `Day ${idx + 1}`,
    title:
      group[0]?.name ||
      (idx === 0 ? 'Arrival & Check-in' : idx === byDate.size - 1 ? 'Departure Day' : 'Vacation Day'),
    subtitle: group.some((g) => g.date)
      ? new Date(group[0].date).toLocaleDateString()
      : undefined,
    notes: group
      .map((g: any) => g.name)
      .filter(Boolean)
      .join(', '),
    rentals: group.filter((g) => g.type === 'rental'),
  }))

  const destinationName =
    (items.find((i) => i.destinationName)?.destinationName as string | undefined) || undefined

  return (
    <TripStoryboard
      name={data.name || 'Shared Trip'}
      destinationName={destinationName}
      startDate={data.start_date ?? null}
      endDate={data.end_date ?? null}
      days={days}
    />
  )
}


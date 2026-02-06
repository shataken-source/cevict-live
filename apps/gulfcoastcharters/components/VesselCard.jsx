import Link from 'next/link'

function vesselEmoji(type) {
  const t = String(type || '').toLowerCase()
  if (t.includes('jet') || t.includes('sea_doo') || t.includes('waverunner')) return '🚤'
  if (t.includes('pontoon')) return '⛵'
  if (t.includes('wake') || t.includes('surf') || t.includes('ski')) return '🏄'
  if (t.includes('yacht')) return '🛥️'
  if (t.includes('kayak') || t.includes('canoe')) return '🛶'
  if (t.includes('paddle')) return '🏄‍♂️'
  if (t.includes('fish') || t.includes('console') || t.includes('bay') || t.includes('inshore') || t.includes('offshore'))
    return '🎣'
  return '⚓'
}

export default function VesselCard({ vessel }) {
  const photos = Array.isArray(vessel.photos) ? vessel.photos : vessel.image ? [vessel.image] : []
  const badge = vessel.category ? String(vessel.category).replace(/_/g, ' ') : null

  return (
    <Link href={`/vessels/${vessel.id}`}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      <div className="relative h-48 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
        {photos[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photos[0]} alt={vessel.name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-6xl">{vesselEmoji(vessel.type)}</div>
        )}

        {vessel.featured ? (
          <div className="absolute top-3 right-3 bg-yellow-300 text-yellow-900 px-3 py-1 rounded-full text-xs font-semibold">
            Featured
          </div>
        ) : null}

        {badge ? (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold text-gray-900">
            {badge.toUpperCase()}
          </div>
        ) : null}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900 truncate">{vessel.name}</h3>
            <p className="text-sm text-gray-600 truncate">
              {vessel.type}
              {vessel.capacity ? ` • up to ${vessel.capacity}` : ''}
            </p>
            {vessel.home_port ? <p className="text-sm text-gray-600 truncate">{vessel.home_port}</p> : null}
          </div>
          <div className="text-right shrink-0">
            {vessel.price ? (
              <p className="text-lg font-bold text-blue-700">${vessel.price}</p>
            ) : (
              <p className="text-sm text-gray-500">Contact</p>
            )}
            {vessel.rating ? (
              <p className="text-xs text-gray-600">
                {Number(vessel.rating).toFixed(1)} ★ {vessel.reviews ? `(${vessel.reviews})` : ''}
              </p>
            ) : null}
          </div>
        </div>

        {Array.isArray(vessel.specialties) && vessel.specialties.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {vessel.specialties.slice(0, 4).map((s) => (
              <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                {s}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between">
          <span className={`text-xs font-semibold ${vessel.available ? 'text-green-700' : 'text-gray-500'}`}>
            {vessel.available ? 'Available' : 'Unavailable'}
          </span>
          <span className="text-sm font-semibold text-blue-700 hover:text-blue-900">
            View details →
          </span>
        </div>
      </div>
    </div>
    </Link>
  )
}


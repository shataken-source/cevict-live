// Next.js doesn't allow re-exporting route config, so we duplicate it
export { GET } from '../daily-results/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

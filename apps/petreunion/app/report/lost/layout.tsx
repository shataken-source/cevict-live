import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Report Lost Pet | Free - PetReunion',
  description: 'Report your lost pet. Completely free. Add photo, location, and contact info so others can help bring them home.',
}

export default function ReportLostLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

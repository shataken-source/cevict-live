import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Report Found Pet | Free - PetReunion',
  description: 'Report a pet you found. Completely free. We match with lost pet reports to help reunite families.',
}

export default function ReportFoundLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

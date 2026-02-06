import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search Lost & Found Pets | Completely Free - PetReunion',
  description: 'Search our database of lost and found pets. Completely free. Filter by location, type, breed, and more. No sign-up required.',
}

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

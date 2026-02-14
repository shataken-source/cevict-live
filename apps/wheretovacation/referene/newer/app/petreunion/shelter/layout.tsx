import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shelter Login | PetReunion',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ShelterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

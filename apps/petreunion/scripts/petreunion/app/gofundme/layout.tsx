import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support PetReunion - GoFundMe | Help Reunite Lost Pets',
  description: 'Support PetReunion and help reunite lost pets with their families. 100% free forever. Every donation helps keep our service free for everyone.',
  openGraph: {
    title: 'Support PetReunion - GoFundMe',
    description: 'Help reunite lost pets with their families. Every donation keeps PetReunion 100% free.',
    type: 'website',
    url: 'https://petreunion.org/gofundme',
  },
};

export default function GoFundMeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}


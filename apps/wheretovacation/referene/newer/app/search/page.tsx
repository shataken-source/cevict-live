import { Metadata } from 'next';
import SearchClient from './SearchClient';
import { generateIntentMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = generateIntentMetadata(
  {
    primary: 'best',
    secondary: 'adventure',
  },
  undefined,
  'Vacation'
);

export default function SearchPage() {
  return <SearchClient />;
}

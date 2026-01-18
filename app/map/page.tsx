import dynamicImport from 'next/dynamic';

export const dynamic = 'force-dynamic';

const MapClient = dynamicImport(() => import('./MapClient'), { ssr: false });

export default function MapPage() {
  return <MapClient />;
}

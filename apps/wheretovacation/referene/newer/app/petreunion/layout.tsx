import { ErrorBoundary } from '@/components/errors/ErrorBoundary';
import PetReunionNav from '@/components/petreunion/PetReunionNav';

export default function PetReunionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <PetReunionNav />
        <main>{children}</main>
      </div>
    </ErrorBoundary>
  );
}












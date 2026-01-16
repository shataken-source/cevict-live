'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, MapPin } from '@/components/ui/icons';
import Link from 'next/link';
import ShareButton from '@/components/ShareButton';

interface Pet {
  id: string;
  name: string;
  pet_type?: string;
  imageUrl?: string;
  breed?: string;
  location?: string;
  dateLost?: string;
}

export function RecentPets({ pets }: { pets: Pet[] }) {
  if (!pets.length) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 mb-16">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="w-6 h-6" />
          Recently Added Pets
        </h2>
        <Link href="/search">
          <Button variant="outline">
            View All Pets
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        ⚠️ Match probability is an estimate. 100% accuracy is not guaranteed.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {pets.slice(0, 6).map((pet) => (
          <PetCard key={pet.id} pet={pet} />
        ))}
      </div>
    </div>
  );
}

function PetCard({ pet }: { pet: Pet }) {
  return (
    <div className="group">
      <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow h-full flex flex-col">
        <div className="relative pt-[75%] bg-gray-100 dark:bg-gray-700">
          {pet.imageUrl ? (
            <img
              src={pet.imageUrl}
              alt={pet.name}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <span>No Image</span>
            </div>
          )}
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <Link href={`/pets/${pet.id}`}>
            <h3 className="text-lg font-semibold mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {pet.name}
            </h3>
          </Link>
          {pet.breed && (
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
              {pet.breed}
            </p>
          )}
          <div className="mt-auto pt-2 text-sm text-gray-500 dark:text-gray-400">
            {pet.location && (
              <p className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {pet.location}
              </p>
            )}
            {pet.dateLost && (
              <p className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Lost {pet.dateLost}
              </p>
            )}
          </div>
          <div className="mt-3">
            <ShareButton
              petId={pet.id}
              petName={pet.name}
              petType={pet.pet_type || 'pet'}
              location={pet.location || ''}
              photoUrl={pet.imageUrl}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

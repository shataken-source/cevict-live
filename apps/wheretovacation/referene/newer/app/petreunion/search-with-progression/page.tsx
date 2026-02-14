'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import AgeProgression from '@/components/petreunion/AgeProgression';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SearchWithProgressionPage() {
  const searchParams = useSearchParams();
  const [imageUrl, setImageUrl] = useState<string>('');
  const [petType, setPetType] = useState<'dog' | 'cat'>('dog');
  const [breed, setBreed] = useState('');
  const [monthsSinceLoss, setMonthsSinceLoss] = useState(0);
  const [petName, setPetName] = useState('');

  useEffect(() => {
    // Get params from URL or localStorage
    const storedImage = localStorage.getItem('age_progression_image');
    const storedData = localStorage.getItem('age_progression_data');

    if (storedImage) {
      setImageUrl(storedImage);
    }

    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        setPetType(data.petType || 'dog');
        setBreed(data.breed || '');
        setMonthsSinceLoss(data.monthsSinceLoss || 0);
        setPetName(data.petName || '');
      } catch (e) {
        console.error('Failed to parse stored data', e);
      }
    }

    // Also check URL params
    const imageParam = searchParams?.get('image');
    const monthsParam = searchParams?.get('months');
    const typeParam = searchParams?.get('type');
    const breedParam = searchParams?.get('breed');
    const nameParam = searchParams?.get('name');

    if (imageParam) setImageUrl(imageParam);
    if (monthsParam) setMonthsSinceLoss(parseInt(monthsParam));
    if (typeParam) setPetType(typeParam as 'dog' | 'cat');
    if (breedParam) setBreed(breedParam);
    if (nameParam) setPetName(nameParam);
  }, [searchParams]);

  if (!imageUrl) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Age Progression Search</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              No image provided. Please upload a pet photo first.
            </p>
            <Link href="/petreunion/report">
              <Button>Go to Report Lost Pet</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Link href="/petreunion" className="inline-flex items-center gap-2 text-blue-600 hover:underline mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to PetReunion
      </Link>

      <h1 className="text-3xl font-bold mb-6">Age Progression Search</h1>

      <AgeProgression
        originalImage={imageUrl}
        petType={petType}
        breed={breed}
        monthsSinceLoss={monthsSinceLoss}
        petName={petName}
        onProgressionComplete={(progressions) => {
          console.log('Age progression complete:', progressions);
          // Store results for search
          localStorage.setItem('age_progression_results', JSON.stringify(progressions));
        }}
      />
    </div>
  );
}






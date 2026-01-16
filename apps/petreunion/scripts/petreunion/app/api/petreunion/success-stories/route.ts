import { NextResponse } from 'next/server';

/**
 * Success Stories API
 * Returns pet reunion success stories
 */

export async function GET() {
  // In production, fetch from Supabase
  const stories = [
    {
      id: '1',
      petName: 'Max',
      petType: 'Golden Retriever',
      location: 'Atlanta, GA',
      daysMissing: 5,
      story: 'Max escaped during a thunderstorm and ran several blocks from home. A kind neighbor found him shivering under a porch and posted on PetReunion. Our AI matched Max within 48 hours, and we were reunited! Thank you PetReunion for bringing our boy home.',
      photoUrl: '',
      ownerName: 'Sarah M.',
      reunionDate: '2024-12-20',
      likes: 234
    },
    {
      id: '2',
      petName: 'Luna',
      petType: 'Tabby Cat',
      location: 'Miami, FL',
      daysMissing: 12,
      story: 'Luna slipped out through a window and was missing for almost two weeks. We were heartbroken. The AI matched her with a shelter listing 30 miles away - she had traveled so far! The shelter confirmed it was Luna using PetReunion\'s photos. She\'s finally home and we\'re never letting her out of sight again.',
      photoUrl: '',
      ownerName: 'James R.',
      reunionDate: '2024-12-15',
      likes: 189
    },
    {
      id: '3',
      petName: 'Buddy',
      petType: 'Beagle Mix',
      location: 'Nashville, TN',
      daysMissing: 3,
      story: 'Buddy slipped his collar during our evening walk - he got spooked by fireworks. Someone found him the next day and posted on PetReunion. The notification came to my phone instantly! Buddy was only 2 miles away. This app is a lifesaver.',
      photoUrl: '',
      ownerName: 'Maria L.',
      reunionDate: '2024-12-22',
      likes: 156
    },
    {
      id: '4',
      petName: 'Whiskers',
      petType: 'Persian Cat',
      location: 'Charlotte, NC',
      daysMissing: 8,
      story: 'Whiskers is an indoor cat who somehow got outside when we had contractors working. Eight days of searching, crying, and hoping. A vet clinic 5 miles away scanned a found cat\'s microchip and used PetReunion to find us. So grateful!',
      photoUrl: '',
      ownerName: 'David K.',
      reunionDate: '2024-12-18',
      likes: 203
    },
    {
      id: '5',
      petName: 'Rocky',
      petType: 'German Shepherd',
      location: 'Jacksonville, FL',
      daysMissing: 2,
      story: 'Rocky broke through our fence during a storm. Within hours of posting on PetReunion, three people messaged saying they saw a German Shepherd matching his description. One person had actually brought him to their house for safety. PetReunion connected us immediately!',
      photoUrl: '',
      ownerName: 'Jennifer T.',
      reunionDate: '2024-12-24',
      likes: 178
    },
    {
      id: '6',
      petName: 'Mochi',
      petType: 'Shiba Inu',
      location: 'Raleigh, NC',
      daysMissing: 6,
      story: 'Mochi escaped from our yard and we searched everywhere. The AI facial recognition matched Mochi with a "found dog" post on Facebook that someone had crossposted to PetReunion. Without this technology, we might never have found her. She was 15 miles away!',
      photoUrl: '',
      ownerName: 'Kevin W.',
      reunionDate: '2024-12-19',
      likes: 145
    }
  ];

  return NextResponse.json({ stories, total: stories.length });
}

export async function POST(request: Request) {
  try {
    const story = await request.json();

    // Validate required fields
    if (!story.petName || !story.story) {
      return NextResponse.json(
        { error: 'Pet name and story are required' },
        { status: 400 }
      );
    }

    // In production, save to Supabase
    const newStory = {
      id: Date.now().toString(),
      ...story,
      likes: 0,
      reunionDate: new Date().toISOString().split('T')[0],
      status: 'pending_review'
    };

    return NextResponse.json({ 
      success: true, 
      story: newStory,
      message: 'Thank you for sharing! Your story will be reviewed and posted soon.'
    });

  } catch (error) {
    console.error('Error saving story:', error);
    return NextResponse.json(
      { error: 'Failed to save story' },
      { status: 500 }
    );
  }
}


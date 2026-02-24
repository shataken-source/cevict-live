// Real vacation property data for testing
export const vacationProperties = [
  {
    id: 'costa-rica-manuel-antonio',
    name: 'Manuel Antonio Beach Villa',
    destination: 'Costa Rica',
    activities: [
      { id: 'surfing', name: 'Surfing & Watersports', icon: '🏄' },
      { id: 'diving', name: 'Scuba Diving', icon: '🤿' },
      { id: 'wildlife', name: 'Wildlife Safari', icon: '🦁' },
      { id: 'adventure', name: 'Adventure Sports', icon: '🪂' }
    ],
    price: 1850,
    rating: 4.8,
    duration: '7 days',
    guests: 6,
    amenities: ['WiFi', 'Kitchen', 'Parking', 'Pool', 'Air Conditioning', 'Beach Access', 'Ocean View'],
    reviews: 156,
    image: '/images/destinations/costa-rica-villa.jpg',
    description: 'Luxury beachfront villa in Manuel Antonio with stunning ocean views and private beach access'
  },
  {
    id: 'hawaii-waikiki-resort',
    name: 'Waikiki Paradise Resort',
    destination: 'Hawaii',
    activities: [
      { id: 'surfing', name: 'Surfing & Watersports', icon: '🏄' },
      { id: 'beach', name: 'Beach & Relaxation', icon: '🏖️' },
      { id: 'diving', name: 'Scuba Diving', icon: '🤿' },
      { id: 'wellness', name: 'Wellness & Spa', icon: '🧘' }
    ],
    price: 3200,
    rating: 4.9,
    duration: '5 days',
    guests: 4,
    amenities: ['WiFi', 'Kitchen', 'Pool', 'Hot Tub', 'Air Conditioning', 'Gym', 'Beach Access', 'Free Breakfast'],
    reviews: 289,
    image: '/images/destinations/hawaii-resort.jpg',
    description: 'Premium resort in the heart of Waikiki with world-class spa and direct beach access'
  },
  {
    id: 'colorado-aspen-lodge',
    name: 'Aspen Mountain Lodge',
    destination: 'Colorado',
    activities: [
      { id: 'skiing', name: 'Winter Sports', icon: '🎿' },
      { id: 'mountain', name: 'Mountain & Hiking', icon: '🏔️' },
      { id: 'adventure', name: 'Adventure Sports', icon: '🪂' },
      { id: 'wellness', name: 'Wellness & Spa', icon: '🧘' }
    ],
    price: 2750,
    rating: 4.7,
    duration: '6 days',
    guests: 8,
    amenities: ['WiFi', 'Kitchen', 'Parking', 'Fireplace', 'Heating', 'Hot Tub', 'Mountain View', 'BBQ Grill'],
    reviews: 198,
    image: '/images/destinations/colorado-lodge.jpg',
    description: 'Luxury ski-in/ski-out lodge in Aspen with hot tub and mountain views'
  },
  {
    id: 'california-malibu-beach',
    name: 'Malibu Beach House',
    destination: 'California',
    activities: [
      { id: 'surfing', name: 'Surfing & Watersports', icon: '🏄' },
      { id: 'beach', name: 'Beach & Relaxation', icon: '🏖️' },
      { id: 'diving', name: 'Scuba Diving', icon: '🤿' },
      { id: 'golf', name: 'Golf Courses', icon: '⛳' }
    ],
    price: 4500,
    rating: 4.9,
    duration: '7 days',
    guests: 10,
    amenities: ['WiFi', 'Kitchen', 'Parking', 'Pool', 'Hot Tub', 'Ocean View', 'BBQ Grill', 'TV'],
    reviews: 312,
    image: '/images/destinations/malibu-beach.jpg',
    description: 'Exclusive Malibu beachfront property with private pool and ocean views'
  },
  {
    id: 'japan-kyoto-temple',
    name: 'Kyoto Temple Retreat',
    destination: 'Japan',
    activities: [
      { id: 'cultural', name: 'Cultural & Heritage', icon: '🏛️' },
      { id: 'food', name: 'Food & Wine', icon: '🍷' },
      { id: 'festivals', name: 'Festivals & Events', icon: '🎉' },
      { id: 'wellness', name: 'Wellness & Spa', icon: '🧘' }
    ],
    price: 2200,
    rating: 4.8,
    duration: '8 days',
    guests: 4,
    amenities: ['WiFi', 'Kitchen', 'Air Conditioning', 'Heating', 'TV', 'Free Breakfast'],
    reviews: 167,
    image: '/images/destinations/kyoto-temple.jpg',
    description: 'Traditional temple stay in Kyoto with cultural experiences and meditation'
  },
  {
    id: 'thailand-phuket-villa',
    name: 'Phuket Tropical Villa',
    destination: 'Thailand',
    activities: [
      { id: 'beach', name: 'Beach & Relaxation', icon: '🏖️' },
      { id: 'diving', name: 'Scuba Diving', icon: '🤿' },
      { id: 'cultural', name: 'Cultural & Heritage', icon: '🏛️' },
      { id: 'food', name: 'Food & Wine', icon: '🍷' }
    ],
    price: 1750,
    rating: 4.6,
    duration: '6 days',
    guests: 6,
    amenities: ['WiFi', 'Kitchen', 'Pool', 'Air Conditioning', 'Beach Access', 'Free Breakfast'],
    reviews: 203,
    image: '/images/destinations/phuket-villa.jpg',
    description: 'Tropical villa in Phuket with private pool and beach access'
  },
  {
    id: 'florida-keys-cottage',
    name: 'Florida Keys Cottage',
    destination: 'Florida',
    activities: [
      { id: 'beach', name: 'Beach & Relaxation', icon: '🏖️' },
      { id: 'fishing', name: 'Fishing Adventures', icon: '🎣' },
      { id: 'diving', name: 'Scuba Diving', icon: '🤿' },
      { id: 'wellness', name: 'Wellness & Spa', icon: '🧘' }
    ],
    price: 1450,
    rating: 4.5,
    duration: '5 days',
    guests: 4,
    amenities: ['WiFi', 'Kitchen', 'Parking', 'Beach Access', 'BBQ Grill', 'Pet Friendly'],
    reviews: 134,
    image: '/images/destinations/florida-keys.jpg',
    description: 'Cozy beach cottage in the Florida Keys with private dock and beach access'
  },
  {
    id: 'alaska-glacier-lodge',
    name: 'Alaska Glacier View Lodge',
    destination: 'Alaska',
    activities: [
      { id: 'wildlife', name: 'Wildlife Safari', icon: '🦁' },
      { id: 'fishing', name: 'Fishing Adventures', icon: '🎣' },
      { id: 'adventure', name: 'Adventure Sports', icon: '🪂' },
      { id: 'photography', name: 'Photography Tours', icon: '📷' }
    ],
    price: 3800,
    rating: 4.9,
    duration: '7 days',
    guests: 6,
    amenities: ['WiFi', 'Kitchen', 'Parking', 'Heating', 'Fireplace', 'Mountain View'],
    reviews: 87,
    image: '/images/destinations/alaska-lodge.jpg',
    description: 'Remote wilderness lodge with glacier views and wildlife viewing opportunities'
  },
  {
    id: 'arizona-sedona-retreat',
    name: 'Sedona Red Rock Retreat',
    destination: 'Arizona',
    activities: [
      { id: 'adventure', name: 'Adventure Sports', icon: '🪂' },
      { id: 'wellness', name: 'Wellness & Spa', icon: '🧘' },
      { id: 'photography', name: 'Photography Tours', icon: '📷' },
      { id: 'golf', name: 'Golf Courses', icon: '⛳' }
    ],
    price: 1950,
    rating: 4.7,
    duration: '4 days',
    guests: 4,
    amenities: ['WiFi', 'Kitchen', 'Pool', 'Hot Tub', 'Air Conditioning', 'Mountain View'],
    reviews: 145,
    image: '/images/destinations/sedona-retreat.jpg',
    description: 'Luxury retreat in Sedona with spa services and red rock views'
  },
  {
    id: 'new-york-manhattan-loft',
    name: 'Manhattan Luxury Loft',
    destination: 'New York',
    activities: [
      { id: 'cultural', name: 'Cultural & Heritage', icon: '🏛️' },
      { id: 'food', name: 'Food & Wine', icon: '🍷' },
      { id: 'festivals', name: 'Festivals & Events', icon: '🎉' },
      { id: 'wellness', name: 'Wellness & Spa', icon: '🧘' }
    ],
    price: 5500,
    rating: 4.8,
    duration: '5 days',
    guests: 6,
    amenities: ['WiFi', 'Kitchen', 'Gym', 'Air Conditioning', 'Heating', 'TV', 'Washer/Dryer'],
    reviews: 267,
    image: '/images/destinations/nyc-loft.jpg',
    description: 'Penthouse loft in Manhattan with city views and premium amenities'
  }
];

export const destinations = [
  { id: 'costa-rica', name: 'Costa Rica', activities: ['surfing', 'fishing', 'diving', 'wildlife', 'adventure'] },
  { id: 'hawaii', name: 'Hawaii', activities: ['surfing', 'beach', 'fishing', 'diving', 'wellness'] },
  { id: 'colorado', name: 'Colorado', activities: ['skiing', 'mountain', 'adventure', 'wellness'] },
  { id: 'california', name: 'California', activities: ['surfing', 'mountain', 'beach', 'skiing', 'diving', 'golf', 'food', 'wellness', 'adventure'] },
  { id: 'japan', name: 'Japan', activities: ['cultural', 'skiing', 'beach', 'food', 'festivals', 'wellness'] },
  { id: 'thailand', name: 'Thailand', activities: ['beach', 'cultural', 'fishing', 'diving', 'food', 'wellness'] },
  { id: 'florida', name: 'Florida', activities: ['beach', 'fishing', 'diving', 'golf', 'wellness'] },
  { id: 'alaska', name: 'Alaska', activities: ['wildlife', 'fishing', 'adventure', 'photography'] },
  { id: 'arizona', name: 'Arizona', activities: ['golf', 'adventure', 'wellness', 'photography'] },
  { id: 'new-york', name: 'New York', activities: ['cultural', 'food', 'festivals', 'wellness'] }
];

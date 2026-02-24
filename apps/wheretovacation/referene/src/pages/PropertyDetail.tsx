import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PropertyGallery } from '@/components/PropertyGallery';
import { ReviewList } from '@/components/ReviewList';
import { BookingModal } from '@/components/BookingModal';
import { supabase } from '@/lib/supabase';
import { MapPin, Users, Bed, Bath, Wifi, Car, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [bookingOpen, setBookingOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProperty();
    loadReviews();
  }, [id]);

  const loadProperty = async () => {
    const { data, error } = await supabase.from('properties').select('*').eq('id', id).single();
    if (error) {
      toast({ title: 'Error loading property', variant: 'destructive' });
      navigate('/');
    } else {
      setProperty(data);
    }
  };

  const loadReviews = async () => {
    const { data } = await supabase.from('reviews').select('*').eq('property_id', id).order('created_at', { ascending: false });
    setReviews(data || []);
  };

  if (!property) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const amenityIcons: any = { wifi: Wifi, parking: Car };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Button variant="outline" onClick={() => navigate('/')} className="mb-4">Back to Properties</Button>
        
        <PropertyGallery images={property.images} title={property.title} />

        <div className="grid md:grid-cols-3 gap-8 mt-8">
          <div className="md:col-span-2 space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{property.title}</h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{property.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{property.rating}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center gap-2"><Users className="w-5 h-5" /> {property.max_guests} Guests</div>
              <div className="flex items-center gap-2"><Bed className="w-5 h-5" /> {property.bedrooms} Bedrooms</div>
              <div className="flex items-center gap-2"><Bath className="w-5 h-5" /> {property.bathrooms} Bathrooms</div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">Description</h2>
              <p className="text-muted-foreground">{property.description}</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">Amenities</h2>
              <div className="grid grid-cols-2 gap-3">
                {property.amenities?.map((amenity: string) => {
                  const Icon = amenityIcons[amenity] || Wifi;
                  return <div key={amenity} className="flex items-center gap-2"><Icon className="w-5 h-5" /> {amenity}</div>;
                })}
              </div>
            </div>

            <ReviewList reviews={reviews} />
          </div>

          <div className="md:col-span-1">
            <div className="sticky top-8 border rounded-lg p-6 bg-white shadow-lg">
              <div className="text-3xl font-bold mb-4">${property.price_per_night}<span className="text-lg font-normal text-muted-foreground">/night</span></div>
              <Button onClick={() => setBookingOpen(true)} className="w-full" size="lg">Book Now</Button>
            </div>
          </div>
        </div>
      </div>

      <BookingModal isOpen={bookingOpen} onClose={() => setBookingOpen(false)} property={property} />
    </div>
  );
}

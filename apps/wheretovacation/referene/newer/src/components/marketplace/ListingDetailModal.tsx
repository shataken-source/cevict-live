import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { MapPin, Eye, MessageSquare, DollarSign, Star } from 'lucide-react';
import PaymentModal from './PaymentModal';
import MarketplaceMessenger from './MarketplaceMessenger';


interface ListingDetailModalProps {
  listing: any;
  open: boolean;
  onClose: () => void;
  currentUserId?: string;
  onUpdate: () => void;
}

export default function ListingDetailModal({ listing, open, onClose, currentUserId, onUpdate }: ListingDetailModalProps) {
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [offers, setOffers] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showMessenger, setShowMessenger] = useState(false);

  const isSeller = currentUserId === listing.seller_id;

  if (showMessenger && currentUserId && !isSeller) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
          <MarketplaceMessenger
            listingId={listing.id}
            sellerId={listing.seller_id}
            buyerId={currentUserId}
            currentUserId={currentUserId}
            onClose={() => setShowMessenger(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }


  useEffect(() => {
    if (isSeller) {
      loadOffers();
    }
    loadSellerReviews();
  }, [listing.id]);

  const loadOffers = async () => {
    try {
      const { data } = await supabase.functions.invoke('marketplace-manager', {
        body: { action: 'get_offers', listing_id: listing.id }
      });
      setOffers(data?.offers || []);
    } catch (error) {
      console.error('Failed to load offers');
    }
  };

  const loadSellerReviews = async () => {
    try {
      const { data } = await supabase.functions.invoke('marketplace-manager', {
        body: { action: 'get_seller_reviews', seller_id: listing.seller_id }
      });
      setReviews(data?.reviews || []);
    } catch (error) {
      console.error('Failed to load reviews');
    }
  };

  const handleMakeOffer = async () => {
    if (!currentUserId) {
      toast.error('Please log in to make an offer');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('marketplace-manager', {
        body: {
          action: 'create_offer',
          listing_id: listing.id,
          buyer_id: currentUserId,
          seller_id: listing.seller_id,
          offer_amount: parseFloat(offerAmount),
          message: offerMessage
        }
      });

      if (error) throw error;

      toast.success('Offer submitted successfully!');
      setOfferAmount('');
      setOfferMessage('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit offer');
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToOffer = async (offerId: string, status: string, counterAmount?: number) => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('marketplace-manager', {
        body: {
          action: 'respond_to_offer',
          offer_id: offerId,
          status,
          counter_amount: counterAmount
        }
      });

      if (error) throw error;

      toast.success(`Offer ${status}!`);
      loadOffers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to respond to offer');
    } finally {
      setLoading(false);
    }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 'N/A';

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{listing.title}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="mb-4">
                <img
                  src={listing.images?.[selectedImage] || '/placeholder.svg'}
                  alt={listing.title}
                  className="w-full h-64 object-cover rounded-lg"
                />
                {listing.images?.length > 1 && (
                  <div className="flex gap-2 mt-2">
                    {listing.images.map((img: string, idx: number) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`${listing.title} ${idx + 1}`}
                        className={`w-16 h-16 object-cover rounded cursor-pointer ${
                          selectedImage === idx ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => setSelectedImage(idx)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-blue-600">${listing.price}</span>
                  <Badge>{listing.condition}</Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {listing.location || 'Not specified'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {listing.views || 0} views
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{listing.description}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Seller Rating</h3>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{avgRating}</span>
                    <span className="text-gray-600">({reviews.length} reviews)</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Tabs defaultValue="buy">
                <TabsList className="w-full">
                  <TabsTrigger value="buy" className="flex-1">Buy Now</TabsTrigger>
                  {listing.negotiable && <TabsTrigger value="offer" className="flex-1">Make Offer</TabsTrigger>}
                  {isSeller && <TabsTrigger value="offers" className="flex-1">Offers ({offers.length})</TabsTrigger>}
                </TabsList>

                <TabsContent value="buy" className="space-y-4">
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => setPaymentModalOpen(true)}
                    disabled={isSeller || !currentUserId}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Buy Now for ${listing.price}
                  </Button>
                  {!isSeller && currentUserId && (
                    <Button 
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowMessenger(true)}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Message Seller
                    </Button>
                  )}
                  {!currentUserId && (
                    <p className="text-sm text-center text-gray-600">Please log in to purchase</p>
                  )}
                </TabsContent>


                {listing.negotiable && (
                  <TabsContent value="offer" className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Your Offer ($)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={offerAmount}
                        onChange={(e) => setOfferAmount(e.target.value)}
                        placeholder="Enter your offer"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Message (optional)</label>
                      <Textarea
                        value={offerMessage}
                        onChange={(e) => setOfferMessage(e.target.value)}
                        placeholder="Add a message to the seller..."
                        rows={3}
                      />
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={handleMakeOffer}
                      disabled={!offerAmount || loading || isSeller || !currentUserId}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Submit Offer
                    </Button>
                  </TabsContent>
                )}

                {isSeller && (
                  <TabsContent value="offers" className="space-y-3">
                    {offers.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">No offers yet</p>
                    ) : (
                      offers.map((offer) => (
                        <div key={offer.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold">${offer.offer_amount}</p>
                              <p className="text-sm text-gray-600">{offer.message}</p>
                            </div>
                            <Badge>{offer.status}</Badge>
                          </div>
                          {offer.status === 'pending' && (
                            <div className="flex gap-2 mt-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleRespondToOffer(offer.id, 'accepted')}
                                disabled={loading}
                              >
                                Accept
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleRespondToOffer(offer.id, 'rejected')}
                                disabled={loading}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {paymentModalOpen && (
        <PaymentModal
          open={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          listing={listing}
          amount={listing.price}
          buyerId={currentUserId!}
          onSuccess={() => {
            toast.success('Purchase successful!');
            onUpdate();
            onClose();
          }}
        />
      )}
    </>
  );
}

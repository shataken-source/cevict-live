'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useUnifiedAuth } from '@/shared/auth/UnifiedAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ExternalLink, MapPin, Calendar, User, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';

interface Correction {
  id: string;
  target_type: 'law_card' | 'directory_place';
  target_id: string;
  policy_field?: string;
  proposed_summary?: string;
  proposed_details?: string;
  proposed_tags?: string[];
  source_url: string;
  confidence: 'high' | 'medium' | 'low';
  additional_notes?: string;
  contact_email?: string;
  submitted_by: string;
  submitted_by_email?: {
    email: string;
  };
  status: 'submitted' | 'needs_more_info' | 'accepted' | 'rejected' | 'duplicate';
  admin_notes?: string;
  created_at: string;
}

interface DirectoryPlace {
  id: string;
  name: string;
  address: string;
  city: string;
  state_code: string;
  category: string;
  description?: string;
  notes?: string;
  website_url?: string;
  phone?: string;
  age_restriction: 'none' | '18+' | '21+';
  amenities: string[];
  source_url: string;
  submitted_by: string;
  submitted_by_email?: {
    email: string;
  };
  status: 'submitted' | 'needs_more_info' | 'verified' | 'rejected' | 'duplicate';
  admin_notes?: string;
  created_at: string;
}

const STATUS_COLORS = {
  submitted: 'bg-yellow-100 text-yellow-800',
  needs_more_info: 'bg-orange-100 text-orange-800',
  accepted: 'bg-green-100 text-green-800',
  verified: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  duplicate: 'bg-gray-100 text-gray-800',
};

const CATEGORY_LABELS = {
  indoor_smoking: 'Indoor Smoking',
  vaping: 'Vaping',
  outdoor_public: 'Outdoor Public Spaces',
  patio_private: 'Patio/Private Areas',
  retail_sales: 'Retail Sales',
  hemp_restrictions: 'Hemp Restrictions',
  penalties: 'Penalties & Enforcement',
  lounge: 'Smoking Lounge',
  patio: 'Restaurant/Bar Patio',
  hotel: 'Hotel (Smoking Rooms)',
  bar: 'Bar/Nightclub',
  restaurant: 'Restaurant',
  shop: 'Vape/Tobacco Shop',
  other: 'Other',
};

export default function ModerationQueue() {
  const { user } = useUnifiedAuth();
  const supabase = createClient();

  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [places, setPlaces] = useState<DirectoryPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSubmissions();
    }
  }, [user]);

  const fetchSubmissions = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch corrections with submitter emails
      const { data: correctionsData, error: correctionsError } = await supabase
        .from('sr_corrections')
        .select(`
          *,
          submitted_by_email:unified_users(email)
        `)
        .in('status', ['submitted', 'needs_more_info'])
        .order('created_at', { ascending: false });

      // Fetch directory places with submitter emails
      const { data: placesData, error: placesError } = await supabase
        .from('sr_directory_places')
        .select(`
          *,
          submitted_by_email:unified_users(email)
        `)
        .in('status', ['submitted', 'needs_more_info'])
        .order('created_at', { ascending: false });

      if (correctionsError) throw correctionsError;
      if (placesError) throw placesError;

      setCorrections(correctionsData || []);
      setPlaces(placesData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (
    type: 'correction' | 'place',
    id: string,
    status: 'accepted' | 'rejected' | 'needs_more_info' | 'verified',
    adminNotes?: string
  ) => {
    if (!supabase) {
      setError('Supabase is not configured');
      return;
    }

    try {
      setActionLoading(id);

      const table = type === 'correction' ? 'sr_corrections' : 'sr_directory_places';
      const updateData: any = {
        status,
        admin_notes: adminNotes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id,
      };

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Refresh the list
      await fetchSubmissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update submission');
    } finally {
      setActionLoading(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              You must be signed in as an admin to access the moderation queue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/auth">Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-slate-600">Loading moderation queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Moderation Queue</h1>
          <p className="mt-2 text-slate-600">
            Review and moderate user-submitted corrections and directory places.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="bg-red-100 border-red-600 text-red-800 mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs defaultValue="corrections" className="space-y-6">
          <TabsList>
            <TabsTrigger value="corrections">
              Law Corrections ({corrections.length})
            </TabsTrigger>
            <TabsTrigger value="places">
              Directory Places ({places.length})
            </TabsTrigger>
          </TabsList>

          {/* Corrections Tab */}
          <TabsContent value="corrections" className="space-y-4">
            {corrections.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                  <h3 className="mt-2 text-sm font-medium text-slate-900">All caught up!</h3>
                  <p className="mt-1 text-sm text-slate-500">No pending corrections to review.</p>
                </CardContent>
              </Card>
            ) : (
              corrections.map((correction) => (
                <Card key={correction.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {correction.policy_field && CATEGORY_LABELS[correction.policy_field as keyof typeof CATEGORY_LABELS]} Correction
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {correction.submitted_by_email?.email || 'Anonymous'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(correction.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            Confidence: {correction.confidence}
                          </span>
                        </CardDescription>
                      </div>
                      <Badge className={STATUS_COLORS[correction.status]}>
                        {correction.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {correction.proposed_summary && (
                      <div>
                        <Label className="text-sm font-medium">Proposed Summary</Label>
                        <p className="mt-1 text-sm text-slate-700">{correction.proposed_summary}</p>
                      </div>
                    )}

                    {correction.proposed_details && (
                      <div>
                        <Label className="text-sm font-medium">Additional Details</Label>
                        <p className="mt-1 text-sm text-slate-700">{correction.proposed_details}</p>
                      </div>
                    )}

                    {correction.proposed_tags && correction.proposed_tags.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Tags</Label>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {correction.proposed_tags.map((tag, index) => (
                            <Badge key={index} className="bg-gray-100 text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {correction.source_url && (
                      <div>
                        <Label className="text-sm font-medium">Source</Label>
                        <a
                          href={correction.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {correction.source_url}
                        </a>
                      </div>
                    )}

                    {correction.additional_notes && (
                      <div>
                        <Label className="text-sm font-medium">Additional Notes</Label>
                        <p className="mt-1 text-sm text-slate-700">{correction.additional_notes}</p>
                      </div>
                    )}

                    {/* Admin Actions */}
                    <div className="border-t pt-4">
                      <Label className="text-sm font-medium mb-2 block">Admin Notes</Label>
                      <Textarea
                        placeholder="Add notes for this submission..."
                        className="mb-3"
                        id={`admin-notes-${correction.id}`}
                      />

                      <div className="flex gap-2">
                        <Button
                          className="px-3 py-1 text-sm"
                          onClick={() => {
                            const notes = document.getElementById(`admin-notes-${correction.id}`) as HTMLTextAreaElement;
                            handleReview('correction', correction.id, 'accepted', notes.value);
                          }}
                          disabled={actionLoading === correction.id}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Accept (Award Points)
                        </Button>

                        <Button
                          className="px-3 py-1 text-sm border border-gray-300 bg-transparent"
                          onClick={() => {
                            const notes = document.getElementById(`admin-notes-${correction.id}`) as HTMLTextAreaElement;
                            handleReview('correction', correction.id, 'needs_more_info', notes.value);
                          }}
                          disabled={actionLoading === correction.id}
                        >
                          <AlertCircle className="w-4 h-4 mr-1" />
                          Request Info
                        </Button>

                        <Button
                          className="px-3 py-1 text-sm bg-red-600 text-white hover:bg-red-700"
                          onClick={() => {
                            const notes = document.getElementById(`admin-notes-${correction.id}`) as HTMLTextAreaElement;
                            handleReview('correction', correction.id, 'rejected', notes.value);
                          }}
                          disabled={actionLoading === correction.id}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Places Tab */}
          <TabsContent value="places" className="space-y-4">
            {places.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                  <h3 className="mt-2 text-sm font-medium text-slate-900">All caught up!</h3>
                  <p className="mt-1 text-sm text-slate-500">No pending places to review.</p>
                </CardContent>
              </Card>
            ) : (
              places.map((place) => (
                <Card key={place.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{place.name}</CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {place.address}, {place.city}, {place.state_code}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {place.submitted_by_email?.email || 'Anonymous'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(place.created_at).toLocaleDateString()}
                          </span>
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge className="bg-gray-100">
                          {CATEGORY_LABELS[place.category as keyof typeof CATEGORY_LABELS]}
                        </Badge>
                        <Badge className={STATUS_COLORS[place.status]}>
                          {place.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {place.description && (
                      <div>
                        <Label className="text-sm font-medium">Description</Label>
                        <p className="mt-1 text-sm text-slate-700">{place.description}</p>
                      </div>
                    )}

                    {place.phone && (
                      <div>
                        <Label className="text-sm font-medium">Phone</Label>
                        <p className="mt-1 text-sm text-slate-700">{place.phone}</p>
                      </div>
                    )}

                    {place.website_url && (
                      <div>
                        <Label className="text-sm font-medium">Website</Label>
                        <a
                          href={place.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {place.website_url}
                        </a>
                      </div>
                    )}

                    {place.amenities && place.amenities.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Amenities</Label>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {place.amenities.map((amenity, index) => (
                            <Badge key={index} className="border border-gray-300 bg-transparent text-xs">
                              {amenity.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {place.source_url && (
                      <div>
                        <Label className="text-sm font-medium">Source</Label>
                        <a
                          href={place.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {place.source_url}
                        </a>
                      </div>
                    )}

                    {/* Admin Actions */}
                    <div className="border-t pt-4">
                      <Label className="text-sm font-medium mb-2 block">Admin Notes</Label>
                      <Textarea
                        placeholder="Add notes for this submission..."
                        className="mb-3"
                        id={`admin-notes-place-${place.id}`}
                      />

                      <div className="flex gap-2">
                        <Button
                          className="px-3 py-1 text-sm"
                          onClick={() => {
                            const notes = document.getElementById(`admin-notes-place-${place.id}`) as HTMLTextAreaElement;
                            handleReview('place', place.id, 'verified', notes.value);
                          }}
                          disabled={actionLoading === place.id}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Verify
                        </Button>

                        <Button
                          className="px-3 py-1 text-sm border border-gray-300 bg-transparent"
                          onClick={() => {
                            const notes = document.getElementById(`admin-notes-place-${place.id}`) as HTMLTextAreaElement;
                            handleReview('place', place.id, 'needs_more_info', notes.value);
                          }}
                          disabled={actionLoading === place.id}
                        >
                          <AlertCircle className="w-4 h-4 mr-1" />
                          Request Info
                        </Button>

                        <Button
                          className="px-3 py-1 text-sm bg-red-600 text-white hover:bg-red-700"
                          onClick={() => {
                            const notes = document.getElementById(`admin-notes-place-${place.id}`) as HTMLTextAreaElement;
                            handleReview('place', place.id, 'rejected', notes.value);
                          }}
                          disabled={actionLoading === place.id}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

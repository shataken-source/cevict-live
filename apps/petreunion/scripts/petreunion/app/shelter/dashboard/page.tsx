'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Building, Loader2, Plus, Search, Trash2 } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ShelterPet {
  id: string;
  pet_name: string | null;
  pet_type: string;
  breed: string;
  color: string;
  size: string | null;
  status: 'lost' | 'found' | 'reunited';
  location_city: string;
  location_state: string;
  date_lost?: string;
  date_found?: string;
  photo_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export default function ShelterDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pets, setPets] = useState<ShelterPet[]>([]);
  const [shelterId, setShelterId] = useState<string | null>(null);
  const [shelterIdInput, setShelterIdInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'lost' | 'found' | 'reunited'>('all');
  const [editingPet, setEditingPet] = useState<ShelterPet | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    // Get shelter_id from URL params (no prompt - some environments block it)
    const params = new URLSearchParams(window.location.search);
    const id = params.get('shelter_id');

    if (id) {
      setShelterId(id);
      setShelterIdInput(id);
      loadPets(id);
    } else {
      // Show an in-page form instead of using prompt()
      setLoading(false);
    }
  }, []);

  function applyShelterId(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setError('Shelter ID is required to access the dashboard');
      return;
    }
    setError(null);
    setShelterId(trimmed);
    setShelterIdInput(trimmed);
    window.history.replaceState({}, '', `?shelter_id=${encodeURIComponent(trimmed)}`);
    loadPets(trimmed);
  }

  async function loadPets(id: string) {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/shelter/pets?shelter_id=${id}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setPets([]);
      } else {
        setPets(data.pets || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load pets');
      setPets([]);
    } finally {
      setLoading(false);
    }
  }

  async function updatePetStatus(petId: string, newStatus: 'lost' | 'found' | 'reunited') {
    try {
      const res = await fetch('/api/shelter/pets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: petId,
          status: newStatus,
          ...(newStatus === 'reunited' ? { date_found: new Date().toISOString().split('T')[0] } : {}),
        }),
      });

      const data = await res.json();
      if (data.ok) {
        toast.success(`Pet marked as ${newStatus}`);
        if (shelterId) loadPets(shelterId);
      } else {
        toast.error(data.error || 'Failed to update pet');
      }
    } catch (err: any) {
      toast.error('Failed to update pet status');
    }
  }

  async function deletePet(petId: string) {
    if (!confirm('Are you sure you want to delete this pet? This cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/shelter/pets?id=${petId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.ok) {
        toast.success('Pet deleted successfully');
        if (shelterId) loadPets(shelterId);
      } else {
        toast.error(data.error || 'Failed to delete pet');
      }
    } catch (err: any) {
      toast.error('Failed to delete pet');
    }
  }

  const filteredPets = pets.filter(pet => {
    const matchesSearch = !searchTerm ||
      (pet.pet_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pet.breed?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pet.color?.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || pet.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: pets.length,
    lost: pets.filter(p => p.status === 'lost').length,
    found: pets.filter(p => p.status === 'found').length,
    reunited: pets.filter(p => p.status === 'reunited').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !shelterId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <AlertCircle className="w-5 h-5" />
              <CardTitle>Shelter ID Required</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/shelters">
              <Button className="w-full">View All Shelters</Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" className="w-full">Contact Support</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!shelterId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <Building className="w-5 h-5" />
              <CardTitle>Shelter Dashboard</CardTitle>
            </div>
            <CardDescription>Enter your Shelter ID to load your pet listings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="shelterId">Shelter ID</Label>
              <Input
                id="shelterId"
                value={shelterIdInput}
                onChange={(e) => setShelterIdInput(e.target.value)}
                placeholder="Enter your shelter ID"
              />
              <p className="text-xs text-gray-500">
                Don’t have one yet? Contact support and we’ll provision it for your shelter.
              </p>
            </div>

            <Button className="w-full" onClick={() => applyShelterId(shelterIdInput)}>
              Continue
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Link href="/shelters">
                <Button variant="outline" className="w-full">
                  View Shelters
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" className="w-full">
                  Contact Support
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Building className="w-10 h-10 text-blue-600" />
              Shelter Dashboard
            </h1>
            <p className="text-gray-600">
              Manage your shelter's pet listings and help reunite lost pets with their families
            </p>
            {shelterId && (
              <p className="text-sm text-gray-500 mt-1">Shelter ID: {shelterId}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Link href="/report/lost">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Plus className="w-4 h-4 mr-2" />
                Add New Pet
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardDescription>Total Pets</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Lost Pets</CardDescription>
              <CardTitle className="text-3xl text-orange-600">{stats.lost}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Found Pets</CardDescription>
              <CardTitle className="text-3xl text-blue-600">{stats.found}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Reunited</CardDescription>
              <CardTitle className="text-3xl text-green-600">{stats.reunited}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by name, breed, or color..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                {(['all', 'lost', 'found', 'reunited'] as const).map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'default' : 'outline'}
                    onClick={() => setStatusFilter(status)}
                    className="capitalize"
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Pets Grid */}
        {filteredPets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {pets.length === 0 ? 'No pets yet' : 'No pets match your filters'}
              </h3>
              <p className="text-gray-600 mb-6">
                {pets.length === 0
                  ? 'Start by adding your first pet listing'
                  : 'Try adjusting your search or filter criteria'}
              </p>
              {pets.length === 0 && (
                <Link href="/report/lost">
                  <Button>Add Your First Pet</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPets.map((pet) => (
              <Card key={pet.id} className="hover:shadow-lg transition-shadow">
                {pet.photo_url && (
                  <div
                    className="w-full h-48 bg-gray-200 rounded-t-lg overflow-hidden"
                    // Fallback sizing in case CSS fails to load (prevents gigantic images)
                    style={{ height: 192 }}
                  >
                    <img
                      src={pet.photo_url}
                      alt={pet.pet_name || 'Pet photo'}
                      className="w-full h-full object-cover"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{pet.pet_name || 'Unnamed Pet'}</CardTitle>
                      <CardDescription>
                        {pet.breed} • {pet.location_city}, {pet.location_state}
                      </CardDescription>
                    </div>
                    <Badge
                      className={
                        pet.status === 'lost' ? 'bg-red-100 text-red-800' :
                        pet.status === 'reunited' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }
                    >
                      {pet.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">
                      <div><strong>Type:</strong> {pet.pet_type}</div>
                      <div><strong>Color:</strong> {pet.color}</div>
                      {pet.size && <div><strong>Size:</strong> {pet.size}</div>}
                      {pet.date_lost && <div><strong>Date Lost:</strong> {new Date(pet.date_lost).toLocaleDateString()}</div>}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {pet.status !== 'reunited' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updatePetStatus(pet.id, 'reunited')}
                          className="flex-1"
                        >
                          Mark Reunited
                        </Button>
                      )}
                      {pet.status === 'lost' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updatePetStatus(pet.id, 'found')}
                        >
                          Mark Found
                        </Button>
                      )}
                      <Link href={`/lost/${pet.id}`}>
                        <Button size="sm" variant="outline">
                          <Search className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deletePet(pet.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

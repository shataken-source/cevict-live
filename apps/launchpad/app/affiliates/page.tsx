'use client';

// Simple UI components for Launchpad
const Button = ({ children, onClick, className = '', disabled, type = 'button', variant = 'default', size = 'default' }: any) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded font-semibold transition ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${
      variant === 'destructive' ? 'bg-red-600 text-white hover:bg-red-700' :
      variant === 'outline' ? 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50' :
      'bg-blue-600 text-white hover:bg-blue-700'
    } ${size === 'sm' ? 'px-2 py-1 text-sm' : ''} ${className}`}
  >
    {children}
  </button>
);

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children }: any) => (
  <div className="p-6 border-b border-gray-200">{children}</div>
);

const CardTitle = ({ children }: any) => (
  <h2 className="text-2xl font-bold text-gray-900">{children}</h2>
);

const CardDescription = ({ children }: any) => (
  <p className="text-gray-600 mt-1">{children}</p>
);

const CardContent = ({ children, className = '' }: any) => (
  <div className={`p-6 ${className}`}>{children}</div>
);

const Input = ({ value, onChange, placeholder, required, type = 'text', id, className = '', ...props }: any) => (
  <input
    id={id}
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    required={required}
    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    {...props}
  />
);

const Label = ({ htmlFor, children, className = '' }: any) => (
  <label htmlFor={htmlFor} className={`block text-sm font-medium text-gray-700 mb-1 ${className}`}>
    {children}
  </label>
);

const Alert = ({ children, className = '' }: any) => (
  <div className={`p-4 rounded-md ${className}`}>{children}</div>
);

const AlertDescription = ({ children }: any) => (
  <p className="text-sm">{children}</p>
);

// Icons as simple components
const Loader2 = ({ className = '' }: any) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const Plus = ({ className = '' }: any) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const Pencil = ({ className = '' }: any) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const Trash2 = ({ className = '' }: any) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ExternalLink = ({ className = '' }: any) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const Copy = ({ className = '' }: any) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckCircle2 = ({ className = '' }: any) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertCircle = ({ className = '' }: any) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
import { useEffect, useState } from 'react';
// Simple toast implementation
const toast = {
  success: (message: string) => {
    alert(`✅ ${message}`);
  },
  error: (message: string) => {
    alert(`❌ ${message}`);
  },
};

interface Affiliate {
  id: string;
  name: string;
  website_url?: string;
  affiliate_url: string;
  description?: string;
  category?: string;
  website?: string[];
  is_active?: boolean;
  commission_rate?: number;
  click_count?: number;
  conversion_count?: number;
  revenue?: number;
  tags?: string[];
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

const WEBSITES = [
  { id: 'petreunion', name: 'PetReunion' },
  { id: 'smokersrights', name: 'SmokersRights' },
  { id: 'prognostication', name: 'Prognostication' },
  { id: 'popthepopcorn', name: 'PopThePopcorn' },
  { id: 'progno', name: 'PROGNO' },
  { id: 'cevict', name: 'CEVICT' },
  { id: 'gcc', name: 'Gulf Coast Charters' },
  { id: 'wheretovacation', name: 'WhereToVacation' },
];

const CATEGORIES = [
  'product',
  'service',
  'merch',
  'donation',
  'subscription',
  'other',
];

export default function AffiliatesPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Affiliate>>({
    name: '',
    website_url: '',
    affiliate_url: '',
    description: '',
    category: '',
    website: [],
    is_active: true,
    commission_rate: undefined,
    tags: [],
    notes: '',
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadAffiliates();
  }, []);

  const loadAffiliates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/affiliates');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load affiliates: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      setAffiliates(data.affiliates || []);

      // If no error but empty array, show info message
      if (data.affiliates && data.affiliates.length === 0 && !data.error) {
        // This is fine - just no affiliates yet
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load affiliates';
      setError(errorMsg);
      // Only show toast for actual errors, not empty results
      if (!errorMsg.includes('Supabase not configured')) {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const url = editingId ? `/api/affiliates/${editingId}` : '/api/affiliates';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save affiliate');
      }

      toast.success(editingId ? 'Affiliate updated' : 'Affiliate created');
      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        website_url: '',
        affiliate_url: '',
        description: '',
        category: '',
        website: [],
        is_active: true,
        commission_rate: undefined,
        tags: [],
        notes: '',
      });
      loadAffiliates();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    }
  };

  const handleEdit = (affiliate: Affiliate) => {
    setEditingId(affiliate.id);
    setFormData({
      name: affiliate.name,
      website_url: affiliate.website_url || '',
      affiliate_url: affiliate.affiliate_url,
      description: affiliate.description || '',
      category: affiliate.category || '',
      website: affiliate.website || [],
      is_active: affiliate.is_active ?? true,
      commission_rate: affiliate.commission_rate,
      tags: affiliate.tags || [],
      notes: affiliate.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this affiliate?')) return;

    try {
      const res = await fetch(`/api/affiliates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete affiliate');
      toast.success('Affiliate deleted');
      loadAffiliates();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const copyAffiliateUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('Affiliate URL copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleWebsite = (websiteId: string) => {
    const current = formData.website || [];
    const updated = current.includes(websiteId)
      ? current.filter((w) => w !== websiteId)
      : [...current, websiteId];
    setFormData({ ...formData, website: updated });
  };

  const addTag = (tag: string) => {
    if (!tag.trim()) return;
    const current = formData.tags || [];
    if (!current.includes(tag.trim())) {
      setFormData({ ...formData, tags: [...current, tag.trim()] });
    }
  };

  const removeTag = (tag: string) => {
    const current = formData.tags || [];
    setFormData({ ...formData, tags: current.filter((t) => t !== tag) });
  };

  if (loading && affiliates.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Affiliate Management</h1>
            <p className="text-gray-600">Manage affiliate links for all websites</p>
          </div>
          <Button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData({
                name: '',
                website_url: '',
                affiliate_url: '',
                description: '',
                category: '',
                website: [],
                is_active: true,
                commission_rate: undefined,
                tags: [],
                notes: '',
              });
            }}
            className="bg-gradient-to-r from-blue-600 to-purple-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Affiliate
          </Button>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {!error && affiliates.length === 0 && !loading && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700">
              No affiliates found. Add your first affiliate below.
            </AlertDescription>
          </Alert>
        )}

        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{editingId ? 'Edit Affiliate' : 'Add New Affiliate'}</CardTitle>
              <CardDescription>Configure affiliate link details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="e.g., Amazon Products"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
                      value={formData.category || ''}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select category</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="website_url">Website URL</Label>
                  <Input
                    id="website_url"
                    type="url"
                    value={formData.website_url}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, website_url: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="affiliate_url">Affiliate URL *</Label>
                  <Input
                    id="affiliate_url"
                    type="url"
                    value={formData.affiliate_url}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, affiliate_url: e.target.value })}
                    required
                    placeholder="https://example.com/ref=yourcode"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Brief description of the affiliate"
                  />
                </div>

                <div>
                  <Label>Websites (select all that apply)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                    {WEBSITES.map((site) => (
                      <label key={site.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.website?.includes(site.id) || false}
                          onChange={() => toggleWebsite(site.id)}
                          className="rounded"
                        />
                        <span className="text-sm">{site.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="commission_rate">Commission Rate (%)</Label>
                    <Input
                      id="commission_rate"
                      type="number"
                      step="0.01"
                      value={formData.commission_rate || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData({
                          ...formData,
                          commission_rate: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      placeholder="5.00"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active ?? true}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="is_active" className="cursor-pointer">
                      Active
                    </Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={(formData.tags || []).join(', ')}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const tags = e.target.value.split(',').map((t) => t.trim()).filter(Boolean);
                      setFormData({ ...formData, tags });
                    }}
                    placeholder="merch, donation, product"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Internal notes about this affiliate"
                  />
                </div>

                <div className="flex gap-4">
                  <Button type="submit" className="flex-1">
                    {editingId ? 'Update Affiliate' : 'Create Affiliate'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6">
          {affiliates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-600 mb-4">No affiliates yet</p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Affiliate
                </Button>
              </CardContent>
            </Card>
          ) : (
            affiliates.map((affiliate) => (
              <Card key={affiliate.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold">{affiliate.name}</h3>
                        {affiliate.is_active ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Active</span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">Inactive</span>
                        )}
                        {affiliate.category && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {affiliate.category}
                          </span>
                        )}
                      </div>
                      {affiliate.description && (
                        <p className="text-gray-600 mb-2">{affiliate.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {affiliate.website?.map((siteId) => {
                          const site = WEBSITES.find((s) => s.id === siteId);
                          return site ? (
                            <span key={siteId} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                              {site.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {affiliate.commission_rate && (
                          <span>Commission: {affiliate.commission_rate}%</span>
                        )}
                        {affiliate.click_count !== undefined && (
                          <span>Clicks: {affiliate.click_count}</span>
                        )}
                        {affiliate.revenue !== undefined && affiliate.revenue > 0 && (
                          <span>Revenue: ${affiliate.revenue.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyAffiliateUrl(affiliate.affiliate_url, affiliate.id)}
                      >
                        {copiedId === affiliate.id ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      {affiliate.website_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(affiliate.website_url, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleEdit(affiliate)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(affiliate.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono break-all">
                    {affiliate.affiliate_url}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


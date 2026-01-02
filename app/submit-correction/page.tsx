'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useUnifiedAuth } from '@/shared/auth/UnifiedAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const SOUTHEAST_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'FL', name: 'Florida' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'GA', name: 'Georgia' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'SC', name: 'South Carolina' },
];

const POLICY_FIELDS = {
  indoor_smoking: 'Indoor Smoking',
  vaping: 'Vaping',
  outdoor_public: 'Outdoor Public Spaces',
  patio_private: 'Patio/Private Areas',
  retail_sales: 'Retail Sales',
  hemp_restrictions: 'Hemp Restrictions',
  penalties: 'Penalties & Enforcement',
  general_info: 'General Information',
};

export default function SubmitCorrection() {
  const router = useRouter();
  const { user } = useUnifiedAuth();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    target_type: 'law_card' as 'law_card' | 'directory_place',
    target_id: '',
    state_code: 'AL',
    policy_field: '',
    proposed_summary: '',
    proposed_details: '',
    proposed_tags: [] as string[],
    source_url: '',
    confidence: 'medium' as 'high' | 'medium' | 'low',
    additional_notes: '',
    contact_email: '',
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTagsChange = (value: string) => {
    const tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, proposed_tags: tags }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to submit a correction');
      return;
    }

    if (!formData.source_url) {
      setError('Source URL is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // For now, we'll target the first law card for the selected state/category
      // In production, you'd have a proper selection UI
      const { data: targetCard } = await supabase
        .from('sr_law_cards')
        .select('id')
        .eq('state_code', formData.state_code)
        .eq('category', formData.policy_field)
        .single();

      if (!targetCard) {
        setError('No existing law card found for this state and category. Please submit a new law card instead.');
        return;
      }

      const { error: submitError } = await supabase
        .from('sr_corrections')
        .insert({
          target_type: formData.target_type,
          target_id: targetCard.id,
          policy_field: formData.policy_field,
          proposed_summary: formData.proposed_summary,
          proposed_details: formData.proposed_details,
          proposed_tags: formData.proposed_tags,
          source_url: formData.source_url,
          confidence: formData.confidence,
          additional_notes: formData.additional_notes,
          contact_email: formData.contact_email,
          submitted_by: user.id,
        });

      if (submitError) throw submitError;

      setSuccess(true);
      // Reset form
      setFormData({
        target_type: 'law_card',
        target_id: '',
        state_code: 'AL',
        policy_field: '',
        proposed_summary: '',
        proposed_details: '',
        proposed_tags: [],
        source_url: '',
        confidence: 'medium',
        additional_notes: '',
        contact_email: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit correction');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              You must be signed in to submit corrections to the law database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/auth">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-green-600">Correction Submitted!</CardTitle>
            <CardDescription>
              Thank you for helping keep our law database accurate. Your submission will be reviewed by our team.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You will earn 50 points when your correction is accepted, with a 25-point bonus for official government sources.
              </AlertDescription>
            </Alert>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setSuccess(false)} className="flex-1">
                Submit Another
              </Button>
              <Button asChild className="flex-1">
                <Link href="/">Back to Explorer</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Law Explorer
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-slate-900">Submit a Correction</h1>
          <p className="mt-2 text-slate-600">
            Help us keep the law database accurate. Submit corrections with evidence sources.
          </p>
        </div>

        {/* Form */}
        <Card className="submit-form">
          <CardHeader>
            <CardTitle>Correction Details</CardTitle>
            <CardDescription>
              Provide accurate information with reliable sources. All submissions are reviewed before publication.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* State Selection */}
              <div className="form-section">
                <Label htmlFor="state_code">State</Label>
                <Select value={formData.state_code} onValueChange={(value) => handleInputChange('state_code', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a state" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOUTHEAST_STATES.map((state) => (
                      <SelectItem key={state.code} value={state.code}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Policy Field */}
              <div className="form-section">
                <Label htmlFor="policy_field">What needs correction?</Label>
                <Select value={formData.policy_field} onValueChange={(value) => handleInputChange('policy_field', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select policy area" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(POLICY_FIELDS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Proposed Summary */}
              <div className="form-section">
                <Label htmlFor="proposed_summary">Proposed Summary</Label>
                <Textarea
                  id="proposed_summary"
                  placeholder="Brief summary of the correct law or regulation"
                  value={formData.proposed_summary}
                  onChange={(e) => handleInputChange('proposed_summary', e.target.value)}
                  rows={3}
                  required
                />
              </div>

              {/* Proposed Details */}
              <div className="form-section">
                <Label htmlFor="proposed_details">Additional Details</Label>
                <Textarea
                  id="proposed_details"
                  placeholder="Provide more context, exceptions, or specific details"
                  value={formData.proposed_details}
                  onChange={(e) => handleInputChange('proposed_details', e.target.value)}
                  rows={4}
                />
              </div>

              {/* Tags */}
              <div className="form-section">
                <Label htmlFor="proposed_tags">Tags (comma-separated)</Label>
                <Input
                  id="proposed_tags"
                  placeholder="e.g., beach ban, patio exemption, 21+ only"
                  value={formData.proposed_tags.join(', ')}
                  onChange={(e) => handleTagsChange(e.target.value)}
                />
                {formData.proposed_tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.proposed_tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Source URL (Required) */}
              <div className="form-section">
                <Label htmlFor="source_url">
                  Source URL <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="source_url"
                  type="url"
                  placeholder="https://example.com/official-law-text"
                  value={formData.source_url}
                  onChange={(e) => handleInputChange('source_url', e.target.value)}
                  required
                />
                <p className="mt-1 text-sm text-slate-500">
                  Official government sources preferred. Direct links to statutes or ordinances are best.
                </p>
              </div>

              {/* Confidence Level */}
              <div className="form-section">
                <Label>Confidence Level</Label>
                <Select value={formData.confidence} onValueChange={(value) => handleInputChange('confidence', value as 'high' | 'medium' | 'low')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High - Certain this is correct</SelectItem>
                    <SelectItem value="medium">Medium - Reasonably confident</SelectItem>
                    <SelectItem value="low">Low - Needs verification</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Additional Notes */}
              <div className="form-section">
                <Label htmlFor="additional_notes">Additional Notes</Label>
                <Textarea
                  id="additional_notes"
                  placeholder="Any additional context or clarification"
                  value={formData.additional_notes}
                  onChange={(e) => handleInputChange('additional_notes', e.target.value)}
                  rows={3}
                />
              </div>

              {/* Contact Email */}
              <div className="form-section">
                <Label htmlFor="contact_email">Contact Email (Optional)</Label>
                <Input
                  id="contact_email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.contact_email}
                  onChange={(e) => handleInputChange('contact_email', e.target.value)}
                />
                <p className="mt-1 text-sm text-slate-500">
                  In case we need clarification about your submission.
                </p>
              </div>

              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Submitting...' : 'Submit Correction'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

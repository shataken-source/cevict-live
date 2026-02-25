import { useState } from 'react';
import { Upload, FileText, Shield, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { rateLimiter, RATE_LIMITS } from '@/lib/rateLimiter';
import DOMPurify from 'isomorphic-dompurify';

export default function CaptainApplicationFormSecure() {

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '', email: '', phone: '', location: '', uscgLicense: '',
    yearsExperience: '', specialties: '', bio: '', insuranceProvider: '', insuranceCoverage: ''
  });
  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    uscgLicense: null, insurance: null, certifications: null
  });

  const handleFileChange = (type: string, file: File | null) => {
    if (file && file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)');

      return;
    }
    setFiles(prev => ({ ...prev, [type]: file }));
  };

  const uploadDocument = async (file: File, type: string, captainId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${captainId}/${type}-${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('captain-verification-docs')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;
    return fileName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting
    if (!rateLimiter.limit(`captain_app_${formData.email}`, RATE_LIMITS.AUTH)) {
      toast.error('Too many attempts. Please wait.');

      return;
    }

    setLoading(true);

    try {
      // Sanitize inputs
      const sanitized = {
        ...formData,
        fullName: DOMPurify.sanitize(formData.fullName),
        bio: DOMPurify.sanitize(formData.bio),
        specialties: DOMPurify.sanitize(formData.specialties)
      };

      // Create captain account first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: sanitized.email,
        password: crypto.randomUUID(), // Secure temp password — user resets via email
        options: {
          data: { role: 'captain_pending', full_name: sanitized.fullName }
        }
      });

      if (authError) throw authError;
      const captainId = authData.user?.id;

      // Upload documents
      const uploadedDocs: { [key: string]: string } = {};
      for (const [type, file] of Object.entries(files)) {
        if (file) uploadedDocs[type] = await uploadDocument(file, type, captainId!);
      }

      // Submit application
      await supabase.from('captain_applications').insert({
        captain_id: captainId,
        ...sanitized,
        documents: uploadedDocs,
        status: 'pending'
      });

      toast.success('Application submitted! Check your email.');

      setFormData({
        fullName: '', email: '', phone: '', location: '', uscgLicense: '',
        yearsExperience: '', specialties: '', bio: '', insuranceProvider: '', insuranceCoverage: ''
      });
      setFiles({ uscgLicense: null, insurance: null, certifications: null });
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit application');

    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input id="fullName" required value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" required value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Application'}
      </Button>
    </form>
  );
}

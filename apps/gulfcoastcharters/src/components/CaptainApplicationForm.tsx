import { useState } from 'react';
import { Upload, FileText, Shield, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function CaptainApplicationForm() {
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    uscgLicense: '',
    yearsExperience: '',
    specialties: '',
    bio: '',
    insuranceProvider: '',
    insuranceCoverage: ''
  });
  const [files, setFiles] = useState<{[key: string]: File | null}>({
    uscgLicense: null,
    insurance: null,
    certifications: null
  });

  const handleFileChange = (type: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [type]: file }));
  };

  const uploadDocument = async (file: File, type: string, captainId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${captainId}/${type}-${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('captain-verification-docs')
      .upload(fileName, file);
    
    if (error) throw error;
    return fileName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload documents
      const captainId = crypto.randomUUID();
      const uploadedDocs: {[key: string]: string} = {};
      
      for (const [type, file] of Object.entries(files)) {
        if (file) {
          uploadedDocs[type] = await uploadDocument(file, type, captainId);
        }
      }

      // Submit application via edge function
      const { data, error } = await supabase.functions.invoke('captain-auth', {
        body: {
          action: 'submit_application',
          ...formData,
          documents: uploadedDocs
        }
      });

      if (error) throw error;

      toast.success('Your captain application has been submitted for review.');

      // Reset form
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
              <Input
                id="fullName"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                required
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                required
                placeholder="City, State"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Credentials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="uscgLicense">USCG License Number *</Label>
              <Input
                id="uscgLicense"
                required
                value={formData.uscgLicense}
                onChange={(e) => setFormData({...formData, uscgLicense: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="yearsExperience">Years Experience *</Label>
              <Input
                id="yearsExperience"
                type="number"
                required
                value={formData.yearsExperience}
                onChange={(e) => setFormData({...formData, yearsExperience: e.target.value})}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="specialties">Specialties (comma separated)</Label>
            <Input
              id="specialties"
              placeholder="Deep Sea Fishing, Inshore Fishing, etc."
              value={formData.specialties}
              onChange={(e) => setFormData({...formData, specialties: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              rows={4}
              value={formData.bio}
              onChange={(e) => setFormData({...formData, bio: e.target.value})}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Document Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="uscgDoc">USCG License Document *</Label>
            <Input
              id="uscgDoc"
              type="file"
              required
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileChange('uscgLicense', e.target.files?.[0] || null)}
            />
          </div>
          <div>
            <Label htmlFor="insuranceDoc">Insurance Certificate *</Label>
            <Input
              id="insuranceDoc"
              type="file"
              required
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileChange('insurance', e.target.files?.[0] || null)}
            />
          </div>
          <div>
            <Label htmlFor="certsDoc">Additional Certifications</Label>
            <Input
              id="certsDoc"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileChange('certifications', e.target.files?.[0] || null)}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Application'}
      </Button>
    </form>
  );
}

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export function SuggestionBox({ userType }: { userType: 'captain' | 'customer' }) {
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!category || !subject || !message) {
      toast.error('Please fill all fields');
      return;
    }

    setSubmitting(true);
    try {
      await supabase.functions.invoke('suggestion-system', {
        body: { userType, category, subject, message }
      });
      toast.success('Thank you! Your suggestion has been submitted.');
      setCategory('');
      setSubject('');
      setMessage('');
    } catch (error) {
      toast.error('Failed to submit suggestion');
    }
    setSubmitting(false);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <MessageSquare className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-bold">Suggestion Box</h3>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        We value your feedback! Share your ideas to help us improve Gulf Coast Charters.
      </p>
      <div className="space-y-4">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="feature">New Feature</SelectItem>
            <SelectItem value="improvement">Improvement</SelectItem>
            <SelectItem value="bug">Bug Report</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Textarea placeholder="Describe your suggestion..." value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
        <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-gradient-to-r from-blue-600 to-cyan-600">
          <Send className="w-4 h-4 mr-2" />Submit Suggestion
        </Button>
      </div>
    </Card>
  );
}

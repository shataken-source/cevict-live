import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { sendConversationTranscript } from '@/utils/sendConversationEmail';
import { toast } from 'sonner';

export function SendTranscriptButton() {
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      await sendConversationTranscript('jason@gulfcoastcharters.com');
      toast.success('Transcript sent successfully to jason@gulfcoastcharters.com');
    } catch (error) {
      toast.error('Failed to send transcript. Please try again.');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Button 
      onClick={handleSend} 
      disabled={sending}
      className="gap-2"
    >
      <Mail className="w-4 h-4" />
      {sending ? 'Sending...' : 'Send Session Transcript'}
    </Button>
  );
}

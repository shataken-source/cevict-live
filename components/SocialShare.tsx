'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Share2, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Mail, 
  Link2, 
  Download,
  QrCode,
  Check
} from 'lucide-react';

interface SocialShareProps {
  title: string;
  description: string;
  url: string;
  type?: 'law' | 'place' | 'comparison' | 'general';
  metadata?: {
    state?: string;
    category?: string;
    tags?: string[];
  };
}

export default function SocialShare({ 
  title, 
  description, 
  url, 
  type = 'general',
  metadata 
}: SocialShareProps) {
  const [copied, setCopied] = useState(false);
  const [embedCode, setEmbedCode] = useState('');
  const [showEmbed, setShowEmbed] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.origin + url : url;
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);
  const encodedUrl = encodeURIComponent(shareUrl);

  const generateEmbedCode = () => {
    const code = `<iframe src="${shareUrl}?embed=true" width="600" height="400" frameborder="0" title="${title}"></iframe>`;
    setEmbedCode(code);
    setShowEmbed(true);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareOnFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      '_blank',
      'width=600,height=400'
    );
  };

  const shareOnTwitter = () => {
    const text = `${title} - ${description}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodedUrl}`,
      '_blank',
      'width=600,height=400'
    );
  };

  const shareOnLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      '_blank',
      'width=600,height=400'
    );
  };

  const shareViaEmail = () => {
    const subject = title;
    const body = `I thought you might find this interesting:\n\n${title}\n${description}\n\n${shareUrl}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const downloadImage = async () => {
    // Create a canvas-based image for sharing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1200;
    canvas.height = 630;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1e293b');
    gradient.addColorStop(1, '#334155');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Logo and branding
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('SmokersRights', 60, 100);

    // Title
    ctx.font = 'bold 36px Arial';
    ctx.fillText(title, 60, 200);

    // Description (truncated)
    ctx.font = '24px Arial';
    const maxWidth = 1000;
    const lines = wrapText(ctx, description, maxWidth);
    lines.slice(0, 3).forEach((line, index) => {
      ctx.fillText(line, 60, 280 + (index * 40));
    });

    // Metadata badges
    if (metadata) {
      let yOffset = 450;
      ctx.font = '18px Arial';
      
      if (metadata.state) {
        ctx.fillStyle = '#3b82f6';
        ctx.fillText(`📍 ${metadata.state}`, 60, yOffset);
        yOffset += 30;
      }
      
      if (metadata.category) {
        ctx.fillStyle = '#10b981';
        ctx.fillText(`📋 ${metadata.category}`, 60, yOffset);
        yOffset += 30;
      }
    }

    // Footer
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px Arial';
    ctx.fillText(shareUrl, 60, 580);

    // Download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  };

  const generateQRCode = () => {
    // This would integrate with a QR code library
    // For now, we'll open a QR code service
    window.open(
      `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}`,
      '_blank'
    );
  };

  return (
    <div className="flex items-center gap-2">
      {/* Quick Share Buttons */}
      <Button
        variant="outline"
        size="sm"
        onClick={shareOnFacebook}
        className="text-blue-600 hover:text-blue-700"
      >
        <Facebook className="w-4 h-4" />
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={shareOnTwitter}
        className="text-sky-500 hover:text-sky-600"
      >
        <Twitter className="w-4 h-4" />
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={shareOnLinkedIn}
        className="text-blue-700 hover:text-blue-800"
      >
        <Linkedin className="w-4 h-4" />
      </Button>

      {/* More Options Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={shareViaEmail}>
            <Mail className="w-4 h-4 mr-2" />
            Share via Email
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => copyToClipboard(shareUrl)}>
            <Link2 className="w-4 h-4 mr-2" />
            {copied ? 'Copied!' : 'Copy Link'}
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={downloadImage}>
            <Download className="w-4 h-4 mr-2" />
            Download Image
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={generateQRCode}>
            <QrCode className="w-4 h-4 mr-2" />
            Generate QR Code
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={generateEmbedCode}>
            <Link2 className="w-4 h-4 mr-2" />
            Get Embed Code
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Embed Dialog */}
      <Dialog open={showEmbed} onOpenChange={setShowEmbed}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Embed This Content</DialogTitle>
            <DialogDescription>
              Copy this code to embed on your website
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Input
                value={embedCode}
                readOnly
                className="pr-10 font-mono text-xs"
              />
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-1 top-1"
                onClick={() => copyToClipboard(embedCode)}
              >
                {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
              </Button>
            </div>
            
            <div className="text-sm text-slate-600">
              <p className="font-medium mb-2">Preview:</p>
              <div className="border rounded p-2 bg-slate-50">
                <div className="text-xs text-slate-500">
                  {title} - Embedded from SmokersRights
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Type-specific badges */}
      {type && (
        <Badge variant="outline" className="text-xs">
          {type === 'law' && '📋 Law'}
          {type === 'place' && '📍 Place'}
          {type === 'comparison' && '⚖️ Comparison'}
          {type === 'general' && '🌊 SmokersRights'}
        </Badge>
      )}
    </div>
  );
}

// Social Share Card Component for Law Cards
export function LawCardShare({ law }: { law: any }) {
  const shareData = {
    title: `${law.category} - ${law.state_name}`,
    description: law.summary,
    url: `/laws/${law.state_code}/${law.category}`,
    type: 'law' as const,
    metadata: {
      state: law.state_name,
      category: law.category,
      tags: law.tags
    }
  };

  return <SocialShare {...shareData} />;
}

// Social Share Card Component for Directory Places
export function PlaceCardShare({ place }: { place: any }) {
  const shareData = {
    title: place.name,
    description: place.description || `Smoker-friendly place in ${place.city}, ${place.state_code}`,
    url: `/places/${place.id}`,
    type: 'place' as const,
    metadata: {
      state: place.state_code,
      category: place.category
    }
  };

  return <SocialShare {...shareData} />;
}

// Social Share Card Component for Comparisons
export function ComparisonShare({ state1, state2 }: { state1: string, state2: string }) {
  const shareData = {
    title: `Laws: ${state1} vs ${state2}`,
    description: `Compare smoking and vaping laws between ${state1} and ${state2}`,
    url: `/compare?state1=${state1}&state2=${state2}`,
    type: 'comparison' as const
  };

  return <SocialShare {...shareData} />;
}

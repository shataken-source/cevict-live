import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AffiliatePromotionalKit({ affiliateCode }: { affiliateCode: string }) {
  const { toast } = useToast();
  const baseUrl = window.location.origin;

  const banners = [
    { size: '728x90', name: 'Leaderboard Banner' },
    { size: '300x250', name: 'Medium Rectangle' },
    { size: '160x600', name: 'Wide Skyscraper' }
  ];

  const emailTemplate = `Subject: Discover Amazing Fishing Charters!

Hi [Name],

I wanted to share something exciting with you! I've been using Gulf Coast Charters to book incredible fishing trips, and I think you'd love it too.

Use my code: ${affiliateCode} to get started!

Check it out: ${baseUrl}?aff=${affiliateCode}

Happy fishing!`;

  const socialPosts = [
    `🎣 Just found the best fishing charter platform! Use code ${affiliateCode} for an amazing experience. ${baseUrl}?aff=${affiliateCode}`,
    `🚤 Planning your next fishing trip? Check out Gulf Coast Charters! My code: ${affiliateCode} ${baseUrl}?aff=${affiliateCode}`,
    `🌊 Amazing fishing adventures await! Join me on Gulf Coast Charters with code ${affiliateCode} ${baseUrl}?aff=${affiliateCode}`
  ];

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied!`, description: 'Ready to share' });
  };

  const downloadBanner = (size: string, name: string) => {
    const [w, h] = size.split('x').map(Number);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#38bdf8';
    ctx.font = `bold ${Math.min(w / 12, 24)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Gulf Coast Charters', w / 2, h / 2 - 10);
    ctx.font = `${Math.min(w / 20, 14)}px system-ui, sans-serif`;
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`Code: ${affiliateCode}`, w / 2, h / 2 + 16);
    const link = document.createElement('a');
    link.download = `gulf-coast-charters-banner-${size}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast({ title: 'Banner downloaded', description: `${name} (${size}px)` });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Promotional Materials</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="banners">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="banners">Banners</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="social">Social Media</TabsTrigger>
          </TabsList>

          <TabsContent value="banners" className="space-y-4">
            {banners.map(banner => (
              <div key={banner.size} className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{banner.name}</p>
                  <p className="text-sm text-gray-500">{banner.size}px</p>
                </div>
                <Button variant="outline" onClick={() => downloadBanner(banner.size, banner.name)}>
                  <Download className="w-4 h-4 mr-2" />Download
                </Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg border">
              <pre className="text-sm whitespace-pre-wrap">{emailTemplate}</pre>
            </div>
            <Button onClick={() => copyText(emailTemplate, 'Email template')} className="w-full">
              <Copy className="w-4 h-4 mr-2" />Copy Email Template
            </Button>
          </TabsContent>

          <TabsContent value="social" className="space-y-4">
            {socialPosts.map((post, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-lg border">
                <p className="text-sm mb-3">{post}</p>
                <Button onClick={() => copyText(post, 'Social post')} variant="outline" size="sm">
                  <Copy className="w-4 h-4 mr-2" />Copy
                </Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

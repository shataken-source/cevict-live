import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const AdvertiserEmailTemplate: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const emailTemplate = `Subject: Advertising Opportunity with Gulf Coast Charters

Dear [Business Name],

I hope this message finds you well. My name is [Your Name], and I'm reaching out from Gulf Coast Charters (gulfcoastcharters.com), the premier online platform connecting anglers and boaters with charter fishing experiences, boat rentals, and marine services along the Gulf Coast.

WHY ADVERTISE WITH US?

Our platform attracts thousands of targeted visitors each month who are actively planning fishing trips and marine adventures. Here's what makes us unique:

• High-Intent Audience: Visitors are ready to book charters, rent boats, and purchase marine gear
• Regional Focus: Connect with anglers and boaters specifically interested in Gulf Coast fishing
• Engaged Community: Average session time of 5+ minutes with users actively researching charter options
• Growing Platform: Rapidly expanding user base with 20%+ monthly growth

ADVERTISING OPTIONS:

1. Banner Ads - Premium placement on high-traffic pages
2. Sidebar Ads - Consistent visibility throughout user browsing
3. Featured Listings - Top placement in charter and boat rental search results
4. Newsletter Sponsorship - Direct access to our email subscriber base

IDEAL FOR:

• Marine equipment and tackle shops
• Hotels and waterfront accommodations
• Restaurants and seafood establishments
• Boat dealers and marine services
• Tourism boards and visitor bureaus
• Fishing gear manufacturers and retailers

We offer flexible packages to fit various budgets and goals. I'd love to schedule a brief call to discuss how we can help [Business Name] reach our highly targeted audience of fishing enthusiasts.

Are you available for a 15-minute call this week to explore partnership opportunities?

Best regards,
[Your Name]
Gulf Coast Charters
[Your Email]
[Your Phone]
gulfcoastcharters.com`;



  const handleCopy = () => {
    navigator.clipboard.writeText(emailTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Advertiser Email Template</CardTitle>
          <p className="text-sm text-gray-600">
            Professional email template for inviting businesses to advertise on Gulf Coast Charters
          </p>


        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-6 rounded-lg border">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {emailTemplate}
            </pre>
          </div>

          <Button onClick={handleCopy} className="w-full">
            {copied ? 'Copied to Clipboard!' : 'Copy Email Template'}
          </Button>

          {copied && (
            <Alert className="bg-green-50">
              <AlertDescription>
                Template copied! Paste it into your email client and personalize it.
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Tips for Using This Template:</h3>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>Replace [Business Name], [Your Name], etc. with actual details</li>
              <li>Research the business beforehand and mention specific products/services</li>
              <li>Include actual traffic stats if available</li>
              <li>Attach a media kit or rate card for detailed information</li>
              <li>Follow up within 3-5 days if no response</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvertiserEmailTemplate;

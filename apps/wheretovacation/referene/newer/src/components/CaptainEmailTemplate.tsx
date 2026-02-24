import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CaptainEmailTemplate() {
  const [copied, setCopied] = useState(false);

  const emailTemplate = `Subject: Join Gulf Coast Charters - Reach More Customers Today!

Dear Captain,

I hope this message finds you well! I'm reaching out to invite you to list your charter business on Gulf Coast Charters, the premier platform connecting fishing enthusiasts with professional charter captains across the Gulf Coast.

WHY LIST WITH US?

• Increased Visibility: Reach thousands of potential customers actively searching for charter experiences
• Free Listing: Get started at no cost and showcase your boat, services, and expertise
• Real-Time Weather: Your listings include live weather data to help customers plan their trips
• Customer Reviews: Build your reputation with authentic customer feedback
• Easy Management: Update your availability, pricing, and details anytime
• Mobile-Friendly: Customers can find and book you from any device

WHAT WE NEED FROM YOU:

• Business & captain name
• Boat specifications (type, length, capacity)
• Location and operating area
• Pricing information
• Contact details
• High-quality photos of your vessel
• Brief description of your services

Getting started takes just 5 minutes! Visit our website and click "List Your Business" or reply to this email and I'll personally assist you with the setup.

Join the growing community of successful charter captains who are already benefiting from increased bookings through our platform.

Best regards,
Gulf Coast Charters Team

P.S. Early listings receive premium placement in search results for the first 30 days!`;

  const handleCopy = () => {
    navigator.clipboard.writeText(emailTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold text-gray-900">Captain Invitation Email Template</h3>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-lg transition"
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? 'Copied!' : 'Copy Email'}
        </button>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
          {emailTemplate}
        </pre>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">Tips for Using This Template:</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Personalize with the captain's name if you have it</li>
          <li>Add your direct contact information</li>
          <li>Include a link to your listing page</li>
          <li>Follow up after 5-7 days if no response</li>
          <li>Consider offering a limited-time promotion for new listings</li>
        </ul>
      </div>
    </div>
  );
}

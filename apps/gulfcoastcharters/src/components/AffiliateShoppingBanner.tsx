import { useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AffiliateShoppingBanner() {
  const [dismissed, setDismissed] = useState(false);

  const affiliates = [
    {
      name: 'Amazon',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
      url: 'https://www.amazon.com/?tag=youraffid-20',
      tagline: 'Shop Marine Gear',
      color: 'from-orange-500 to-yellow-500'
    },
    {
      name: 'BoatUS',
      logo: 'https://www.boatus.com/assets/img/logo.png',
      url: 'https://www.boatus.com/?affiliate=youraffid',
      tagline: 'Boating Essentials',
      color: 'from-blue-600 to-blue-800'
    },
    {
      name: 'Walmart',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Walmart_logo.svg',
      url: 'https://www.walmart.com/?affcamid=youraffid',
      tagline: 'Outdoor & Marine',
      color: 'from-blue-500 to-blue-700'
    }
  ];

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-y border-gray-200 py-6 relative">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        aria-label="Dismiss banner"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div className="container mx-auto px-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Shop Boating Gear & Supplies</h3>
          <p className="text-sm text-gray-600">Support us while you shop</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {affiliates.map((affiliate) => (
            <a
              key={affiliate.name}
              href={affiliate.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className={`bg-gradient-to-br ${affiliate.color} p-4 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105 text-white group`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-lg">{affiliate.name}</span>
                <ExternalLink className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-sm opacity-90">{affiliate.tagline}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

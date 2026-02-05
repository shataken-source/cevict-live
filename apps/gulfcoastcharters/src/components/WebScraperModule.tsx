import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function WebScraperModule() {
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleScan = async () => {
    if (!searchTerm || !location) {
      alert('Please enter both search term and location');
      return;
    }

    setIsScanning(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('web-scraper', {
        body: { searchTerm, location },
      });

      if (error) throw error;

      setResults(data.results || []);
      alert(`Scan complete! Found ${data.count} potential charter businesses.`);
    } catch (error) {
      console.error('Error scanning:', error);
      alert('Error scanning. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleImport = (index: number) => {
    const result = results[index];
    alert(`Importing "${result.businessName}" to draft listings for review.`);
  };

  return (
    <div className="bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Web Scraper Module</h2>
        <p className="text-gray-600 mb-8">
          Automatically discover charter businesses online and import their information.
        </p>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Search Term</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="e.g., charter boat, fishing charter"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Galveston, TX"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleScan}
            disabled={isScanning || !searchTerm || !location}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50"
          >
            {isScanning ? 'Scanning...' : 'Start Scan'}
          </button>

          {results.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4">Found {results.length} Results</h3>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold">{result.businessName}</h4>
                      <p className="text-sm text-gray-600">{result.website}</p>
                      <p className="text-sm text-gray-600">{result.phone}</p>
                      <p className="text-sm text-gray-500">{result.description}</p>
                    </div>
                    <button
                      onClick={() => handleImport(index)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
                    >
                      Import
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

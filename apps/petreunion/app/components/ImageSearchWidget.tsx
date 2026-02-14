'use client';

import { useState } from 'react';

interface Match {
  id: string;
  pet_name: string;
  pet_type: string;
  breed: string;
  color: string;
  photo_url: string;
  location_city: string;
  location_state: string;
  status: string;
  similarity: number;
}

export default function ImageSearchWidget() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setMatches([]);
      setError('');
    }
  };

  const handleSearch = async () => {
    if (!imageFile) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError('');
    setMatches([]);

    try {
      // Upload image to temporary storage or convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);
      reader.onload = async () => {
        const base64Image = reader.result as string;

        // Call match API
        const response = await fetch('/api/petreunion/match-by-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: base64Image, // CLIP can handle base64 data URLs
            threshold: 0.65, // Lower threshold for more results
            limit: 10,
            status: 'all',
          }),
        });

        const data = await response.json();

        if (data.success) {
          setMatches(data.matches || []);
          if (data.matches.length === 0) {
            setError('No similar pets found. Try adjusting the photo or search again later.');
          }
        } else {
          setError(data.error || 'Search failed');
        }
        setLoading(false);
      };
      reader.onerror = () => {
        setError('Failed to read image file');
        setLoading(false);
      };
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-2xl font-bold text-purple-700 mb-4">
        🔍 Search by Photo (AI-Powered)
      </h2>
      <p className="text-gray-600 mb-4">
        Upload a photo of a pet you found or are looking for. Our AI will find visually similar pets in our database.
      </p>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Photo
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
        />
      </div>

      {previewUrl && (
        <div className="mb-4">
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-xs max-h-64 rounded-lg border-2 border-gray-300"
          />
        </div>
      )}

      <button
        onClick={handleSearch}
        disabled={!imageFile || loading}
        className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Searching...' : 'Find Similar Pets'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {matches.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-4">
            Found {matches.length} Similar Pet{matches.length !== 1 ? 's' : ''}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map((match) => (
              <div
                key={match.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
              >
                {match.photo_url && (
                  <img
                    src={match.photo_url}
                    alt={match.pet_name}
                    className="w-full h-48 object-cover rounded-lg mb-3"
                  />
                )}
                <h4 className="font-bold text-lg text-purple-700">
                  {match.pet_name}
                </h4>
                <p className="text-sm text-gray-600">
                  {match.pet_type} • {match.breed || 'Unknown breed'}
                </p>
                <p className="text-sm text-gray-600">
                  {match.color || 'Color not specified'}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  📍 {match.location_city}, {match.location_state}
                </p>
                <p className="text-sm font-medium text-green-600 mt-2">
                  {Math.round(match.similarity * 100)}% match
                </p>
                <span
                  className={`inline-block mt-2 px-2 py-1 rounded text-xs font-semibold ${
                    match.status === 'lost'
                      ? 'bg-red-100 text-red-700'
                      : match.status === 'found'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {match.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

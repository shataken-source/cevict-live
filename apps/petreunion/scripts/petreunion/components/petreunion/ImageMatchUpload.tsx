import React, { useCallback, useState } from 'react';

interface ImageMatchUploadProps {
  onImageUpload?: (file: File) => void;
  onMatch?: (matchData: any) => void;
  maxSize?: number; // in MB
  acceptedFormats?: string[];
}

export default function ImageMatchUpload({
  onImageUpload,
  onMatch,
  maxSize = 5,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp']
}: ImageMatchUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return;
    }

    // Validate file format
    if (!acceptedFormats.includes(file.type)) {
      setError('Invalid file format. Please upload JPEG, PNG, or WebP images.');
      return;
    }

    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Handle upload
    setIsUploading(true);
    onImageUpload?.(file);

    // Simulate upload completion
    setTimeout(() => {
      setIsUploading(false);
    }, 1000);
  }, [maxSize, acceptedFormats, onImageUpload]);

  const handleMatch = useCallback(async () => {
    if (!preview) return;

    setIsMatching(true);
    try {
      // Simulate image matching
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock match result
      const mockMatchData = {
        confidence: 0.85,
        matches: [
          {
            id: '1',
            name: 'Buddy',
            similarity: 0.92,
            image: '/api/placeholder/300/200'
          }
        ]
      };

      onMatch?.(mockMatchData);
    } catch (err) {
      setError('Failed to match image. Please try again.');
    } finally {
      setIsMatching(false);
    }
  }, [preview, onMatch]);

  const handleClear = useCallback(() => {
    setPreview(null);
    setError(null);
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Image Match Upload</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {!preview ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <label htmlFor="file-upload" className="cursor-pointer">
            <span className="text-lg text-gray-600">Click to upload or drag and drop</span>
            <p className="text-sm text-gray-500 mt-1">
              {acceptedFormats.join(', ')} up to {maxSize}MB
            </p>
            <input
              id="file-upload"
              type="file"
              className="sr-only"
              accept={acceptedFormats.join(',')}
              onChange={handleFileSelect}
              disabled={isUploading}
            />
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <img
              src={preview}
              alt="Upload preview"
              className="w-full h-64 object-cover rounded-lg"
            />
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleMatch}
              disabled={isMatching}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMatching ? 'Matching...' : 'Find Matches'}
            </button>
            <button
              onClick={handleClear}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

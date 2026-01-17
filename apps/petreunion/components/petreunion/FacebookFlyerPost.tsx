
interface FacebookFlyerPostProps {
  pet: {
    name?: string | null;
    type?: string | null;
    breed?: string | null;
    color?: string | null;
    size?: string | null;
    age?: string | null;
    lastSeen?: string | null;
    location?: string | null;
    description?: string | null;
    contact?: {
      phone?: string | null;
      email?: string | null;
    } | null;
    imageUrl?: string | null;
  };
  petUrl?: string;
  onCopy?: () => void;
}

export default function FacebookFlyerPost({ pet, petUrl, onCopy }: FacebookFlyerPostProps) {
  const facebookPost = `🚨 LOST PET ALERT 🚨

${pet.type?.toUpperCase() || 'PET'} MISSING - ${pet.name || 'Unknown'}

🐾 Details:
• Type: ${pet.type || 'Unknown'} (${pet.breed || 'Unknown breed'})
• Color: ${pet.color || 'Unknown'}
• Size: ${pet.size || 'Unknown'}
• Age: ${pet.age || 'Unknown'}

📍 Last Seen:
• Date: ${pet.lastSeen || 'Unknown'}
• Location: ${pet.location || 'Unknown'}

📝 Description:
${pet.description || 'No description available'}

📞 Contact Information:
• Phone: ${pet.contact?.phone || 'Not provided'}
• Email: ${pet.contact?.email || 'Not provided'}

Please share this post to help us find ${pet.name || 'this pet'}! If you have seen this pet or have any information, please contact us immediately.

#LostPet #${pet.type || 'Pet'}Missing #PetReunion #HelpFind${pet.name?.replace(/\s+/g, '') || 'Pet'} #Lost${pet.type || 'Pet'}

${pet.imageUrl ? '\n📷 Photo attached' : ''}`;

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(facebookPost);
    onCopy?.();
  };

  const handleShareToFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Facebook Post Generator</h2>

      {/* Preview */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Preview:</h3>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <pre className="whitespace-pre-wrap text-sm text-gray-800">{facebookPost}</pre>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleCopyToClipboard}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy to Clipboard
        </button>

        <button
          onClick={handleShareToFacebook}
          className="flex-1 bg-blue-700 text-white py-2 px-4 rounded-md hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Share to Facebook
        </button>
      </div>

      {/* Tips */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">Tips for Sharing:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Post in local community groups and lost pet groups</li>
          <li>• Share with friends and ask them to share</li>
          <li>• Post in neighborhood Facebook groups</li>
          <li>• Include a clear photo of the pet</li>
          <li>• Update the post when the pet is found</li>
        </ul>
      </div>

      {/* Hashtag Suggestions */}
      <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-semibold text-gray-700 mb-2">Additional Hashtags:</h4>
        <div className="flex flex-wrap gap-2">
          {[
            `#${pet.location?.replace(/\s+/g, '') || 'UnknownLocation'}`,
            `#${pet.color}${pet.type}`,
            `#${pet.breed?.replace(/\s+/g, '') || 'UnknownBreed'}`,
            '#MissingPet',
            '#PetSearch',
            '#LostAndFoundPets',
            '#CommunityHelp'
          ].map((tag, index) => (
            <span key={index} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

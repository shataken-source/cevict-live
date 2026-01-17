
interface LostPetFlyerProps {
  pet: {
    name: string;
    type: string;
    breed: string;
    color: string;
    size: string;
    age: string;
    lastSeen: string;
    location: string;
    description: string;
    contact: {
      phone: string;
      email: string;
    };
    imageUrl?: string;
  };
  onPrint?: () => void;
  onShare?: () => void;
}

export default function LostPetFlyer({ pet, onPrint, onShare }: LostPetFlyerProps) {
  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-red-600 text-white p-6 text-center">
        <h1 className="text-3xl font-bold mb-2">LOST PET</h1>
        <p className="text-xl">Help us find our beloved companion</p>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pet Image */}
          <div className="flex justify-center">
            {pet.imageUrl ? (
              <img
                src={pet.imageUrl}
                alt={pet.name}
                className="w-full h-64 object-cover rounded-lg"
              />
            ) : (
              <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                <svg
                  className="w-16 h-16 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Pet Information */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{pet.name}</h2>
              <p className="text-lg text-gray-600">{pet.type} • {pet.breed}</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">Color:</span>
                <span className="text-gray-600">{pet.color}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">Size:</span>
                <span className="text-gray-600">{pet.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">Age:</span>
                <span className="text-gray-600">{pet.age}</span>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">Last Seen</h3>
              <p className="text-yellow-700">
                <strong>Date:</strong> {pet.lastSeen}<br />
                <strong>Location:</strong> {pet.location}
              </p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mt-6">
          <h3 className="font-semibold text-gray-700 mb-2">Description</h3>
          <p className="text-gray-600">{pet.description}</p>
        </div>

        {/* Contact Information */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Contact Information</h3>
          <div className="space-y-1">
            <p className="text-blue-700">
              <strong>Phone:</strong> {pet.contact.phone}
            </p>
            <p className="text-blue-700">
              <strong>Email:</strong> {pet.contact.email}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex space-x-4">
          <button
            onClick={onPrint}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Print Flyer
          </button>
          <button
            onClick={onShare}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
          >
            Share Online
          </button>
        </div>

        {/* Urgency Notice */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 italic">
            If you have seen this pet or have any information, please contact us immediately.
            Your help could reunite a family with their beloved pet.
          </p>
        </div>
      </div>
    </div>
  );
}

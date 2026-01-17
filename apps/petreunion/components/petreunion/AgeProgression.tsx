import { useState } from 'react';

interface AgeProgressionProps {
  currentAge?: string;
  petType?: string;
  originalImage?: string;
  breed?: string;
  monthsSinceLoss?: number;
  petName?: string;
  onProgressionComplete?: (progressions: any) => void;
  onAgeChange?: (newAge: string) => void;
}

export default function AgeProgression({
  currentAge,
  petType,
  onAgeChange,
  originalImage,
  breed,
  monthsSinceLoss,
  petName,
  onProgressionComplete
}: AgeProgressionProps) {
  const [selectedAge, setSelectedAge] = useState(currentAge);

  const getAgeProgression = (petType: string) => {
    const dogProgression = [
      { age: 'Puppy (0-1 year)', description: 'Very young, playful, learning basic commands' },
      { age: 'Young (1-3 years)', description: 'Energetic, fully grown, may still be maturing' },
      { age: 'Adult (3-7 years)', description: 'Mature, stable temperament, in prime years' },
      { age: 'Senior (7-10 years)', description: 'Slowing down, may have age-related changes' },
      { age: 'Geriatric (10+ years)', description: 'Older, requires special care and attention' }
    ];

    const catProgression = [
      { age: 'Kitten (0-1 year)', description: 'Very young, playful, learning to hunt' },
      { age: 'Young (1-3 years)', description: 'Active, fully grown, still very playful' },
      { age: 'Adult (3-7 years)', description: 'Mature, stable, in prime years' },
      { age: 'Senior (7-10 years)', description: 'Less active, may have health issues' },
      { age: 'Geriatric (10+ years)', description: 'Older, requires special care' }
    ];

    return petType.toLowerCase() === 'cat' ? catProgression : dogProgression;
  };

  const progression = getAgeProgression(petType || 'dog');
  const currentIndex = progression.findIndex(stage => stage.age === selectedAge);

  const handleAgeSelect = (age: string) => {
    setSelectedAge(age);
    onAgeChange?.(age);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Age Progression</h3>

      <div className="space-y-4">
        {/* Progress Bar */}
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / progression.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {progression.map((stage, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full ${
                  index <= currentIndex ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Age Stages */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {progression.map((stage, index) => (
            <div
              key={index}
              onClick={() => handleAgeSelect(stage.age)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                index === currentIndex
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{stage.age}</h4>
                {index === currentIndex && (
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-sm text-gray-600">{stage.description}</p>
            </div>
          ))}
        </div>

        {/* Current Selection */}
        {currentIndex >= 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Current Selection</h4>
            <p className="text-blue-800">
              <strong>{progression[currentIndex].age}</strong>
            </p>
            <p className="text-blue-700 text-sm mt-1">
              {progression[currentIndex].description}
            </p>
          </div>
        )}

        {/* Age Tips */}
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Age-Related Tips</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Younger pets require more training and socialization</li>
            <li>• Adult pets are often more settled and predictable</li>
            <li>• Senior pets may need special medical attention</li>
            <li>• Consider age when matching with potential adopters</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

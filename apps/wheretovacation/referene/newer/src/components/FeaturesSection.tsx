export default function FeaturesSection() {
  const features = [
    {
      title: 'Verified Captains',
      description: 'All charter captains are licensed and insured professionals',
      icon: '✓',
    },
    {
      title: 'Best Price Guarantee',
      description: 'Compare prices across the Gulf Coast to find the best deal',
      icon: '$',
    },
    {
      title: 'Easy Booking',
      description: 'Direct contact with captains for quick booking confirmations',
      icon: '→',
    },
    {
      title: 'Real Reviews',
      description: 'Read authentic reviews from verified fishing enthusiasts',
      icon: '★',
    },
  ];

  return (
    <div className="bg-white py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Why Choose Gulf Coast Charters?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-blue-900 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>


      </div>
    </div>
  );
}

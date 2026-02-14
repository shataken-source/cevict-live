export default function StatsSection() {
  const stats = [
    { number: '500+', label: 'Charter Boats' },
    { number: '5 States', label: 'Gulf Coast Coverage' },
    { number: '10K+', label: 'Happy Customers' },
    { number: '4.8★', label: 'Average Rating' },
  ];

  return (
    <div className="bg-blue-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl md:text-5xl font-bold mb-2">{stat.number}</div>
              <div className="text-lg text-blue-200">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

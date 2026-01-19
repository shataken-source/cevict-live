import { Search, Calendar, Anchor, CheckCircle } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      icon: Search,
      title: 'Browse & Compare',
      desc: 'Explore 200+ verified charters with transparent pricing',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Calendar,
      title: 'Book Instantly',
      desc: 'Secure your dates with our easy 2-minute booking process',
      color: 'from-cyan-500 to-cyan-600'
    },
    {
      icon: Anchor,
      title: 'Set Sail',
      desc: 'Meet your captain and enjoy your unforgettable adventure',
      color: 'from-teal-500 to-teal-600'
    },
    {
      icon: CheckCircle,
      title: 'Share & Earn',
      desc: 'Leave a review and earn $25 for every friend you refer',
      color: 'from-green-500 to-green-600'
    }
  ];

  return (
    <section className="bg-white py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-gray-600 text-lg">Book your dream charter in 4 simple steps</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, idx) => (
            <div key={idx} className="relative text-center">
              <div className={`w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
                <step.icon className="w-10 h-10 text-white" />
              </div>
              <div className="absolute top-10 left-1/2 w-full h-0.5 bg-gray-200 -z-10 hidden lg:block" 
                   style={{ display: idx === steps.length - 1 ? 'none' : 'block' }} />
              <h3 className="font-bold text-xl mb-2">{step.title}</h3>
              <p className="text-gray-600 text-sm">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

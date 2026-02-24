import { Button } from './ui/button';
import { Ship, DollarSign, Calendar, TrendingUp } from 'lucide-react';

export default function BecomeCaptainCTA() {
  const benefits = [
    { icon: DollarSign, title: 'Earn More', description: 'Set your own rates and keep 85% of bookings' },
    { icon: Calendar, title: 'Flexible Schedule', description: 'Work when you want, manage your availability' },
    { icon: TrendingUp, title: 'Grow Your Business', description: 'Access thousands of potential customers' },
  ];

  return (
    <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900 py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center text-white mb-12">
          <Ship className="w-16 h-16 mx-auto mb-6 text-cyan-300" />
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Are You a Charter Captain?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join our platform and connect with thousands of fishing enthusiasts looking for their next adventure
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {benefits.map((benefit, index) => (
            <div key={index} className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center text-white">
              <benefit.icon className="w-12 h-12 mx-auto mb-4 text-cyan-300" />
              <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
              <p className="text-blue-100">{benefit.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button 
            size="lg" 
            className="bg-white text-blue-900 hover:bg-blue-50 text-lg px-8 py-6 h-auto"
            onClick={() => window.location.href = '/apply-captain'}
          >
            Start Your Captain Application
          </Button>
          <p className="text-blue-200 mt-4">Already a captain? <a href="/captain-login" className="underline hover:text-white">Login here</a></p>
        </div>
      </div>
    </div>
  );
}

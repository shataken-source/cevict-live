import { Shield, Lock, Award, RefreshCw, CreditCard, Clock } from 'lucide-react';

export default function TrustBadges() {
  const badges = [
    { icon: Shield, title: 'Secure Booking', desc: '256-bit SSL encryption' },
    { icon: Award, title: 'Best Price Guarantee', desc: 'We match any lower price' },
    { icon: RefreshCw, title: 'Free Cancellation', desc: 'Up to 48 hours before' },
    { icon: CreditCard, title: 'Secure Payments', desc: 'PCI DSS compliant' },
    { icon: Clock, title: '24/7 Support', desc: 'Always here to help' },
    { icon: Lock, title: 'Privacy Protected', desc: 'Your data is safe' }
  ];

  return (
    <section className="bg-gradient-to-br from-blue-50 to-cyan-50 py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-8">Book With Confidence</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {badges.map((badge, idx) => (
            <div key={idx} className="bg-white rounded-lg p-4 text-center shadow-md hover:shadow-lg transition">
              <badge.icon className="w-10 h-10 mx-auto mb-2 text-blue-600" />
              <h3 className="font-semibold text-sm mb-1">{badge.title}</h3>
              <p className="text-xs text-gray-600">{badge.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

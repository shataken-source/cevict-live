import { Shield, Award, CheckCircle, Users } from 'lucide-react';

export default function TrustBadgesBar() {
  const badges = [
    { icon: Shield, label: 'Insured & Licensed', color: 'text-blue-600' },
    { icon: Award, label: 'BBB Accredited', color: 'text-green-600' },
    { icon: CheckCircle, label: 'USCG Verified', color: 'text-cyan-600' },
    { icon: Users, label: '10,000+ Happy Customers', color: 'text-purple-600' }
  ];

  return (
    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 py-6 border-y border-blue-100">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {badges.map((badge, idx) => (
            <div key={idx} className="flex items-center justify-center gap-2 text-center">
              <badge.icon className={`w-6 h-6 ${badge.color}`} />
              <span className="text-sm font-semibold text-gray-700">{badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

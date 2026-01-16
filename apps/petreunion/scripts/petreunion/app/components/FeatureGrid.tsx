'use client';

import { Shield, Sparkles, TrendingUp, Users } from '@/components/ui/icons';

export function FeatureGrid() {
  const features = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Secure & Private",
      description: "Your data is encrypted and never shared without permission."
    },
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: "AI-Powered Matching",
      description: "Advanced algorithms to help find your lost pet faster."
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Real-time Updates",
      description: "Get instant notifications about potential matches."
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Community Support",
      description: "Join a network of pet lovers ready to help."
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 mb-16">
      <h2 className="text-3xl font-bold text-center mb-12">Why Choose PetReunion?</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {features.map((feature, index) => (
          <div key={index} className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300">
              {feature.icon}
            </div>
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

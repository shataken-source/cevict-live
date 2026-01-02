'use client';

import { useState } from 'react';
import PaymentForm from '@/components/Payment/PaymentForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Shield, Zap, Users, Globe } from 'lucide-react';

export default function PricingPage() {
  const [showPayment, setShowPayment] = useState(false);

  const features = [
    {
      icon: Globe,
      title: 'Comprehensive Coverage',
      description: 'Access smoking and vaping laws for all Southeast states',
    },
    {
      icon: Zap,
      title: 'Real-Time Updates',
      description: 'Get notified when laws change in your area',
    },
    {
      icon: Users,
      title: 'Community Driven',
      description: 'Contributions from thousands of users like you',
    },
    {
      icon: Shield,
      title: 'Verified Information',
      description: 'All content reviewed and verified by our team',
    },
  ];

  if (showPayment) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto py-8">
          <button
            onClick={() => setShowPayment(false)}
            className="mb-6 text-blue-600 hover:text-blue-800"
          >
            ← Back to Pricing
          </button>
          <PaymentForm
            amount={19.99}
            description="SmokersRights Professional Plan"
            onSuccess={() => {
              alert('Payment successful! Thank you for your support.');
              setShowPayment(false);
            }}
            onError={(error) => {
              alert(`Payment failed: ${error}`);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <Badge className="mb-4">Premium Features</Badge>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              Support Civil Liberties
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Join thousands of advocates who rely on SmokersRights for accurate, 
              up-to-date information on smoking and vaping regulations.
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-slate-600 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Free Plan */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="text-xl">Free</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold">$0</span>
                <span className="text-slate-600">/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Basic state law browsing
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Simple search functionality
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Community submissions
                </li>
                <li className="flex items-center text-slate-400">
                  <div className="w-4 h-4 border-2 border-slate-300 rounded mr-2" />
                  Advanced search filters
                </li>
                <li className="flex items-center text-slate-400">
                  <div className="w-4 h-4 border-2 border-slate-300 rounded mr-2" />
                  Law comparison tool
                </li>
                <li className="flex items-center text-slate-400">
                  <div className="w-4 h-4 border-2 border-slate-300 rounded mr-2" />
                  Email notifications
                </li>
              </ul>
              <Button variant="outline" className="w-full" disabled>
                Current Plan
              </Button>
            </CardContent>
          </Card>

          {/* Professional Plan */}
          <Card className="relative ring-2 ring-blue-500 shadow-lg">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-blue-500">Most Popular</Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                Professional
                <Star className="w-5 h-5 text-yellow-500 fill-current" />
              </CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold">$19.99</span>
                <span className="text-slate-600">/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Everything in Free
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Advanced search & filters
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Law comparison tool
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Email notifications
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Priority support
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Mobile app access
                </li>
              </ul>
              <Button 
                className="w-full" 
                onClick={() => setShowPayment(true)}
              >
                Upgrade Now
              </Button>
            </CardContent>
          </Card>

          {/* Enterprise Plan */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="text-xl">Enterprise</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold">$49.99</span>
                <span className="text-slate-600">/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Everything in Professional
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  API access
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Custom reports
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Dedicated support
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Team collaboration
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  White-label options
                </li>
              </ul>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowPayment(true)}
              >
                Contact Sales
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Testimonials */}
        <div className="bg-white rounded-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-8">
            Trusted by Advocates Nationwide
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-200 rounded-full mx-auto mb-4"></div>
              <p className="text-slate-600 italic mb-2">
                "SmokersRights has been invaluable for staying compliant with changing regulations."
              </p>
              <p className="font-semibold">Sarah J.</p>
              <p className="text-sm text-slate-500">Business Owner</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-200 rounded-full mx-auto mb-4"></div>
              <p className="text-slate-600 italic mb-2">
                "The comparison tool saves me hours of research every week."
              </p>
              <p className="font-semibold">Michael R.</p>
              <p className="text-sm text-slate-500">Legal Consultant</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-200 rounded-full mx-auto mb-4"></div>
              <p className="text-slate-600 italic mb-2">
                "Accurate, up-to-date information that I can rely on."
              </p>
              <p className="font-semibold">Jennifer L.</p>
              <p className="text-sm text-slate-500">Advocate</p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-600 mb-8">
            Have questions? We're here to help.
          </p>
          <Button variant="outline">
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
}

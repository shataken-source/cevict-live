'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, CheckCircle2, Globe, Heart, Mail, Phone, Shield, Star, TrendingUp } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { useState } from 'react';

export default function SponsorPage() {
  const [formData, setFormData] = useState({
    organizationName: '',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    sponsorshipLevel: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sponsorshipLevels = [
    {
      name: 'Bronze',
      amount: '$500',
      benefits: [
        'Logo on website footer',
        'Social media recognition',
        'Quarterly newsletter mention'
      ]
    },
    {
      name: 'Silver',
      amount: '$1,500',
      benefits: [
        'Everything in Bronze',
        'Logo on homepage',
        'Featured in monthly newsletter',
        'Recognition at events'
      ]
    },
    {
      name: 'Gold',
      amount: '$3,500',
      benefits: [
        'Everything in Silver',
        'Prominent logo placement',
        'Dedicated sponsor page',
        'Quarterly impact reports',
        'Priority support'
      ]
    },
    {
      name: 'Platinum',
      amount: '$7,500+',
      benefits: [
        'Everything in Gold',
        'Exclusive sponsor recognition',
        'Custom partnership opportunities',
        'Annual impact report',
        'Direct contact with leadership'
      ]
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // In a real implementation, you would:
      // 1. Send email to admin team
      // 2. Save to database
      // 3. Send confirmation email to sponsor

      const subject = encodeURIComponent(`PetReunion Sponsorship Inquiry - ${formData.sponsorshipLevel || 'General'}`);
      const lines = [
        `Organization: ${formData.organizationName}`,
        `Contact: ${formData.contactName}`,
        `Email: ${formData.email}`,
        `Phone: ${formData.phone || 'N/A'}`,
        `Website: ${formData.website || 'N/A'}`,
        `Interested level: ${formData.sponsorshipLevel || 'N/A'}`,
        '',
        formData.message || '',
      ];

      const body = encodeURIComponent(lines.join('\n'));
      window.location.href = `mailto:sponsors@petreunion.org?subject=${subject}&body=${body}`;

      // Reset form
      setFormData({
        organizationName: '',
        contactName: '',
        email: '',
        phone: '',
        website: '',
        sponsorshipLevel: '',
        message: ''
      });
    } catch (error) {
      alert('Failed to submit sponsorship inquiry. Please try again or contact us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-4 rounded-full">
              <Shield className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-gray-900">Become a Sponsor</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Partner with PetReunion to make a lasting impact in your community while gaining valuable brand exposure.
          </p>
        </div>

        {/* Benefits Section */}
        <Card className="mb-12 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Star className="w-6 h-6 text-purple-600" />
              Why Sponsor PetReunion?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Community Impact</h3>
                    <p className="text-gray-600 text-sm">
                      Support a cause that directly helps families in your community reunite with their beloved pets.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Brand Visibility</h3>
                    <p className="text-gray-600 text-sm">
                      Reach thousands of pet owners and animal lovers through our platform and social media.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Tax Benefits</h3>
                    <p className="text-gray-600 text-sm">
                      PetReunion is a 501(c)(3) nonprofit - your sponsorship is tax-deductible.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Measurable Impact</h3>
                    <p className="text-gray-600 text-sm">
                      Receive regular reports on how your sponsorship is helping reunite pets with families.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sponsorship Levels */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Sponsorship Levels</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {sponsorshipLevels.map((level) => (
              <Card
                key={level.name}
                className={`relative overflow-hidden ${level.name === 'Gold' ? 'border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50' :
                  level.name === 'Platinum' ? 'border-2 border-purple-400 bg-gradient-to-br from-purple-50 to-pink-50' :
                    'border-gray-200'
                  }`}
              >
                {level.name === 'Gold' && (
                  <div className="absolute top-2 right-2">
                    <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded">POPULAR</span>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{level.name}</CardTitle>
                  <CardDescription className="text-xl font-bold text-gray-900">
                    {level.amount}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-4">
                    {level.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Form */}
          <Card className="border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Building2 className="w-6 h-6 text-purple-600" />
                Request Sponsorship Information
              </CardTitle>
              <CardDescription>
                Fill out the form below and we'll contact you within 24-48 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="organizationName">Organization Name *</Label>
                  <Input
                    id="organizationName"
                    type="text"
                    required
                    placeholder="Your Company or Organization"
                    value={formData.organizationName}
                    onChange={(e) => updateField('organizationName', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="contactName">Contact Name *</Label>
                  <Input
                    id="contactName"
                    type="text"
                    required
                    placeholder="John Doe"
                    value={formData.contactName}
                    onChange={(e) => updateField('contactName', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="contact@organization.com"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://www.yourwebsite.com"
                    value={formData.website}
                    onChange={(e) => updateField('website', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="sponsorshipLevel">Interest Level</Label>
                  <select
                    id="sponsorshipLevel"
                    value={formData.sponsorshipLevel}
                    onChange={(e) => updateField('sponsorshipLevel', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="">Select a level</option>
                    {sponsorshipLevels.map((level) => (
                      <option key={level.name} value={level.name}>
                        {level.name} - {level.amount}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us about your organization and why you're interested in sponsoring PetReunion..."
                    rows={4}
                    value={formData.message}
                    onChange={(e) => updateField('message', e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-lg py-6"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5 mr-2" />
                      Submit Inquiry
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <div className="space-y-6">
            {/* Current Sponsors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-600" />
                  Our Sponsors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">
                  We're grateful to our sponsors who help make PetReunion possible:
                </p>
                <div className="space-y-2 text-sm text-gray-500">
                  <p>• Become our first sponsor!</p>
                  <p>• Your logo could be here</p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-blue-600" />
                  Direct Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <a href="mailto:sponsors@petreunion.org" className="text-blue-600 hover:underline">
                    sponsors@petreunion.org
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-500" />
                  <a href="tel:1-800-PET-FIND" className="text-blue-600 hover:underline">
                    1-800-PET-FIND
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-700">petreunion.org</span>
                </div>
              </CardContent>
            </Card>

            {/* Custom Sponsorship */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-600" />
                  Custom Sponsorship
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">
                  Interested in a custom sponsorship package? We're happy to work with you to create a partnership that fits your organization's goals and budget.
                </p>
                <Link href="/donate">
                  <Button variant="outline" className="w-full">
                    <Heart className="w-4 h-4 mr-2" />
                    Make a Donation Instead
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Impact Stats */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Your Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Pets in Database</span>
                    <span className="font-bold text-green-700">5,785</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Reunited Pets</span>
                    <span className="font-bold text-green-700">1,000+</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Active Searches</span>
                    <span className="font-bold text-green-700">4,785</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}


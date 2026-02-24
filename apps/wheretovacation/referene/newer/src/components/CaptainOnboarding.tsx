import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { CheckCircle, Ship, FileText, CreditCard, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const steps = [
  { id: 1, title: 'Business Info', icon: Ship },
  { id: 2, title: 'Boat Details', icon: FileText },
  { id: 3, title: 'Payment Setup', icon: CreditCard },
  { id: 4, title: 'Verification', icon: Award }
];

export default function CaptainOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    businessName: '',
    captainName: '',
    email: '',
    phone: '',
    boatName: '',
    boatType: '',
    capacity: '',
    description: '',
    bankAccount: '',
    routingNumber: '',
    license: ''
  });

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const handleSubmit = async () => {
    try {
      await supabase.functions.invoke('captain-onboarding', {
        body: formData
      });
      alert('Application submitted! We will review and contact you within 48 hours.');
    } catch (error) {
      alert('Submission failed. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-center">Become a Captain</h1>
      
      <div className="flex justify-between mb-8">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex flex-col items-center flex-1">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${currentStep >= step.id ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-xs mt-2">{step.title}</span>
            </div>
          );
        })}
      </div>

      <Card className="p-6">
        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">Business Information</h3>
            <Input placeholder="Business Name" value={formData.businessName} onChange={(e) => setFormData({...formData, businessName: e.target.value})} />
            <Input placeholder="Captain Name" value={formData.captainName} onChange={(e) => setFormData({...formData, captainName: e.target.value})} />
            <Input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            <Input placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">Boat Details</h3>
            <Input placeholder="Boat Name" value={formData.boatName} onChange={(e) => setFormData({...formData, boatName: e.target.value})} />
            <Input placeholder="Boat Type" value={formData.boatType} onChange={(e) => setFormData({...formData, boatType: e.target.value})} />
            <Input type="number" placeholder="Capacity" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: e.target.value})} />
            <Textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
          </div>
        )}

        <div className="flex gap-4 mt-6">
          {currentStep > 1 && <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>Back</Button>}
          {currentStep < 4 ? (
            <Button onClick={handleNext} className="flex-1">Next</Button>
          ) : (
            <Button onClick={handleSubmit} className="flex-1">Submit Application</Button>
          )}
        </div>
      </Card>
    </div>
  );
}

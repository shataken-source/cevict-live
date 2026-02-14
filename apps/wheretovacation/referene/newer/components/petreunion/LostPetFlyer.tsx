'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';

interface LostPetFlyerProps {
  pet: {
    pet_name?: string;
    pet_type: string;
    breed: string;
    color: string;
    size?: string;
    date_lost: string;
    location_city: string;
    location_state: string;
    location_detail?: string;
    markings?: string;
    description?: string;
    owner_name: string;
    owner_phone?: string;
    owner_email?: string;
    reward_amount?: number;
    photo_url?: string;
  };
}

export default function LostPetFlyer({ pet }: LostPetFlyerProps) {
  const flyerRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!flyerRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Lost Pet Flyer - ${pet.pet_name || 'Pet'}</title>
  <style>
    @media print {
      @page {
        size: letter;
        margin: 0.5in;
      }
      body {
        margin: 0;
        padding: 0;
      }
    }
    body {
      font-family: Arial, sans-serif;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 20px;
      background: white;
    }
    .flyer {
      border: 4px solid #ef4444;
      padding: 30px;
      background: white;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 48px;
      color: #ef4444;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .header h2 {
      font-size: 36px;
      color: #1f2937;
      margin: 10px 0;
    }
    .content {
      display: flex;
      gap: 30px;
      margin-bottom: 20px;
    }
    .photo-section {
      flex: 0 0 300px;
    }
    .photo-section img {
      width: 100%;
      height: auto;
      border: 3px solid #1f2937;
      border-radius: 8px;
    }
    .info-section {
      flex: 1;
    }
    .info-row {
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-label {
      font-weight: bold;
      color: #1f2937;
      font-size: 16px;
      margin-bottom: 5px;
    }
    .info-value {
      font-size: 18px;
      color: #374151;
    }
    .reward {
      background: #fef3c7;
      border: 3px solid #f59e0b;
      padding: 15px;
      text-align: center;
      margin: 20px 0;
      border-radius: 8px;
    }
    .reward-text {
      font-size: 24px;
      font-weight: bold;
      color: #92400e;
    }
    .contact {
      background: #dbeafe;
      border: 3px solid #3b82f6;
      padding: 20px;
      text-align: center;
      margin-top: 20px;
      border-radius: 8px;
    }
    .contact-title {
      font-size: 20px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 10px;
    }
    .contact-info {
      font-size: 24px;
      color: #1e3a8a;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
    .urgent {
      background: #fee2e2;
      border: 3px solid #ef4444;
      padding: 15px;
      text-align: center;
      margin-bottom: 20px;
      border-radius: 8px;
    }
    .urgent-text {
      font-size: 28px;
      font-weight: bold;
      color: #991b1b;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="flyer">
    <div class="header">
      <h1>🚨 LOST PET 🚨</h1>
      <h2>${pet.pet_name || 'Missing Pet'}</h2>
    </div>
    
    <div class="urgent">
      <div class="urgent-text">Please Help Us Find Our Pet!</div>
    </div>
    
    <div class="content">
      <div class="photo-section">
        ${pet.photo_url 
          ? `<img src="${pet.photo_url}" alt="${pet.pet_name || 'Lost pet'}" />`
          : `<div style="width: 100%; height: 300px; background: #f3f4f6; border: 3px solid #1f2937; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 48px;">🐾</div>`
        }
      </div>
      
      <div class="info-section">
        <div class="info-row">
          <div class="info-label">Type:</div>
          <div class="info-value">${pet.pet_type === 'dog' ? '🐕 Dog' : '🐱 Cat'}</div>
        </div>
        
        <div class="info-row">
          <div class="info-label">Breed:</div>
          <div class="info-value">${pet.breed}</div>
        </div>
        
        <div class="info-row">
          <div class="info-label">Color:</div>
          <div class="info-value">${pet.color}</div>
        </div>
        
        ${pet.size ? `
        <div class="info-row">
          <div class="info-label">Size:</div>
          <div class="info-value">${pet.size}</div>
        </div>
        ` : ''}
        
        <div class="info-row">
          <div class="info-label">Lost Date:</div>
          <div class="info-value">${new Date(pet.date_lost).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        
        <div class="info-row">
          <div class="info-label">Last Seen:</div>
          <div class="info-value">${pet.location_detail || `${pet.location_city}, ${pet.location_state}`}</div>
        </div>
        
        ${pet.markings ? `
        <div class="info-row">
          <div class="info-label">Distinctive Markings:</div>
          <div class="info-value">${pet.markings}</div>
        </div>
        ` : ''}
        
        ${pet.description ? `
        <div class="info-row">
          <div class="info-label">Description:</div>
          <div class="info-value">${pet.description}</div>
        </div>
        ` : ''}
      </div>
    </div>
    
    ${pet.reward_amount ? `
    <div class="reward">
      <div class="reward-text">💰 REWARD: $${pet.reward_amount}</div>
    </div>
    ` : ''}
    
    <div class="contact">
      <div class="contact-title">📞 IF FOUND, PLEASE CONTACT:</div>
      <div class="contact-info">
        ${pet.owner_name}<br>
        ${pet.owner_phone ? `Phone: ${pet.owner_phone}<br>` : ''}
        ${pet.owner_email ? `Email: ${pet.owner_email}` : ''}
      </div>
    </div>
    
    <div class="footer">
      <p><strong>Please share this flyer!</strong></p>
      <p>Post on social media, share with neighbors, post at local businesses</p>
      <p>Every share helps bring ${pet.pet_name || 'our pet'} home! ❤️</p>
    </div>
  </div>
</body>
</html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleDownload = () => {
    if (!flyerRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // For now, trigger print which allows saving as PDF
    handlePrint();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">📄 Lost Pet Flyer</h3>
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print Flyer
          </Button>
          <Button onClick={handleDownload} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>
      
      <div 
        ref={flyerRef}
        className="bg-white border-4 border-red-500 p-8 shadow-xl"
        style={{ maxWidth: '8.5in', margin: '0 auto' }}
      >
        {/* Flyer Preview */}
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold text-red-600 mb-2 uppercase tracking-wide">
            🚨 LOST PET 🚨
          </h1>
          <h2 className="text-4xl font-bold text-gray-900">
            {pet.pet_name || 'Missing Pet'}
          </h2>
        </div>
        
        <div className="bg-red-100 border-3 border-red-500 p-4 text-center mb-6 rounded-lg">
          <p className="text-3xl font-bold text-red-700 uppercase">
            Please Help Us Find Our Pet!
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            {pet.photo_url ? (
              <img 
                src={pet.photo_url} 
                alt={pet.pet_name || 'Lost pet'}
                className="w-full border-4 border-gray-900 rounded-lg"
              />
            ) : (
              <div className="w-full h-64 bg-gray-200 border-4 border-gray-900 rounded-lg flex items-center justify-center text-6xl">
                🐾
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <div>
              <p className="font-bold text-lg text-gray-900">Type:</p>
              <p className="text-xl text-gray-700">{pet.pet_type === 'dog' ? '🐕 Dog' : '🐱 Cat'}</p>
            </div>
            <div>
              <p className="font-bold text-lg text-gray-900">Breed:</p>
              <p className="text-xl text-gray-700">{pet.breed}</p>
            </div>
            <div>
              <p className="font-bold text-lg text-gray-900">Color:</p>
              <p className="text-xl text-gray-700">{pet.color}</p>
            </div>
            {pet.size && (
              <div>
                <p className="font-bold text-lg text-gray-900">Size:</p>
                <p className="text-xl text-gray-700">{pet.size}</p>
              </div>
            )}
            <div>
              <p className="font-bold text-lg text-gray-900">Lost Date:</p>
              <p className="text-xl text-gray-700">
                {new Date(pet.date_lost).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <div>
              <p className="font-bold text-lg text-gray-900">Last Seen:</p>
              <p className="text-xl text-gray-700">
                {pet.location_detail || `${pet.location_city}, ${pet.location_state}`}
              </p>
            </div>
            {pet.markings && (
              <div>
                <p className="font-bold text-lg text-gray-900">Distinctive Markings:</p>
                <p className="text-xl text-gray-700">{pet.markings}</p>
              </div>
            )}
          </div>
        </div>
        
        {pet.reward_amount && (
          <div className="bg-yellow-100 border-3 border-yellow-500 p-4 text-center mb-6 rounded-lg">
            <p className="text-3xl font-bold text-yellow-800">
              💰 REWARD: ${pet.reward_amount}
            </p>
          </div>
        )}
        
        <div className="bg-blue-100 border-3 border-blue-500 p-6 text-center rounded-lg">
          <p className="text-2xl font-bold text-blue-900 mb-3">📞 IF FOUND, PLEASE CONTACT:</p>
          <p className="text-3xl font-bold text-blue-800">{pet.owner_name}</p>
          {pet.owner_phone && (
            <p className="text-2xl text-blue-700 mt-2">Phone: {pet.owner_phone}</p>
          )}
          {pet.owner_email && (
            <p className="text-xl text-blue-600 mt-1">{pet.owner_email}</p>
          )}
        </div>
        
        <div className="text-center mt-6 text-gray-600">
          <p className="font-semibold text-lg mb-2">Please share this flyer!</p>
          <p>Post on social media, share with neighbors, post at local businesses</p>
          <p className="mt-2 text-red-600 font-semibold">
            Every share helps bring {pet.pet_name || 'our pet'} home! ❤️
          </p>
        </div>
      </div>
    </div>
  );
}



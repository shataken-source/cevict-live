import React, { useState, useRef } from 'react';
import { PhotoMatcher } from '@/components/ai/PhotoMatcher';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, Camera } from 'lucide-react';

interface ReportLostPetProps {
  onSubmit?: (data: LostPetData) => void;
  onComplete?: (result: { id: string }) => void;
  shelterId?: string;
}

interface LostPetData {
  name: string;
  type: string;
  breed: string;
  color: string;
  size: string;
  age: string;
  gender: string;
  microchipped: boolean;
  microchipNumber: string;
  lastSeenDate: string;
  lastSeenLocation: string;
  lastSeenCity: string;
  lastSeenState: string;
  lastSeenZip: string;
  description: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  imageUrl?: string;
}

export default function ReportLostPet({ onSubmit, onComplete, shelterId }: ReportLostPetProps) {
  const [formData, setFormData] = useState<LostPetData>({
    name: '',
    type: '',
    breed: '',
    color: '',
    size: '',
    age: '',
    gender: '',
    microchipped: false,
    microchipNumber: '',
    lastSeenDate: '',
    lastSeenLocation: '',
    lastSeenCity: '',
    lastSeenState: '',
    lastSeenZip: '',
    description: '',
    contactName: '',
    contactPhone: '',
    contactEmail: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [petId, setPetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      setSubmitError('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setSubmitError('Image must be smaller than 10MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedPhoto(result);
      setFormData(prev => ({ ...prev, imageUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setUploadedPhoto(null);
    setFormData(prev => ({ ...prev, imageUrl: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/petreunion/report-lost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_name: formData.name,
          pet_type: formData.type,
          breed: formData.breed,
          color: formData.color,
          size: formData.size,
          age: formData.age,
          gender: formData.gender,
          description: formData.description,
          date_lost: formData.lastSeenDate,
          location_city: formData.lastSeenCity,
          location_state: formData.lastSeenState.trim().toUpperCase(),
          location_zip: formData.lastSeenZip || null,
          location_detail: formData.lastSeenLocation,
          owner_name: formData.contactName,
          owner_email: formData.contactEmail,
          owner_phone: formData.contactPhone,
          photo_url: formData.imageUrl,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success || !data?.pet?.id) {
        const baseMessage = (typeof data?.error === 'string' && data.error) ? data.error : 'Failed to submit report';
        const shouldSuggestRetry = data?.code === 'SERVICE_QUOTA_EXCEEDED' || data?.code === 'SERVICE_UNAVAILABLE';
        const retryAfterSeconds = typeof data?.retryAfterSeconds === 'number' ? data.retryAfterSeconds : null;

        const retryNote = shouldSuggestRetry
          ? retryAfterSeconds
            ? ` Please try again in about ${Math.max(1, Math.round(retryAfterSeconds / 60))} minutes.`
            : ' Please try again later.'
          : '';

        throw new Error(`${baseMessage}${retryNote}`);
      }

      // Set pet ID for PhotoMatcher
      setPetId(data.pet.id);
      
      onSubmit?.(formData);
      onComplete?.({ id: data.pet.id });
    } catch (error) {
      console.error('Error submitting report:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Report a Lost Pet</h2>

      {submitError ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {submitError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Pet Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Pet Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pet Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select type</option>
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Breed
              </label>
              <input
                type="text"
                name="breed"
                value={formData.breed}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color *
              </label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Size *
              </label>
              <select
                name="size"
                value={formData.size}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select size</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="giant">Giant</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Age
              </label>
              <input
                type="text"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                placeholder="e.g., 2 years, 6 months"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Microchipped
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="microchipped"
                  checked={formData.microchipped}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Yes, my pet is microchipped</span>
              </div>
            </div>

            {formData.microchipped && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Microchip Number
                </label>
                <input
                  type="text"
                  name="microchipNumber"
                  value={formData.microchipNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Photo Upload */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Pet Photo</h3>
          
          {!uploadedPhoto ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative w-full h-64 rounded-lg overflow-hidden">
                <img
                  src={uploadedPhoto}
                  alt="Uploaded pet photo"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* AI Photo Matching - Only show after pet is created */}
              {petId && uploadedPhoto && (
                <PhotoMatcher
                  petId={petId}
                  photoUrl={uploadedPhoto}
                  onMatchFound={(matches) => {
                    console.log('Found matches:', matches);
                    // You could show these matches to the user
                  }}
                />
              )}
            </div>
          )}
          
          <Alert>
            <Camera className="h-4 w-4" />
            <AlertDescription>
              <strong>AI Photo Matching:</strong> After submitting your report, our AI will analyze your pet's photo 
              and search for potential matches in our database using over 500 facial features and patterns.
            </AlertDescription>
          </Alert>
        </div>

        {/* Last Seen Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Last Seen Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Seen Date *
              </label>
              <input
                type="date"
                name="lastSeenDate"
                value={formData.lastSeenDate}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Seen Location *
              </label>
              <input
                type="text"
                name="lastSeenLocation"
                value={formData.lastSeenLocation}
                onChange={handleInputChange}
                required
                placeholder="Address or intersection"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City *
              </label>
              <input
                type="text"
                name="lastSeenCity"
                value={formData.lastSeenCity}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State (2-letter) *
              </label>
              <input
                type="text"
                name="lastSeenState"
                value={formData.lastSeenState}
                onChange={handleInputChange}
                required
                maxLength={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ZIP (optional)
              </label>
              <input
                type="text"
                name="lastSeenZip"
                value={formData.lastSeenZip}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            required
            rows={4}
            placeholder="Provide any additional details about your pet, distinctive features, behavior, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name *
              </label>
              <input
                type="text"
                name="contactName"
                value={formData.contactName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Report Lost Pet'}
          </button>
        </div>
      </form>
    </div>
  );
}

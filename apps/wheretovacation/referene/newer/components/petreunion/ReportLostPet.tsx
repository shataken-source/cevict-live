'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, MapPin, Calendar, AlertCircle, CheckCircle2, Loader2, Heart, Shield, Sparkles, Phone, Mail, DollarSign, Navigation } from 'lucide-react';
import SearchAreaMap from './SearchAreaMap';
import LostPetFlyer from './LostPetFlyer';
import { Progress } from '@/components/ui/progress';

// Common breed variations - auto-correct typos
const BREED_VARIATIONS: Record<string, string> = {
  // Lab variations
  'lab': 'Labrador Retriever',
  'labrador': 'Labrador Retriever',
  'lab retriver': 'Labrador Retriever',
  'lab retriever': 'Labrador Retriever',
  'labradore': 'Labrador Retriever',
  'labrodor': 'Labrador Retriever',
  
  // Golden variations
  'golden': 'Golden Retriever',
  'golden retriever': 'Golden Retriever',
  'golden retriver': 'Golden Retriever',
  'golden retr': 'Golden Retriever',
  
  // Pit Bull variations
  'pit bull': 'Pit Bull',
  'pitbull': 'Pit Bull',
  'pit bull mix': 'Pit Bull Mix',
  'pitbull mix': 'Pit Bull Mix',
  
  // Shepherd variations
  'german sheperd': 'German Shepherd',
  'german shepard': 'German Shepherd',
  'german shephard': 'German Shepherd',
  'shepherd': 'German Shepherd',
  'shepard': 'German Shepherd',
  
  // Mixed variations
  'mix': 'Mixed Breed',
  'mixed': 'Mixed Breed',
  'mut': 'Mixed Breed',
  'mutt': 'Mixed Breed',
  'unknown': 'Mixed Breed',
  'not sure': 'Mixed Breed',
  'dont know': 'Mixed Breed',
  'not shure': 'Mixed Breed',
  'unsure': 'Mixed Breed',
};

// Common color variations
const COLOR_VARIATIONS: Record<string, string> = {
  'blak': 'black',
  'blk': 'black',
  'wite': 'white',
  'whit': 'white',
  'brown': 'brown',
  'brwn': 'brown',
  'tann': 'tan',
  'tan': 'tan',
  'gray': 'grey',
  'grey': 'grey',
  'gry': 'grey',
  'brindel': 'brindle',
  'brindl': 'brindle',
  'yello': 'yellow',
  'yelow': 'yellow',
  'gold': 'golden',
  'golden': 'golden',
  'oragne': 'orange',
  'orange': 'orange',
};

// Helper: Auto-correct spelling
function autoCorrectBreed(input: string): string {
  const lower = input.toLowerCase().trim();
  if (!lower) return '';
  
  // Direct match
  if (BREED_VARIATIONS[lower]) {
    return BREED_VARIATIONS[lower];
  }
  
  // Fuzzy match - find closest
  for (const [variant, correct] of Object.entries(BREED_VARIATIONS)) {
    if (lower.includes(variant) || variant.includes(lower)) {
      return correct;
    }
  }
  
  // Return original if no match found
  return input;
}

function autoCorrectColor(input: string): string {
  const lower = input.toLowerCase().trim();
  if (!lower) return '';
  
  if (COLOR_VARIATIONS[lower]) {
    return COLOR_VARIATIONS[lower];
  }
  
  return input;
}

interface ReportLostPetProps {
  onComplete?: (petData: any) => void;
  shelterId?: string; // Optional: if submitted by a shelter
}

export default function ReportLostPet({ onComplete, shelterId }: ReportLostPetProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [autoSaved, setAutoSaved] = useState(false);
  const [savedProgress, setSavedProgress] = useState(false);
  const [immediateMatches, setImmediateMatches] = useState<any>(null);
  const [prognoSearchAreas, setPrognoSearchAreas] = useState<any[]>([]);
  const [savedPet, setSavedPet] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    pet_name: '',
    pet_type: 'dog',
    breed: '',
    color: '',
    size: '',
    
    // Step 2: When/Where
    date_lost: '',
    location_city: '',
    location_state: 'Alabama',
    location_zip: '',
    location_detail: '',
    
    // Step 3: Details
    markings: '',
    description: '',
    microchip: '',
    collar: '',
    
    // Step 4: Contact & Reward
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    reward_amount: '',
    reward_payment_methods: [] as string[],
  });

  // Auto-save progress to localStorage (including photo)
  React.useEffect(() => {
    const saved = localStorage.getItem('petreunion_draft');
    const savedPhoto = localStorage.getItem('petreunion_draft_photo');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Only restore if we don't already have data
        setFormData(prev => {
          // Check if we should restore (only if current data is empty)
          if (!prev.pet_name && !prev.breed && !prev.color) {
            setSavedProgress(true);
            return { ...prev, ...parsed };
          }
          return prev;
        });
        // Restore photo if saved
        if (savedPhoto) {
          setUploadedPhoto(savedPhoto);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []); // Only run on mount

  React.useEffect(() => {
    // Auto-save every 3 seconds (faster for better UX)
    const timer = setTimeout(() => {
      if (Object.values(formData).some(v => v) || uploadedPhoto) {
        try {
          // Save form data
          localStorage.setItem('petreunion_draft', JSON.stringify(formData));
          // Save photo separately (can be large) - only if it exists
          if (uploadedPhoto) {
            try {
              localStorage.setItem('petreunion_draft_photo', uploadedPhoto);
            } catch (photoError: any) {
              console.error('Failed to save photo in auto-save:', photoError);
              if (photoError.name === 'QuotaExceededError') {
                console.warn('Photo too large for localStorage, skipping photo save');
              }
            }
          }
          setAutoSaved(true);
          setTimeout(() => setAutoSaved(false), 2000);
        } catch (error: any) {
          console.error('Auto-save error:', error);
          if (error.name === 'QuotaExceededError') {
            console.warn('localStorage quota exceeded - clearing old data');
            // Try to clear and save again
            try {
              localStorage.removeItem('petreunion_draft');
              localStorage.setItem('petreunion_draft', JSON.stringify(formData));
            } catch (retryError) {
              console.error('Failed to save even after clearing:', retryError);
            }
          }
        }
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [formData, uploadedPhoto]);

  const updateField = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    // Note: Auto-correct moved to onBlur handlers to not interfere with typing
  }, [errors]);

  // Auto-correct on blur (when user leaves the field)
  const handleBreedBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      const corrected = autoCorrectBreed(value);
      if (corrected !== value) {
        setFormData(prev => ({ ...prev, breed: corrected }));
      }
    }
  }, []);

  const handleColorBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      const corrected = autoCorrectColor(value);
      if (corrected !== value) {
        setFormData(prev => ({ ...prev, color: corrected }));
      }
    }
  }, []);

  const validateStep = (stepNum: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (stepNum === 1) {
      if (!formData.pet_type) {
        newErrors.pet_type = "Please tell us if it's a dog or cat";
      }
      if (!formData.breed || formData.breed.length < 2) {
        newErrors.breed = "We need at least a guess at the breed (you can say 'mixed' or 'not sure')";
      }
      if (!formData.color || formData.color.length < 2) {
        newErrors.color = "What color is your pet? (black, brown, white, etc.)";
      }
    }
    
    if (stepNum === 2) {
      if (!formData.date_lost) {
        newErrors.date_lost = "When did your pet go missing?";
      }
      if (!formData.location_city || formData.location_city.length < 2) {
        newErrors.location_city = "What city was your pet last seen in?";
      }
    }
    
    if (stepNum === 3) {
      // Step 3 is optional, but encourage description
      if (!formData.description || formData.description.length < 10) {
        newErrors.description = "Can you tell us a bit more about your pet? This helps people identify them.";
      }
    }
    
    if (stepNum === 4) {
      if (!formData.owner_name || formData.owner_name.length < 2) {
        newErrors.owner_name = "We need your name so we can contact you";
      }
      if (!formData.owner_email && !formData.owner_phone) {
        newErrors.owner_contact = "We need at least an email OR phone number to contact you";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🖼️ handlePhotoUpload called', { 
      hasFiles: !!e.target.files, 
      fileCount: e.target.files?.length || 0,
      target: e.target 
    });
    
    try {
      const file = e.target.files?.[0];
      if (!file) {
        console.warn('⚠️ No file selected');
        return;
      }
      
      console.log('✅ Photo upload started:', { name: file.name, size: file.size, type: file.type });
      
      // Check file size (warn if > 5MB - localStorage limit is usually 5-10MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Photo is large. It may not save properly. Consider using a smaller image.');
      }
      
      // Validate it's an image
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPG, PNG, etc.)');
        e.target.value = ''; // Reset input
        return;
      }
      
      // Simple preview - in production, upload to storage
      const reader = new FileReader();
      
      reader.onerror = (error) => {
        console.error('❌ FileReader error:', error);
        alert('Failed to read the photo. Please try a different image.');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      
      reader.onloadstart = () => {
        console.log('📖 FileReader started reading file...');
      };
      
      reader.onload = () => {
        console.log('📖 FileReader onload fired');
      };
      
      reader.onloadend = async () => {
        console.log('📖 FileReader onloadend fired, result type:', typeof reader.result);
        try {
          const photoData = reader.result as string;
          if (!photoData) {
            console.error('❌ No photo data from FileReader, result:', reader.result);
            alert('Failed to process the photo. Please try again.');
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            return;
          }
          
          console.log('✅ Photo processed, size:', photoData.length, 'characters');
          console.log('✅ Photo data preview:', photoData.substring(0, 50) + '...');
          
          // Resize image before saving
          let resizedPhoto = photoData;
          try {
            const { resizeImageFromFile } = await import('@/lib/image-resize-client');
            resizedPhoto = await resizeImageFromFile(file, { maxWidth: 800, maxHeight: 800, quality: 0.85, format: 'jpeg' });
            console.log('✅ Photo resized, new size:', resizedPhoto.length, 'characters');
          } catch (resizeError) {
            console.warn('⚠️ Failed to resize photo, using original:', resizeError);
            // Continue with original if resize fails
          }
          
          // Update state
          setUploadedPhoto(resizedPhoto);
          console.log('✅ Photo state updated with setUploadedPhoto');
          
          // Save photo immediately (don't wait for auto-save timer)
          try {
            if (resizedPhoto.length > 5 * 1024 * 1024) {
              console.warn('⚠️ Photo is very large, may exceed localStorage quota');
            }
            localStorage.setItem('petreunion_draft_photo', resizedPhoto);
            console.log('✅ Photo saved to localStorage successfully');
          } catch (error: any) {
            console.error('❌ Failed to save photo to localStorage:', error);
            if (error.name === 'QuotaExceededError') {
              alert('Photo is too large to save. Please use a smaller image or submit the form now.');
            } else {
              alert('Failed to save photo. Please try again.');
            }
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }
        } catch (error: any) {
          console.error('❌ Error processing photo data:', error);
          alert('Failed to process the photo. Please try again.');
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };
      
      console.log('📖 Starting FileReader.readAsDataURL...');
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('❌ Photo upload error:', error);
      alert('Failed to upload photo. Please try again.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    
    setLoading(true);
    
    try {
      // Prepare submission data
      const submitData = {
        pet_name: formData.pet_name || null,
        pet_type: formData.pet_type,
        breed: formData.breed,
        color: formData.color,
        size: formData.size || null,
        date_lost: formData.date_lost,
        location_city: formData.location_city,
        location_state: formData.location_state,
        location_zip: formData.location_zip || null,
        location_detail: formData.location_detail || null,
        markings: formData.markings || null,
        description: formData.description || null,
        microchip: formData.microchip || null,
        collar: formData.collar || null,
        owner_name: formData.owner_name,
        owner_email: formData.owner_email || null,
        owner_phone: formData.owner_phone || null,
        reward_amount: formData.reward_amount || null,
        photo: uploadedPhoto || null,
        shelter_id: shelterId || null, // Include shelter ID if from shelter
      };
      
      // Log request size for debugging (especially photo size)
      const requestBody = JSON.stringify(submitData);
      const requestSizeKB = (requestBody.length / 1024).toFixed(2);
      console.log('Submitting pet report...', {
        dataSize: `${requestSizeKB} KB`,
        hasPhoto: !!submitData.photo,
        photoSize: submitData.photo ? `${(submitData.photo.length / 1024).toFixed(2)} KB` : 'none'
      });
      
      // Submit to API with immediate search
      const response = await fetch('/api/petreunion/report-lost-immediate-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      });
      
      // Check if response is ok before parsing
      if (!response.ok) {
        // Try to parse error as JSON, fallback to text
        let errorMessage = 'Failed to submit pet report';
        let errorDetails = '';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          
          // Provide user-friendly message for API key errors
          if (errorMessage.includes('Invalid API key') || errorMessage.includes('Database configuration')) {
            errorMessage = 'Database configuration error';
            errorDetails = '\n\nThe database is not properly configured. Please contact support or check your setup.';
            if (errorData.details) {
              errorDetails = `\n\n${errorData.details}`;
            }
          } else if (errorData.details) {
            // Include details if available (for debugging)
            if (process.env.NODE_ENV === 'development') {
              errorDetails = `\n\nDetails: ${errorData.details}`;
            }
          }
          
          if (errorData.errorName) {
            errorDetails += `\n\nError Type: ${errorData.errorName}`;
          }
        } catch (e) {
          // If not JSON, try to get text
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch (textError) {
            // Use status text as fallback
            errorMessage = response.statusText || errorMessage;
          }
        }
        throw new Error(errorMessage + errorDetails);
      }
      
      // Parse successful response
      const result = await response.json();
      
      // Store matches for display
      if (result.immediateMatches) {
        setImmediateMatches(result.immediateMatches);
      }
      
      // Store PROGNO search areas
      if (result.prognoSearchAreas) {
        setPrognoSearchAreas(result.prognoSearchAreas);
      }
      
      // Store saved pet data for flyer
      if (result.pet) {
        setSavedPet({
          ...result.pet,
          owner_name: formData.owner_name,
          owner_email: formData.owner_email,
          owner_phone: formData.owner_phone,
          reward_amount: formData.reward_amount ? parseFloat(String(formData.reward_amount)) : null,
          photo_url: uploadedPhoto || result.pet.photo_url
        });
      }
      
      if (onComplete) {
        onComplete(result);
      }
      
      setStep(5); // Success step with matches
      // Clear saved draft on success
      localStorage.removeItem('petreunion_draft');
      localStorage.removeItem('petreunion_draft_photo');
    } catch (error: any) {
      console.error('Submit error:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      
      // Extract error message - show first line for UI, full message in console
      let errorMessage = error?.message || 'Something went wrong. Please try again or contact us directly.';
      
      // If it's a very long error, truncate for UI but log full in console
      const displayMessage = errorMessage.split('\n')[0]; // Show first line only
      
      setErrors({ submit: displayMessage });
      
      // Scroll to top to show error
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  // Success screen with immediate matches
  if (step === 5) {
    const hasStrongMatches = immediateMatches?.strongMatches?.length > 0;
    const hasMatches = immediateMatches?.matches?.length > 0;
    
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Success Message */}
        <Card className={`border-2 ${hasStrongMatches ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50' : 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
          <CardHeader className="text-center">
            {hasStrongMatches ? (
              <>
                <div className="text-6xl mb-4">🎉</div>
                <CardTitle className="text-3xl font-bold text-green-700 mb-2">
                  We Found Potential Matches!
                </CardTitle>
                <CardDescription className="text-lg text-green-600">
                  We found {immediateMatches.strongMatches.length} strong match{immediateMatches.strongMatches.length !== 1 ? 'es' : ''} for {formData.pet_name || 'your pet'}!
                </CardDescription>
              </>
            ) : hasMatches ? (
              <>
                <CheckCircle2 className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <CardTitle className="text-2xl text-blue-700">Your Pet Has Been Added!</CardTitle>
                <CardDescription className="text-lg">
                  We found {immediateMatches.matches.length} potential match{immediateMatches.matches.length !== 1 ? 'es' : ''}. Review them below.
                </CardDescription>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <CardTitle className="text-2xl text-blue-700">Your Pet Has Been Added!</CardTitle>
                <CardDescription className="text-lg">
                  We're now searching for {formData.pet_name || 'your pet'}.
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg border border-white/50">
              <p className="text-gray-700 mb-4 font-medium">What's happening right now:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Your pet is in our search database</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Searching shelters near you</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Checking found pets database</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">You'll be notified of any matches</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Strong Matches */}
        {hasStrongMatches && (
          <Card className="border-2 border-green-500 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader>
              <CardTitle className="text-2xl text-green-700 flex items-center gap-2">
                <Sparkles className="w-6 h-6" />
                Strong Matches - Please Review These First!
              </CardTitle>
              <CardDescription className="text-green-600">
                These pets match very closely with your pet's description
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {immediateMatches.strongMatches.map((match: any, idx: number) => (
                <Card key={idx} className="bg-white border-2 border-green-300 hover:border-green-500 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {match.photo_url && (
                        <img
                          src={match.photo_url}
                          alt={match.pet_name || 'Found pet'}
                          className="w-32 h-32 object-cover rounded-lg border-2 border-green-200"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">
                              {match.pet_name || 'Unknown Name'}
                            </h3>
                            <p className="text-gray-600">
                              {match.pet_type} • {match.breed} • {match.color} • {match.size}
                            </p>
                          </div>
                          <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                            {match.matchScore}/100 Match
                          </div>
                        </div>
                        {match.matchReasons && match.matchReasons.length > 0 && (
                          <div className="mb-2">
                            <p className="text-sm font-semibold text-gray-700 mb-1">Why this matches:</p>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {match.matchReasons.map((reason: string, i: number) => (
                                <li key={i} className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {match.description && (
                          <p className="text-sm text-gray-600 mt-2">{match.description.substring(0, 200)}...</p>
                        )}
                        <div className="mt-3 flex gap-2">
                          <Button 
                            onClick={() => window.open(`/petreunion/lost/${match.id}`, '_blank')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            View Details
                          </Button>
                          {match.microchip && (
                            <Button variant="outline" className="border-green-300">
                              Microchip: {match.microchip}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Other Matches */}
        {hasMatches && immediateMatches.matches.filter((m: any) => !m.isStrongMatch).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Other Potential Matches</CardTitle>
              <CardDescription>
                These pets might match - worth checking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {immediateMatches.matches
                .filter((m: any) => !m.isStrongMatch)
                .slice(0, 5)
                .map((match: any, idx: number) => (
                  <Card key={idx} className="bg-gray-50 hover:bg-gray-100 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {match.photo_url && (
                          <img
                            src={match.photo_url}
                            alt={match.pet_name || 'Found pet'}
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold">{match.pet_name || 'Unknown'}</h4>
                          <p className="text-sm text-gray-600">
                            {match.breed} • {match.color} • Match Score: {match.matchScore}/100
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2"
                            onClick={() => window.open(`/petreunion/lost/${match.id}`, '_blank')}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-xl text-blue-700">What Happens Next</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-full p-2">
                <Phone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">We'll Contact You</p>
                <p className="text-sm text-gray-600">
                  If we find a match, we'll call or email you immediately at {formData.owner_email || formData.owner_phone || 'your contact info'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-full p-2">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Shelters Are Being Searched</p>
                <p className="text-sm text-gray-600">
                  We're checking shelters within 25 miles of {formData.location_city}, {formData.location_state}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-full p-2">
                <Heart className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Don't Give Up Hope</p>
                <p className="text-sm text-gray-600">
                  We'll keep searching daily. Many pets are found weeks or months later. Stay positive!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PROGNO Search Areas Map */}
        {prognoSearchAreas.length > 0 && (
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300">
            <CardHeader>
              <CardTitle className="text-xl text-blue-700 flex items-center gap-2">
                <Navigation className="w-5 h-5" />
                PROGNO Search Areas
              </CardTitle>
              <CardDescription className="text-blue-600">
                Based on your pet's breed, size, and behavior patterns, these are the best areas to search
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SearchAreaMap
                location={{
                  city: formData.location_city,
                  state: formData.location_state,
                  zipcode: formData.location_zip
                }}
                searchAreas={prognoSearchAreas}
                petName={formData.pet_name}
              />
            </CardContent>
          </Card>
        )}

        {/* Lost Pet Flyer */}
        {savedPet && (
          <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-300">
            <CardHeader>
              <CardTitle className="text-xl text-red-700 flex items-center gap-2">
                📄 Print Lost Pet Flyer
              </CardTitle>
              <CardDescription className="text-red-600">
                Print and share this flyer to help spread the word
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LostPetFlyer pet={savedPet} />
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button 
            onClick={() => window.location.href = '/petreunion'}
            variant="outline"
            className="flex-1"
          >
            Search More Pets
          </Button>
          <Button 
            onClick={() => window.location.reload()}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Report Another Pet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card className="border-2 border-blue-200 shadow-xl bg-gradient-to-br from-white to-blue-50/30">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl flex items-center gap-3 mb-2">
                <div className="bg-red-100 p-3 rounded-full">
                  <Heart className="w-8 h-8 text-red-500" />
                </div>
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Report Your Lost Pet
                </span>
              </CardTitle>
              <CardDescription className="mt-2 text-lg text-gray-600">
                💙 We know this is hard. We're here to help you find your pet. Take your time - we'll guide you through each step.
              </CardDescription>
              <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Shield className="w-4 h-4" />
                  <span>100% Free</span>
                </div>
                <div className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  <span>Instant Search</span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  <span>We Care</span>
                </div>
              </div>
            </div>
            {autoSaved && (
              <div className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Saved
              </div>
            )}
          </div>
          {savedProgress && (
            <Alert className="mt-4 border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700 text-sm">
                We found your previous progress and restored it. You can continue where you left off!
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {[1, 2, 3, 4].map((num) => (
                <div
                  key={num}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step >= num ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {num}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Basic Info</span>
              <span>When/Where</span>
              <span>Details</span>
              <span>Contact</span>
            </div>
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <Label>Dog or Cat?</Label>
                <div className="flex gap-4 mt-2">
                  <Button
                    type="button"
                    variant={formData.pet_type === 'dog' ? 'default' : 'outline'}
                    onClick={() => updateField('pet_type', 'dog')}
                    className="flex-1"
                  >
                    Dog
                  </Button>
                  <Button
                    type="button"
                    variant={formData.pet_type === 'cat' ? 'default' : 'outline'}
                    onClick={() => updateField('pet_type', 'cat')}
                    className="flex-1"
                  >
                    Cat
                  </Button>
                </div>
                {errors.pet_type && (
                  <p className="text-red-500 text-sm mt-1">{errors.pet_type}</p>
                )}
              </div>

              <div>
                <Label>Pet's Name (if you know it)</Label>
                <Input
                  value={formData.pet_name}
                  onChange={(e) => updateField('pet_name', e.target.value)}
                  placeholder="Buddy, Max, Fluffy..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label>
                  Breed <span className="text-gray-500">(it's okay if you're not sure)</span>
                </Label>
                <Input
                  value={formData.breed}
                  onChange={(e) => updateField('breed', e.target.value)}
                  onBlur={handleBreedBlur}
                  placeholder="Lab, Golden, Mixed, Not sure..."
                  className="mt-1 text-gray-900"
                  style={{ color: '#111827', backgroundColor: 'white' }}
                />
                {errors.breed && (
                  <Alert className="mt-2 border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-700 text-sm">
                      {errors.breed}
                    </AlertDescription>
                  </Alert>
                )}
                {formData.breed && !errors.breed && (
                  <p className="text-green-600 text-sm mt-1">✓ Got it!</p>
                )}
              </div>

              <div>
                <Label>What Color?</Label>
                <Input
                  value={formData.color}
                  onChange={(e) => updateField('color', e.target.value)}
                  onBlur={handleColorBlur}
                  placeholder="Black, brown, white, golden, mixed colors..."
                  className="mt-1 text-gray-900"
                  style={{ color: '#111827' }}
                />
                {errors.color && (
                  <Alert className="mt-2 border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-700 text-sm">
                      {errors.color}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div>
                <Label>Size</Label>
                <Select 
                  value={formData.size || ''} 
                  onChange={(e) => updateField('size', e.target.value)}
                  className="mt-1"
                >
                  <option value="">Pick closest size...</option>
                  <option value="small">Small (under 25 lbs)</option>
                  <option value="medium">Medium (25-50 lbs)</option>
                  <option value="large">Large (50-80 lbs)</option>
                  <option value="x-large">Extra Large (over 80 lbs)</option>
                  <option value="not sure">Not sure</option>
                </Select>
              </div>

              <div>
                <Label>Photo (if you have one)</Label>
                <div className="mt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      console.log('📸 File input onChange triggered', {
                        files: e.target.files,
                        fileCount: e.target.files?.length || 0,
                        hasFiles: !!e.target.files && e.target.files.length > 0,
                        inputValue: e.target.value
                      });
                      if (e.target.files && e.target.files.length > 0) {
                        handlePhotoUpload(e);
                      } else {
                        console.warn('⚠️ onChange fired but no files selected');
                      }
                    }}
                    className="hidden"
                    id="photo-upload"
                    disabled={loading}
                  />
                  <label
                    htmlFor="photo-upload"
                    className={`flex items-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                      loading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                    }`}
                  >
                    <Upload className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {uploadedPhoto ? 'Photo uploaded ✓ (click to change)' : 'Click to upload a photo'}
                    </span>
                  </label>
                  {uploadedPhoto && (
                    <div className="mt-2 relative inline-block">
                      <img 
                        src={uploadedPhoto} 
                        alt="Pet preview" 
                        className="w-32 h-32 object-cover rounded border border-gray-200" 
                        onError={(e) => {
                          console.error('Image load error');
                          setUploadedPhoto(null);
                          localStorage.removeItem('petreunion_draft_photo');
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                          alert('Failed to display photo. Please try uploading again.');
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setUploadedPhoto(null);
                          localStorage.removeItem('petreunion_draft_photo');
                          const input = document.getElementById('photo-upload') as HTMLInputElement;
                          if (input) input.value = '';
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 shadow-md z-10"
                        title="Remove photo"
                        aria-label="Remove photo"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: When/Where */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  When did they go missing?
                </Label>
                <Input
                  type="date"
                  value={formData.date_lost}
                  onChange={(e) => updateField('date_lost', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="mt-1"
                />
                {errors.date_lost && (
                  <p className="text-red-500 text-sm mt-1">{errors.date_lost}</p>
                )}
                {/* Age Progression Warning */}
                {formData.date_lost && (() => {
                  const lostDate = new Date(formData.date_lost);
                  const today = new Date();
                  const daysLost = Math.floor((today.getTime() - lostDate.getTime()) / (1000 * 60 * 60 * 24));
                  const monthsLost = Math.floor(daysLost / 30);
                  const yearsLost = Math.floor(daysLost / 365);
                  
                  // Show warning if lost for more than 3 months (puppy/kitten would have grown)
                  if (monthsLost >= 3) {
                    const ageText = yearsLost > 0 
                      ? `${yearsLost} year${yearsLost > 1 ? 's' : ''}`
                      : `${monthsLost} month${monthsLost > 1 ? 's' : ''}`;
                    
                    return (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-blue-800">
                            <p className="font-medium">Age Progression Notice:</p>
                            <p className="mt-1">
                              Your pet has been missing for <strong>{ageText}</strong>. 
                              {formData.size === 'small' || !formData.size ? (
                                <span> If they were a puppy or kitten when lost, they may have grown significantly and look very different now. Please consider updating their size and description to reflect how they might look today.</span>
                              ) : (
                                <span> They may look different now. Consider adding a note in the description about how they might have changed.</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  What City?
                </Label>
                <Input
                  value={formData.location_city}
                  onChange={(e) => updateField('location_city', e.target.value)}
                  placeholder="Albertville, Birmingham..."
                  className="mt-1"
                />
                {errors.location_city && (
                  <Alert className="mt-2 border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-700 text-sm">
                      {errors.location_city}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>State</Label>
                  <Select 
                    value={formData.location_state || 'Alabama'} 
                    onChange={(e) => updateField('location_state', e.target.value)}
                    className="mt-1"
                  >
                    <option value="Alabama">Alabama</option>
                    <option value="Florida">Florida</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Mississippi">Mississippi</option>
                    <option value="Louisiana">Louisiana</option>
                    <option value="Texas">Texas</option>
                  </Select>
                </div>
                <div>
                  <Label>ZIP Code (if you know it)</Label>
                  <Input
                    value={formData.location_zip}
                    onChange={(e) => updateField('location_zip', e.target.value)}
                    placeholder="35950"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Any specific area? (optional)</Label>
                <Input
                  value={formData.location_detail}
                  onChange={(e) => updateField('location_detail', e.target.value)}
                  placeholder="Lakes Subdivision, near Main St, behind Walmart..."
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Step 3: Details */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <Label>Tell us more about your pet</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Any special markings, personality, anything that would help identify them..."
                  rows={4}
                  className="mt-1"
                />
                {errors.description && (
                  <Alert className="mt-2 border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-700 text-sm">
                      {errors.description}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div>
                <Label>Special Markings (optional)</Label>
                <Input
                  value={formData.markings}
                  onChange={(e) => updateField('markings', e.target.value)}
                  placeholder="White patch on chest, scar on ear, etc."
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Microchip Number (if you have it)</Label>
                  <Input
                    value={formData.microchip}
                    onChange={(e) => updateField('microchip', e.target.value)}
                    placeholder="Optional"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Was wearing a collar? (optional)</Label>
                  <Select 
                    value={formData.collar || ''} 
                    onChange={(e) => updateField('collar', e.target.value)}
                    className="mt-1"
                  >
                    <option value="">Select...</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="not sure">Not sure</option>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Contact & Reward */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <Label>Your Name</Label>
                <Input
                  value={formData.owner_name}
                  onChange={(e) => updateField('owner_name', e.target.value)}
                  placeholder="So we know who to contact"
                  className="mt-1"
                />
                {errors.owner_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.owner_name}</p>
                )}
              </div>

              <div>
                <Label>Your Email</Label>
                <Input
                  type="email"
                  value={formData.owner_email}
                  onChange={(e) => updateField('owner_email', e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Your Phone Number</Label>
                <Input
                  type="tel"
                  value={formData.owner_phone}
                  onChange={(e) => updateField('owner_phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  className="mt-1"
                />
              </div>

              {errors.owner_contact && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-700 text-sm">
                    {errors.owner_contact}
                  </AlertDescription>
                </Alert>
              )}

              <div className="border-t pt-6">
                <Label className="text-lg">Reward (Optional)</Label>
                <p className="text-sm text-gray-500 mb-4">
                  Offering a reward can help motivate people to look for your pet
                </p>
                
                <div>
                  <Label>Reward Amount</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-500">$</span>
                    <Input
                      type="number"
                      value={formData.reward_amount}
                      onChange={(e) => updateField('reward_amount', e.target.value)}
                      placeholder="250"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {errors.submit && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700 text-sm">
                    {errors.submit}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
            >
              Back
            </Button>
            {step < 4 ? (
              <Button onClick={handleNext} className="bg-blue-500 hover:bg-blue-600">
                Next Step
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit & Start Search'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


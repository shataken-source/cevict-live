/**
 * Full Age Verification Component - Layer 2 Hard Verification
 * 
 * Required for purchases and community features
 * Integrates with AgeChecker.net for database verification
 */

'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  Upload, 
  Camera, 
  Shield, 
  CheckCircle, 
  Clock, 
  FileText,
  User,
  MapPin,
  Calendar
} from 'lucide-react';
import { ageVerificationService, AgeVerificationRequest } from '@/lib/ageVerification';

interface FullVerificationProps {
  onVerified?: (verificationId: string) => void;
  onCancel?: () => void;
  returnUrl?: string;
}

export default function FullVerification({ onVerified, onCancel, returnUrl }: FullVerificationProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState<AgeVerificationRequest>({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    dateOfBirth: '',
    email: '',
    phoneNumber: ''
  });

  // File upload state
  const [idImage, setIdImage] = useState<File | null>(null);
  const [selfieImage, setSelfieImage] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const idInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const totalSteps = 3;

  const updateFormData = (field: keyof AgeVerificationRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        // Validate personal info
        if (!formData.firstName || !formData.lastName || !formData.dateOfBirth) {
          setError('Please fill in all required fields');
          return false;
        }
        
        // Validate age
        const age = calculateAge(formData.dateOfBirth);
        if (age < 21) {
          setError('You must be at least 21 years old');
          return false;
        }
        break;

      case 2:
        // Validate address
        if (!formData.address || !formData.city || !formData.state || !formData.zipCode) {
          setError('Please complete your address information');
          return false;
        }
        break;

      case 3:
        // Validate contact info
        if (!formData.email || !formData.phoneNumber) {
          setError('Please provide your contact information');
          return false;
        }
        
        // Validate email format
        if (!isValidEmail(formData.email)) {
          setError('Please enter a valid email address');
          return false;
        }
        break;
    }

    setError(null);
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const submitVerification = async () => {
    if (!validateStep()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await ageVerificationService.verifyAge(formData);
      setVerificationResult(result);

      if (result.success) {
        // Verification successful
        onVerified?.(result.verificationId);
        
        // Log compliance event
        await fetch('/api/compliance/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'verification_completed',
            details: { 
              method: 'database',
              verificationId: result.verificationId,
              status: result.status
            }
          })
        });

        // Redirect if return URL provided
        if (returnUrl) {
          window.location.href = decodeURIComponent(returnUrl);
        }
      } else if (result.requiresManualReview) {
        // Require manual review with ID upload
        setStep(4); // Move to ID upload step
      } else {
        setError(result.message || 'Verification failed');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('Unable to complete verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleIdUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be less than 10MB');
        return;
      }

      setIdImage(file);
    }
  };

  const handleSelfieUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      setSelfieImage(file);
    }
  };

  const uploadForManualReview = async () => {
    if (!idImage || !verificationResult?.verificationId) {
      setError('Please upload your ID document');
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await ageVerificationService.uploadIdForManualReview(
        verificationResult.verificationId,
        idImage,
        selfieImage || undefined
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success) {
        setStep(5); // Success step
      } else {
        setError('Failed to upload documents. Please try again.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Unable to upload documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateString: string): number => {
    const birth = new Date(dateString);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Personal Information</h3>
              <p className="text-sm text-slate-600">Enter your legal name and date of birth</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => updateFormData('firstName', e.target.value)}
                  placeholder="Legal first name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => updateFormData('lastName', e.target.value)}
                  placeholder="Legal last name"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="mt-1"
              />
              {formData.dateOfBirth && (
                <p className="text-sm text-slate-600 mt-1">
                  Age: {calculateAge(formData.dateOfBirth)} years
                </p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                <MapPin className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Address Information</h3>
              <p className="text-sm text-slate-600">Enter your current residential address</p>
            </div>

            <div>
              <Label htmlFor="address">Street Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => updateFormData('address', e.target.value)}
                placeholder="123 Main Street"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => updateFormData('city', e.target.value)}
                  placeholder="City"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <select
                  id="state"
                  value={formData.state}
                  onChange={(e) => updateFormData('state', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select State</option>
                  <option value="AL">Alabama</option>
                  <option value="FL">Florida</option>
                  <option value="MS">Mississippi</option>
                  <option value="LA">Louisiana</option>
                  <option value="TN">Tennessee</option>
                  <option value="KY">Kentucky</option>
                  <option value="AR">Arkansas</option>
                  <option value="GA">Georgia</option>
                  <option value="WV">West Virginia</option>
                  <option value="SC">South Carolina</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="zipCode">ZIP Code *</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) => updateFormData('zipCode', e.target.value)}
                placeholder="12345"
                maxLength={10}
                className="mt-1"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-3">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Contact Information</h3>
              <p className="text-sm text-slate-600">Add your email and phone number</p>
            </div>

            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                placeholder="your@email.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                placeholder="(555) 123-4567"
                className="mt-1"
              />
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your contact information is used solely for verification purposes and compliance with federal regulations. 
                We will never share your information without your consent.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 4:
        // Manual review step
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 rounded-full mb-3">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Manual Review Required</h3>
              <p className="text-sm text-slate-600">Please upload your ID document for verification</p>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                We couldn't verify your identity automatically. Please upload a clear photo of your government-issued ID.
                Review typically takes less than 90 seconds.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="idUpload">Government ID *</Label>
              <div className="mt-1">
                <input
                  ref={idInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleIdUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => idInputRef.current?.click()}
                  className="w-full border-dashed border-2"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {idImage ? idImage.name : 'Upload ID Document'}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Accepted: Driver's License, State ID, Passport (Max 10MB)
              </p>
            </div>

            <div>
              <Label htmlFor="selfieUpload">Selfie with ID (Optional)</Label>
              <div className="mt-1">
                <input
                  ref={selfieInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSelfieUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => selfieInputRef.current?.click()}
                  className="w-full border-dashed border-2"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {selfieImage ? selfieImage.name : 'Upload Selfie (Optional)'}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Helps speed up verification (Max 10MB)
              </p>
            </div>

            {uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
          </div>
        );

      case 5:
        // Success step
        return (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900">Verification Submitted</h3>
            <p className="text-slate-600">
              Your documents have been uploaded for manual review. 
              You'll receive an email once verification is complete (typically within 90 seconds).
            </p>
            <Button
              onClick={() => window.location.href = returnUrl || '/'}
              className="w-full"
            >
              Continue to Site
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Personal Information';
      case 2: return 'Address Information';
      case 3: return 'Contact Information';
      case 4: return 'ID Verification';
      case 5: return 'Verification Complete';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              Full Age Verification
            </CardTitle>
            <CardDescription>
              Required for purchases and community features
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Progress Bar */}
            {step <= 3 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Step {step} of {totalSteps}</span>
                  <span>{getStepTitle()}</span>
                </div>
                <Progress value={(step / totalSteps) * 100} className="h-2" />
              </div>
            )}

            {/* Step Content */}
            {renderStepContent()}

            {/* Error Display */}
            {error && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Navigation Buttons */}
            {step <= 4 && (
              <div className="flex gap-3">
                {step > 1 && step <= 3 && (
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={loading}
                    className="flex-1"
                  >
                    Previous
                  </Button>
                )}

                {step <= 3 && (
                  <Button
                    onClick={step === 3 ? submitVerification : nextStep}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </div>
                    ) : step === 3 ? (
                      'Submit Verification'
                    ) : (
                      'Next'
                    )}
                  </Button>
                )}

                {step === 4 && (
                  <Button
                    onClick={uploadForManualReview}
                    disabled={loading || !idImage}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Uploading...
                      </div>
                    ) : (
                      'Upload for Review'
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Cancel Button */}
            {step <= 3 && (
              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={onCancel}
                  disabled={loading}
                  className="text-slate-600 hover:text-slate-800"
                >
                  Cancel Verification
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Badge */}
        <div className="text-center mt-4">
          <div className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Shield className="w-4 h-4" />
            <span>Protected by AgeChecker.net</span>
            <span>•</span>
            <span>FDA Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}

#!/bin/bash

# Batch fix all useToast imports to sonner
# This script migrates from deprecated useToast hook to sonner toast

echo "Starting toast migration..."

# List of files to fix
files=(
  "src/components/CaptainApplicationReview.tsx"
  "src/components/CertificationManager.tsx"
  "src/components/ComplianceDashboard.tsx"
  "src/components/CustomerDashboard.tsx"
  "src/components/EventCreationModal.tsx"
  "src/components/EventDetailsModal.tsx"
  "src/components/EventPhotoGallery.tsx"
  "src/components/EventPhotoModeration.tsx"
  "src/components/EventPhotoUpload.tsx"
  "src/components/FeatureFlagAdmin.tsx"
  "src/components/LicenseStorage.tsx"
  "src/components/PasskeyAuthentication.tsx"
  "src/components/PasskeyRegistration.tsx"
  "src/components/PhotoContestLeaderboard.tsx"
  "src/components/PhotoModerationQueue.tsx"
  "src/components/ProfileSettings.tsx"
  "src/components/RealTimeBookingSystem.tsx"
  "src/components/ReferralDashboard.tsx"
  "src/components/ReminderSchedulerPanel.tsx"
  "src/components/RentalBookingModal.tsx"
  "src/components/SendConversationEmail.tsx"
  "src/components/TripPhotoGallery.tsx"
  "src/components/TwoFactorSetup.tsx"
  "src/components/TwoFactorVerification.tsx"
  "src/components/UserActivityAnalytics.tsx"
  "src/components/admin/AffiliateCredentialsManager.tsx"
  "src/components/admin/SiteSettingsManager.tsx"
  "src/components/admin/UserManagementPanel.tsx"
  "src/components/fleet/DocumentManager.tsx"
  "src/components/mobile/GPSCheckIn.tsx"
  "src/components/mobile/QuickActionPanel.tsx"
  "src/pages/MarineProductsAdmin.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file..."
    
    # Replace import
    sed -i "s/import { useToast } from '@\/hooks\/use-toast';/import { toast } from 'sonner';/g" "$file"
    sed -i 's/import { useToast } from "@\/hooks\/use-toast";/import { toast } from "sonner";/g' "$file"
    
    # Remove useToast() call
    sed -i '/const { toast } = useToast();/d' "$file"
    
    echo "✓ Fixed $file"
  else
    echo "✗ File not found: $file"
  fi
done

echo ""
echo "Migration complete! Please manually update toast calls from:"
echo "  toast({ title: 'Title', description: 'Message' })"
echo "to:"
echo "  toast.success('Message') or toast.error('Message')"

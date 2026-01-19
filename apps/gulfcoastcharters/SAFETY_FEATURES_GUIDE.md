# Safety & Business Features Guide

## Overview
CharterConnect now includes critical safety and business management features including insurance verification, emergency contacts, and booking modifications.

## Features Implemented

### 1. Insurance Verification System
**Location:** Captain Dashboard > Insurance Tab

**Features:**
- Upload insurance policies
- Track coverage amounts and expiry dates
- Policy status tracking (pending/active/expired)
- Compliance verification

**Edge Function:** `insurance-verification`

### 2. Emergency Contact System
**Component:** `EmergencyContactManager`

**Features:**
- Add multiple emergency contacts
- Store contact relationships and phone numbers
- SOS alert system for emergencies
- Automatic notification to all contacts

**Edge Function:** `emergency-contact-system`

### 3. Booking Modification System
**Component:** `BookingModificationModal`

**Features:**
- Request date changes
- Modify guest counts
- Captain approval workflow
- Automatic email notifications

**Edge Function:** `booking-modification-system`

## Usage

### For Captains
1. Navigate to Captain Dashboard
2. Click "Insurance" tab
3. Upload insurance documents
4. Track policy status

### For Customers
1. Access Profile Settings
2. Add emergency contacts
3. Use booking modification from booking details
4. Receive confirmation emails

## Technical Details
All features use Supabase edge functions for secure server-side processing and Mailjet for email notifications.

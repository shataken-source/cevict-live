# Gulf Coast Charter - Function Testing Guide

## Overview
This guide outlines all key functions for Users, Captains, and Admins to ensure complete platform functionality.

---

## 🔵 USER FUNCTIONS

### 1. Authentication
- **Login/Signup Modal**
  - Click "Login / Sign Up" button in navigation
  - Test email/password signup
  - Test email/password login
  - Verify password visibility toggle works
  - Test "Forgot Password" link
  - Test Google OAuth button (shows coming soon)
  - Verify error messages display correctly
  - Verify success message and auto-close on login

### 2. Charter Browsing
- **Featured Charters Section**
  - Scroll to "Featured Luxury Charters" section
  - View all charter cards with images, ratings, prices
  - Click on charter card to open detail modal
  - Verify "Book Now" button in modal

### 3. Booking Process
- **Create Booking**
  - Click "Book Now" on any charter
  - Fill in customer details (name, email, phone)
  - Click date selector to open calendar
  - Select available date (green dates)
  - Try selecting unavailable date (should show error)
  - Set number of guests
  - Choose duration (Half Day/Full Day)
  - Add special requests
  - Enter optional referral code
  - Toggle email/SMS reminder preferences
  - Verify total price calculation
  - Click "Proceed to Payment"
  - Should redirect to Stripe checkout

### 4. User Profile
- **View/Edit Profile**
  - Click username in navigation (when logged in)
  - View profile information
  - Edit profile details
  - View booking history

### 5. My Bookings
- **View Bookings**
  - Click "My Bookings" in navigation
  - View all past and upcoming bookings
  - See booking status (pending, confirmed, in-progress, completed)
  - View booking details
  - Request cancellation (if applicable)

---

## ⚓ CAPTAIN FUNCTIONS

### 1. Captain Login
- **Access Captain Portal**
  - Click "Captain Portal" in main navigation
  - Enter email: any@example.com
  - Enter password: "demo" (for testing)
  - Click "Login to Dashboard"
  - Verify redirect to captain dashboard

### 2. Captain Dashboard
- **Overview Tab**
  - View total bookings count
  - See upcoming charters
  - View pending requests
  - Check total revenue
  - View recent activity

- **Bookings Tab**
  - See all bookings (past, current, upcoming)
  - Filter by status
  - View booking details
  - Accept/decline pending bookings
  - Mark bookings as complete
  - View customer contact info

- **Availability Tab**
  - View calendar with availability
  - Click dates to toggle available/unavailable
  - See booked dates (marked in red)
  - See available dates (marked in green)
  - Verify changes save automatically

- **Earnings Tab**
  - View total earnings
  - See pending payouts
  - View payout history
  - Request payout
  - Download earnings report

### 3. Availability Management
- **Set Availability**
  - Open Availability tab
  - Click on future dates
  - Toggle between available/unavailable
  - Verify booked dates cannot be changed
  - Verify calendar syncs with booking system

### 4. Booking Management
- **Handle Bookings**
  - Accept new booking requests
  - View customer details
  - Contact customers
  - Update booking status
  - Mark as in-progress when charter starts
  - Mark as completed when charter ends
  - Handle cancellation requests

### 5. Earnings & Payouts
- **Financial Management**
  - View earnings breakdown
  - See pending vs. paid amounts
  - Request payout (minimum $100)
  - View payout history
  - Download financial reports

---

## 👑 ADMIN FUNCTIONS

### 1. Admin Access
- **Login as Admin**
  - Login with level 1 user account
  - Verify "Admin Panel" button appears in navigation
  - Click "Admin Panel" to open

### 2. Admin Panel Features
- **User Management**
  - View all registered users
  - Edit user details
  - Change user levels (1=admin, 2=captain, 3=customer)
  - Deactivate/activate accounts
  - View user activity logs

- **Charter Management**
  - View all listed charters
  - Approve/reject new charter listings
  - Edit charter details
  - Remove listings
  - Feature/unfeature charters

- **Booking Management**
  - View all bookings across platform
  - Filter by status, date, captain
  - Resolve disputes
  - Process refunds
  - View booking analytics

### 3. Scraper Dashboard
- **Web Scraping Tools** (Admin Only)
  - View scraper status
  - Add new URLs to scrape
  - Configure scraping rules
  - View scraped data
  - Approve/reject scraped charters
  - Bulk import charters

### 4. Review Moderation
- **Manage Reviews**
  - View all customer reviews
  - Approve/reject reviews
  - Flag inappropriate content
  - Respond to reviews
  - Edit review visibility

### 5. Analytics & Reports
- **Platform Analytics**
  - View total bookings
  - See revenue metrics
  - Track user growth
  - Monitor captain performance
  - Export reports

---

## 🧪 TESTING CHECKLIST

### Critical User Flows
- [ ] User signup and login
- [ ] Charter browsing and search
- [ ] Complete booking with payment
- [ ] Receive booking confirmation email
- [ ] View booking in "My Bookings"
- [ ] Captain receives booking notification

### Critical Captain Flows
- [ ] Captain login with demo password
- [ ] View dashboard overview
- [ ] Set availability on calendar
- [ ] Accept new booking
- [ ] Mark booking as complete
- [ ] Request payout

### Critical Admin Flows
- [ ] Admin login
- [ ] Access admin panel
- [ ] View all users and bookings
- [ ] Use scraper dashboard
- [ ] Moderate reviews

### Edge Cases to Test
- [ ] Double-booking prevention (try booking same date twice)
- [ ] Cancellation within 24 hours (should show no refund)
- [ ] Cancellation 7+ days out (should show full refund)
- [ ] Invalid date selection
- [ ] Payment failure handling
- [ ] Network error handling

---

## 📧 EMAIL NOTIFICATIONS

### User Emails
- Booking confirmation with details
- Reminder 24 hours before charter
- SMS reminder with weather forecast
- Booking status updates
- Cancellation confirmation

### Captain Emails
- New booking notification
- Booking cancellation alert
- Payout confirmation
- Customer review notification

### Admin Emails
- New charter listing pending approval
- Dispute resolution needed
- System error alerts

---

## 🔐 TEST ACCOUNTS

### Demo Accounts
- **Customer**: Use signup form to create account
- **Captain**: Email: any@example.com, Password: "demo"
- **Admin**: Must be set in database with level=1

---

## 🚀 DEPLOYMENT VERIFICATION

After deployment, verify:
- [ ] All pages load correctly
- [ ] Images display properly
- [ ] Navigation works on all pages
- [ ] Forms submit successfully
- [ ] Stripe checkout redirects work
- [ ] Email notifications send
- [ ] Calendar availability syncs
- [ ] Mobile responsive design works
- [ ] All buttons have working onClick handlers
- [ ] No console errors

---

## 📞 SUPPORT

For issues or questions:
- Email: support@gulfcoastcharters.com
- Report bugs via admin panel
- Check browser console for errors

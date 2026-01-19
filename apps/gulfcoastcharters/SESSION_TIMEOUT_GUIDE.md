# Session Timeout & Auto-Logout System Guide

## Overview
The CharterConnect platform now includes an enterprise-grade session timeout system that automatically logs out inactive users after a configurable period. This feature complements the two-factor authentication (2FA) system for enhanced security.

## Features

### 1. **Automatic Session Monitoring**
- Tracks user activity (mouse, keyboard, scroll, touch, clicks)
- Monitors inactivity periods
- Automatically triggers warnings and logout

### 2. **Configurable Timeout Settings**
Users can customize their session preferences:
- **Timeout Duration**: 5 minutes to 4 hours
- **Warning Duration**: 30 seconds to 5 minutes before timeout
- **Auto-extend on Activity**: Automatically reset timer when active

### 3. **Visual Warning System**
- Modal dialog appears before timeout
- Live countdown timer
- Progress bar showing remaining time
- Options to extend session or logout immediately

### 4. **Smart Activity Detection**
The system monitors:
- Mouse movements
- Keyboard input
- Scrolling
- Touch events
- Clicks

## User Guide

### Configuring Session Timeout

1. **Access Profile Settings**
   - Click your profile name in the navigation
   - Navigate to "Profile Settings"

2. **Find Session Timeout Settings**
   - Scroll to the "Session Timeout Settings" section
   - Identified by the clock icon

3. **Configure Your Preferences**
   - **Timeout Duration**: Select how long before auto-logout (default: 30 minutes)
   - **Warning Duration**: Choose when to show warning (default: 2 minutes)
   - **Auto-extend on Activity**: Enable to automatically reset timer when active

4. **Save Settings**
   - Click "Save Session Settings" button
   - Settings are saved locally and synchronized

### During Active Session

**Normal Operation:**
- Session timer runs in the background
- Activity automatically tracked
- No interruption to your workflow

**When Approaching Timeout:**
- Warning modal appears with countdown
- Two options available:
  - "Stay Logged In" - Extends session
  - "Logout Now" - Immediate logout

**If No Action Taken:**
- Automatic logout after countdown reaches zero
- Redirected to home page
- Must log in again to continue

## Technical Implementation

### Components

1. **SessionTimeoutWarning** (`src/components/SessionTimeoutWarning.tsx`)
   - Modal dialog with countdown timer
   - Progress bar visualization
   - Extend/Logout action buttons

2. **useSessionMonitor** Hook (`src/hooks/useSessionMonitor.ts`)
   - Activity tracking logic
   - Timer management
   - Preference loading/saving
   - Automatic logout handling

3. **session-manager** Edge Function
   - Server-side session management
   - Preference validation
   - Activity logging (optional)

### Integration Points

**AppLayout.tsx:**
```typescript
// Initialize session monitoring
const { 
  showWarning, 
  remainingSeconds, 
  handleExtend, 
  handleLogout 
} = useSessionMonitor();

// Render warning modal
{isAuthenticated && (
  <SessionTimeoutWarning
    isOpen={showWarning}
    remainingSeconds={remainingSeconds}
    onExtend={handleExtend}
    onLogout={handleLogout}
  />
)}
```

**ProfileSettings.tsx:**
- Session timeout configuration UI
- Preference management
- Save/load functionality

### Data Storage

**localStorage:**
```json
{
  "sessionPreferences": {
    "timeoutDuration": 1800,
    "warningDuration": 120,
    "autoExtend": false
  }
}
```

## Security Benefits

1. **Prevents Unauthorized Access**
   - Automatically logs out inactive users
   - Reduces risk of unauthorized access to unattended devices

2. **Compliance Support**
   - Helps meet security compliance requirements
   - Configurable timeouts for different security levels

3. **User Control**
   - Users can customize based on their needs
   - Balance between security and convenience

4. **Works with 2FA**
   - Complements two-factor authentication
   - Multi-layered security approach

## Best Practices

### For Users

1. **Choose Appropriate Timeout**
   - Public computers: 5-15 minutes
   - Personal devices: 30 minutes - 1 hour
   - Trusted environments: 2-4 hours

2. **Enable Auto-extend**
   - For active work sessions
   - Prevents interruptions during use
   - Still protects when idle

3. **Set Warning Duration**
   - Longer warnings (3-5 min) for important work
   - Shorter warnings (30-60 sec) for quick tasks

### For Administrators

1. **Default Settings**
   - Current defaults: 30 min timeout, 2 min warning
   - Adjust based on security requirements

2. **User Education**
   - Inform users about the feature
   - Explain how to configure settings
   - Emphasize security benefits

3. **Monitoring**
   - Track session timeout events
   - Analyze user preferences
   - Adjust defaults if needed

## Troubleshooting

### Session Timing Out Too Quickly
- Check timeout duration setting
- Enable auto-extend on activity
- Verify activity detection is working

### Warning Not Appearing
- Check browser console for errors
- Ensure user is authenticated
- Verify component is rendered

### Settings Not Saving
- Check localStorage permissions
- Verify edge function is accessible
- Check browser console for errors

### Activity Not Detected
- Ensure JavaScript is enabled
- Check for browser extensions blocking events
- Verify event listeners are attached

## Future Enhancements

Potential improvements:
1. **Server-side Session Tracking**
   - Database-backed session management
   - Cross-device session monitoring
   - Admin dashboard for session overview

2. **Advanced Activity Detection**
   - API call tracking
   - Form interaction monitoring
   - Page navigation tracking

3. **Customizable Warnings**
   - Multiple warning stages
   - Audio/visual notifications
   - Custom warning messages

4. **Session Analytics**
   - Average session duration
   - Timeout frequency
   - User preference patterns

## Support

For issues or questions:
1. Check browser console for errors
2. Verify localStorage is enabled
3. Test with different timeout settings
4. Contact system administrator

## Conclusion

The session timeout system provides an additional layer of security while maintaining user convenience through customizable settings. Combined with 2FA, it creates a robust security framework for the CharterConnect platform.

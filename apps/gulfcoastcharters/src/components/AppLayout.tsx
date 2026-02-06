/**
 * AppLayout Component
 * 
 * Main layout wrapper for the entire application. Provides consistent structure
 * across all pages including navigation, footer, PWA features, and AI assistant.
 * 
 * Features:
 * - Enhanced navigation with role-based menus
 * - PWA install prompt with rewards
 * - Offline indicator for network status
 * - Fishy AI assistant (context-aware based on user role)
 * - Responsive footer with comprehensive links
 * 
 * @see NavigationEnhanced - Main navigation component
 * @see FishyAIChat - AI assistant component
 */

import NavigationEnhanced from './NavigationEnhanced';
import Footer from './Footer';
import PWAEnhancedInstallPrompt from './PWAEnhancedInstallPrompt';
import OfflineIndicator from './OfflineIndicator';
import FishyAIChat from './FishyAIChat';
import FinnConcierge from './FinnConcierge';
import ConversationalAIAssistant from './personalization/ConversationalAIAssistant';
import { useUser } from '@/contexts/UserContext';


interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Main application layout component
 * Wraps all pages with consistent navigation, footer, and global features
 */
export default function AppLayout({ children }: AppLayoutProps) {
  const { user } = useUser();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Enhanced navigation with dropdowns and language selector */}
      <NavigationEnhanced />
      
      {/* PWA install prompt - offers points reward for installation */}
      <PWAEnhancedInstallPrompt />
      
      {/* Network status indicator - shows when offline */}
      <OfflineIndicator />
      
      {/* Main content area - pages render here */}
      <main className="flex-grow">
        {children}
      </main>
      
      {/* Comprehensive footer with links and information */}
      <Footer />
      
      {/* Fishy AI assistant - context-aware based on user role */}
      <FishyAIChat userType={user?.role === 'captain' ? 'captain' : 'customer'} />
      
      {/* Finn Concierge - Personal vacation concierge with memory */}
      <FinnConcierge userId={user?.id} />
      
      {/* Conversational AI Shopping Assistant (Rufus-style) */}
      <ConversationalAIAssistant />

    </div>
  );
}


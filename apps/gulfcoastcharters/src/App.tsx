import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import ErrorBoundary from '@/components/ErrorBoundary';
import SessionTimeoutWarning from '@/components/SessionTimeoutWarningWrapper';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import OfflineIndicator from '@/components/OfflineIndicator';
import { FeatureFlagProvider } from '@/contexts/FeatureFlagContext';
import { I18nProvider } from '@/contexts/I18nContext';
import { SiteSettingsProvider } from '@/contexts/SiteSettingsContext';
import { UserProvider } from '@/contexts/UserContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import './App.css';



const Index = lazy(() => import("./pages/Index"));
const CaptainDirectory = lazy(() => import("./pages/CaptainDirectory"));
const CaptainProfile = lazy(() => import("./pages/CaptainProfile"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const Community = lazy(() => import("./pages/Community"));
const MarineGearShop = lazy(() => import("./pages/MarineGearShop"));
const ApplyCaptain = lazy(() => import("./pages/ApplyCaptain"));
const CaptainLogin = lazy(() => import("./pages/CaptainLogin"));
const LocationLanding = lazy(() => import("./pages/LocationLanding"));
const MarineProductsAdmin = lazy(() => import("./pages/MarineProductsAdmin"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentHistory = lazy(() => import("./pages/PaymentHistory"));
const Favorites = lazy(() => import("./pages/Favorites"));
const BookingHistory = lazy(() => import("./pages/BookingHistory"));
const GiftCardPurchase = lazy(() => import("./components/GiftCardPurchase"));
const PriceAlertManager = lazy(() => import("./components/PriceAlertManager"));
const RenewDocument = lazy(() => import("./pages/RenewDocument"));
const MultiDayTripPlanner = lazy(() => import("./components/MultiDayTripPlanner"));






const PhotoModerationPage = lazy(() => import("./pages/PhotoModerationPage"));
const AffiliateAnalytics = lazy(() => import("./pages/AffiliateAnalytics"));
const AffiliateProgram = lazy(() => import("./pages/AffiliateProgram"));
const AdminFraudDetection = lazy(() => import("./pages/AdminFraudDetection"));


const AdminMobileDashboard = lazy(() => import("./pages/AdminMobileDashboard"));
const MobileCaptainDashboard = lazy(() => import("./pages/MobileCaptainDashboard"));
const MembershipAdminPage = lazy(() => import("./components/admin/MembershipAdmin"));
const AdminScraperDashboard = lazy(() => import("./pages/AdminScraperDashboard"));
const ChatbotAdmin = lazy(() => import("./components/admin/ChatbotAdmin"));
const BackupManagement = lazy(() => import("./components/admin/BackupManagement"));
const MailingListManager = lazy(() => import("./components/MailingListManager"));
const AdminMonetization = lazy(() => import("./pages/AdminMonetization"));







const AdminCaptainReview = lazy(() => import("./pages/AdminCaptainReview"));
const PromotionsPage = lazy(() => import("./components/PromotionsPage"));
const FAQ = lazy(() => import("./pages/FAQ"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const DeveloperOnboarding = lazy(() => import("./pages/DeveloperOnboarding"));
const ComponentShowcase = lazy(() => import("./pages/ComponentShowcase"));
const NotFound = lazy(() => import("./pages/NotFound"));
const NotificationHistory = lazy(() => import("./pages/NotificationHistory"));











const App = () => (
  <ErrorBoundary>
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <SiteSettingsProvider>
          <FeatureFlagProvider>
            <I18nProvider>
              <UserProvider>
                <TooltipProvider>
                  <Toaster />
                  <OfflineIndicator />
                  <PWAInstallPrompt />
                  <BrowserRouter>
                    <SessionTimeoutWarning />
                    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-xl">Loading...</div></div>}>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/faq" element={<FAQ />} />
                        <Route path="/about" element={<AboutUs />} />
                        <Route path="/promotions" element={<PromotionsPage />} />
                        <Route path="/search" element={<SearchResults />} />
                        <Route path="/community" element={<Community />} />
                        <Route path="/marine-gear-shop" element={<MarineGearShop />} />
                        <Route path="/apply-captain" element={<ApplyCaptain />} />
                        <Route path="/captain-login" element={<CaptainLogin />} />
                        <Route path="/location/:location" element={<LocationLanding />} />
                        <Route path="/admin/marine-products" element={<MarineProductsAdmin />} />
                        <Route path="/payment-success" element={<PaymentSuccess />} />
                        <Route path="/payment-history" element={<PaymentHistory />} />
                        <Route path="/booking-history" element={<BookingHistory />} />
                        <Route path="/gift-cards" element={<GiftCardPurchase />} />
                        <Route path="/price-alerts" element={<PriceAlertManager />} />
                        <Route path="/renew-document" element={<RenewDocument />} />
                        <Route path="/plan-trip" element={<MultiDayTripPlanner />} />





                        <Route path="/admin/photo-moderation" element={<PhotoModerationPage />} />
                        <Route path="/admin/affiliate-analytics" element={<AffiliateAnalytics />} />
                        <Route path="/admin/captain-review" element={<AdminCaptainReview />} />
                        <Route path="/admin/memberships" element={<MembershipAdminPage />} />
                        <Route path="/admin/scraper" element={<AdminScraperDashboard />} />
                        <Route path="/admin/mobile" element={<AdminMobileDashboard />} />
                        <Route path="/admin/chatbot" element={<ChatbotAdmin />} />
                        <Route path="/admin/backups" element={<BackupManagement />} />
                        <Route path="/admin/monetization" element={<AdminMonetization />} />
                        <Route path="/admin/fraud-detection" element={<AdminFraudDetection />} />
                        <Route path="/admin/mailing-list" element={<MailingListManager />} />
                        <Route path="/affiliate-program" element={<AffiliateProgram />} />
                        <Route path="/developer-onboarding" element={<DeveloperOnboarding />} />
                        <Route path="/components-showcase" element={<ComponentShowcase />} />
                        <Route path="/notifications" element={<NotificationHistory />} />










                        <Route path="/captain/mobile-dashboard" element={<MobileCaptainDashboard />} />
                        <Route path="/captains" element={<CaptainDirectory />} />
                        <Route path="/captain/:id" element={<CaptainProfile />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>



                    </Suspense>
                  </BrowserRouter>
                </TooltipProvider>
              </UserProvider>
            </I18nProvider>
          </FeatureFlagProvider>
        </SiteSettingsProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);




export default App;

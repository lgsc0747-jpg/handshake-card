import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import { DashboardThemeProvider } from "@/contexts/DashboardThemeContext";
import { NotificationListener } from "@/components/NotificationListener";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import CardsPage from "./pages/CardsPage.tsx";
import NfcManagerPage from "./pages/NfcManagerPage.tsx";
import ShortUrlRedirect from "./pages/ShortUrlRedirect.tsx";
import LogsPage from "./pages/LogsPage.tsx";


import PersonasPage from "./pages/PersonasPage.tsx";
import LeadsPage from "./pages/LeadsPage.tsx";
import DesignStudioPage from "./pages/DesignStudioPage.tsx";
import PageBuilderPage from "./pages/PageBuilderPage.tsx";

import SettingsPage from "./pages/SettingsPage.tsx";
import PublicProfilePage from "./pages/PublicProfilePage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import SignupPage from "./pages/SignupPage.tsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.tsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.tsx";
import TermsPage from "./pages/TermsPage.tsx";
import PrivacyPage from "./pages/PrivacyPage.tsx";
import PlansPage from "./pages/PlansPage.tsx";
import AdminPage from "./pages/AdminPage.tsx";
import TurnstileSettingsPage from "./pages/TurnstileSettingsPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import UnsubscribePage from "./pages/UnsubscribePage.tsx";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <PreferencesProvider>
          <DashboardThemeProvider>
          <NotificationListener />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/cards" element={<ProtectedRoute><CardsPage /></ProtectedRoute>} />
            <Route path="/nfc-manager" element={<ProtectedRoute><NfcManagerPage /></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute><LogsPage /></ProtectedRoute>} />
            
            <Route path="/profile" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/personas" element={<ProtectedRoute><PersonasPage /></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute><LeadsPage /></ProtectedRoute>} />
            <Route path="/design-studio" element={<ProtectedRoute><DesignStudioPage /></ProtectedRoute>} />
            <Route path="/page-builder" element={<ProtectedRoute><PageBuilderPage /></ProtectedRoute>} />

            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/plans" element={<ProtectedRoute><PlansPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
            <Route path="/admin/turnstile" element={<ProtectedRoute><TurnstileSettingsPage /></ProtectedRoute>} />
            <Route path="/p/:username" element={<PublicProfilePage />} />
            <Route path="/p/:username/:personaSlug" element={<PublicProfilePage />} />
            <Route path="/u/:code" element={<ShortUrlRedirect />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/unsubscribe" element={<UnsubscribePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </DashboardThemeProvider>
          <CookieConsentBanner />
          </PreferencesProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

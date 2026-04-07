import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useProfileStore } from '@/store/profileStore';

// Lazy-loaded pages
const HomePage = lazy(() => import('@/pages/HomePage'));
const LobbyPage = lazy(() => import('@/pages/LobbyPage'));
const GamePage = lazy(() => import('@/pages/GamePage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const RoomPage = lazy(() => import('@/pages/RoomPage'));

// Eagerly-loaded shell components
import ProfileSetup from '@/components/profile/ProfileSetup';
import Toast from '@/components/ui/Toast';

function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-full bg-[#0f3d25]">
      <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/lobby/:gameId" element={<LobbyPage />} />
        <Route path="/game/:gameId" element={<GamePage />} />
        <Route path="/room/:code" element={<RoomPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  const { isSetupComplete, initProfile } = useProfileStore();

  useEffect(() => {
    initProfile();
  }, [initProfile]);

  return (
    <BrowserRouter>
      {/* Global toast overlay */}
      <Toast />

      {isSetupComplete ? (
        <Suspense fallback={<PageSpinner />}>
          <AnimatedRoutes />
        </Suspense>
      ) : (
        <ProfileSetup />
      )}
    </BrowserRouter>
  );
}

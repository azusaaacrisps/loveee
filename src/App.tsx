import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import { useCoupleStore } from './stores/couple';
import { useDailyStore } from './stores/daily';
import { useAnniversaryStore } from './stores/anniversary';
import { useWishlistStore } from './stores/wishlist';
import { useMemoryStore } from './stores/memory';
import { useSavingsStore } from './stores/savings';
import { useLoveHeartStore } from './stores/loveHeart';
import { useWeatherStore } from './stores/weather';
import { HomePage } from './pages/HomePage';
import { DailyPage } from './pages/DailyPage';
import { AnniversaryPage } from './pages/AnniversaryPage';
import { WishlistPage } from './pages/WishlistPage';
import { MemoryPage } from './pages/MemoryPage';
import { SavingsPage } from './pages/SavingsPage';
import { AuthPage } from './pages/AuthPage';
import { SettingsPage } from './pages/SettingsPage';
import { MusicPage } from './pages/MusicPage';
import { useMusicStore } from './stores/music';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn } = useAuthStore();
  return isLoggedIn ? <>{children}</> : <Navigate to="/auth" />;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn } = useAuthStore();
  return !isLoggedIn ? <>{children}</> : <Navigate to="/" />;
};

const DATA_VERSION = '3';

const clearOldData = () => {
  const savedVersion = localStorage.getItem('app:dataVersion');
  if (savedVersion !== DATA_VERSION) {
    const auth = localStorage.getItem('couple-diary:auth');
    if (auth) {
      try {
        const user = JSON.parse(auth);
        const coupleId = user?.coupleId;
        if (coupleId) {
          localStorage.removeItem(`couple-diary:daily:${coupleId}`);
          localStorage.removeItem(`couple-diary:anniversary:${coupleId}`);
          localStorage.removeItem(`couple-diary:wishlist:${coupleId}`);
          localStorage.removeItem(`couple-diary:memory:${coupleId}`);
          localStorage.removeItem(`couple-diary:savings:${coupleId}`);
          localStorage.removeItem(`couple-diary:savings-goal:${coupleId}`);
        }
      } catch {
        // ignore
      }
    }
    localStorage.setItem('app:dataVersion', DATA_VERSION);
  }
};

export default function App() {
  const { loadAuth, isLoggedIn } = useAuthStore();
  const { loadProfile } = useCoupleStore();
  const { loadRecords: loadDailyRecords } = useDailyStore();
  const { loadAnniversaries } = useAnniversaryStore();
  const { loadWishes } = useWishlistStore();
  const { loadMemories } = useMemoryStore();
  const { loadSavings } = useSavingsStore();
  const { loadLoveHeart } = useLoveHeartStore();
  const { loadWeather } = useWeatherStore();
  const { loadSongs } = useMusicStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAuth();
    clearOldData();
  }, [loadAuth]);

  useEffect(() => {
    if (!isLoggedIn) {
      setIsLoading(false);
      return;
    }

    const loadAllData = async () => {
      await Promise.all([
        loadProfile(),
        loadDailyRecords(),
        loadAnniversaries(),
        loadWishes(),
        loadMemories(),
        loadSavings(),
        loadLoveHeart(),
        loadWeather(),
        loadSongs(),
      ]);
      setIsLoading(false);
    };

    loadAllData();
  }, [
    isLoggedIn,
    loadProfile,
    loadDailyRecords,
    loadAnniversaries,
    loadWishes,
    loadMemories,
    loadSavings,
    loadLoveHeart,
    loadWeather,
    loadSongs,
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">💕</div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={
          <AuthRoute>
            <AuthPage />
          </AuthRoute>
        } />
        
        <Route path="/" element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        } />
        
        <Route path="/daily" element={
          <ProtectedRoute>
            <DailyPage />
          </ProtectedRoute>
        } />
        
        <Route path="/anniversary" element={
          <ProtectedRoute>
            <AnniversaryPage />
          </ProtectedRoute>
        } />
        
        <Route path="/wishlist" element={
          <ProtectedRoute>
            <WishlistPage />
          </ProtectedRoute>
        } />
        
        <Route path="/memory" element={
          <ProtectedRoute>
            <MemoryPage />
          </ProtectedRoute>
        } />
        
        <Route path="/music" element={
          <ProtectedRoute>
            <MusicPage />
          </ProtectedRoute>
        } />
        
        <Route path="/savings" element={
          <ProtectedRoute>
            <SavingsPage />
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
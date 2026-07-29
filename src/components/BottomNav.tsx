import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLoveHeartStore } from '../stores/loveHeart';

interface BottomNavProps {
  onHeartClick?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onHeartClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loveHeart } = useLoveHeartStore();

  const navItems = [
    { path: '/', icon: '🏠', label: 'Home' },
    { path: '/memory', icon: '📷', label: 'Memory' },
    { path: '/music', icon: '🎵', label: 'Music' },
    { path: '/settings', icon: '🌙', label: 'Mine' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/40 backdrop-blur-md border-t border-white/40 z-50">
      <div className="max-w-md mx-auto px-6">
        <div className="flex items-center justify-between py-2">
          {navItems.map((item, index) => (
            <React.Fragment key={item.path}>
              <button
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 transition-colors ${
                  isActive(item.path) ? 'text-primary' : 'text-text-muted hover:text-primary'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs">{item.label}</span>
              </button>
              {index < navItems.length - 1 && (
                <div className="w-px h-8 bg-gray-200/50 mx-2" />
              )}
            </React.Fragment>
          ))}
        </div>

        <button
          onClick={onHeartClick}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"
        >
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white text-2xl shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95">
            ♥
          </div>
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1">
            <span className="text-xs text-primary font-semibold">{loveHeart?.boyCount || 0}</span>
            <span className="text-accent text-xs">♥</span>
            <span className="text-xs text-accent font-semibold">{loveHeart?.girlCount || 0}</span>
          </div>
        </button>
      </div>
    </nav>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useCoupleStore } from '../stores/couple';
import { useLoveHeartStore } from '../stores/loveHeart';
import { calculateDaysTogether } from '../utils/date';
import { AvatarCropper } from '../components/AvatarCropper';
import { BottomNav } from '../components/BottomNav';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();
  const { profile, updateProfile } = useCoupleStore();
  const { addHeart } = useLoveHeartStore();
  const [boyAvatar, setBoyAvatar] = useState<string | null>(null);
  const [girlAvatar, setGirlAvatar] = useState<string | null>(null);
  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const [croppingType, setCroppingType] = useState<'boy' | 'girl' | null>(null);

  useEffect(() => {
    if (profile) {
      setBoyAvatar(profile.boyAvatar || null);
      setGirlAvatar(profile.girlAvatar || null);
    }
  }, [profile]);

  const handleBoyAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCropperImage(event.target?.result as string);
      setCroppingType('boy');
    };
    reader.readAsDataURL(file);
  };

  const handleGirlAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCropperImage(event.target?.result as string);
      setCroppingType('girl');
    };
    reader.readAsDataURL(file);
  };

  const handleCropperConfirm = (croppedImage: string) => {
    if (croppingType === 'boy') {
      setBoyAvatar(croppedImage);
      updateProfile({ ...profile!, boyAvatar: croppedImage });
    } else if (croppingType === 'girl') {
      setGirlAvatar(croppedImage);
      updateProfile({ ...profile!, girlAvatar: croppedImage });
    }
    setCropperImage(null);
    setCroppingType(null);
  };

  const handleCropperCancel = () => {
    setCropperImage(null);
    setCroppingType(null);
  };

  const handleDeleteBoyAvatar = () => {
    setBoyAvatar(null);
    updateProfile({ ...profile!, boyAvatar: '' });
  };

  const handleDeleteGirlAvatar = () => {
    setGirlAvatar(null);
    updateProfile({ ...profile!, girlAvatar: '' });
  };

  const handleRestoreAvatars = () => {
    setBoyAvatar(null);
    setGirlAvatar(null);
    updateProfile({ ...profile!, boyAvatar: '', girlAvatar: '' });
  };

  const handleLogout = () => {
    if (window.confirm('确定要退出登录吗？')) {
      logout();
      navigate('/auth');
    }
  };

  const daysTogether = profile ? calculateDaysTogether(profile.togetherDate) : 0;

  return (
    <div className="min-h-screen pb-24 page-transition">
      <div className="sticky top-0 bg-bg-nav/95 backdrop-blur-md z-50 border-b border-white/50">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <button 
            className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-text-secondary hover:text-primary transition-colors"
          >
            ☰
          </button>
          <h1 className="font-semibold text-text-primary tracking-wide">
            {profile?.boyNickname}&{profile?.girlNickname}
          </h1>
          <div className="flex items-center gap-1.5 bg-accent-light rounded-full px-3 py-1">
            <span className="text-accent text-sm">♥</span>
            <span className="text-accent text-sm font-semibold">100%</span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-text-primary">我的</h2>
          <span className="text-text-muted text-xs">头像与重要日子设置</span>
        </div>

        <div className="glass-card rounded-2xl shadow-card p-5 mb-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-text-primary text-lg">Mine</h3>
              <p className="text-text-muted text-xs mt-1">{profile?.boyNickname}和{profile?.girlNickname}的小手机设置台。</p>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-12 h-12 rounded-full overflow-hidden shadow-sm">
                {boyAvatar?.startsWith('data:image') ? (
                  <img src={boyAvatar} alt="男生头像" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                    <span className="text-xl">🧸</span>
                  </div>
                )}
              </div>
              <span className="text-accent text-sm">♥</span>
              <div className="w-12 h-12 rounded-full overflow-hidden shadow-sm">
                {girlAvatar?.startsWith('data:image') ? (
                  <img src={girlAvatar} alt="女生头像" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-pink-100 flex items-center justify-center">
                    <span className="text-xl">🐰</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full">在一起 {daysTogether} 天</span>
            <span className="px-3 py-1 bg-accent/10 text-accent text-xs rounded-full">{user?.username}</span>
            <span className="px-3 py-1 bg-gray-100 text-text-muted text-xs rounded-full">未开始记录</span>
          </div>

          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div>
              <p className="text-text-muted text-xs">情侣码</p>
              <p className="font-mono text-text-primary text-sm">{user?.coupleId}</p>
            </div>
            <button
              onClick={() => {
                if (user?.coupleId) {
                  navigator.clipboard.writeText(user.coupleId);
                  alert('已复制情侣码');
                }
              }}
              className="px-3 py-1.5 bg-primary/10 text-primary text-xs rounded-lg hover:bg-primary/20 transition-colors"
            >
              复制
            </button>
          </div>
        </div>

        <div className="glass-card rounded-2xl shadow-card p-5 mb-5">
          <h3 className="font-semibold text-text-primary mb-2">头像管理</h3>
          <p className="text-text-muted text-xs mb-4">更换你和{profile?.boyNickname}的小窗头像。</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/35 rounded-xl p-4 text-center border border-white/40">
              <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-3 shadow-sm">
                {boyAvatar?.startsWith('data:image') ? (
                  <img src={boyAvatar} alt="男生头像" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                    <span className="text-3xl">🧸</span>
                  </div>
                )}
              </div>
              <p className="font-medium text-text-primary mb-3">{profile?.boyNickname}</p>
              
              <input
                type="file"
                accept="image/*"
                onChange={handleBoyAvatarUpload}
                className="hidden"
                id="boy-avatar-change"
              />
              <label
                htmlFor="boy-avatar-change"
                className="block w-full py-2 bg-primary/10 text-primary text-sm rounded-xl hover:bg-primary/20 transition-colors cursor-pointer mb-2"
              >
                换图片
              </label>
              
              <button
                onClick={handleDeleteBoyAvatar}
                className="w-full py-2 bg-accent/10 text-accent text-sm rounded-xl hover:bg-accent/20 transition-colors"
              >
                删掉头像
              </button>
            </div>

            <div className="bg-white/35 rounded-xl p-4 text-center border border-white/40">
              <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-3 shadow-sm">
                {girlAvatar?.startsWith('data:image') ? (
                  <img src={girlAvatar} alt="女生头像" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-pink-100 flex items-center justify-center">
                    <span className="text-3xl">🐰</span>
                  </div>
                )}
              </div>
              <p className="font-medium text-text-primary mb-3">{profile?.girlNickname}</p>
              
              <input
                type="file"
                accept="image/*"
                onChange={handleGirlAvatarUpload}
                className="hidden"
                id="girl-avatar-change"
              />
              <label
                htmlFor="girl-avatar-change"
                className="block w-full py-2 bg-primary/10 text-primary text-sm rounded-xl hover:bg-primary/20 transition-colors cursor-pointer mb-2"
              >
                换图片
              </label>
              
              <button
                onClick={handleDeleteGirlAvatar}
                className="w-full py-2 bg-accent/10 text-accent text-sm rounded-xl hover:bg-accent/20 transition-colors"
              >
                删掉头像
              </button>
            </div>
          </div>

          <button
            onClick={handleRestoreAvatars}
            className="w-full mt-4 py-2 bg-accent/10 text-accent text-sm rounded-xl hover:bg-accent/20 transition-colors"
          >
            恢复文字头像
          </button>
        </div>

        <div className="glass-card rounded-2xl shadow-card p-5">
          <p className="text-text-muted text-xs uppercase tracking-wider mb-4">QUICK ACCESS</p>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/daily')}
              className="bg-white/35 rounded-xl p-4 text-left hover:bg-white/50 transition-colors border border-white/40"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-primary">📝</span>
              </div>
              <p className="font-medium text-text-primary text-sm">日常记录</p>
              <p className="text-text-muted text-xs mt-1">记录每天的生活</p>
            </button>

            <button
              onClick={() => navigate('/anniversary')}
              className="bg-white/35 rounded-xl p-4 text-left hover:bg-white/50 transition-colors border border-white/40"
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                <span className="text-accent">🎁</span>
              </div>
              <p className="font-medium text-text-primary text-sm">纪念日</p>
              <p className="text-text-muted text-xs mt-1">重要的日子</p>
            </button>

            <button
              onClick={() => navigate('/wishlist')}
              className="bg-white/35 rounded-xl p-4 text-left hover:bg-white/50 transition-colors border border-white/40"
            >
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center mb-3">
                <span className="text-warning">✨</span>
              </div>
              <p className="font-medium text-text-primary text-sm">心愿清单</p>
              <p className="text-text-muted text-xs mt-1">未来的计划</p>
            </button>

            <button
              onClick={() => navigate('/savings')}
              className="bg-white/35 rounded-xl p-4 text-left hover:bg-white/50 transition-colors border border-white/40"
            >
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center mb-3">
                <span className="text-success">💰</span>
              </div>
              <p className="font-medium text-text-primary text-sm">小金库</p>
              <p className="text-text-muted text-xs mt-1">共同的财富</p>
            </button>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full mt-5 py-3 bg-danger/10 text-danger rounded-xl font-medium hover:bg-danger/20 transition-colors"
        >
          退出登录
        </button>
      </div>

      <BottomNav onHeartClick={addHeart} />

      {cropperImage && (
        <AvatarCropper
          imageSrc={cropperImage}
          onConfirm={handleCropperConfirm}
          onCancel={handleCropperCancel}
        />
      )}
    </div>
  );
};
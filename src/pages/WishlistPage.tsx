import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWishlistStore } from '../stores/wishlist';
import { useLoveHeartStore } from '../stores/loveHeart';
import { useCoupleStore } from '../stores/couple';
import { Modal } from '../components/common/Modal';
import { BottomNav } from '../components/BottomNav';
import type { Wish } from '../types';

const WishCard = ({ 
  item, 
  onToggle, 
  onDelete,
  profile
}: { 
  item: Wish; 
  onToggle: (id: string) => void; 
  onDelete: (id: string) => void;
  profile: { boyNickname?: string; girlNickname?: string } | null;
}) => {
  return (
    <div className={`bg-white rounded-2xl shadow-card p-4 card-hover flex items-center gap-4 ${item.status === 'completed' ? 'opacity-70' : ''}`}>
      <button
        onClick={() => onToggle(item.id)}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          item.status === 'completed' 
            ? 'bg-success/20 text-success' 
            : 'bg-gray-100 text-text-muted hover:bg-primary/10 hover:text-primary'
        }`}
      >
        {item.status === 'completed' ? '✓' : '○'}
      </button>
      
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-medium ${item.gender === 'boy' ? 'text-primary' : 'text-accent'}`}>
            {item.gender === 'boy' ? profile?.boyNickname || '他' : profile?.girlNickname || '她'}
          </span>
          <span className="text-xs text-text-muted">的心愿</span>
        </div>
        <p className={`font-medium ${item.status === 'completed' ? 'line-through text-text-muted' : 'text-text-primary'}`}>
          {item.title}
        </p>
        {item.description && (
          <p className="text-text-muted text-xs mt-1">{item.description}</p>
        )}
      </div>
      
      <button
        onClick={() => onDelete(item.id)}
        className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center text-danger/70 hover:text-danger hover:bg-danger/20 transition-all"
      >
        ✕
      </button>
    </div>
  );
};

export const WishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const { wishes, loadWishes, addWish, toggleWishStatus, deleteWish } = useWishlistStore();
  const { addHeart } = useLoveHeartStore();
  const { profile } = useCoupleStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadWishes();
  }, [loadWishes]);

  const completedCount = wishes.filter(w => w.status === 'completed').length;

  const handleSave = () => {
    if (!title.trim()) return;
    addWish(title, description);
    setTitle('');
    setDescription('');
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen pb-24 page-transition">
      <div className="sticky top-0 bg-bg-nav/95 backdrop-blur-md z-50 border-b border-white/50">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-text-secondary hover:text-primary transition-colors"
            >
              ←
            </button>
            <h1 className="font-semibold text-text-primary">心愿清单</h1>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-10 h-10 rounded-xl bg-primary text-white shadow-sm flex items-center justify-center hover:bg-primary-dark transition-colors"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <div className="glass-card rounded-2xl shadow-card p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">完成进度</p>
              <p className="text-2xl font-semibold text-primary mt-1">
                {completedCount} / {wishes.length}
              </p>
            </div>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xl font-semibold text-primary">
                {wishes.length > 0 ? Math.round((completedCount / wishes.length) * 100) : 0}%
              </span>
            </div>
          </div>
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
              style={{ width: `${wishes.length > 0 ? (completedCount / wishes.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="space-y-3">
          {wishes.length > 0 ? (
            wishes.map(item => (
              <WishCard 
                key={item.id} 
                item={item} 
                onToggle={toggleWishStatus} 
                onDelete={deleteWish}
                profile={profile}
              />
            ))
          ) : (
            <div className="glass-card rounded-2xl shadow-card p-8 text-center">
              <span className="text-4xl mb-3 block">✨</span>
              <p className="text-text-secondary mb-1">还没有心愿</p>
              <p className="text-text-muted text-xs">记录你们想一起做的事情吧</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 px-6 py-2 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary-dark transition-colors"
              >
                添加心愿
              </button>
            </div>
          )}
        </div>
      </div>

      <BottomNav onHeartClick={addHeart} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="✨ 添加心愿">
        <div className="space-y-4">
          <div>
            <label className="block text-text-secondary text-sm mb-2">心愿内容</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：一起去旅行"
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
          
          <div>
            <label className="block text-text-secondary text-sm mb-2">备注（可选）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="补充说明..."
              className="w-full h-20 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 resize-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            添加
          </button>
        </div>
      </Modal>
    </div>
  );
};
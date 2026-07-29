import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnniversaryStore } from '../stores/anniversary';
import { useLoveHeartStore } from '../stores/loveHeart';
import { useCoupleStore } from '../stores/couple';
import { formatDate, calculateDaysUntil, calculateDaysTogether } from '../utils/date';
import { Modal } from '../components/common/Modal';
import { BottomNav } from '../components/BottomNav';
import type { Anniversary } from '../types';

const AnniversaryCard = ({ 
  item, 
  onDelete,
  profile
}: { 
  item: Anniversary; 
  onDelete: (id: string) => void;
  profile: { boyNickname?: string; girlNickname?: string } | null;
}) => {
  const daysUntil = calculateDaysUntil(item.date);
  const daysTogether = calculateDaysTogether(item.date);
  const isFuture = daysUntil > 0;
  
  return (
    <div className="glass-card rounded-2xl shadow-card p-4 card-hover">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-text-primary">{item.name}</h3>
            {item.isTogetherDay && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">恋爱日</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${item.gender === 'boy' ? 'text-primary' : 'text-accent'}`}>
              {item.gender === 'boy' ? profile?.boyNickname || '他' : profile?.girlNickname || '她'}
            </span>
            <span className="text-text-muted text-xs">添加</span>
            <span className="text-text-muted text-xs">·</span>
            <span className="text-text-muted text-xs">{formatDate(item.date)}</span>
          </div>
        </div>
        {!item.isTogetherDay && (
          <button
            onClick={() => onDelete(item.id)}
            className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center text-danger/70 hover:text-danger hover:bg-danger/20 transition-all"
          >
            ✕
          </button>
        )}
      </div>
      
      <div className="mt-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-semibold text-primary days-counter">{daysUntil}</span>
            <span className="text-text-secondary text-sm">天后</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
              style={{ width: `${Math.max(0, 100 - daysUntil * 2)}%` }}
            />
          </div>
        </div>
        <div className="text-center">
          <p className="text-text-muted text-xs">{isFuture ? '还有' : '已陪伴'}</p>
          <p className="text-xl font-semibold text-accent days-counter">{isFuture ? daysUntil : daysTogether}</p>
          <p className="text-text-muted text-xs">天</p>
        </div>
      </div>
    </div>
  );
};

export const AnniversaryPage: React.FC = () => {
  const navigate = useNavigate();
  const { anniversaries, loadAnniversaries, addAnniversary, deleteAnniversary } = useAnniversaryStore();
  const { addHeart } = useLoveHeartStore();
  const { profile } = useCoupleStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    loadAnniversaries();
  }, [loadAnniversaries]);

  const handleSave = () => {
    if (!name.trim() || !date) return;
    addAnniversary(name, date);
    setName('');
    setDate('');
    setIsModalOpen(false);
  };

  const sortedAnniversaries = [...anniversaries].sort((a, b) => {
    if (a.isTogetherDay) return -1;
    if (b.isTogetherDay) return 1;
    return calculateDaysUntil(a.date) - calculateDaysUntil(b.date);
  });

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
            <h1 className="font-semibold text-text-primary">纪念日</h1>
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
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="glass-card rounded-2xl shadow-card p-4 text-center card-hover">
            <p className="text-3xl font-semibold text-primary days-counter">{anniversaries.length}</p>
            <p className="text-text-muted text-xs mt-1">总纪念日</p>
          </div>
          <div className="glass-card rounded-2xl shadow-card p-4 text-center card-hover">
            <p className="text-3xl font-semibold text-accent days-counter">
              {anniversaries.filter(a => calculateDaysUntil(a.date) <= 30).length}
            </p>
            <p className="text-text-muted text-xs mt-1">即将到来</p>
          </div>
        </div>

        <div className="space-y-3">
          {sortedAnniversaries.length > 0 ? (
            sortedAnniversaries.map(item => (
              <AnniversaryCard key={item.id} item={item} onDelete={deleteAnniversary} profile={profile} />
            ))
          ) : (
            <div className="glass-card rounded-2xl shadow-card p-8 text-center">
              <span className="text-4xl mb-3 block">🎁</span>
              <p className="text-text-secondary mb-1">还没有添加纪念日</p>
              <p className="text-text-muted text-xs">记录你们的重要日子吧</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 px-6 py-2 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary-dark transition-colors"
              >
                添加纪念日
              </button>
            </div>
          )}
        </div>
      </div>

      <BottomNav onHeartClick={addHeart} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="🎁 添加纪念日">
        <div className="space-y-4">
          <div>
            <label className="block text-text-secondary text-sm mb-2">纪念日名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：在一起100天"
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
          
          <div>
            <label className="block text-text-secondary text-sm mb-2">日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all date-picker-input"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={!name.trim() || !date}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            添加
          </button>
        </div>
      </Modal>
    </div>
  );
};
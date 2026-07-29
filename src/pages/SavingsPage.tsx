import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSavingsStore } from '../stores/savings';
import { useLoveHeartStore } from '../stores/loveHeart';
import { useCoupleStore } from '../stores/couple';
import { formatDate } from '../utils/date';
import { Modal } from '../components/common/Modal';
import { BottomNav } from '../components/BottomNav';
import type { SavingRecord, SavingsGoal } from '../types';

const RecordCard = ({ 
  item, 
  onDelete,
  profile
}: { 
  item: SavingRecord; 
  onDelete: (id: string) => void;
  profile: { boyNickname?: string; girlNickname?: string } | null;
}) => {
  return (
    <div className="glass-card rounded-2xl shadow-card p-4 card-hover flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.gender === 'boy' ? 'bg-primary/10' : 'bg-accent/10'}`}>
          <span className="text-xl">💰</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${item.gender === 'boy' ? 'text-primary' : 'text-accent'}`}>
              {item.gender === 'boy' ? profile?.boyNickname || '他' : profile?.girlNickname || '她'}
            </span>
            <span className="text-text-muted text-xs">存入</span>
          </div>
          <p className="font-medium text-text-primary">{item.note || '无备注'}</p>
          <p className="text-text-muted text-xs">{formatDate(item.createdAt)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-success">+¥{item.amount.toFixed(2)}</p>
        <button
          onClick={() => onDelete(item.id)}
          className="text-text-muted text-xs hover:text-danger transition-colors"
        >
          删除
        </button>
      </div>
    </div>
  );
};

export const SavingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    records, 
    goal, 
    loadSavings, 
    addRecord, 
    deleteRecord, 
    setGoal, 
    getTotalSavings,
    getBoySavings,
    getGirlSavings,
    getProgress
  } = useSavingsStore();
  const { addHeart } = useLoveHeartStore();
  const { profile } = useCoupleStore();
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [goalAmount, setGoalAmount] = useState('');

  useEffect(() => {
    loadSavings();
  }, [loadSavings]);

  const handleAddRecord = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    addRecord(parseFloat(amount), note);
    setAmount('');
    setNote('');
    setIsRecordModalOpen(false);
  };

  const handleSetGoal = () => {
    if (!goalAmount || parseFloat(goalAmount) <= 0) return;
    setGoal(parseFloat(goalAmount));
    setGoalAmount('');
    setIsGoalModalOpen(false);
  };

  const totalBalance = getTotalSavings();
  const progress = goal ? getProgress() : 0;

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
            <h1 className="font-semibold text-text-primary">小金库</h1>
            <div className="w-10" />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <div className="glass-card rounded-2xl shadow-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-text-muted text-sm mb-1">当前余额</p>
              <p className="text-4xl font-semibold text-text-primary">¥{totalBalance.toFixed(2)}</p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
          <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-text-muted text-xs">{profile?.boyNickname || '他'}</span>
              </div>
              <p className="font-semibold text-text-primary">¥{getBoySavings().toFixed(2)}</p>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-text-muted text-xs">{profile?.girlNickname || '她'}</span>
              </div>
              <p className="font-semibold text-text-primary">¥{getGirlSavings().toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl shadow-card p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-text-primary">存钱目标</h3>
            <button 
              onClick={() => setIsGoalModalOpen(true)}
              className="text-primary text-sm flex items-center gap-1"
            >
              + 设置
            </button>
          </div>
          
          {goal ? (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-text-primary">目标进度</span>
                <span className="text-text-secondary text-sm">
                  ¥{totalBalance.toFixed(2)} / ¥{goal.targetAmount.toFixed(2)}
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-text-muted text-xs mt-2 text-right">{Math.round(progress)}%</p>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-text-muted text-sm">还没有存钱目标</p>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsRecordModalOpen(true)}
          className="w-full py-3 bg-success/10 text-success rounded-xl font-medium hover:bg-success/20 transition-colors flex items-center justify-center gap-2 mb-4"
        >
          💰 存入一笔
        </button>

        <div className="space-y-3">
          {records.length > 0 ? (
            records.map(item => (
              <RecordCard key={item.id} item={item} onDelete={deleteRecord} profile={profile} />
            ))
          ) : (
            <div className="glass-card rounded-2xl shadow-card p-8 text-center">
              <span className="text-4xl mb-3 block">💰</span>
              <p className="text-text-secondary mb-1">还没有记录</p>
              <p className="text-text-muted text-xs">记录你们的存钱情况吧</p>
            </div>
          )}
        </div>
      </div>

      <BottomNav onHeartClick={addHeart} />

      <Modal isOpen={isRecordModalOpen} onClose={() => setIsRecordModalOpen(false)} title="💰 存入一笔">
        <div className="space-y-4">
          <div>
            <label className="block text-text-secondary text-sm mb-2">金额</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
          
          <div>
            <label className="block text-text-secondary text-sm mb-2">备注</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：工资"
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>

          <button
            onClick={handleAddRecord}
            disabled={!amount || parseFloat(amount) <= 0}
            className="w-full py-3 bg-success text-white rounded-xl font-medium hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            确认存入
          </button>
        </div>
      </Modal>

      <Modal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} title="🎯 设置存钱目标">
        <div className="space-y-4">
          <div>
            <label className="block text-text-secondary text-sm mb-2">目标金额</label>
            <input
              type="number"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>

          <button
            onClick={handleSetGoal}
            disabled={!goalAmount || parseFloat(goalAmount) <= 0}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            设置目标
          </button>
        </div>
      </Modal>
    </div>
  );
};
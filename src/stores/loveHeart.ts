import { create } from 'zustand';
import { LoveHeart } from '../types';
import { storage } from '../utils/storage';
import { useAuthStore } from './auth';
import { loveHeartService } from '../services/firebase';
import { withTimeout } from '../utils/firebase';

interface LoveHeartStore {
  loveHeart: LoveHeart | null;
  _loading: boolean;
  
  loadLoveHeart: () => Promise<void>;
  addHeart: () => void;
  resetHearts: () => void;
}

export const useLoveHeartStore = create<LoveHeartStore>((set, get) => ({
  loveHeart: null,
  _loading: false,

  loadLoveHeart: async () => {
    const coupleId = useAuthStore.getState().getCoupleId();
    if (!coupleId) return;
    if (get()._loading) return;
    set({ _loading: true });

    let loveHeart = storage.getItem<LoveHeart>(`loveheart:${coupleId}`);
    
    // 立即使用本地数据渲染
    if (loveHeart) {
      set({ loveHeart });
    }
    
    try {
      const firebaseLoveHeart = await withTimeout(
        loveHeartService.get(coupleId),
        5000,
        null
      );
      if (firebaseLoveHeart) {
        loveHeart = firebaseLoveHeart;
        storage.setItem(`loveheart:${coupleId}`, loveHeart);
      }
    } catch (error) {
      console.log('Using local loveHeart (Firebase unavailable)');
    }

    if (!loveHeart) {
      loveHeart = {
        boyCount: 0,
        girlCount: 0,
        updatedAt: new Date().toISOString(),
      };
      storage.setItem(`loveheart:${coupleId}`, loveHeart);
    }

    set({ loveHeart, _loading: false });
  },

  addHeart: () => {
    const coupleId = useAuthStore.getState().getCoupleId();
    const { user } = useAuthStore.getState();
    if (!coupleId || !user) return;

    const field = user.gender === 'boy' ? 'boyCount' : 'girlCount';

    // 乐观更新本地
    const loveHeart = get().loveHeart || { boyCount: 0, girlCount: 0, updatedAt: new Date().toISOString() };
    const updated: LoveHeart = {
      ...loveHeart,
      [user.gender === 'boy' ? 'boyCount' : 'girlCount']: loveHeart[field] + 1,
      updatedAt: new Date().toISOString(),
    };
    storage.setItem(`loveheart:${coupleId}`, updated);
    set({ loveHeart: updated });

    // Firebase 原子增量
    loveHeartService.increment(coupleId, user.gender).catch(error => {
      console.error('Failed to increment loveHeart in Firebase:', error);
    });
  },

  resetHearts: () => {
    const coupleId = useAuthStore.getState().getCoupleId();
    if (!coupleId) return;

    const loveHeart: LoveHeart = {
      boyCount: 0,
      girlCount: 0,
      updatedAt: new Date().toISOString(),
    };
    storage.setItem(`loveheart:${coupleId}`, loveHeart);
    set({ loveHeart });

    loveHeartService.set(coupleId, loveHeart).catch(error => {
      console.error('Failed to reset loveHeart in Firebase:', error);
    });
  },
}));
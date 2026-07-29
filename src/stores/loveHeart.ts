import { create } from 'zustand';
import { LoveHeart } from '../types';
import { storage } from '../utils/storage';
import { useAuthStore } from './auth';
import { loveHeartService } from '../services/firebase';
import { withTimeout } from '../utils/firebase';

interface LoveHeartStore {
  loveHeart: LoveHeart | null;
  
  loadLoveHeart: () => Promise<void>;
  addHeart: () => void;
  resetHearts: () => void;
}

export const useLoveHeartStore = create<LoveHeartStore>((set, get) => ({
  loveHeart: null,

  loadLoveHeart: async () => {
    const coupleId = useAuthStore.getState().getCoupleId();
    if (!coupleId) return;

    let loveHeart = storage.getItem<LoveHeart>(`loveheart:${coupleId}`);
    
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

    set({ loveHeart });
  },

  addHeart: () => {
    const coupleId = useAuthStore.getState().getCoupleId();
    const { user } = useAuthStore.getState();
    if (!coupleId || !user) return;

    let loveHeart = get().loveHeart;
    if (!loveHeart) {
      loveHeart = {
        boyCount: 0,
        girlCount: 0,
        updatedAt: new Date().toISOString(),
      };
    }

    if (user.gender === 'boy') {
      loveHeart.boyCount += 1;
    } else {
      loveHeart.girlCount += 1;
    }

    loveHeart.updatedAt = new Date().toISOString();
    storage.setItem(`loveheart:${coupleId}`, loveHeart);
    set({ loveHeart });

    loveHeartService.set(coupleId, loveHeart).catch(error => {
      console.error('Failed to update loveHeart in Firebase:', error);
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
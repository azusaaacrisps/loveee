import { create } from 'zustand';
import { Anniversary } from '../types';
import { storage } from '../utils/storage';
import { useAuthStore } from './auth';
import { generateId } from '../utils/date';
import { anniversaryService } from '../services/firebase';
import { withTimeout } from '../utils/firebase';

interface AnniversaryStore {
  anniversaries: Anniversary[];
  _loading: boolean;
  
  loadAnniversaries: () => Promise<void>;
  addAnniversary: (name: string, date: string) => void;
  deleteAnniversary: (id: string) => void;
  getUpcomingAnniversary: () => Anniversary | null;
}

export const useAnniversaryStore = create<AnniversaryStore>((set, get) => ({
  anniversaries: [],
  _loading: false,

  loadAnniversaries: async () => {
    const coupleId = useAuthStore.getState().getCoupleId();
    if (!coupleId) return;
    if (get()._loading) return;
    set({ _loading: true });

    const localAnniversaries = storage.getItem<Anniversary[]>(`anniversary:${coupleId}`) || [];
    const deletedIds = new Set(storage.getItem<string[]>(`deletedIds:anniversary:${coupleId}`) || []);
    let anniversaries = localAnniversaries;
    
    // 立即使用本地数据渲染
    set({ anniversaries: localAnniversaries });
    
    try {
      const firebaseAnniversaries = await withTimeout(
        anniversaryService.getAll(coupleId),
        5000,
        []
      );
      
      if (firebaseAnniversaries.length > 0) {
        const localIds = new Set(localAnniversaries.map(a => a.id));
        
        const toDeleteIds = new Set(
          firebaseAnniversaries.filter(a => deletedIds.has(a.id)).map(a => a.id)
        );
        if (toDeleteIds.size > 0) {
          console.log(`发现 ${toDeleteIds.size} 个纪念日已在本地删除，同步到Firebase`);
          for (const id of toDeleteIds) {
            await anniversaryService.delete(coupleId, id).catch(() => {});
          }
          const remainingDeleted = new Set(
            [...deletedIds].filter(id => !toDeleteIds.has(id))
          );
          storage.setItem(`deletedIds:anniversary:${coupleId}`, Array.from(remainingDeleted));
        }
        
        // 以 Firebase 为准，过滤掉已删除的，再补上本地独有（未同步）的记录
        const firebaseIds = new Set(firebaseAnniversaries.map(a => a.id));
        const anniversariesNotInFirebase = localAnniversaries.filter(a => !firebaseIds.has(a.id));
        anniversaries = [
          ...firebaseAnniversaries.filter(a => !toDeleteIds.has(a.id)),
          ...anniversariesNotInFirebase,
        ];
      }
    } catch (error) {
      console.log('Using local anniversaries (Firebase unavailable)');
    }

    storage.setItem(`anniversary:${coupleId}`, anniversaries);
    set({ anniversaries, _loading: false });
  },

  addAnniversary: async (name: string, date: string) => {
    const coupleId = useAuthStore.getState().getCoupleId();
    const { user } = useAuthStore.getState();
    if (!coupleId || !user) return;

    const newAnniversary: Anniversary = {
      id: generateId(),
      userId: user.id,
      gender: user.gender,
      name,
      date,
      isTogetherDay: false,
      createdAt: new Date().toISOString(),
    };

    try {
      await anniversaryService.add(coupleId, newAnniversary);
      
      const anniversaries = [...get().anniversaries, newAnniversary];
      storage.setItem(`anniversary:${coupleId}`, anniversaries);
      set({ anniversaries });
    } catch (error) {
      console.error('Failed to add anniversary to Firebase:', error);
      const anniversaries = [...get().anniversaries, newAnniversary];
      storage.setItem(`anniversary:${coupleId}`, anniversaries);
      set({ anniversaries });
    }
  },

  deleteAnniversary: async (id: string) => {
    const coupleId = useAuthStore.getState().getCoupleId();
    if (!coupleId) return;

    const anniversaries = get().anniversaries.filter(a => a.id !== id && !a.isTogetherDay);
    storage.setItem(`anniversary:${coupleId}`, anniversaries);
    set({ anniversaries });

    const deletedIds = new Set(storage.getItem<string[]>(`deletedIds:anniversary:${coupleId}`) || []);
    deletedIds.add(id);
    storage.setItem(`deletedIds:anniversary:${coupleId}`, Array.from(deletedIds));

    try {
      await anniversaryService.delete(coupleId, id);
      deletedIds.delete(id);
      storage.setItem(`deletedIds:anniversary:${coupleId}`, Array.from(deletedIds));
    } catch (error) {
      console.error('Failed to delete anniversary from Firebase:', error);
    }
  },

  getUpcomingAnniversary: () => {
    const anniversaries = get().anniversaries;
    if (anniversaries.length === 0) return null;

    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth();
    const nowDate = now.getDate();

    let minDiff = Infinity;
    let upcoming: Anniversary | null = null;

    anniversaries.forEach(a => {
      const date = new Date(a.date);
      let targetDate = new Date(nowYear, date.getMonth(), date.getDate());
      
      if (targetDate < now) {
        targetDate = new Date(nowYear + 1, date.getMonth(), date.getDate());
      }

      const diff = Math.floor((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diff < minDiff) {
        minDiff = diff;
        upcoming = a;
      }
    });

    return upcoming;
  },
}));
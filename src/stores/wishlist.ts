import { create } from 'zustand';
import { Wish, TabType } from '../types';
import { storage } from '../utils/storage';
import { useAuthStore } from './auth';
import { generateId } from '../utils/date';
import { wishlistService } from '../services/firebase';
import { withTimeout } from '../utils/firebase';

interface WishlistStore {
  wishes: Wish[];
  _loading: boolean;
  
  loadWishes: () => Promise<void>;
  addWish: (title: string, description: string) => void;
  toggleWishStatus: (id: string) => void;
  deleteWish: (id: string) => void;
  getWishesByTab: (tab: TabType) => Wish[];
  getCompletedCount: () => number;
}

export const useWishlistStore = create<WishlistStore>((set, get) => ({
  wishes: [],
  _loading: false,

  loadWishes: async () => {
    const coupleId = useAuthStore.getState().getCoupleId();
    if (!coupleId) return;
    if (get()._loading) return;
    set({ _loading: true });

    const localWishes = storage.getItem<Wish[]>(`wishlist:${coupleId}`) || [];
    const deletedIds = new Set(storage.getItem<string[]>(`deletedIds:wishlist:${coupleId}`) || []);
    let wishes = localWishes;
    
    // 立即使用本地数据渲染
    set({ wishes: localWishes });
    
    try {
      const firebaseWishes = await withTimeout(
        wishlistService.getAll(coupleId),
        5000,
        []
      );
      
      if (firebaseWishes.length > 0) {
        const localIds = new Set(localWishes.map(w => w.id));
        
        const toDeleteIds = new Set(
          firebaseWishes.filter(w => deletedIds.has(w.id)).map(w => w.id)
        );
        if (toDeleteIds.size > 0) {
          console.log(`发现 ${toDeleteIds.size} 个心愿已在本地删除，同步到Firebase`);
          for (const id of toDeleteIds) {
            await wishlistService.delete(coupleId, id).catch(() => {});
          }
          const remainingDeleted = new Set(
            [...deletedIds].filter(id => !toDeleteIds.has(id))
          );
          storage.setItem(`deletedIds:wishlist:${coupleId}`, Array.from(remainingDeleted));
        }
        
        const newFromFirebase = firebaseWishes.filter(
          w => !localIds.has(w.id) && !toDeleteIds.has(w.id)
        );
        if (newFromFirebase.length > 0) {
          console.log(`从Firebase获取 ${newFromFirebase.length} 个新心愿`);
        }
        
        const firebaseIds = new Set(firebaseWishes.map(w => w.id));
        const wishesNotInFirebase = localWishes.filter(w => !firebaseIds.has(w.id));
        wishes = [...newFromFirebase, ...wishesNotInFirebase];
      }
    } catch (error) {
      console.log('Using local wishes (Firebase unavailable)');
    }

    storage.setItem(`wishlist:${coupleId}`, wishes);
    set({ wishes, _loading: false });
  },

  addWish: async (title: string, description: string) => {
    const coupleId = useAuthStore.getState().getCoupleId();
    const { user } = useAuthStore.getState();
    if (!coupleId || !user) return;

    const newWish: Wish = {
      id: generateId(),
      userId: user.id,
      gender: user.gender,
      title,
      description,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    try {
      await wishlistService.add(coupleId, newWish);
      
      const wishes = [newWish, ...get().wishes];
      storage.setItem(`wishlist:${coupleId}`, wishes);
      set({ wishes });
    } catch (error) {
      console.error('Failed to add wish to Firebase:', error);
      const wishes = [newWish, ...get().wishes];
      storage.setItem(`wishlist:${coupleId}`, wishes);
      set({ wishes });
    }
  },

  toggleWishStatus: async (id: string) => {
    const coupleId = useAuthStore.getState().getCoupleId();
    if (!coupleId) return;

    const currentWish = get().wishes.find(w => w.id === id);
    if (!currentWish) return;

    const newStatus = currentWish.status === 'pending' ? 'completed' : 'pending';

    try {
      await wishlistService.update(coupleId, id, { status: newStatus });
      const wishes = get().wishes.map(w => 
        w.id === id ? { ...w, status: newStatus } : w
      ) as Wish[];
      storage.setItem(`wishlist:${coupleId}`, wishes);
      set({ wishes });
    } catch (error) {
      console.error('Failed to update wish in Firebase:', error);
    }
  },

  deleteWish: async (id: string) => {
    const coupleId = useAuthStore.getState().getCoupleId();
    if (!coupleId) return;

    const wishes = get().wishes.filter(w => w.id !== id);
    storage.setItem(`wishlist:${coupleId}`, wishes);
    set({ wishes });

    const deletedIds = new Set(storage.getItem<string[]>(`deletedIds:wishlist:${coupleId}`) || []);
    deletedIds.add(id);
    storage.setItem(`deletedIds:wishlist:${coupleId}`, Array.from(deletedIds));

    try {
      await wishlistService.delete(coupleId, id);
      deletedIds.delete(id);
      storage.setItem(`deletedIds:wishlist:${coupleId}`, Array.from(deletedIds));
    } catch (error) {
      console.error('Failed to delete wish from Firebase:', error);
    }
  },

  getWishesByTab: (tab: TabType) => {
    if (tab === 'all') return get().wishes;
    return get().wishes.filter(w => w.status === tab);
  },

  getCompletedCount: () => {
    return get().wishes.filter(w => w.status === 'completed').length;
  },
}));
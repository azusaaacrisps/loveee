import { create } from 'zustand';
import { SavingRecord, SavingsGoal } from '../types';
import { storage } from '../utils/storage';
import { useAuthStore } from './auth';
import { generateId } from '../utils/date';
import { savingsService } from '../services/firebase';
import { withTimeout } from '../utils/firebase';

interface SavingsStore {
  records: SavingRecord[];
  goal: SavingsGoal | null;
  showCelebration: boolean;
  _loading: boolean;
  
  loadSavings: () => Promise<void>;
  addRecord: (amount: number, note: string) => void;
  deleteRecord: (id: string) => void;
  setGoal: (targetAmount: number) => void;
  getTotalSavings: () => number;
  getBoySavings: () => number;
  getGirlSavings: () => number;
  getMonthlySavings: () => number;
  getProgress: () => number;
  triggerCelebration: () => void;
  dismissCelebration: () => void;
}

export const useSavingsStore = create<SavingsStore>((set, get) => ({
  records: [],
  goal: null,
  showCelebration: false,
  _loading: false,

  loadSavings: async () => {
    const coupleId = useAuthStore.getState().getCoupleId();
    if (!coupleId) return;
    if (get()._loading) return;
    set({ _loading: true });

    const localRecords = storage.getItem<SavingRecord[]>(`savings:${coupleId}`) || [];
    const localGoal = storage.getItem<SavingsGoal>(`savings-goal:${coupleId}`) || null;
    const deletedIds = new Set(storage.getItem<string[]>(`deletedIds:savings:${coupleId}`) || []);
    
    let records = localRecords;
    let goal = localGoal;
    
    // 立即使用本地数据渲染
    set({ records: localRecords, goal: localGoal });
    
    try {
      const firebaseRecords = await withTimeout(
        savingsService.getAllRecords(coupleId),
        5000,
        []
      );
      
      if (firebaseRecords.length > 0) {
        const localIds = new Set(localRecords.map(r => r.id));
        
        const toDeleteIds = new Set(
          firebaseRecords.filter(r => deletedIds.has(r.id)).map(r => r.id)
        );
        if (toDeleteIds.size > 0) {
          console.log(`发现 ${toDeleteIds.size} 条存款记录已在本地删除，同步到Firebase`);
          for (const id of toDeleteIds) {
            await savingsService.deleteRecord(coupleId, id).catch(() => {});
          }
          const remainingDeleted = new Set(
            [...deletedIds].filter(id => !toDeleteIds.has(id))
          );
          storage.setItem(`deletedIds:savings:${coupleId}`, Array.from(remainingDeleted));
        }
        
        // 以 Firebase 为准，过滤掉已删除的，再补上本地独有（未同步）的记录
        const firebaseIds = new Set(firebaseRecords.map(r => r.id));
        const recordsNotInFirebase = localRecords.filter(r => !firebaseIds.has(r.id));
        records = [
          ...firebaseRecords.filter(r => !toDeleteIds.has(r.id)),
          ...recordsNotInFirebase,
        ];
      }

      const firebaseGoal = await withTimeout(
        savingsService.getGoal(coupleId),
        5000,
        null
      );
      if (firebaseGoal) {
        goal = firebaseGoal;
      }
    } catch (error) {
      console.log('Using local savings (Firebase unavailable)');
    }

    storage.setItem(`savings:${coupleId}`, records);
    if (goal) {
      storage.setItem(`savings-goal:${coupleId}`, goal);
    }
    set({ records, goal, _loading: false });
  },

  addRecord: async (amount: number, note: string) => {
    const coupleId = useAuthStore.getState().getCoupleId();
    const { user } = useAuthStore.getState();
    if (!coupleId || !user) return;

    const newRecord: SavingRecord = {
      id: generateId(),
      userId: user.id,
      gender: user.gender,
      amount,
      note,
      createdAt: new Date().toISOString(),
    };

    try {
      await savingsService.addRecord(coupleId, newRecord);
      
      const records = [newRecord, ...get().records];
      storage.setItem(`savings:${coupleId}`, records);
      
      const totalSavings = get().getTotalSavings() + amount;
      const goal = get().goal;
      
      if (goal && totalSavings >= goal.targetAmount) {
        set({ records, showCelebration: true });
      } else {
        set({ records });
      }
    } catch (error) {
      console.error('Failed to add savings record to Firebase:', error);
      const records = [newRecord, ...get().records];
      storage.setItem(`savings:${coupleId}`, records);
      set({ records });
    }
  },

  deleteRecord: async (id: string) => {
    const coupleId = useAuthStore.getState().getCoupleId();
    if (!coupleId) return;

    const records = get().records.filter(r => r.id !== id);
    storage.setItem(`savings:${coupleId}`, records);
    set({ records });

    const deletedIds = new Set(storage.getItem<string[]>(`deletedIds:savings:${coupleId}`) || []);
    deletedIds.add(id);
    storage.setItem(`deletedIds:savings:${coupleId}`, Array.from(deletedIds));

    try {
      await savingsService.deleteRecord(coupleId, id);
      deletedIds.delete(id);
      storage.setItem(`deletedIds:savings:${coupleId}`, Array.from(deletedIds));
    } catch (error) {
      console.error('Failed to delete savings record from Firebase:', error);
    }
  },

  setGoal: (targetAmount: number) => {
    const coupleId = useAuthStore.getState().getCoupleId();
    const { user } = useAuthStore.getState();
    if (!coupleId || !user) return;

    const goal: SavingsGoal = {
      userId: user.id,
      targetAmount,
      updatedAt: new Date().toISOString(),
    };

    storage.setItem(`savings-goal:${coupleId}`, goal);
    set({ goal });

    savingsService.setGoal(coupleId, goal).catch(error => {
      console.error('Failed to set savings goal in Firebase:', error);
    });
  },

  getTotalSavings: () => {
    return get().records.reduce((sum, r) => sum + r.amount, 0);
  },

  getBoySavings: () => {
    return get().records.filter(r => r.gender === 'boy').reduce((sum, r) => sum + r.amount, 0);
  },

  getGirlSavings: () => {
    return get().records.filter(r => r.gender === 'girl').reduce((sum, r) => sum + r.amount, 0);
  },

  getMonthlySavings: () => {
    const now = new Date();
    return get().records
      .filter(r => {
        const date = new Date(r.createdAt);
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      })
      .reduce((sum, r) => sum + r.amount, 0);
  },

  getProgress: () => {
    const total = get().getTotalSavings();
    const goal = get().goal;
    if (!goal || goal.targetAmount === 0) return 0;
    return Math.min((total / goal.targetAmount) * 100, 100);
  },

  triggerCelebration: () => {
    set({ showCelebration: true });
  },

  dismissCelebration: () => {
    set({ showCelebration: false });
  },
}));
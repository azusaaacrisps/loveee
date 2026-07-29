import { create } from 'zustand';
import { DailyRecord } from '../types';
import { storage } from '../utils/storage';
import { useAuthStore } from './auth';
import { generateId } from '../utils/date';
import { dailyService } from '../services/firebase';
import { withTimeout } from '../utils/firebase';

interface DailyStore {
  records: DailyRecord[];
  _loading: boolean;
  
  loadRecords: () => Promise<void>;
  addRecord: (content: string, images: string[]) => void;
  deleteRecord: (id: string) => void;
  getRecordsByFilter: (year?: number, month?: number, day?: number) => DailyRecord[];
}

export const useDailyStore = create<DailyStore>((set, get) => ({
  records: [],
  _loading: false,

  loadRecords: async () => {
    const coupleId = useAuthStore.getState().getCoupleId();
    if (!coupleId) return;
    if (get()._loading) return;
    set({ _loading: true });

    const localRecords = storage.getItem<DailyRecord[]>(`daily:${coupleId}`) || [];
    const deletedIds = new Set(storage.getItem<string[]>(`deletedIds:daily:${coupleId}`) || []);
    let records = localRecords;
    
    // 立即使用本地数据渲染
    set({ records: localRecords });
    
    console.log(`=== 加载记录 ===`);
    console.log(`coupleId: ${coupleId}`);
    console.log(`本地记录数: ${localRecords.length}`);
    console.log(`deletedIds:`, Array.from(deletedIds));
    
    try {
      const firebaseRecords = await withTimeout(
        dailyService.getAll(coupleId),
        5000,
        []
      );
      
      console.log(`Firebase返回记录数: ${firebaseRecords.length}`);
      
      if (firebaseRecords.length > 0) {
        const localIds = new Set(localRecords.map(r => r.id));
        console.log(`本地ID集合:`, Array.from(localIds));
        
        const toDeleteIds = new Set(
          firebaseRecords.filter(r => deletedIds.has(r.id)).map(r => r.id)
        );
        if (toDeleteIds.size > 0) {
          console.log(`发现 ${toDeleteIds.size} 条记录已在本地删除，同步到Firebase`);
          for (const id of toDeleteIds) {
            await dailyService.delete(coupleId, id).catch(() => {});
          }
          const remainingDeleted = new Set(
            [...deletedIds].filter(id => !toDeleteIds.has(id))
          );
          storage.setItem(`deletedIds:daily:${coupleId}`, Array.from(remainingDeleted));
        }
        
        const newFromFirebase = firebaseRecords.filter(
          r => !localIds.has(r.id) && !toDeleteIds.has(r.id)
        );
        console.log(`新记录数: ${newFromFirebase.length}`);
        if (newFromFirebase.length > 0) {
          console.log(`新记录ID:`, newFromFirebase.map(r => r.id));
        }
        
        const firebaseIds = new Set(firebaseRecords.map(r => r.id));
        const recordsNotInFirebase = localRecords.filter(r => !firebaseIds.has(r.id));
        if (newFromFirebase.length > 0 || recordsNotInFirebase.length > 0) {
          records = [...newFromFirebase, ...recordsNotInFirebase];
        }
      }
    } catch (error) {
      console.log('Using local records (Firebase unavailable)');
    }

    storage.setItem(`daily:${coupleId}`, records);
    set({ records, _loading: false });
    console.log(`加载完成，最终记录数: ${records.length}`);
  },

  addRecord: async (content: string, images: string[]) => {
    const coupleId = useAuthStore.getState().getCoupleId();
    const { user } = useAuthStore.getState();
    if (!coupleId || !user) return;

    const newRecord: DailyRecord = {
      id: generateId(),
      userId: user.id,
      gender: user.gender,
      content,
      images,
      createdAt: new Date().toISOString(),
    };

    try {
      await dailyService.add(coupleId, newRecord);
      
      const records = [newRecord, ...get().records];
      storage.setItem(`daily:${coupleId}`, records);
      set({ records });
    } catch (error) {
      console.error('Failed to add daily record to Firebase:', error);
      const records = [newRecord, ...get().records];
      storage.setItem(`daily:${coupleId}`, records);
      set({ records });
    }
  },

  deleteRecord: async (id: string) => {
    const coupleId = useAuthStore.getState().getCoupleId();
    if (!coupleId) return;

    console.log(`=== 删除记录开始 ===`);
    console.log(`当前记录数: ${get().records.length}`);
    console.log(`要删除的ID: ${id}`);
    
    const records = get().records.filter(r => r.id !== id);
    console.log(`删除后记录数: ${records.length}`);
    
    storage.setItem(`daily:${coupleId}`, records);
    const storedRecords = storage.getItem<DailyRecord[]>(`daily:${coupleId}`);
    console.log(`localStorage保存后记录数: ${storedRecords?.length}`);
    
    set({ records });
    
    const deletedIds = new Set(storage.getItem<string[]>(`deletedIds:daily:${coupleId}`) || []);
    deletedIds.add(id);
    storage.setItem(`deletedIds:daily:${coupleId}`, Array.from(deletedIds));
    const storedDeletedIds = storage.getItem<string[]>(`deletedIds:daily:${coupleId}`);
    console.log(`deletedIds保存后:`, storedDeletedIds);

    try {
      await dailyService.delete(coupleId, id);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Firebase 删除失败:`, error);
    }
  },

  getRecordsByFilter: (year?: number, month?: number, day?: number) => {
    let records = get().records;
    
    if (year !== undefined) {
      records = records.filter(r => new Date(r.createdAt).getFullYear() === year);
    }
    if (month !== undefined) {
      records = records.filter(r => new Date(r.createdAt).getMonth() === month);
    }
    if (day !== undefined) {
      records = records.filter(r => new Date(r.createdAt).getDate() === day);
    }
    
    return records;
  },
}));
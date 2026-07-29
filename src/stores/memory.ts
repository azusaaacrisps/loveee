import { create } from 'zustand';
import { Memory } from '../types';
import { storage } from '../utils/storage';
import { useAuthStore } from './auth';
import { generateId } from '../utils/date';
import { memoryService } from '../services/firebase';
import { withTimeout } from '../utils/firebase';

interface MemoryStore {
  memories: Memory[];
  _loading: boolean;
  
  loadMemories: () => Promise<void>;
  addMemory: (content: string, images: string[], isPrivate: boolean, isImportant: boolean) => void;
  deleteMemory: (id: string) => void;
  getMemoriesByFilter: (year?: number, month?: number, day?: number) => Memory[];
}

export const useMemoryStore = create<MemoryStore>((set, get) => ({
  memories: [],
  _loading: false,

  loadMemories: async () => {
    const coupleId = useAuthStore.getState().getCoupleId();
    if (!coupleId) return;
    if (get()._loading) return;
    set({ _loading: true });

    const localMemories = storage.getItem<Memory[]>(`memory:${coupleId}`) || [];
    const deletedIds = new Set(storage.getItem<string[]>(`deletedIds:memory:${coupleId}`) || []);
    let memories = localMemories;
    
    // 立即使用本地数据渲染
    set({ memories: localMemories });
    
    try {
      const firebaseMemories = await withTimeout(
        memoryService.getAll(coupleId),
        5000,
        []
      );
      
      if (firebaseMemories.length > 0) {
        const localIds = new Set(localMemories.map(m => m.id));
        
        const toDeleteIds = new Set(
          firebaseMemories.filter(m => deletedIds.has(m.id)).map(m => m.id)
        );
        if (toDeleteIds.size > 0) {
          console.log(`发现 ${toDeleteIds.size} 条回忆已在本地删除，同步到Firebase`);
          for (const id of toDeleteIds) {
            await memoryService.delete(coupleId, id).catch(() => {});
          }
          const remainingDeleted = new Set(
            [...deletedIds].filter(id => !toDeleteIds.has(id))
          );
          storage.setItem(`deletedIds:memory:${coupleId}`, Array.from(remainingDeleted));
        }
        
        const newFromFirebase = firebaseMemories.filter(
          m => !localIds.has(m.id) && !toDeleteIds.has(m.id)
        );
        if (newFromFirebase.length > 0) {
          console.log(`从Firebase获取 ${newFromFirebase.length} 条新回忆`);
        }
        
        const firebaseIds = new Set(firebaseMemories.map(m => m.id));
        const memoriesNotInFirebase = localMemories.filter(m => !firebaseIds.has(m.id));
        if (newFromFirebase.length > 0 || memoriesNotInFirebase.length > 0) {
          memories = [...newFromFirebase, ...memoriesNotInFirebase];
        }
      }
    } catch (error) {
      console.log('Using local memories (Firebase unavailable)');
    }

    storage.setItem(`memory:${coupleId}`, memories);
    set({ memories, _loading: false });
  },

  addMemory: async (content: string, images: string[], isPrivate: boolean, isImportant: boolean) => {
    const coupleId = useAuthStore.getState().getCoupleId();
    const { user } = useAuthStore.getState();
    if (!coupleId || !user) return;

    const newMemory: Memory = {
      id: generateId(),
      userId: user.id,
      gender: user.gender,
      content,
      images,
      isPrivate,
      isImportant,
      createdAt: new Date().toISOString(),
    };

    try {
      await memoryService.add(coupleId, newMemory);
      
      const memories = [newMemory, ...get().memories];
      storage.setItem(`memory:${coupleId}`, memories);
      set({ memories });
    } catch (error) {
      console.error('Failed to add memory to Firebase:', error);
      const memories = [newMemory, ...get().memories];
      storage.setItem(`memory:${coupleId}`, memories);
      set({ memories });
    }
  },

  deleteMemory: async (id: string) => {
    const coupleId = useAuthStore.getState().getCoupleId();
    if (!coupleId) return;

    const memories = get().memories.filter(m => m.id !== id);
    storage.setItem(`memory:${coupleId}`, memories);
    set({ memories });

    const deletedIds = new Set(storage.getItem<string[]>(`deletedIds:memory:${coupleId}`) || []);
    deletedIds.add(id);
    storage.setItem(`deletedIds:memory:${coupleId}`, Array.from(deletedIds));

    try {
      await memoryService.delete(coupleId, id);
      deletedIds.delete(id);
      storage.setItem(`deletedIds:memory:${coupleId}`, Array.from(deletedIds));
    } catch (error) {
      console.error('Failed to delete memory from Firebase:', error);
    }
  },

  getMemoriesByFilter: (year?: number, month?: number, day?: number) => {
    let memories = get().memories;
    
    if (year !== undefined) {
      memories = memories.filter(m => new Date(m.createdAt).getFullYear() === year);
    }
    if (month !== undefined) {
      memories = memories.filter(m => new Date(m.createdAt).getMonth() === month);
    }
    if (day !== undefined) {
      memories = memories.filter(m => new Date(m.createdAt).getDate() === day);
    }
    
    return memories;
  },
}));
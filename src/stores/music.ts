import { create } from 'zustand';
import { SharedSong } from '../types';
import { storage } from '../utils/storage';
import { generateId } from '../utils/date';
import { musicService } from '../services/firebase';
import { useAuthStore } from './auth';
import { withTimeout } from '../utils/firebase';

interface MusicStore {
  songs: SharedSong[];
  currentSong: SharedSong | null;
  isPlaying: boolean;
  _loading: boolean;
  
  loadSongs: () => Promise<void>;
  syncSongs: () => Promise<void>;
  cleanupSongs: () => void;
  addSong: (song: Omit<SharedSong, 'id' | 'createdAt'>) => Promise<void>;
  deleteSong: (id: string) => void;
  setCurrentSong: (song: SharedSong | null) => void;
  togglePlay: () => void;
  updateCurrentSongUrl: (url: string) => void;
}

export const useMusicStore = create<MusicStore>((set, get) => ({
  songs: [],
  currentSong: null,
  isPlaying: false,
  _loading: false,

  syncSongs: async () => {
    const coupleId = useAuthStore.getState().getCoupleId();
    if (!coupleId) return;

    // 如果已经有监听器在运行，不用重复设置
    if ((get() as any)._unsubscribe) return;

    // 先加载一次初始数据
    await get().loadSongs();

    // 设置 onSnapshot 实时监听
    try {
      const unsub = musicService.onChange(coupleId, (firebaseSongs) => {
        const localSongs = get().songs;
        const firebaseIds = new Set(firebaseSongs.map(s => s.id));
        const localIds = new Set(localSongs.map(s => s.id));

        // 检查是否有新数据或变化
        const hasNew = firebaseSongs.some(s => !localIds.has(s.id));
        const hasDelete = localSongs.some(s => !firebaseIds.has(s.id));
        const hasChange = firebaseSongs.length !== localSongs.length;

        if (hasNew || hasDelete || hasChange) {
          // 合并：Firebase 数据 + 本地独有的（可能是 Firebase 还没同步的）
          const merged = [...firebaseSongs];
          for (const local of localSongs) {
            if (!firebaseIds.has(local.id)) {
              merged.push(local);
            }
          }
          storage.setItem(`music:${coupleId}`, merged);
          set({ songs: merged });
        }
      });
      (get() as any)._unsubscribe = unsub;
    } catch (error) {
      console.error('Failed to set up music sync:', error);
    }
  },

  cleanupSongs: () => {
    const unsub = (get() as any)._unsubscribe;
    if (unsub) {
      unsub();
      (get() as any)._unsubscribe = null;
    }
  },

  loadSongs: async () => {
    const coupleId = useAuthStore.getState().getCoupleId();
    if (!coupleId) return;
    if (get()._loading) return;
    set({ _loading: true });
    
    const localSongs = storage.getItem<SharedSong[]>(`music:${coupleId}`) || [];
    const deletedIds = new Set(storage.getItem<string[]>(`deletedIds:music:${coupleId}`) || []);
    let songs = localSongs;
    
    // 立即使用本地数据渲染
    set({ songs: localSongs });
    
    try {
      const firebaseSongs = await withTimeout(
        musicService.getAll(coupleId),
        5000,
        []
      );
      
      if (firebaseSongs.length > 0) {
        const localIds = new Set(localSongs.map(s => s.id));
        
        const toDeleteIds = new Set(
          firebaseSongs.filter(s => deletedIds.has(s.id)).map(s => s.id)
        );
        if (toDeleteIds.size > 0) {
          console.log(`发现 ${toDeleteIds.size} 首歌曲已在本地删除，同步到Firebase`);
          for (const id of toDeleteIds) {
            await musicService.delete(coupleId, id).catch(() => {});
          }
          const remainingDeleted = new Set(
            [...deletedIds].filter(id => !toDeleteIds.has(id))
          );
          storage.setItem(`deletedIds:music:${coupleId}`, Array.from(remainingDeleted));
        }
        
        // 以 Firebase 为准，过滤掉已删除的，再补上本地独有（未同步）的记录
        const firebaseIds = new Set(firebaseSongs.map(s => s.id));
        const songsNotInFirebase = localSongs.filter(s => !firebaseIds.has(s.id));
        songs = [
          ...firebaseSongs.filter(s => !toDeleteIds.has(s.id)),
          ...songsNotInFirebase,
        ];
      }
    } catch (error) {
      console.log('Using local songs (Firebase unavailable)');
    }

    storage.setItem(`music:${coupleId}`, songs);
    set({ songs, _loading: false });
  },

  addSong: async (song) => {
    const coupleId = useAuthStore.getState().getCoupleId();
    if (!coupleId) return;
    
    const newSong: SharedSong = {
      ...song,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    
    try {
      await musicService.add(coupleId, newSong);
      
      const currentSongs = get().songs;
      const updatedSongs = [newSong, ...currentSongs];
      
      storage.setItem(`music:${coupleId}`, updatedSongs);
      set({ songs: updatedSongs });
    } catch (error) {
      console.error('Failed to add song to Firebase:', error);
      const currentSongs = get().songs;
      const updatedSongs = [newSong, ...currentSongs];
      storage.setItem(`music:${coupleId}`, updatedSongs);
      set({ songs: updatedSongs });
    }
  },

  deleteSong: async (id) => {
    const coupleId = useAuthStore.getState().getCoupleId();
    if (!coupleId) return;
    
    const currentSongs = get().songs;
    const updatedSongs = currentSongs.filter(song => song.id !== id);
    
    storage.setItem(`music:${coupleId}`, updatedSongs);
    
    const deletedIds = new Set(storage.getItem<string[]>(`deletedIds:music:${coupleId}`) || []);
    deletedIds.add(id);
    storage.setItem(`deletedIds:music:${coupleId}`, Array.from(deletedIds));
    
    set({ 
      songs: updatedSongs,
      currentSong: get().currentSong?.id === id ? null : get().currentSong
    });
    
    try {
      await musicService.delete(coupleId, id);
      deletedIds.delete(id);
      storage.setItem(`deletedIds:music:${coupleId}`, Array.from(deletedIds));
    } catch (error) {
      console.error('Failed to delete song from Firebase:', error);
    }
  },

  setCurrentSong: (song) => {
    set({ 
      currentSong: song,
      isPlaying: song !== null
    });
  },

  togglePlay: () => {
    set(state => ({ isPlaying: !state.isPlaying }));
  },

  updateCurrentSongUrl: (url: string) => {
    const { currentSong, songs } = get();
    if (!currentSong) return;

    const updatedSong = { ...currentSong, url };
    const updatedSongs = songs.map(s => s.id === updatedSong.id ? updatedSong : s);
    const coupleId = useAuthStore.getState().getCoupleId();
    if (coupleId) {
      storage.setItem(`music:${coupleId}`, updatedSongs);
    }
    set({ currentSong: updatedSong, songs: updatedSongs });
  },
}));
import { create } from 'zustand';
import { CoupleProfile } from '../types';
import { storage } from '../utils/storage';
import { useAuthStore } from './auth';
import { profileService } from '../services/firebase';
import { withTimeout } from '../utils/firebase';

interface CoupleStore {
  profile: CoupleProfile | null;
  
  loadProfile: () => Promise<void>;
  updateProfile: (profile: Partial<CoupleProfile>) => Promise<void>;
}

export const useCoupleStore = create<CoupleStore>((set, get) => ({
  profile: null,

  loadProfile: async () => {
    const coupleId = useAuthStore.getState().getCoupleId();
    if (!coupleId) {
      console.warn('[loadProfile] 无 coupleId，无法加载资料');
      return;
    }
    console.log('[loadProfile] 当前 coupleId =', coupleId);

    // 先用本地数据立即渲染（避免空白），随后用 Firebase 权威数据覆盖
    const localProfile = storage.getItem<CoupleProfile>(`profile:${coupleId}`);
    if (localProfile) {
      set({ profile: localProfile });
    }

    try {
      // 以 Firebase 为权威：成功读到就用云端数据
      const firebaseProfile = await withTimeout(
        profileService.get(coupleId),
        15000,
        null
      );
      console.log('[loadProfile] Firebase 返回:', firebaseProfile);
      if (
        firebaseProfile &&
        (firebaseProfile.boyNickname || firebaseProfile.girlNickname || firebaseProfile.togetherDate)
      ) {
        storage.setItem(`profile:${coupleId}`, firebaseProfile);
        set({ profile: firebaseProfile });
      } else if (firebaseProfile) {
        console.warn('[loadProfile] Firebase 文档存在但字段为空，未覆盖本地数据');
      }
    } catch (error) {
      // 读取失败（多为网络/需梯子）：保留本地数据，但明确报错便于排查
      console.error('[loadProfile] 读取 Firebase 失败（请确认网络可访问 firestore.googleapis.com，梯子环境需开启）:', error);
    }
  },

  updateProfile: async (updates: Partial<CoupleProfile>) => {
    const coupleId = useAuthStore.getState().getCoupleId();
    if (!coupleId) return;

    const current = get().profile || {
      userId: '',
      boyNickname: '',
      girlNickname: '',
      boyAvatar: '',
      girlAvatar: '',
      togetherDate: '',
    };
    const updated = { ...current, ...updates };
    
    storage.setItem(`profile:${coupleId}`, updated);
    set({ profile: updated });

    try {
      await profileService.set(coupleId, updated);
      console.log('[updateProfile] 已成功保存到 Firebase');
    } catch (error) {
      // 写入失败多为网络/需梯子：本地已更新，但云端未同步
      console.error('[updateProfile] 保存到 Firebase 失败（请确认网络可访问 firestore.googleapis.com，梯子环境需开启）:', error);
    }
  },
}));
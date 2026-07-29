import { create } from 'zustand';
import { User, CoupleProfile } from '../types';
import { storage } from '../utils/storage';
import { generateId } from '../utils/date';
import { profileService, userService } from '../services/firebase';
import { migrateFromLocalStorage } from '../services/migration';

interface AuthStore {
  user: User | null;
  isLoggedIn: boolean;
  error: string | null;
  
  register: (username: string, password: string, gender: 'boy' | 'girl', profile?: Partial<CoupleProfile> & { coupleId?: string }) => Promise<boolean>;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loadAuth: () => void;
  getCoupleId: () => string | null;
  generateCoupleId: () => string;
  getCoupleProfile: (coupleId: string) => CoupleProfile | null;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoggedIn: false,
  error: null,

  register: async (username: string, password: string, gender: 'boy' | 'girl', profile?: Partial<CoupleProfile> & { coupleId?: string }): Promise<boolean> => {
    const users = storage.getItem<User[]>('users') || [];
    
    if (users.some(u => u.username === username)) {
      set({ error: '用户名已存在' });
      return false;
    }

    const newCoupleId = profile?.coupleId || generateId();

    const newUser: User = {
      id: generateId(),
      username,
      password,
      coupleId: newCoupleId,
      gender,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    storage.setItem('users', users);

    try {
      const firebaseId = await userService.add({
        username,
        password,
        coupleId: newCoupleId,
        gender,
        createdAt: newUser.createdAt,
      });
      newUser.id = firebaseId;
      storage.setItem('users', users);
      console.log('用户已同步到Firebase，ID:', firebaseId);
    } catch (error) {
      console.error('同步用户到Firebase失败:', error);
      set({ error: '用户注册成功，但同步到云端失败，请稍后重试' });
    }

    if (!profile?.coupleId) {
      const userId = newUser.id;
      const newProfile: CoupleProfile = {
        userId,
        boyNickname: profile?.boyNickname || '亲爱的',
        girlNickname: profile?.girlNickname || '宝贝',
        boyAvatar: '',
        girlAvatar: '',
        togetherDate: profile?.togetherDate || new Date().toISOString().split('T')[0],
      };
      storage.setItem(`profile:${newCoupleId}`, newProfile);
      await profileService.set(newCoupleId, newProfile);
    } else if (profile) {
      const existingProfile = storage.getItem<CoupleProfile>(`profile:${newCoupleId}`);
      const updatedProfile: CoupleProfile = {
        userId: newUser.id,
        boyNickname: existingProfile?.boyNickname || profile.boyNickname || '',
        girlNickname: existingProfile?.girlNickname || profile.girlNickname || '',
        boyAvatar: existingProfile?.boyAvatar || '',
        girlAvatar: existingProfile?.girlAvatar || '',
        togetherDate: existingProfile?.togetherDate || profile.togetherDate || '',
      };
      storage.setItem(`profile:${newCoupleId}`, updatedProfile);
      await profileService.set(newCoupleId, updatedProfile);
    }

    storage.setItem('auth', newUser);
    set({ user: newUser, isLoggedIn: true, error: null });
    return true;
  },

  login: async (username: string, password: string): Promise<boolean> => {
    const users = storage.getItem<User[]>('users') || [];
    let user = users.find(u => u.username === username && u.password === password);

    if (user) {
      // 本地已有账号：直接登录，后台静默同步到 Firebase（不阻塞登录）
      storage.setItem('auth', user);
      set({ user, isLoggedIn: true, error: null });
      if (user.coupleId) {
        migrateFromLocalStorage(user.coupleId).catch(e => console.warn('后台同步失败（可稍后重试）:', e));
      }
      return true;
    }

    // 本地没有，尝试从 Firebase 获取
    try {
      const firebaseUser = await userService.getByUsername(username);
      if (firebaseUser && firebaseUser.password === password) {
        user = firebaseUser;
        users.push(user);
        storage.setItem('users', users);
        storage.setItem('auth', user);
        set({ user, isLoggedIn: true, error: null });
        if (user.coupleId) {
          migrateFromLocalStorage(user.coupleId).catch(e => console.warn('后台同步失败（可稍后重试）:', e));
        }
        return true;
      }
      if (firebaseUser) {
        set({ error: '密码错误' });
        return false;
      }
      set({ error: '用户名不存在，请先注册' });
      return false;
    } catch (error) {
      console.error('从 Firebase 获取用户失败:', error);
      set({ error: '无法连接服务器，请检查网络后重试' });
      return false;
    }
  },

  logout: () => {
    storage.removeItem('auth');
    set({ user: null, isLoggedIn: false, error: null });
  },

  loadAuth: () => {
    const auth = storage.getItem<User>('auth');
    if (auth) {
      set({ user: auth, isLoggedIn: true });
    }
  },

  getCoupleId: () => {
    return get().user?.coupleId || null;
  },

  generateCoupleId: () => {
    return generateId();
  },

  getCoupleProfile: (coupleId: string): CoupleProfile | null => {
    return storage.getItem<CoupleProfile>(`profile:${coupleId}`) || null;
  },
}));
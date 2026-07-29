import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  increment,
  onSnapshot,
} from 'firebase/firestore';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../firebase/config';
import {
  DailyRecord,
  Anniversary,
  Wish,
  Memory,
  SavingRecord,
  SharedSong,
  User,
  CoupleProfile,
  WeatherRecord,
  SavingsGoal,
} from '../types';

const FIRESTORE_TIMEOUT = 8000;

export const withTimeout = <T>(promise: Promise<T>, ms: number = FIRESTORE_TIMEOUT, defaultValue?: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('NETWORK_TIMEOUT')), ms)),
  ]).catch(err => {
    if (defaultValue !== undefined && err.message === 'NETWORK_TIMEOUT') {
      return defaultValue;
    }
    throw err;
  });
};

const withNetwork = async <T>(fn: () => Promise<T>): Promise<T> => {
  return fn();
};

export const COLLECTIONS = {
  COUPLES: 'couples',
  USERS: 'users',
  DAILY: 'daily',
  ANNIVERSARY: 'anniversaries',
  WISHLIST: 'wishlist',
  MEMORY: 'memories',
  SAVINGS: 'savings',
  MUSIC: 'music',
  PROFILE: 'profile',
  WEATHER: 'weather',
};

export interface CoupleProfileData {
  id: string;
  wifeId: string;
  husbandId: string;
  wifeName: string;
  husbandName: string;
  createdAt: string;
  [key: string]: any;
}

export const userService = {
  getAll: async (): Promise<User[]> => {
    try {
      const colRef = collection(db, COLLECTIONS.USERS);
      const snapshot = await withTimeout(getDocs(colRef));
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as User);
    } catch (error) {
      console.error('Failed to get all users:', error);
      return [];
    }
  },
  getByUsername: async (username: string): Promise<User | null> => {
    try {
      const colRef = collection(db, COLLECTIONS.USERS);
      const snapshot = await withTimeout(getDocs(colRef));
      const found = snapshot.docs.find(doc => doc.data().username === username);
      return found ? { ...found.data(), id: found.id } as User : null;
    } catch (error) {
      console.error('Failed to get user by username:', error);
      throw error;
    }
  },
  add: async (user: Omit<User, 'id'>): Promise<string> => {
    try {
      const colRef = collection(db, COLLECTIONS.USERS);
      const docRef = await addDoc(colRef, user);
      return docRef.id;
    } catch (error) {
      console.error('Failed to add user:', error);
      throw error;
    }
  },
  getByCoupleId: async (coupleId: string): Promise<User[]> => {
    try {
      const colRef = collection(db, COLLECTIONS.USERS);
      const snapshot = await withTimeout(getDocs(colRef));
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as User)
        .filter(u => u.coupleId === coupleId);
    } catch (error) {
      console.error('Failed to get users by coupleId:', error);
      return [];
    }
  },
};

export const dailyService = {
  getAll: async (coupleId: string): Promise<DailyRecord[]> => {
    try {
      const colRef = collection(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.DAILY);
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snapshot = await withTimeout(getDocs(q));
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as DailyRecord);
    } catch (error) {
      console.error('Failed to get daily records:', error);
      throw error;
    }
  },
  // 使用 record.id 作为文档 ID，保证 id 字段、文档路径、删除目标三者一致
  add: async (coupleId: string, record: DailyRecord): Promise<string> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.DAILY, record.id);
      await setDoc(docRef, record);
      return record.id;
    });
  },
  update: async (coupleId: string, id: string, data: Partial<DailyRecord>): Promise<void> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.DAILY, id);
      await updateDoc(docRef, data as any);
    });
  },
  delete: async (coupleId: string, id: string): Promise<void> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.DAILY, id);
      await deleteDoc(docRef);
    });
  },
};

export const anniversaryService = {
  getAll: async (coupleId: string): Promise<Anniversary[]> => {
    try {
      const colRef = collection(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.ANNIVERSARY);
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snapshot = await withTimeout(getDocs(q));
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Anniversary);
    } catch (error) {
      console.error('Failed to get anniversaries:', error);
      throw error;
    }
  },
  add: async (coupleId: string, anniversary: Anniversary): Promise<string> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.ANNIVERSARY, anniversary.id);
      await setDoc(docRef, anniversary);
      return anniversary.id;
    });
  },
  update: async (coupleId: string, id: string, data: Partial<Anniversary>): Promise<void> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.ANNIVERSARY, id);
      await updateDoc(docRef, data as any);
    });
  },
  delete: async (coupleId: string, id: string): Promise<void> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.ANNIVERSARY, id);
      await deleteDoc(docRef);
    });
  },
};

export const wishlistService = {
  getAll: async (coupleId: string): Promise<Wish[]> => {
    try {
      const colRef = collection(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.WISHLIST);
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snapshot = await withTimeout(getDocs(q));
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Wish);
    } catch (error) {
      console.error('Failed to get wishes:', error);
      throw error;
    }
  },
  add: async (coupleId: string, wish: Wish): Promise<string> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.WISHLIST, wish.id);
      await setDoc(docRef, wish);
      return wish.id;
    });
  },
  update: async (coupleId: string, id: string, data: Partial<Wish>): Promise<void> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.WISHLIST, id);
      await updateDoc(docRef, data as any);
    });
  },
  delete: async (coupleId: string, id: string): Promise<void> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.WISHLIST, id);
      await deleteDoc(docRef);
    });
  },
};

export const memoryService = {
  getAll: async (coupleId: string): Promise<Memory[]> => {
    try {
      const colRef = collection(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.MEMORY);
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snapshot = await withTimeout(getDocs(q));
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Memory);
    } catch (error) {
      console.error('Failed to get memories:', error);
      throw error;
    }
  },
  add: async (coupleId: string, memory: Memory): Promise<string> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.MEMORY, memory.id);
      await setDoc(docRef, memory);
      return memory.id;
    });
  },
  update: async (coupleId: string, id: string, data: Partial<Memory>): Promise<void> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.MEMORY, id);
      await updateDoc(docRef, data as any);
    });
  },
  delete: async (coupleId: string, id: string): Promise<void> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.MEMORY, id);
      await deleteDoc(docRef);
    });
  },
};

export const savingsService = {
  getAllRecords: async (coupleId: string): Promise<SavingRecord[]> => {
    try {
      const colRef = collection(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.SAVINGS);
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snapshot = await withTimeout(getDocs(q));
      return snapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id }) as SavingRecord)
        .filter(r => r.id !== 'balance');
    } catch (error) {
      console.error('Failed to get saving records:', error);
      throw error;
    }
  },
  addRecord: async (coupleId: string, record: SavingRecord): Promise<string> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.SAVINGS, record.id);
      await setDoc(docRef, record);
      return record.id;
    });
  },
  // 更新金额，使用 setDoc 保证 id 一致
  updateBalance: async (coupleId: string, balance: number): Promise<void> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.SAVINGS, 'balance');
      await setDoc(docRef, { id: 'balance', balance }, { merge: true });
    });
  },
  getBalance: async (coupleId: string): Promise<number> => {
    try {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.SAVINGS, 'balance');
      const snapshot = await withTimeout(getDoc(docRef));
      return snapshot.exists() ? (snapshot.data().balance as number) || 0 : 0;
    } catch (error) {
      console.error('Failed to get balance:', error);
      return 0;
    }
  },
  getGoal: async (coupleId: string): Promise<SavingsGoal | null> => {
    try {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.SAVINGS, 'goal');
      const snapshot = await withTimeout(getDoc(docRef));
      return snapshot.exists() ? (snapshot.data() as SavingsGoal) : null;
    } catch (error) {
      console.error('Failed to get savings goal:', error);
      return null;
    }
  },
  setGoal: async (coupleId: string, goal: SavingsGoal): Promise<void> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.SAVINGS, 'goal');
      await setDoc(docRef, goal, { merge: true });
    });
  },
  deleteRecord: async (coupleId: string, id: string): Promise<void> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.SAVINGS, id);
      await deleteDoc(docRef);
    });
  },
};

export const musicService = {
  getAll: async (coupleId: string): Promise<SharedSong[]> => {
    try {
      const colRef = collection(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.MUSIC);
      const q = query(colRef, orderBy('addedAt', 'desc'));
      const snapshot = await withTimeout(getDocs(q));
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as SharedSong);
    } catch (error) {
      console.error('Failed to get songs:', error);
      throw error;
    }
  },
  add: async (coupleId: string, song: SharedSong): Promise<string> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.MUSIC, song.id);
      await setDoc(docRef, song);
      return song.id;
    });
  },
  delete: async (coupleId: string, id: string): Promise<void> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.MUSIC, id);
      await deleteDoc(docRef);
    });
  },
  onChange: (coupleId: string, callback: (songs: SharedSong[]) => void): () => void => {
    const colRef = collection(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.MUSIC);
    const q = query(colRef, orderBy('addedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const songs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as SharedSong);
      callback(songs);
    });
  },
};

export const profileService = {
  get: async (coupleId: string): Promise<CoupleProfile | null> => {
    try {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.PROFILE, 'main');
      const snapshot = await withTimeout(getDoc(docRef));
      if (snapshot.exists()) {
        return { ...snapshot.data(), id: snapshot.id } as unknown as CoupleProfile;
      }
      return null;
    } catch (error) {
      console.error('Failed to get profile:', error);
      return null;
    }
  },
  set: async (coupleId: string, profile: CoupleProfile): Promise<void> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.PROFILE, 'main');
      await setDoc(docRef, profile, { merge: true });
    });
  },
  update: async (coupleId: string, data: Partial<CoupleProfile>): Promise<void> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.PROFILE, 'main');
      await updateDoc(docRef, data as any);
    });
  },
};

export const loveHeartService = {
  get: async (coupleId: string): Promise<any | null> => {
    try {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, 'loveHeart', 'main');
      const snapshot = await withTimeout(getDoc(docRef));
      if (snapshot.exists()) {
        return snapshot.data();
      }
      return null;
    } catch (error) {
      console.error('Failed to get love heart:', error);
      return null;
    }
  },
  set: async (coupleId: string, data: any): Promise<void> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, 'loveHeart', 'main');
      await setDoc(docRef, data, { merge: true });
    });
  },
  increment: async (coupleId: string, gender: 'boy' | 'girl'): Promise<void> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, 'loveHeart', 'main');
      const field = gender === 'boy' ? 'boyCount' : 'girlCount';
      await updateDoc(docRef, { [field]: increment(1), updatedAt: new Date().toISOString() });
    });
  },
};

export const weatherService = {
  getAll: async (coupleId: string): Promise<WeatherRecord[]> => {
    try {
      const colRef = collection(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.WEATHER);
      const snapshot = await withTimeout(getDocs(colRef));
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as WeatherRecord);
    } catch (error) {
      console.error('Failed to get weather records:', error);
      return [];
    }
  },
  // 使用 record.id 作为文档 ID，保证 id 字段、文档路径、删除目标三者一致
  add: async (coupleId: string, record: WeatherRecord): Promise<string> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.WEATHER, record.id);
      await setDoc(docRef, record);
      return record.id;
    });
  },
  update: async (coupleId: string, id: string, data: Partial<WeatherRecord>): Promise<void> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.WEATHER, id);
      await updateDoc(docRef, data as any);
    });
  },
  delete: async (coupleId: string, id: string): Promise<void> => {
    return withNetwork(async () => {
      const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, COLLECTIONS.WEATHER, id);
      await deleteDoc(docRef);
    });
  },
};

// 迁移工具：使用指定 id 写入（保持 id 与文档 id 一致）
export const addDocWithId = async (
  coupleId: string,
  collectionName: string,
  id: string,
  data: any
): Promise<void> => {
  return withNetwork(async () => {
    const docRef = doc(db, COLLECTIONS.COUPLES, coupleId, collectionName, id);
    await setDoc(docRef, { ...data, id });
  });
};

export const getAuthState = (callback: (user: any) => void): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

export const logout = async (): Promise<void> => {
  return signOut(auth);
};

export { signInWithEmailAndPassword, createUserWithEmailAndPassword };

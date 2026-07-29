import { storage } from '../utils/storage';
import {
  profileService,
  dailyService,
  anniversaryService,
  wishlistService,
  memoryService,
  savingsService,
  weatherService,
  loveHeartService,
} from './firebase';
import {
  CoupleProfile,
  DailyRecord,
  Anniversary,
  Wish,
  Memory,
  SavingRecord,
  SavingsGoal,
  WeatherRecord,
  LoveHeart,
} from '../types';

const MIGRATION_KEY = 'couple-diary:migrated';

export const isMigrated = (coupleId: string): boolean => {
  const migrated = storage.getItem<Record<string, boolean>>(MIGRATION_KEY) || {};
  return migrated[coupleId] || false;
};

export const markAsMigrated = (coupleId: string): void => {
  const migrated = storage.getItem<Record<string, boolean>>(MIGRATION_KEY) || {};
  migrated[coupleId] = true;
  storage.setItem(MIGRATION_KEY, migrated);
};

export const migrateFromLocalStorage = async (coupleId: string): Promise<void> => {
  if (isMigrated(coupleId)) return;

  try {
    const profile = storage.getItem<CoupleProfile>(`profile:${coupleId}`);
    if (profile) {
      await profileService.set(coupleId, profile);
    }

    const dailyRecords = storage.getItem<DailyRecord[]>(`daily:${coupleId}`);
    if (dailyRecords && dailyRecords.length > 0) {
      for (const record of dailyRecords) {
        const { id, ...data } = record;
        await addDocWithId(coupleId, 'daily', id, data);
      }
    }

    const anniversaries = storage.getItem<Anniversary[]>(`anniversary:${coupleId}`);
    if (anniversaries && anniversaries.length > 0) {
      for (const anniversary of anniversaries) {
        const { id, ...data } = anniversary;
        await addDocWithId(coupleId, 'anniversary', id, data);
      }
    }

    const wishes = storage.getItem<Wish[]>(`wishlist:${coupleId}`);
    if (wishes && wishes.length > 0) {
      for (const wish of wishes) {
        const { id, ...data } = wish;
        await addDocWithId(coupleId, 'wishlist', id, data);
      }
    }

    const memories = storage.getItem<Memory[]>(`memory:${coupleId}`);
    if (memories && memories.length > 0) {
      for (const memory of memories) {
        const { id, ...data } = memory;
        await addDocWithId(coupleId, 'memory', id, data);
      }
    }

    const savingsRecords = storage.getItem<SavingRecord[]>(`savings:${coupleId}`);
    if (savingsRecords && savingsRecords.length > 0) {
      for (const record of savingsRecords) {
        const { id, ...data } = record;
        await addDocWithId(coupleId, 'savings', id, data);
      }
    }

    const savingsGoal = storage.getItem<SavingsGoal>(`savings-goal:${coupleId}`);
    if (savingsGoal) {
      await savingsService.setGoal(coupleId, savingsGoal);
    }

    const weatherRecords = storage.getItem<WeatherRecord[]>(`weather:${coupleId}`);
    if (weatherRecords && weatherRecords.length > 0) {
      for (const record of weatherRecords) {
        const { id, ...data } = record;
        await addDocWithId(coupleId, 'weather', id, data);
      }
    }

    const loveHeart = storage.getItem<LoveHeart>(`loveheart:${coupleId}`);
    if (loveHeart) {
      await loveHeartService.set(coupleId, loveHeart);
    }

    markAsMigrated(coupleId);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

const addDocWithId = async <T>(coupleId: string, collectionName: string, id: string, data: T): Promise<void> => {
  const { doc, setDoc } = await import('firebase/firestore');
  const { db } = await import('../firebase/config');
  const docRef = doc(db, 'couples', coupleId, collectionName, id);
  await setDoc(docRef, data);
};
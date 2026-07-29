import { create } from 'zustand';
import { WeatherRecord } from '../types';
import { storage } from '../utils/storage';
import { useAuthStore } from './auth';
import { generateId, getToday } from '../utils/date';
import { fetchWeatherByCity, fetchWeatherByLocation, getCurrentLocation } from '../services/weatherService';
import { weatherService } from '../services/firebase';

interface WeatherStore {
  records: WeatherRecord[];
  isFetching: boolean;
  fetchError: string | null;
  
  loadWeather: () => Promise<void>;
  addWeather: (city: string, weather: string, temperature: string, note: string) => void;
  updateWeather: (id: string, city: string, weather: string, temperature: string, note: string) => void;
  getTodayWeather: () => WeatherRecord | null;
  fetchWeatherAuto: () => Promise<void>;
  fetchWeatherByCityName: (cityName: string) => Promise<void>;
}

export const useWeatherStore = create<WeatherStore>((set, get) => ({
  records: [],
  isFetching: false,
  fetchError: null,

  loadWeather: async () => {
    const coupleId = useAuthStore.getState().getCoupleId();
    if (!coupleId) return;

    // 先用本地数据立即渲染，保证切页返回时不空白
    const localRecords = storage.getItem<WeatherRecord[]>(`weather:${coupleId}`) || [];
    set({ records: localRecords });

    try {
      const firebaseRecords = await weatherService.getAll(coupleId);
      if (firebaseRecords.length > 0) {
        // 以 id 去重合并，Firebase 优先，本地独有的保留
        const map = new Map<string, WeatherRecord>();
        [...localRecords, ...firebaseRecords].forEach(r => map.set(r.id, r));
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        storage.setItem(`weather:${coupleId}`, merged);
        set({ records: merged });
      }
    } catch (error) {
      console.error('Failed to load weather from Firebase:', error);
    }
  },

  addWeather: (city: string, weather: string, temperature: string, note: string) => {
    const coupleId = useAuthStore.getState().getCoupleId();
    const { user } = useAuthStore.getState();
    if (!coupleId || !user) return;

    const newRecord: WeatherRecord = {
      id: generateId(),
      userId: user.id,
      city,
      weather,
      temperature,
      note,
      createdAt: new Date().toISOString(),
    };

    const records = [newRecord, ...get().records];
    storage.setItem(`weather:${coupleId}`, records);
    set({ records });

    weatherService.add(coupleId, { ...newRecord }).catch(error => {
      console.error('Failed to add weather to Firebase:', error);
    });
  },

  updateWeather: (id: string, city: string, weather: string, temperature: string, note: string) => {
    const coupleId = useAuthStore.getState().getCoupleId();
    if (!coupleId) return;

    const records = get().records.map(r => 
      r.id === id ? { ...r, city, weather, temperature, note, createdAt: new Date().toISOString() } : r
    );
    storage.setItem(`weather:${coupleId}`, records);
    set({ records });

    weatherService.update(coupleId, id, { city, weather, temperature, note, createdAt: new Date().toISOString() }).catch(error => {
      console.error('Failed to update weather in Firebase:', error);
    });
  },

  getTodayWeather: () => {
    const today = getToday();
    return get().records.find(r => r.createdAt.startsWith(today)) || null;
  },

  fetchWeatherAuto: async () => {
    const coupleId = useAuthStore.getState().getCoupleId();
    if (!coupleId) return;

    set({ isFetching: true, fetchError: null });

    try {
      const getWeatherData = async (cityName: string): Promise<{ temperature: number; condition: string; description: string } | null> => {
        try {
          const weatherData = await fetchWeatherByCity(cityName);
          return {
            temperature: weatherData.temperature,
            condition: weatherData.condition,
            description: weatherData.description,
          };
        } catch (error) {
          console.error(`${cityName}天气获取失败:`, error);
          return null; // 不回退到模拟数据
        }
      };

      const [shanghaiData, chongqingData] = await Promise.all([
        getWeatherData('上海'),
        getWeatherData('重庆'),
      ]);

      if (!shanghaiData && !chongqingData) {
        set({ isFetching: false, fetchError: '获取天气失败，请检查网络后重试' });
        return;
      }

      const shanghaiRecord = get().records.find(r => r.city === '上海');
      const chongqingRecord = get().records.find(r => r.city === '重庆');

      if (shanghaiData) {
        if (shanghaiRecord) {
          get().updateWeather(
            shanghaiRecord.id,
            '上海',
            shanghaiData.condition,
            shanghaiData.temperature.toString(),
            shanghaiData.description
          );
        } else {
          get().addWeather(
            '上海',
            shanghaiData.condition,
            shanghaiData.temperature.toString(),
            shanghaiData.description
          );
        }
      }

      if (chongqingData) {
        if (chongqingRecord) {
          get().updateWeather(
            chongqingRecord.id,
            '重庆',
            chongqingData.condition,
            chongqingData.temperature.toString(),
            chongqingData.description
          );
        } else {
          get().addWeather(
            '重庆',
            chongqingData.condition,
            chongqingData.temperature.toString(),
            chongqingData.description
          );
        }
      }

      set({ isFetching: false });
    } catch (error) {
      set({ isFetching: false, fetchError: error instanceof Error ? error.message : '获取天气失败' });
    }
  },

  fetchWeatherByCityName: async (cityName: string) => {
    const coupleId = useAuthStore.getState().getCoupleId();
    const { user } = useAuthStore.getState();
    if (!coupleId || !user) return;

    set({ isFetching: true, fetchError: null });

    try {
      const weatherData = await fetchWeatherByCity(cityName);
      
      get().addWeather(
        weatherData.city,
        weatherData.condition,
        weatherData.temperature.toString(),
        weatherData.description
      );
    } catch (error) {
      set({ fetchError: error instanceof Error ? error.message : '获取天气失败' });
    } finally {
      set({ isFetching: false });
    }
  },
}));
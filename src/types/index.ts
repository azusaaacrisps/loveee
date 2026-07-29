export interface User {
  id: string;
  username: string;
  password: string;
  coupleId: string | null;
  gender: 'boy' | 'girl';
  createdAt: string;
}

export interface CoupleProfile {
  userId: string;
  boyNickname: string;
  girlNickname: string;
  boyAvatar: string;
  girlAvatar: string;
  togetherDate: string;
}

export interface DailyRecord {
  id: string;
  userId: string;
  gender: 'boy' | 'girl';
  content: string;
  images: string[];
  createdAt: string;
}

export interface Anniversary {
  id: string;
  userId: string;
  gender: 'boy' | 'girl';
  name: string;
  date: string;
  isTogetherDay: boolean;
  createdAt: string;
}

export interface Wish {
  id: string;
  userId: string;
  gender: 'boy' | 'girl';
  title: string;
  description: string;
  status: 'pending' | 'completed';
  createdAt: string;
}

export interface Memory {
  id: string;
  userId: string;
  gender: 'boy' | 'girl';
  content: string;
  images: string[];
  isPrivate: boolean;
  isImportant: boolean;
  createdAt: string;
}

export interface SavingRecord {
  id: string;
  userId: string;
  gender: 'boy' | 'girl';
  amount: number;
  note: string;
  createdAt: string;
}

export interface SavingsGoal {
  userId: string;
  targetAmount: number;
  updatedAt: string;
}

export interface WeatherRecord {
  id: string;
  userId: string;
  city: string;
  weather: string;
  temperature: string;
  note: string;
  createdAt: string;
}

export interface LoveHeart {
  boyCount: number;
  girlCount: number;
  updatedAt: string;
}

export interface LoveHeart {
  boyCount: number;
  girlCount: number;
  updatedAt: string;
}

export interface SharedSong {
  id: string;
  userId: string;
  gender: 'boy' | 'girl';
  songId: string;
  songName: string;
  artist: string;
  cover: string;
  lyrics: string;
  url: string;
  comment: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
}

export type TabType = 'all' | 'pending' | 'completed';

export type FilterType = 'year' | 'month' | 'day';
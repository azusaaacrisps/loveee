import { Anniversary, DailyRecord, Wish, Memory, SavingRecord, SavingsGoal, CoupleProfile } from '../types';
import { getDefaultTogetherDate, generateId } from '../utils/date';

export const createDefaultProfile = (userId: string): CoupleProfile => {
  return {
    userId,
    boyNickname: '亲爱的',
    girlNickname: '宝贝',
    boyAvatar: 'M',
    girlAvatar: 'F',
    togetherDate: getDefaultTogetherDate(),
  };
};

export const createDefaultAnniversary = (userId: string): Anniversary => {
  return {
    id: generateId(),
    userId,
    gender: 'boy',
    name: '在一起的那一天',
    date: getDefaultTogetherDate(),
    isTogetherDay: true,
    createdAt: new Date().toISOString(),
  };
};

export const createDefaultAnniversaries = (userId: string): Anniversary[] => {
  const togetherDay = createDefaultAnniversary(userId);
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 14);
  
  return [
    togetherDay,
    {
      id: generateId(),
      userId,
      gender: 'girl',
      name: '七夕情人节',
      date: `${today.getFullYear()}-08-10`,
      isTogetherDay: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      userId,
      gender: 'boy',
      name: '恋爱一周年',
      date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isTogetherDay: false,
      createdAt: new Date().toISOString(),
    },
  ];
};

export const createDefaultDailyRecords = (userId: string): DailyRecord[] => {
  const now = new Date();
  return [
    {
      id: generateId(),
      userId,
      gender: 'girl',
      content: '今天一起去看了电影，很开心 ♡',
      images: [],
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: generateId(),
      userId,
      gender: 'boy',
      content: '一起做了晚餐，味道很不错！',
      images: [],
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: generateId(),
      userId,
      gender: 'girl',
      content: '散步的时候看到了很美的夕阳，拍了很多照片',
      images: [],
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
};

export const createDefaultWishes = (userId: string): Wish[] => {
  return [
    {
      id: generateId(),
      userId,
      gender: 'girl',
      title: '一起去旅行',
      description: '计划一次浪漫的旅行，去海边看日出',
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      userId,
      gender: 'boy',
      title: '学习一门新技能',
      description: '一起学习烹饪或者乐器',
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
    {
      id: generateId(),
      userId,
      gender: 'girl',
      title: '看一场演唱会',
      description: '去看我们都喜欢的歌手的演唱会',
      status: 'completed',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
};

export const createDefaultMemories = (userId: string): Memory[] => {
  return [
    {
      id: generateId(),
      userId,
      gender: 'boy',
      content: '第一次见面的那天，阳光很好',
      images: [],
      isPrivate: false,
      isImportant: true,
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: generateId(),
      userId,
      gender: 'girl',
      content: '第一次约会，紧张又开心',
      images: [],
      isPrivate: false,
      isImportant: true,
      createdAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
};

export const createDefaultSavings = (userId: string): { records: SavingRecord[]; goal: SavingsGoal } => {
  return {
    records: [
      {
        id: generateId(),
        userId,
        gender: 'boy',
        amount: 1000,
        note: '第一个月存钱',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: generateId(),
        userId,
        gender: 'girl',
        amount: 1500,
        note: '第二个月存钱',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    goal: {
      userId,
      targetAmount: 20000,
      updatedAt: new Date().toISOString(),
    },
  };
};

export const loveQuotes = [
  'Love is not about how much you say, but how much you do.',
  '幸せはいつもそばにある',
  'You are my today and all of my tomorrows.',
  '愛してる',
  'The best thing to hold onto in life is each other.',
  '二人で歩こう',
];

export const getRandomLoveQuote = (): string => {
  return loveQuotes[Math.floor(Math.random() * loveQuotes.length)];
};